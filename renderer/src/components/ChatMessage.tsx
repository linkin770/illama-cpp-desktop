import type { ReactNode } from 'react'
import { useState } from 'react'
import { CopyOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CodeOutlined, TagOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { XMarkdown } from '@ant-design/x-markdown'
import { CodeHighlighter } from '@ant-design/x'
import type { ChatMessage as ChatMessageType } from '../types'
import { escapeHtml, estimateTokens } from '../utils'

export function renderMessageContent(
  message: ChatMessageType,
  chatBusy: boolean,
): ReactNode {
  const content = String(message.content || '')

  if (!content && message.role === 'assistant' && chatBusy) {
    return <div className="typing-line">正在生成...</div>
  }

  if (message.role !== 'assistant') {
    return content ? <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span> : null
  }

  return (
    <XMarkdown
      className="x-markdown-light"
      components={{
        code: ({ lang, block, children, className, ...props }) => {
          if (block) {
            return (
              <CodeHighlighter lang={lang}>
                {typeof children === 'string' ? children : ''}
              </CodeHighlighter>
            )
          }
          
          return (
            <code className={className} {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {content}
    </XMarkdown>
  )
}

export function renderMessageMeta(message: ChatMessageType): ReactNode {
  if (message.role !== 'assistant') return null

  const tokens = message.tokens || message.estimatedTokens || estimateTokens(message.content)
  const latencyMs = message.latencyMs || (message.startedAt ? Date.now() - message.startedAt : 0)
  const speed = message.speed || (tokens && latencyMs ? `${(Number(tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')

  return (
    <div className="message-meta">
      <span className="model-pill">
        <CodeOutlined style={{ fontSize: 12, marginRight: 4 }} />
        {escapeHtml(message.model || 'local-model')}
      </span>
      <span>
        <TagOutlined style={{ fontSize: 12, marginRight: 4 }} />
        {String(tokens || 0)} Tokens
      </span>
      <span>
        <ClockCircleOutlined style={{ fontSize: 12, marginRight: 4 }} />
        {(latencyMs / 1000).toFixed(1)}s
      </span>
      {speed && (
        <span>
          <PlayCircleOutlined style={{ fontSize: 12, marginRight: 4 }} />
          {escapeHtml(speed)}
        </span>
      )}
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
  onPrevVariant: (index: number) => void,
  onNextVariant: (index: number) => void,
): ReactNode {
  const canRetry = message.role === 'assistant'
  const hasVariants = message.role === 'assistant' && message.variants && message.variants.length >= 1
  const currentVariantIndex = message.currentVariantIndex ?? message.variants?.length ?? 0
  const totalVariants = message.variants ? message.variants.length + 1 : 1

  return (
    <div className="message-actions">
      {hasVariants && (
        <div className="variant-switcher">
          <button
            type="button"
            onClick={() => onPrevVariant(index)}
            disabled={currentVariantIndex === 0}
            title="上一个回复"
            className="variant-btn prev"
          >
            ◀
          </button>
          <span className="variant-counter">
            {currentVariantIndex + 1} / {totalVariants}
          </span>
          <button
            type="button"
            onClick={() => onNextVariant(index)}
            disabled={currentVariantIndex >= totalVariants - 1}
            title="下一个回复"
            className="variant-btn next"
          >
            ▶
          </button>
        </div>
      )}
      <button type="button" onClick={() => onCopy(index)} title="复制">
        <CopyOutlined />
      </button>
      {message.role === 'user' && (
        <button type="button" onClick={() => onEdit(index)} title="编辑">
          <EditOutlined />
        </button>
      )}
      {canRetry && (
        <button type="button" onClick={() => onRetry(index)} title="重新生成">
          <ReloadOutlined />
        </button>
      )}
      <button type="button" onClick={() => onDelete(index)} title="删除" className="delete-btn">
        <DeleteOutlined />
      </button>
    </div>
  )
}
