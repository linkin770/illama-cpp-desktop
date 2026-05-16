// 工具函数库 - 提供通用的辅助函数
import type { ChatMessage, LogEntry } from '../types'

// 转义 HTML 特殊字符，防止 XSS
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 转义 HTML 属性值
export function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// 检查元素是否滚动到底部附近
export function isNearBottom(element: HTMLElement | null, threshold = 50): boolean {
  if (!element) return false
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold
}

// 获取文件路径的文件名部分（不含路径）
export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

// 格式化字节大小为人类可读的格式（B, KB, MB, GB）
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// 从模型文件名中推断模型家族
export function modelFamilyFromName(name: string): string {
  const families: Record<string, string> = {
    'llama': 'Llama',
    'qwen': 'Qwen',
    'mistral': 'Mistral',
    'phi': 'Phi',
    'gemma': 'Gemma',
    'falcon': 'Falcon',
    'mixtral': 'Mixtral',
    'yi': 'Yi',
    'deepseek': 'DeepSeek',
    'codegemma': 'CodeGemma',
    'codeqwen': 'CodeQwen',
    'codellama': 'CodeLlama',
  }
  const lower = name.toLowerCase()
  for (const [key, value] of Object.entries(families)) {
    if (lower.includes(key)) return value
  }
  return 'Unknown'
}

// 从模型文件名中推断量化级别
export function quantLabelFromName(name: string): string {
  const patterns: Record<string, string> = {
    'Q4_K_M': 'Q4_K_M',
    'Q4_K_S': 'Q4_K_S',
    'Q5_K_M': 'Q5_K_M',
    'Q5_K_S': 'Q5_K_S',
    'Q8_0': 'Q8_0',
    'F16': 'F16',
    'F32': 'F32',
    'Q2_K': 'Q2_K',
    'Q3_K_M': 'Q3_K_M',
    'Q3_K_S': 'Q3_K_S',
    'Q6_K': 'Q6_K',
    'IQ2_XS': 'IQ2_XS',
    'IQ2_S': 'IQ2_S',
    'IQ3_XS': 'IQ3_XS',
    'IQ3_S': 'IQ3_S',
    'IQ4_XS': 'IQ4_XS',
  }
  for (const [pattern, label] of Object.entries(patterns)) {
    if (name.includes(pattern)) return label
  }
  return ''
}

// 从模型文件名中推断参数量级
export function paramScaleFromName(name: string): string {
  const patterns: Record<string, string> = {
    '7B': '7B',
    '13B': '13B',
    '34B': '34B',
    '65B': '65B',
    '8B': '8B',
    '9B': '9B',
    '1B': '1B',
    '3B': '3B',
    '4B': '4B',
    '10B': '10B',
    '70B': '70B',
  }
  for (const [pattern, label] of Object.entries(patterns)) {
    if (name.includes(pattern)) return label
  }
  return ''
}

// 预估文本的 token 数（粗略估计：每 4 字符约 1 token）
export function estimateTokens(text: string): number {
  return Math.floor(String(text).length / 4)
}

// 分割思考过程和回答内容（【思考】格式）
export function splitThinkingOutput(content: string): { answer: string; thoughts: string[] } {
  const thoughtPattern = /【([^】]+)】/g
  const thoughts: string[] = []
  let match
  let remaining = content
  
  while ((match = thoughtPattern.exec(content)) !== null) {
    thoughts.push(match[1])
    remaining = remaining.replace(match[0], '')
  }
  
  return { answer: remaining.trim(), thoughts }
}

// 分割文本中的代码块和普通文本
export function splitCodeParts(text: string): Array<{ type: 'text' | 'code'; value: string; language?: string }> {
  const result: Array<{ type: 'text' | 'code'; value: string; language?: string }> = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  
  let lastIndex = 0
  let match
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    result.push({
      type: 'code',
      language: match[1] || undefined,
      value: match[2],
    })
    lastIndex = codeBlockRegex.lastIndex
  }
  
  if (lastIndex < text.length) {
    result.push({ type: 'text', value: text.slice(lastIndex) })
  }
  
  return result
}

