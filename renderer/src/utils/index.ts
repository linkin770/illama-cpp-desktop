// 工具函数库 - 提供通用的辅助函数
import type { LogEntry } from '../types'

// 转义 HTML 特殊字符，防止 XSS
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 格式化字节大小为人类可读的格式（B, KB, MB, GB）
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// 预估文本的 token 数（中文约 1.5 字符/token，英文约 4 字符/token）
export function estimateTokens(text: string): number {
  const s = String(text)
  let cjk = 0
  let other = 0
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0x20000 && code <= 0x2A6DF) || (code >= 0xF900 && code <= 0xFAFF)) {
      cjk++
    } else {
      other++
    }
  }
  return Math.max(1, Math.floor(cjk / 1.5 + other / 4))
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