import type { ChatMessage, LogEntry } from '../types'

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function isNearBottom(element: HTMLElement | null, threshold = 50): boolean {
  if (!element) return false
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

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

export function estimateTokens(text: string): number {
  return Math.floor(String(text).length / 4)
}

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

export function renderTextBlock(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

export function canPreviewCode(language: string, code: string): boolean {
  const previewableLangs = ['html', 'css', 'javascript', 'js', 'json', 'svg', 'xml']
  return previewableLangs.includes(language.toLowerCase()) && code.length < 10000
}

export function highlightCode(code: string, language: string): string {
  return escapeHtml(code)
}

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

export function friendlyErrorMessage(error: Error | string): string {
  const text = typeof error === 'string' ? error : String(error?.message || error || '')
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

export function modelName(modelPath?: string): string {
  const model = modelPath || ''
  return model.split(/[\\/]/).pop() || 'local-model'
}

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

export function statusClass(state: string): string {
  if (state === 'running') return 'running'
  if (state === 'error') return 'error'
  if (state === 'starting' || state === 'stopping') return 'pending'
  return ''
}

export function compactStatusMessage(message: string): string {
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

export function visibleLogs(logs: LogEntry[], limit = 420): LogEntry[] {
  return logs
    .map(entry => ({ ...entry, line: compactLogLineForDisplay(entry.line) }))
    .filter(entry => entry.line)
    .slice(-limit)
}

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

export function visibleTerminalLogs(logs: LogEntry[], limit = 520): string[] {
  interface LogEntry {
    at: string
    source: string
    line: string
  }

  return logs
    .map(entry => terminalLineForDisplay(entry))
    .filter(Boolean)
    .slice(-limit)
}

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