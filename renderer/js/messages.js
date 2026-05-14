import { state } from './state.js'
import { formatBytes, estimateTokens, splitCodeParts, escapeHtml, escapeAttribute, isNearBottom, renderTextBlock, highlightCode, canPreviewCode, splitThinkingOutput } from './utils.js'

/**
 * 获取当前模型名称（从配置中提取文件名）
 * @returns {string} 模型文件名
 */
function modelName() {
  const model = state.config?.model || ''
  return model.split(/[\\/]/).pop() || 'local-model'
}

/**
 * 获取服务状态标签
 * @returns {string} 状态标签（未启动/启动中/运行中/停止中/需要处理）
 */
function statusLabel() {
  return {
    stopped: '未启动',
    starting: '启动中',
    running: '运行中',
    stopping: '停止中',
    error: '需要处理',
  }[state.status.state] || state.status.state
}

/**
 * 获取服务状态对应的 CSS 类名
 * @returns {string} CSS 类名（running/error/pending/空字符串）
 */
function statusClass() {
  if (state.status.state === 'running') return 'running'
  if (state.status.state === 'error') return 'error'
  if (state.status.state === 'starting' || state.status.state === 'stopping') return 'pending'
  return ''
}

/**
 * 压缩状态消息，处理常见错误场景
 * @param {string} message - 原始状态消息
 * @returns {string} 压缩后的消息（最大 180 字符）
 */
function compactStatusMessage(message) {
  const text = String(message || '')
  if (text.includes('System message must be at the beginning')) {
    return '系统消息位置错误：已在新版中自动合并到请求最前面。'
  }
  if (/timeout|aborted/i.test(text)) {
    return '请求超时：可在设置里调大“请求超时 ms”，或降低上下文/输出长度。'
  }
  if (text.length > 180) {
    return `${text.slice(0, 180)}...`
  }
  return text
}

/**
 * 格式化友好的错误消息
 * @param {Error|string} error - 错误对象或错误消息
 * @returns {string} 用户友好的错误提示
 */
function friendlyErrorMessage(error) {
  const text = String(error?.message || error || '')
  if (text.includes('System message must be at the beginning')) {
    return '发送失败：系统消息必须位于请求最前面。新版会自动整理历史消息，请再发送一次。'
  }
  if (/timeout|aborted/i.test(text)) {
    return '发送失败：请求超时。可以在设置里调大“请求超时 ms”，或降低 ctx_size / n_predict 后重试。'
  }
  if (text.includes('Chat Template Kwargs must be valid JSON')) {
    return `发送失败：Chat Template Kwargs 不是合法 JSON。${text}`
  }
  if (text.includes('exceed_context_size_error')) {
    return `发送失败：内容超过模型上下文限制。可在设置中增大“上下文大小 ctx_size”，或减少附件大小。${text}`
  }
  return text.length > 360 ? `发送失败：${text.slice(0, 360)}...` : `发送失败：${text}`
}

/**
 * 将时间戳格式化为简短的中文日期时间
 * @param {string|Date} value - 时间值
 * @returns {string} 格式化后的时间字符串（如 "05/14 10:30"）
 */
function shortTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * 生成唯一的会话 ID
 * @returns {string} 会话 ID（格式：session-时间戳-随机串）
 */
function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 从消息列表生成会话标题（取第一条用户消息）
 * @param {Array<{role: string, content: string}>} messages - 消息列表
 * @returns {string} 会话标题（最多 36 字符）
 */
function titleFromMessages(messages) {
  const firstUser = messages.find(message => message.role === 'user' && String(message.content || '').trim())
  return String(firstUser?.content || '新聊天').replace(/\s+/g, ' ').slice(0, 36)
}

/**
 * 从 localStorage 加载会话列表
 */
function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem('llama.cpp.desktop.sessions') || '[]')
    state.sessions = Array.isArray(saved) ? saved : []
  } catch {
    state.sessions = []
  }
}

/**
 * 将会话列表持久化到 localStorage（最多保存 80 条）
 */
function persistSessions() {
  localStorage.setItem('llama.cpp.desktop.sessions', JSON.stringify(state.sessions.slice(0, 80)))
}

/**
 * 保存当前会话到会话列表
 */
