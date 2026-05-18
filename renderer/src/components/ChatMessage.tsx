import type { ReactNode } from 'react'
import type { ChatMessage as ChatMessageType } from '../types'
import { escapeHtml, splitCodeParts, splitThinkingOutput, canPreviewCode, estimateTokens } from '../utils'

export function renderMessageContent(
  message: ChatMessageType,
  chatBusy: boolean,
  messageIndex: number,
  onCopy: (index: number) => void,
): ReactNode {
  const content = String(message.content || '')

  if (!content && message.role === 'assistant' && chatBusy) {
    return <div className="typing-line">正在生成...</div>
  }

  if (message.role !== 'assistant') {
    return content ? <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span> : null
  }

  if (message.streaming) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
  }

  const counter = { value: 0 }
  const { answer, thoughts } = splitThinkingOutput(content)
  const output: ReactNode[] = []

  if (thoughts.length > 0) {
    output.push(
      <details key="thoughts" className="think-block">
        <summary>思考过程</summary>
        {renderCodeAwareParts(thoughts.join('\n\n'), counter, messageIndex, onCopy)}
      </details>,
    )
  }

  if (answer) {
    output.push(<div key="answer">{renderCodeAwareParts(answer, counter, messageIndex, onCopy)}</div>)
  }

  return output.length > 0 ? <>{output}</> : <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
}

function renderCodeAwareParts(
  text: string,
  counter: { value: number },
  messageIndex: number,
  onCopy: (index: number) => void,
): ReactNode[] {
  return splitCodeParts(String(text || '')).map((part, idx) => {
    if (part.type === 'text') {
      return <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>{part.value}</span>
    }

    const codeIndex = counter.value
    counter.value += 1
    const language = part.language || 'text'
    const previewable = canPreviewCode(language, part.value)
    const codeValue = String(part.value || '').replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/, '')

    return (
      <figure key={idx} className="code-block" data-code-index={codeIndex}>
        <figcaption>
          <span>{escapeHtml(language.toUpperCase())}</span>
          <div className="actions">
            <button type="button" onClick={() => onCopy(messageIndex)}>复制</button>
            {previewable && (
              <button type="button" className="eye-btn">&#128065;</button>
            )}
          </div>
        </figcaption>
        <pre><code>{codeValue}</code></pre>
      </figure>
    )
  })
}

export function renderMessageMeta(message: ChatMessageType): ReactNode {
  if (message.role !== 'assistant') return null

  const tokens = message.tokens || message.estimatedTokens || estimateTokens(message.content)
  const latencyMs = message.latencyMs || (message.startedAt ? Date.now() - message.startedAt : 0)
  const speed = message.speed || (tokens && latencyMs ? `${(Number(tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')

  return (
    <div className="message-meta">
      <span className="model-pill">{`☯ ${escapeHtml(message.model || 'local-model')}`}</span>
      <span>{`⛶ ${String(tokens || 0)} Tokens`}</span>
      <span>{`⏲ ${(latencyMs / 1000).toFixed(1)}s`}</span>
      {speed && <span>{`⏻ ${escapeHtml(speed)}`}</span>}
      {message.streaming && <span>生成中</span>}
    </div>
  )
}

export function renderMessageAvatar(role: string): ReactNode {
  const label = role === 'user' ? '你' : role === 'assistant' ? 'AI' : 'sys'
  return (
    <div className="avatar">
      {label}
    </div>
  )
}

export function renderMessageActions(
  message: ChatMessageType,
  index: number,
  onCopy: (index: number) => void,
  onEdit: (index: number) => void,
  onRetry: (index: number) => void,
  onDelete: (index: number) => void,
): ReactNode {
  const canRetry = message.role === 'assistant'

  return (
    <div className="message-actions">
      <button type="button" onClick={() => onCopy(index)} title="复制">⧉</button>
      <button type="button" onClick={() => onEdit(index)} title="编辑">✎</button>
      {canRetry && (
        <button type="button" onClick={() => onRetry(index)} title="重新生成">⟳</button>
      )}
      <button type="button" onClick={() => onDelete(index)} title="删除">✖</button>
    </div>
  )
}