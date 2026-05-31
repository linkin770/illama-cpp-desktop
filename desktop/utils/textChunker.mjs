/**
 * 文本分块工具 - 将长文本切分为小块
 */

/**
 * 将文本分块
 * @param {string} text - 原始文本
 * @param {Object} opts - 分块选项
 * @param {number} opts.chunkSize - 每块大小（字符数），默认 500
 * @param {number} opts.overlap - 重叠字符数，默认 50
 * @param {number} opts.maxChunks - 最大分块数，默认 100
 * @returns {Array<{content: string, index: number}>} 分块数组
 */
export function chunkText(text, opts = {}) {
  const {
    chunkSize = 500,
    overlap = 50,
    maxChunks = 100,
  } = opts

  if (!text || text.trim().length === 0) {
    return []
  }

  const chunks = []
  
  // 先按段落分割
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
  
  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()
    
    // 如果单个段落就超过 chunkSize，需要进一步切分
    if (trimmedParagraph.length > chunkSize) {
      // 先保存当前 chunk
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
        })
        currentChunk = ''
      }
      
      // 将长段落按句子切分
      const subChunks = splitLongParagraph(trimmedParagraph, chunkSize, overlap)
      chunks.push(...subChunks.map((content, idx) => ({
        content,
        index: chunkIndex + idx,
      })))
      chunkIndex += subChunks.length
    } else if (currentChunk.length + trimmedParagraph.length > chunkSize && currentChunk) {
      // 当前 chunk 已满，保存并开始新的
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
      })
      
      // 保留一部分重叠
      const lastPart = currentChunk.slice(-overlap)
      currentChunk = lastPart + '\n\n' + trimmedParagraph
    } else {
      // 添加到当前 chunk
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedParagraph : trimmedParagraph
    }
    
    // 检查是否超过最大分块数
    if (chunks.length >= maxChunks) {
      break
    }
  }

  // 保存最后一个 chunk
  if (currentChunk.trim() && chunks.length < maxChunks) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
    })
  }

  return chunks
}

/**
 * 将长段落按句子切分
 */
function splitLongParagraph(text, chunkSize, overlap) {
  const chunks = []
  
  // 按句子分割
  const sentences = text.split(/([。！？.!?\n]+)/).filter(s => s.trim())
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      
      // 保留重叠
      const lastPart = currentChunk.slice(-overlap)
      currentChunk = lastPart + sentence
    } else {
      currentChunk += sentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}