function saveCurrentSession() {
  if (!state.currentSessionId || state.chatMessages.length === 0) return
  const now = Date.now()
  const next = {
    id: state.currentSessionId,
    title: titleFromMessages(state.chatMessages),
    messages: state.chatMessages,
    updatedAt: now,
  }
  const existing = state.sessions.findIndex(session => session.id === state.currentSessionId)
  if (existing >= 0) {
    state.sessions.splice(existing, 1, next)
  } else {
    state.sessions.unshift(next)
  }
  state.sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  persistSessions()
}

/**
 * 构建 API 请求格式的消息列表
 * @param {Array<{role: string, content: string, attachments?: Array, localOnly?: boolean}>} messages - 原始消息列表
 * @returns {Array<{role: string, content: string}>} 格式化后的消息列表
 */
function buildApiMessages(messages) {
  const systemMessages = []
  const conversation = []

  for (const message of Array.isArray(messages) ? messages : []) {
    if (!message || message.localOnly) continue
    if (!['user', 'assistant', 'system'].includes(message.role)) continue
    if (!String(message.content || '').trim() && !(Array.isArray(message.attachments) && message.attachments.length)) continue

    if (message.role === 'system') {
      const systemText = String(message.content || '').trim()
      if (/^(发送失败|重试失败|请求失败|启动失败)[：:]/.test(systemText)) continue
      systemMessages.push(systemText)
      continue
    }

    conversation.push(message)
  }

  return systemMessages.length
    ? [{ role: 'system', content: systemMessages.filter(Boolean).join('\n\n') }, ...conversation]
    : conversation
}

/**
 * 打开指定会话
 * @param {string} sessionId - 会话 ID
 */
function openSession(sessionId) {
  saveCurrentSession()
  const session = state.sessions.find(item => item.id === sessionId)
  if (!session) return
  state.currentSessionId = session.id
  state.chatMessages = Array.isArray(session.messages) ? session.messages : []
  state.chatInput = ''
  state.attachments = []
  state.view = 'chat'
  state.sidebarPanel = 'chats'
  state.attachmentMenuOpen = false
  state.historyMenuId = ''
  state.stickToBottom = true
}

/**
 * 创建新会话
 */
function startFreshSession() {
  saveCurrentSession()
  state.currentSessionId = makeSessionId()
  state.chatMessages = []
  state.chatInput = ''
  state.attachments = []
  state.attachmentMenuOpen = false
  state.view = 'chat'
  state.sidebarPanel = 'chats'
  state.historyMenuId = ''
  const exists = state.sessions.some(s => s.id === state.currentSessionId)
  if (!exists) {
    state.sessions.unshift({
      id: state.currentSessionId,
      title: '新聊天',
      messages: [],
      updatedAt: Date.now(),
    })
    persistSessions()
  }
}

/**
 * 获取附件类型的中文标签
 * @param {string} kind - 附件类型（image/audio/text/pdf/system/mcp/file）
 * @returns {string} 中文标签
 */
function attachmentLabel(kind) {
  return {
    image: '图片',
    audio: '音频',
    text: '文本',
    pdf: 'PDF',
    system: '系统',
    mcp: 'MCP',
    file: '文件',
  }[kind] || '文件'
}

/**
 * 渲染单个附件项
 * @param {Object} item - 附件对象
 * @param {number} index - 附件索引
 * @param {boolean} removable - 是否可移除
 * @param {string} mode - 渲染模式（composer/message-user/其他）
 * @returns {string} HTML 字符串
 */
function renderAttachmentItem(item, index, removable, mode = 'composer') {
  const kind = String(item?.kind || 'file')
  const name = String(item?.name || 'attachment')
  const meta = [formatBytes(item.size || 0), item.warning || item.error || ''].filter(Boolean).join(' · ')
  const title = [name, item.path || '', meta].filter(Boolean).join('\n')
  const removeButton = removable
    ? `<button type="button" class="attachment-remove" data-action="remove-attachment" data-index="${index}" title="移除附件">×</button>`
    : ''

  if (kind === 'image' && item?.dataUrl) {
    if (mode === 'message-user') {
      return `
        <button type="button" class="chat-image-attachment" data-action="preview-image" data-src="${escapeAttribute(item.dataUrl)}" data-title="${escapeAttribute(name)}" title="${escapeAttribute(title)}">
          <img src="${escapeAttribute(item.dataUrl)}" alt="${escapeAttribute(name)}" loading="lazy" />
        </button>
      `
    }

    return `
      <figure class="attachment-card image ${removable ? 'editable' : 'readonly'}" title="${escapeAttribute(title)}">
        <button type="button" class="attachment-image-trigger" data-action="preview-image" data-src="${escapeAttribute(item.dataUrl)}" data-title="${escapeAttribute(name)}" title="预览图片">
          <img src="${escapeAttribute(item.dataUrl)}" alt="${escapeAttribute(name)}" loading="lazy" />
        </button>
        <figcaption>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(meta)}</span>
        </figcaption>
        ${removeButton}
      </figure>
    `
  }

  return `
    <span class="attachment-chip ${escapeHtml(kind)} ${mode === 'message-user' ? 'message-file' : ''}" title="${escapeAttribute(title)}">
      <strong>${attachmentLabel(kind)}</strong>
      <span class="attachment-name">${escapeHtml(name)}</span>
      <span class="attachment-size">${escapeHtml(formatBytes(item.size || 0))}</span>
      ${removeButton}
    </span>
  `
}

