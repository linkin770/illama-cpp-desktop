/**
 * TF-IDF 检索引擎 - 简易版全文检索
 */

/**
 * 分词函数（简易版，按空格和标点分割）
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[\s\u3000,，.。!！?？;；:：""''""''()（）\[\]【】]+/)
    .filter(token => token.length > 0)
}

/**
 * 计算 TF-IDF 并检索
 * @param {string} query - 查询文本
 * @param {Array} chunks - 所有文本块
 * @param {Object} opts - 选项
 * @param {number} opts.topK - 返回结果数量，默认 3
 * @returns {Array<{chunk: Object, score: number}>} 排序后的结果
 */
export function searchWithTFIDF(query, chunks, opts = {}) {
  const { topK = 3 } = opts

  if (!query || chunks.length === 0) {
    return []
  }

  // 1. 分词
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    return []
  }

  // 2. 计算每个文档的词频（TF）
  const docTokenCounts = chunks.map(chunk => {
    const tokens = tokenize(chunk.content)
    const tokenCount = {}
    for (const token of tokens) {
      tokenCount[token] = (tokenCount[token] || 0) + 1
    }
    return {
      chunk,
      tokens,
      tokenCount,
      totalTokens: tokens.length,
    }
  })

  // 3. 计算 IDF（逆文档频率）
  const totalDocs = chunks.length
  const docFreq = {}
  
  for (const { tokens } of docTokenCounts) {
    const uniqueTokens = new Set(tokens)
    for (const token of uniqueTokens) {
      docFreq[token] = (docFreq[token] || 0) + 1
    }
  }

  const idf = {}
  for (const [token, freq] of Object.entries(docFreq)) {
    idf[token] = Math.log(totalDocs / freq)
  }

  // 4. 计算查询向量与每个文档的余弦相似度
  const results = docTokenCounts.map(({ chunk, tokenCount, totalTokens }) => {
    // 计算查询向量的 TF-IDF
    const queryTFIDF = {}
    for (const token of queryTokens) {
      queryTFIDF[token] = (queryTFIDF[token] || 0) + 1
    }
    for (const token of Object.keys(queryTFIDF)) {
      queryTFIDF[token] = (queryTFIDF[token] / queryTokens.length) * (idf[token] || 0)
    }

    // 计算文档向量的 TF-IDF
    const docTFIDF = {}
    for (const [token, count] of Object.entries(tokenCount)) {
      docTFIDF[token] = (count / totalTokens) * (idf[token] || 0)
    }

    // 计算余弦相似度
    let dotProduct = 0
    let queryMagnitude = 0
    let docMagnitude = 0

    const allTokens = new Set([...Object.keys(queryTFIDF), ...Object.keys(docTFIDF)])
    for (const token of allTokens) {
      const q = queryTFIDF[token] || 0
      const d = docTFIDF[token] || 0
      dotProduct += q * d
      queryMagnitude += q * q
      docMagnitude += d * d
    }

    const similarity = dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude) || 1)

    return {
      chunk,
      score: similarity,
    }
  })

  // 5. 排序并返回 Top-K
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
