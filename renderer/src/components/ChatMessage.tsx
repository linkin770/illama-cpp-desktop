import type { ReactNode } from 'react'
import { useState } from 'react'
import { CopyOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CodeOutlined, TagOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { XMarkdown } from '@ant-design/x-markdown'
import { CodeHighlighter } from '@ant-design/x'
import { Tooltip } from 'antd'
import type { ChatMessage as ChatMessageType } from '../types'
import { escapeHtml } from '../utils'

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

  // 流式输出时使用普通 span 显示，避免频繁的 Markdown 解析
  if (message.streaming) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
  }

  // 消息完成后使用 XMarkdown 渲染
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

function ContextUsageRing({ usagePercent, ctxSize, totalSessionTokens }: { usagePercent: number, ctxSize: number, totalSessionTokens: number }): ReactNode {
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (usagePercent / 100) * circumference

  // 根据使用率选择颜色
  let strokeColor = '#10a37f' // 默认绿色
  if (usagePercent >= 75) {
    strokeColor = '#ff4d4f' // 75%+ 红色
  } else if (usagePercent >= 50) {
    strokeColor = '#faad14' // 50-75% 黄色
  }

  return (
    <Tooltip
      title={
        <div>
          <div>当前对话已使用：{totalSessionTokens} tokens</div>
          <div>上下文窗口大小：{ctxSize} tokens</div>
          <div>使用率：{usagePercent.toFixed(0)}%</div>
        </div>
      }
    >
      <div className="context-usage-ring">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="context-usage-text" style={{ color: strokeColor }}>
          {usagePercent.toFixed(0)}%
        </span>
      </div>
    </Tooltip>
  )
}

export function renderMessageMeta(
  message: ChatMessageType,
  ctxSize: number = 32768,
  totalSessionTokens: number = 0
): ReactNode {
  if (message.role !== 'assistant') return null

  const tokens = message.tokens || message.estimatedTokens || 0
  // 只有在流式生成中才实时计算时间，已完成的消息使用保存的 latencyMs
  const latencyMs = message.streaming && message.startedAt 
    ? Date.now() - message.startedAt 
    : (message.latencyMs || 0)
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
      {/* 流式生成时不渲染 ContextUsageRing，避免每120ms重绘SVG */}
      {!message.streaming && ctxSize > 0 && (
        <ContextUsageRing usagePercent={Math.min(100, Math.max(0, (totalSessionTokens / ctxSize) * 100))} ctxSize={ctxSize} totalSessionTokens={totalSessionTokens} />
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
