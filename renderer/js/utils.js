/**
 * HTML 转义函数，防止 XSS 攻击
 * @param {string} value - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * HTML 属性转义函数，额外转义单引号
 * @param {string} value - 需要转义的属性值
 * @returns {string} 转义后的安全字符串
 */
function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

/**
 * 判断元素是否接近底部
 * @param {HTMLElement} element - DOM 元素
 * @returns {boolean} 如果距离底部小于 96px 返回 true
 */
function isNearBottom(element) {
  if (!element) return true
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96
}

/**
 * 获取文件路径中的文件名
 * @param {string} filePath - 文件路径
 * @returns {string} 文件名（不含路径）
 */
function basename(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || ''
}

/**
 * 格式化字节数为可读字符串
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串（如 "1.5 MB"）
 */
function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!Number.isFinite(value) || value <= 0) return '未读取'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let next = value
  let unitIndex = 0
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024
    unitIndex += 1
  }
  return `${next >= 100 || unitIndex === 0 ? next.toFixed(0) : next.toFixed(2)} ${units[unitIndex]}`
}

/**
 * 从模型文件名中提取模型家族名称
 * @param {string} name - 模型文件名
 * @returns {string} 模型家族名称（去除量化信息和扩展名）
 */
function modelFamilyFromName(name) {
  return String(name || '')
    .replace(/\.gguf$/i, '')
    .replace(/\.(q\d[^.]*)$/i, '')
    .replace(/\.(iq\d[^.]*)$/i, '')
}

/**
 * 从模型文件名中提取量化级别标签
 * @param {string} name - 模型文件名
 * @returns {string} 量化级别（如 Q4_K_M），未标注则返回 "未标注"
 */
function quantLabelFromName(name) {
  const match = String(name || '').match(/\.(q\d[^.]*)\.gguf$/i) || String(name || '').match(/\.(iq\d[^.]*)\.gguf$/i)
  return match?.[1]?.toUpperCase() || '未标注'
}

/**
 * 从模型文件名中提取参数规模
 * @param {string} name - 模型文件名
 * @returns {string} 参数规模（如 7B、13B），未标注则返回 "未标注"
 */
function paramScaleFromName(name) {
  const match = String(name || '').match(/(\d+(?:\.\d+)?)B/i)
  return match ? `${match[1]}B` : '未标注'
}

/**
 * 将文本内容按代码块分割
 * @param {string} content - 原始文本内容
 * @returns {Array<{type: 'text' | 'code', language?: string, value: string}>} 分割后的段落数组
 */
