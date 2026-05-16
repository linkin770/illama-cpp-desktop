// 聊天消息组件 - 展示用户、助手和系统消息
import { useRef, useEffect, memo, type ReactElement } from 'react'
import type { ChatMessage as ChatMessageType } from '../types'
import { escapeHtml, highlightCode, splitCodeParts, renderTextBlock, splitThinkingOutput, canPreviewCode, estimateTokens } from '../utils'

interface ChatMessageProps {
  message: ChatMessageType
  index: number
  chatBusy: boolean
  onCopy: (index: number) => void
  onEdit: (index: number) => void
  onRetry: (index: number) => void
  onDelete: (index: number) => void
}

export const ChatMessage = memo(function ChatMessage({ message, index, chatBusy, onCopy, onEdit, onRetry, onDelete }: ChatMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // 流式生成时自动滚动到最新内容
  useEffect(() => {
    if (message.streaming && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [message.streaming])

  // 渲染消息内容
  const renderContent = () => {
    const content = String(message.content || '')
    // 正在生成时显示加载状态
    if (!content && message.role === 'assistant' && chatBusy) {
      return <div className="bubble"><div className="typing-line">正在生成...</div></div>
    }
    // 用户或系统消息
    if (message.role !== 'assistant') {
      return content ? <div className="bubble" dangerouslySetInnerHTML={{ __html: renderTextBlock(content) }} /> : null
    }

    // 正在流式生成
    if (message.streaming) {
      return <div className="bubble" dangerouslySetInnerHTML={{ __html: renderTextBlock(content) }} />
    }

    // 完整助手消息 - 处理思考过程和代码块
    const counter = { value: 0 }
    const { answer, thoughts } = splitThinkingOutput(content)
    const showThinking = true
    const expandThinking = false

    const output: ReactElement[] = []

    // 显示思考过程
    if (showThinking && thoughts.length > 0) {
      output.push(
        <details key="thoughts" className="think-block" open={expandThinking}>
          <summary>思考过程</summary>
          {renderCodeAwareText(thoughts.join('\n\n'), counter)}
        </details>
      )
    }

    // 显示回答
    if (answer) {
      output.push(<div key="answer">{renderCodeAwareText(answer, counter)}</div>)
    }

    const innerContent = output.length > 0 ? output : <div dangerouslySetInnerHTML={{ __html: renderTextBlock(content) }} />
    return <div className="bubble">{innerContent}</div>
  }

  // 渲染支持代码块的文本
  const renderCodeAwareText = (text: string, counter: { value: number }) => {
    return splitCodeParts(String(text || '')).map((part, idx) => {
      // 普通文本
      if (part.type === 'text') {
        return <span key={idx} dangerouslySetInnerHTML={{ __html: renderTextBlock(part.value) }} />
      }
      // 代码块
      const codeIndex = counter.value
      counter.value += 1
      const language = part.language || 'text'
      const previewable = canPreviewCode(language, part.value)
      const codeValue = String(part.value || '').replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/, '')
      
      const codeContent = highlightCode(codeValue, language)
      
      return (
        <figure key={idx} className="code-block" data-code-index={codeIndex}>
          <figcaption>
            <span>{escapeHtml(language.toUpperCase())}</span>
            <div className="actions">
              <button type="button" onClick={() => onCopy(index)} title="复制代码">复制</button>
              {previewable && (
                <button type="button" className="eye-btn" title="预览">&#128065;</button>
              )}
            </div>
          </figcaption>
          <pre><code dangerouslySetInnerHTML={{ __html: codeContent }}></code></pre>
        </figure>
      )
    })
  }

  // 渲染消息元信息（模型、token数、延迟等）
  const renderMeta = () => {
    if (message.role !== 'assistant') return null
    const tokens = message.tokens || message.estimatedTokens || estimateTokens(message.content)
    const latencyMs = message.latencyMs || (message.streaming ? Date.now() - (message.startedAt || message.createdAt || Date.now()) : 0)
    const speed = message.speed || (tokens && latencyMs ? `${(Number(tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')

    return (
      <div className="message-meta">
        <span className="model-pill">☯ {escapeHtml(message.model || 'local-model')}</span>
        <span>⛶ {escapeHtml(String(tokens || 0))} Tokens</span>
        <span>⏲ {(latencyMs / 1000).toFixed(1)}s</span>
        {speed && <span>⏻ {escapeHtml(speed)}</span>}
        {message.streaming && <span>生成中</span>}
      </div>
    )
  }

  // 只有助手消息可以重试
  const canRetry = message.role === 'assistant'

  return (
    <article ref={contentRef} className={`message ${message.role}`} data-message-index={index}>
      <div className="avatar">
        {message.role === 'user' ? '你' : message.role === 'assistant' ? 'AI' : 'sys'}
      </div>
      <div className="message-body">
        {renderContent()}
        {renderMeta()}
        <div className="message-actions">
          <button type="button" onClick={() => onCopy(index)} title="复制">⧉</button>
          <button type="button" onClick={() => onEdit(index)} title="编辑">✎</button>
          {canRetry && (
            <button type="button" onClick={() => onRetry(index)} title="重新生成">⟳</button>
          )}
          <button type="button" onClick={() => onDelete(index)} title="删除">✖</button>
        </div>
      </div>
    </article>
  )
})