// 渲染文本块为 HTML（转义 + 换行转 <br>）
export function renderTextBlock(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

// 判断代码是否可以预览
export function canPreviewCode(language: string, code: string): boolean {
  const previewableLangs = ['html', 'css', 'javascript', 'js', 'json', 'svg', 'xml']
  return previewableLangs.includes(language.toLowerCase()) && code.length < 10000
}

// 代码高亮（当前仅转义 HTML）
export function highlightCode(code: string, language: string): string {
  return escapeHtml(code)
}

// 格式化时间为简短格式（月-日 时:分）
export function shortTime(value: string | Date): string {
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

// 将错误信息转换为友好的中文提示
export function friendlyErrorMessage(error: Error | string): string {
  const text = typeof error === 'string' ? error : String(error?.message || error || '')
  if (text.includes('System message must be at the beginning')) {
    return '发送失败：系统消息必须位于请求最前面。新版会自动整理历史消息，请再发送一次。'
  }
  if (/timeout|aborted/i.test(text)) {
    return '发送失败：请求超时。可以在设置里调大"请求超时 ms"，或降低 ctx_size / n_predict 后重试。'
  }
  if (text.includes('Chat Template Kwargs must be valid JSON')) {
    return `发送失败：Chat Template Kwargs 不是合法 JSON。${text}`
  }
  if (text.includes('exceed_context_size_error')) {
    return `发送失败：内容超过模型上下文限制。可在设置中增大"上下文大小 ctx_size"，或减少附件大小。${text}`
  }
  return text.length > 360 ? `发送失败：${text.slice(0, 360)}...` : `发送失败：${text}`
}

// 从模型路径中提取模型文件名
export function modelName(modelPath?: string): string {
  const model = modelPath || ''
  return model.split(/[\\/]/).pop() || 'local-model'
}

// 获取服务状态的中文标签
export function statusLabel(state: string): string {
  const labels: Record<string, string> = {
    stopped: '未启动',
    starting: '启动中',
    running: '运行中',
    stopping: '停止中',
    error: '需要处理',
  }
  return labels[state] || state
}

// 获取服务状态对应的 CSS 类名
export function statusClass(state: string): string {
  if (state === 'running') return 'running'
  if (state === 'error') return 'error'
  if (state === 'starting' || state === 'stopping') return 'pending'
  return ''
}

// 压缩状态消息为简短版本
export function compactStatusMessage(message: string): string {
  const text = String(message || '')
  if (text.includes('System message must be at the beginning')) {
    return '系统消息位置错误：已在新版中自动合并到请求最前面。'
  }
  if (/timeout|aborted/i.test(text)) {
    return '请求超时：可在设置里调大"请求超时 ms"，或降低上下文/输出长度。'
  }
  if (text.length > 180) {
    return `${text.slice(0, 180)}...`
  }
  return text
}

// 构建 API 请求用的消息列表（整理系统消息位置）
export function buildApiMessages(messages: ChatMessage[]): ChatMessage[] {
  const systemMessages: string[] = []
  const conversation: ChatMessage[] = []

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
    ? [{ role: 'system', content: systemMessages.filter(Boolean).join('\n\n'), createdAt: Date.now() }, ...conversation]
    : conversation
}

// 过滤日志列表，只显示有意义的日志
export function visibleLogs(logs: LogEntry[], limit = 420): LogEntry[] {
  return logs
    .map(entry => ({ ...entry, line: compactLogLineForDisplay(entry.line) }))
    .filter(entry => entry.line)
    .slice(-limit)
}

// 压缩单条日志行（过滤无关信息）
export function compactLogLineForDisplay(line: string): string {
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

// 过滤终端显示的日志
export function visibleTerminalLogs(logs: LogEntry[], limit = 520): string[] {
  return logs
    .map(entry => terminalLineForDisplay(entry))
    .filter(Boolean)
    .slice(-limit)
}

// 过滤单条终端日志行
export function terminalLineForDisplay(entry: LogEntry): string {
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