function splitCodeParts(content) {
  const parts = []
  const pattern = /```([^\n`]*)\n?([\s\S]*?)```/g
  let cursor = 0
  let match
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: 'text', value: content.slice(cursor, match.index) })
    }
    parts.push({
      type: 'code',
      language: String(match[1] || '').trim().split(/\s+/)[0] || 'text',
      value: match[2] || '',
    })
    cursor = match.index + match[0].length
  }
  if (cursor < content.length) {
    parts.push({ type: 'text', value: content.slice(cursor) })
  }
  return parts
}

/**
 * 渲染 Markdown 文本为 HTML
 * @param {string} text - Markdown 格式文本
 * @returns {string} 转换后的 HTML 字符串
 */
function renderMarkdown(text) {
  const value = String(text || '')
  if (!value.trim()) return ''

  let html = escapeHtml(value)

  // Inline code (must be before bold/italic to avoid conflicts)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // Bold + italic: ***text*** or ___text___
  html = html.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>')
  html = html.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>')

  // Bold: **text** or __text__
  html = html.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>')
  html = html.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>')

  // Italic: *text* or _text_ (single, not preceded/followed by *)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // Process line by line for block elements
  const lines = html.split('\n')
  const result = []
  let inUl = false
  let inOl = false
  let inBlockquote = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Headings: ### text
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (inOl) { result.push('</ol>'); inOl = false }
      if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false }
      const level = headingMatch[1].length
      result.push(`<h${level}>${headingMatch[2]}</h${level}>`)
      continue
    }

    // Horizontal rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (inOl) { result.push('</ol>'); inOl = false }
      if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false }
      result.push('<hr />')
      continue
    }

    // Unordered list: - text or * text or + text
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)$/)
    if (ulMatch) {
      if (inOl) { result.push('</ol>'); inOl = false }
      if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false }
      if (!inUl) { result.push('<ul>'); inUl = true }
      result.push(`<li>${ulMatch[3]}</li>`)
      continue
    }

    // Ordered list: 1. text
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false }
      if (!inOl) { result.push('<ol>'); inOl = true }
      result.push(`<li>${olMatch[3]}</li>`)
      continue
    }

    // Blockquote: > text
    const bqMatch = line.match(/^&gt;\s?(.*)$/)
    if (bqMatch) {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (inOl) { result.push('</ol>'); inOl = false }
      if (!inBlockquote) { result.push('<blockquote>'); inBlockquote = true }
      result.push(`<p>${bqMatch[1] || '&nbsp;'}</p>`)
      continue
    }

    // Close open lists/blockquotes
    if (inUl) { result.push('</ul>'); inUl = false }
    if (inOl) { result.push('</ol>'); inOl = false }
    if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false }

    // Empty line — skip
    if (!line.trim()) {
      continue
    }

    // Paragraph
    result.push(`<p>${line}</p>`)
  }

  // Close any remaining open elements
  if (inUl) result.push('</ul>')
  if (inOl) result.push('</ol>')
  if (inBlockquote) result.push('</blockquote>')

  let output = result.join('')

  // Clean up empty paragraphs
  output = output.replace(/<p>\s*<\/p>/g, '')

  return output
}

/**
 * 将文本渲染为带类名的 Markdown 容器
 * @param {string} text - Markdown 格式文本
 * @returns {string} HTML 字符串
 */
function renderTextBlock(text) {
  const value = String(text || '')
  if (!value.trim()) return ''
  return `<div class="markdown-text">${renderMarkdown(value)}</div>`
}

/**
 * 根据语言类型高亮代码
 * @param {string} code - 代码内容
 * @param {string} language - 编程语言（如 javascript, python, html, css, json）
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightCode(code, language) {
  const lang = String(language || '').toLowerCase()
  let result = escapeHtml(code)
  
  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    result = highlightJavaScript(code)
  } else if (lang === 'python' || lang === 'py') {
    result = highlightPython(code)
  } else if (lang === 'html' || lang === 'xml') {
    result = highlightHtml(code)
  } else if (lang === 'css') {
    result = highlightCss(code)
  } else if (lang === 'json') {
    result = highlightJson(code)
  }
  
  return result
}

/**
 * JavaScript/TypeScript 代码语法高亮
 * @param {string} code - JS/TS 代码
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightJavaScript(code) {
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'in', 'of', 'with', 'switch', 'case', 'default', 'break', 'continue', 'do', 'void', 'delete', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'Symbol', 'Promise', 'Map', 'Set', 'Array', 'Object', 'String', 'Number', 'Boolean']
  
  let result = escapeHtml(code)
  
  result = result.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
  
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
  
  result = result.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="string">$1</span>')
  
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
  
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  result = result.replace(keywordRegex, '<span class="keyword">$1</span>')
  
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>')
  
  return result
}

/**
 * Python 代码语法高亮
 * @param {string} code - Python 代码
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightPython(code) {
  const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'and', 'or', 'not', 'is', 'in', 'True', 'False', 'None', 'self', '__init__', '__str__', '__repr__', '__class__', 'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool']
  
  let result = escapeHtml(code)
  
  result = result.replace(/(#.*$)/gm, '<span class="comment">$1</span>')
  
  result = result.replace(/("""[\s\S]*?""")|('''[\s\S]*?''')|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')/g, '<span class="string">$1</span>')
  
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
  
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  result = result.replace(keywordRegex, '<span class="keyword">$1</span>')
  
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>')
  
  return result
}

/**
 * HTML/XML 代码语法高亮
 * @param {string} code - HTML/XML 代码
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightHtml(code) {
  let result = escapeHtml(code)
  
  result = result.replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="comment">$&</span>')
  
  result = result.replace(/&lt;(\/?)([a-zA-Z][a-zA-Z0-9]*)([^&]*?)&gt;/g, (match, closing, tag, attrs) => {
    return `&lt;${closing}<span class="keyword">${tag}</span>${attrs}&gt;`
  })
  
  result = result.replace(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*("[^"]*"|'[^']*')/g, '<span class="class">$1</span>=<span class="string">$2</span>')
  
  return result
}

/**
 * CSS 代码语法高亮
 * @param {string} code - CSS 代码
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightCss(code) {
  let result = escapeHtml(code)
  
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
  
  result = result.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="string">$1</span>')
  
  result = result.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|deg|s|ms)?\b/g, '<span class="number">$1$2</span>')
  
  result = result.replace(/\b([a-zA-Z-][a-zA-Z0-9-]*)\s*(?=:)/g, '<span class="class">$1</span>')
  
  result = result.replace(/\b(#([0-9a-fA-F]{3}){1,2}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z-]+)\b/g, '<span class="keyword">$1</span>')
  
  return result
}

/**
 * JSON 代码语法高亮
 * @param {string} code - JSON 代码
 * @returns {string} 带高亮样式的 HTML 字符串
 */
function highlightJson(code) {
  let result = escapeHtml(code)
  
  result = result.replace(/"([^"]+)":/g, '<span class="class">"$1"</span>:')
  
  result = result.replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
  
  result = result.replace(/: (\d+\.?\d*)/g, ': <span class="number">$1</span>')
  
  result = result.replace(/: (true|false|null)/g, ': <span class="keyword">$1</span>')
  
  return result
}

/**
 * 判断代码是否可预览（HTML/SVG等）
 * @param {string} language - 编程语言
 * @param {string} code - 代码内容
 * @returns {boolean} 是否可预览
 */
function canPreviewCode(language, code) {
  const lang = String(language || '').toLowerCase()
  return ['html', 'htm', 'svg'].includes(lang) || /<!doctype|<html|<body|<style|<script/i.test(code)
}

/**
 * 估算文本的 token 数量
 * @param {string} text - 文本内容
 * @returns {number} 估算的 token 数
 */
function estimateTokens(text) {
  const value = String(text || '').trim()
  if (!value) return 0
  const cjk = (value.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length
  const latin = value.replace(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '').trim()
  const latinTokens = latin ? latin.split(/\s+/).filter(Boolean).length : 0
  const punctuation = (value.match(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length
  return Math.max(1, Math.round(cjk * 1.5 + latinTokens * 1.3 + punctuation * 0.5))
}

/**
 * 分离思考过程和最终回答
 * @param {string} content - 包含思考过程标记的文本
 * @returns {{answer: string, thoughts: string[]}} 分离后的回答和思考过程数组
 */
function splitThinkingOutput(content) {
  const text = String(content || '')
  const tagPattern = /<think(?:ing)?>/i
  const closePattern = /<\/think(?:ing)?>/i
  const labelPattern = /(?:^|\n)\s*(?:Thinking Process|思考过程)\s*[:：]/i
  const openTag = tagPattern.exec(text)
  const openLabel = labelPattern.exec(text)
  const openCandidates = [openTag, openLabel].filter(Boolean)
  const firstOpen = openCandidates.sort((a, b) => a.index - b.index)[0]
  const closeTag = closePattern.exec(text)
  const cleanMarkers = value => String(value || '')
    .replace(/<\/?think(?:ing)?>/gi, '')
    .replace(/^\s*(?:Thinking Process|思考过程)\s*[:：]\s*/i, '')
    .trim()

  if (firstOpen) {
    const openEnd = firstOpen.index + firstOpen[0].length
    const prefix = text.slice(0, firstOpen.index)
    const closeAfterOpen = closePattern.exec(text.slice(openEnd))
    if (closeAfterOpen) {
      const closeStart = openEnd + closeAfterOpen.index
      const closeEnd = closeStart + closeAfterOpen[0].length
      const prefixLooksLikeThinking = !prefix.trim() || /(?:reasoning|thinking|思考|推理)/i.test(prefix)
      const answerPrefix = prefixLooksLikeThinking ? '' : prefix
      const thoughtPrefix = prefixLooksLikeThinking ? prefix : ''
      return {
        answer: cleanMarkers(`${answerPrefix}${text.slice(closeEnd)}`),
        thoughts: [cleanMarkers(`${thoughtPrefix}${text.slice(openEnd, closeStart)}`)].filter(Boolean),
      }
    }

    return {
      answer: cleanMarkers(prefix),
      thoughts: [cleanMarkers(text.slice(openEnd))].filter(Boolean),
    }
  }

  if (closeTag) {
    const closeEnd = closeTag.index + closeTag[0].length
    return {
      answer: cleanMarkers(text.slice(closeEnd)),
      thoughts: [cleanMarkers(text.slice(0, closeTag.index))].filter(Boolean),
    }
  }

  return { answer: text, thoughts: [] }
}

/**
 * 获取输入框的数值（空字符串返回空，无效数字返回原值）
 * @param {HTMLInputElement} input - 输入框元素
 * @returns {number|string} 数值或原始字符串
 */
function localNumberValue(input) {
  if (input.value === '') return ''
  const next = Number(input.value)
  return Number.isFinite(next) ? next : input.value
}

export {
  escapeHtml,
  escapeAttribute,
  isNearBottom,
  basename,
  formatBytes,
  modelFamilyFromName,
  quantLabelFromName,
  paramScaleFromName,
  splitCodeParts,
  renderTextBlock,
  canPreviewCode,
  estimateTokens,
  splitThinkingOutput,
  highlightCode,
  localNumberValue,
}