/**
 * 渲染消息操作按钮（复制/编辑/重试/删除）
 * @param {number} index - 消息索引
 * @param {Object} message - 消息对象
 * @returns {string} HTML 字符串
 */
function renderMessageActions(index, message) {
  const canRetry = message.role === 'assistant'
  return `
    <div class="message-actions">
      <button type="button" data-action="copy-message" data-index="${index}" title="复制">⧉</button>
      <button type="button" data-action="edit-message" data-index="${index}" title="编辑">✎</button>
      ${canRetry ? `<button type="button" data-action="retry-message" data-index="${index}" title="重新生成">⟳</button>` : ''}
      <button type="button" data-action="delete-message" data-index="${index}" title="删除">✖</button>
    </div>
  `
}

/**
 * 渲染消息元信息（模型名称、Token数、耗时、速度）
 * @param {Object} message - 消息对象
 * @returns {string} HTML 字符串
 */
function renderMessageMeta(message) {
  if (message.role !== 'assistant') return ''
  const tokens = message.tokens || message.estimatedTokens || estimateTokens(message.content)
  const latencyMs = message.latencyMs || (message.streaming ? Date.now() - (message.startedAt || message.createdAt || Date.now()) : 0)
  const speed = message.speed || (tokens && latencyMs ? `${(Number(tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')
  const pieces = [
    `<span class="model-pill">☯ ${escapeHtml(message.model || modelName())}</span>`,
    `<span>⛶ ${escapeHtml(tokens || 0)} Tokens</span>`,
    latencyMs ? `<span>⏲ ${(latencyMs / 1000).toFixed(1)}s</span>` : '<span>⏱ 0.0s</span>',
    speed ? `<span>⏻ ${escapeHtml(speed)}</span>` : '',
    message.streaming ? '<span>生成中</span>' : '',
  ].filter(Boolean)

  return pieces.length ? `<div class="message-meta">${pieces.join('')}</div>` : ''
}

/**
 * 渲染消息内容（支持思考过程、代码高亮等）
 * @param {Object} message - 消息对象
 * @param {number} messageIndex - 消息索引
 * @returns {string} HTML 字符串
 */
function renderMessageContent(message, messageIndex) {
  const content = String(message.content || '')
  if (!content && message.role === 'assistant' && state.chatBusy) {
    return '<div class="typing-line">正在生成...</div>'
  }
  if (message.role !== 'assistant') {
    return content ? renderTextBlock(content) : ''
  }

  const counter = { value: 0 }
  const output = []
  const { answer, thoughts } = splitThinkingOutput(content)
  const showRawOutput = Boolean(state.config?.show_raw_output)
  const showThinking = state.config?.show_thinking !== false && !showRawOutput
  const expandThinking = Boolean(state.config?.expand_thinking)

  if (showThinking && thoughts.length > 0) {
    output.push(`
      <details class="think-block" ${expandThinking ? 'open' : ''}>
        <summary>思考过程</summary>
        ${renderCodeAwareText(thoughts.join('\n\n'), messageIndex, counter)}
      </details>
    `)
  } else if (!showRawOutput && thoughts.length > 0 && state.config?.show_thinking === false) {
    output.push('<div class="markdown-text muted-note">思考过程已隐藏。</div>')
  }

  if (answer) {
    output.push(renderCodeAwareText(answer, messageIndex, counter))
  }

  if (showRawOutput && content) {
    output.push(`
      <details class="raw-output-block" ${message.streaming ? 'open' : ''}>
        <summary>原始输出</summary>
        <pre>${escapeHtml(content)}</pre>
      </details>
    `)
  }

  return output.join('') || renderTextBlock(content)
}

/**
 * 渲染支持代码高亮的文本（分割代码块并高亮）
 * @param {string} text - 文本内容
 * @param {number} messageIndex - 消息索引
 * @param {{value: number}} counter - 代码块计数器
 * @returns {string} HTML 字符串
 */
function renderCodeAwareText(text, messageIndex, counter) {
  return splitCodeParts(String(text || ''))
    .map(part => {
      if (part.type === 'text') return renderTextBlock(part.value)
      const codeIndex = counter.value
      counter.value += 1
      const language = part.language || 'text'
      const previewable = canPreviewCode(language, part.value)
      const codeValue = String(part.value || '').replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
      return `
        <figure class="code-block" data-code-index="${codeIndex}">
          <figcaption>
            <span>${escapeHtml(language.toUpperCase())}</span>
            <div class="actions">
              <button type="button" data-action="copy-code" data-message-index="${messageIndex}" data-code-index="${codeIndex}" title="复制代码">复制</button>
              ${previewable ? `<button type="button" class="eye-btn" data-action="preview-code" data-message-index="${messageIndex}" data-code-index="${codeIndex}" title="预览">&#128065;</button>` : ''}
            </div>
          </figcaption>
          <pre><code>${highlightCode(codeValue, language)}</code></pre>
        </figure>
      `
    })
    .join('')
}

/**
 * 获取指定消息中的指定代码块
 * @param {number} messageIndex - 消息索引
 * @param {number} codeIndex - 代码块索引
 * @returns {{type: 'code', language: string, value: string} | null} 代码块对象或 null
 */
function getCodeBlock(messageIndex, codeIndex) {
  const message = state.chatMessages[Number(messageIndex)]
  if (!message) return null
  const blocks = splitCodeParts(String(message.content || '')).filter(part => part.type === 'code')
  return blocks[Number(codeIndex)] || null
}

/**
 * 滚动打开的原始输出块到底部
 * @param {Document|HTMLElement} root - 根元素
 */
function scrollOpenRawOutputs(root = document) {
  const sync = () => {
    root.querySelectorAll?.('.raw-output-block[open] pre').forEach(pre => {
      pre.scrollTop = pre.scrollHeight
    })
  }
  sync()
  window.requestAnimationFrame(sync)
}

/**
 * 将消息滚动到底部（用于流式输出）
 * @param {HTMLElement} article - 消息元素
 * @param {HTMLElement} feed - 聊天容器
 */
function stickStreamingMessage(article, feed) {
  const sync = () => {
    scrollOpenRawOutputs(article)
    if (feed) feed.scrollTop = feed.scrollHeight
  }
  sync()
  window.requestAnimationFrame(sync)
}

/**
 * 更新消息的实时统计信息（Token数、耗时、速度）
 * @param {Object} message - 消息对象
 */
function updateLiveStats(message) {
  if (!message || message.role !== 'assistant') return
  const startedAt = message.startedAt || message.createdAt || Date.now()
  const latencyMs = Math.max(1, Date.now() - startedAt)
  const tokens = message.tokens || estimateTokens(message.content)
  message.latencyMs = latencyMs
  message.estimatedTokens = estimateTokens(message.content)
  message.speed = tokens ? `${(Number(tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : ''
}

/**
 * 更新消息 DOM（用于流式输出更新）
 * @param {number} index - 消息索引
 */
function updateMessageDom(index) {
  const feed = document.getElementById('chatFeed')
  const message = state.chatMessages[index]
  const article = document.querySelector(`[data-message-index="${index}"]`)
  const bubble = article?.querySelector('.bubble')
  const meta = article?.querySelector('.message-meta')
  if (!message || !bubble) return
  updateLiveStats(message)
  bubble.innerHTML = renderMessageContent(message, index)
  if (meta) meta.outerHTML = renderMessageMeta(message)
  if (message.streaming && state.stickToBottom && !state.isDraggingScrollbar) {
    stickStreamingMessage(article, feed)
  } else if (state.stickToBottom && !state.isDraggingScrollbar && feed) {
    feed.scrollTop = feed.scrollHeight
  }
}

/**
 * 渲染日志行
 * @param {{at: string, source: string, line: string}} entry - 日志条目
 * @param {string} className - CSS 类名
 * @returns {string} HTML 字符串
 */
function renderLogRow(entry, className = 'terminal-row') {
  return `
    <div class="${className}">
      <span>${escapeHtml(shortTime(entry.at))}</span>
      <strong>${escapeHtml(entry.source || 'log')}</strong>
      <em>${escapeHtml(entry.line || '')}</em>
    </div>
  `
}

/**
 * 压缩日志行用于显示（过滤重复日志、超长日志等）
 * @param {string} line - 原始日志行
 * @returns {string} 压缩后的日志行（空字符串表示过滤掉）
 */
function compactLogLineForDisplay(line) {
  const text = String(line || '').trim()
  const lower = text.toLowerCase()
  const routinePatterns = [
    'que start_loop: waiting for new tasks',
    'que start_loop: processing new tasks',
    'srv update_slots: all slots are idle',
    'srv update_slots: run slots completed',
    'srv update_slots: update slots',
  ]

  if (routinePatterns.some(pattern => lower.includes(pattern))) return ''
  if (lower.includes('http: streamed chunk: data:') && !lower.includes('[done]')) return ''
  if (lower.includes('http: streamed chunk: data: [done]')) return 'stream chunk: [DONE]'
  if (text.includes('"prompt":') || text.includes('<|im_start|>') || text.includes('<!DOCTYPE html')) {
    return `[已省略超长日志负载：${text.length} 字符]`
  }
  if (text.length > 420) return `${text.slice(0, 260)} ... [已截断 ${text.length - 260} 字符]`
  return text
}

/**
 * 获取可见的日志列表（过滤重复日志）
 * @param {number} limit - 最大条数（默认 420）
 * @returns {Array<{at: string, source: string, line: string}>} 日志数组
 */
function visibleLogs(limit = 420) {
  return (state.logs || [])
    .map(entry => ({ ...entry, line: compactLogLineForDisplay(entry.line) }))
    .filter(entry => entry.line)
    .slice(-limit)
}

/**
 * 为终端显示处理日志行（过滤聊天相关日志）
 * @param {{at: string, source: string, line: string}} entry - 日志条目
 * @returns {string} 处理后的日志行（空字符串表示过滤掉）
 */
function terminalLineForDisplay(entry) {
  const line = compactLogLineForDisplay(entry?.line)
  if (!line) return ''

  const source = String(entry?.source || '').toLowerCase()
  const lower = line.toLowerCase()
  const runtimePrefix = /^(llama_|load_|clip_|common_|sched_|ggml|cuda|cublas|main:|server|srv\b|srv_|slot|system_info|webui|error|warn|warning|fatal)/i

  if (source === 'chat') return ''
  if (lower.includes('parsed message:')) return ''
  if (lower.includes('"role":"assistant"') || lower.includes('"role":"user"')) return ''
  if (line.includes('<|im_start|>') || line.includes('<!DOCTYPE html')) return ''
  if (runtimePrefix.test(line)) return line
  if (lower.includes('server is listening') || lower.includes('listening on') || lower.includes('model loaded')) return line
  if (source === 'desktop' && !lower.includes('prompt')) return line

  return ''
}

/**
 * 获取终端可见的日志列表
 * @param {number} limit - 最大条数（默认 520）
 * @returns {Array<string>} 日志行数组
 */
function visibleTerminalLogs(limit = 520) {
  return (state.logs || [])
    .map(entry => terminalLineForDisplay(entry))
    .filter(Boolean)
    .slice(-limit)
}

export {
  modelName,
  statusLabel,
  statusClass,
  compactStatusMessage,
  friendlyErrorMessage,
  shortTime,
  makeSessionId,
  titleFromMessages,
  loadSessions,
  persistSessions,
  saveCurrentSession,
  buildApiMessages,
  openSession,
  startFreshSession,
  attachmentLabel,
  renderAttachmentItem,
  renderMessageActions,
  renderMessageMeta,
  renderMessageContent,
  renderCodeAwareText,
  getCodeBlock,
  scrollOpenRawOutputs,
  stickStreamingMessage,
  updateLiveStats,
  updateMessageDom,
  compactLogLineForDisplay,
  renderLogRow,
  visibleLogs,
  terminalLineForDisplay,
  visibleTerminalLogs,
}