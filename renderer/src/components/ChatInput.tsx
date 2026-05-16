// 聊天输入组件 - 处理用户输入、附件选择和发送
import React, { useState, useRef, useEffect } from 'react'
import type { Attachment } from '../types'
import { escapeHtml, modelName } from '../utils'

interface ChatInputProps {
  chatInput: string
  attachments: Attachment[]
  chatBusy: boolean
  config: Record<string, unknown> | null
  onInputChange: (value: string) => void
  onSend: () => void
  onAbort: () => void
  onPickAttachment: (kind: string) => void
  onRemoveAttachment: (index: number) => void
  onOpenModelInfo: () => void
}

export function ChatInput({
  chatInput,
  attachments,
  chatBusy,
  config,
  onInputChange,
  onSend,
  onAbort,
  onPickAttachment,
  onRemoveAttachment,
  onOpenModelInfo,
}: ChatInputProps) {
  // 附件菜单状态
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [attachmentMenuPosition, setAttachmentMenuPosition] = useState<{ left: number; top: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 点击外部关闭附件菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.attach-wrap') && !target.closest('.attach-menu')) {
        setAttachmentMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 处理附件按钮点击 - 定位菜单
  const handleAttachButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 206
    const menuHeight = 252
    const gap = 8
    const minPad = 12
    // 计算菜单位置，确保在视口内
    const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
    const below = rect.bottom + gap
    const above = rect.top - menuHeight - gap
    const top = below + menuHeight < window.innerHeight - minPad
      ? below
      : Math.max(minPad, above)
    
    setAttachmentMenuPosition({ left: Math.round(left), top: Math.round(top) })
    setAttachmentMenuOpen(true)
  }

  // 处理键盘事件 - Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // 获取附件类型标签
  const attachmentLabel = (kind: string) => {
    const labels: Record<string, string> = {
      image: '图片',
      audio: '音频',
      text: '文本',
      pdf: 'PDF',
      system: '系统',
      mcp: 'MCP',
      file: '文件',
    }
    return labels[kind] || '文件'
  }

  return (
    <>
      <div className="composer-wrap">
        {/* 附件预览区 */}
        {attachments.length > 0 && (
          <div className="attachment-row">
            {attachments.map((attachment, index) => (
              <span key={index} className="attachment-chip" title={attachment.name}>
                <strong>{attachmentLabel(attachment.kind)}</strong>
                <span className="attachment-name">{escapeHtml(attachment.name)}</span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => onRemoveAttachment(index)}
                  title="移除附件"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {/* 输入框主区域 */}
        <div className="composer">
          <div className="attach-wrap">
            <button
              className="round-btn"
              type="button"
              onClick={handleAttachButtonClick}
              title="添加内容"
            >
              +
            </button>
          </div>
          <textarea
            ref={textareaRef}
            data-chat-input
            spellCheck={false}
            placeholder="输入一条消息……"
            value={chatInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {/* 模型信息按钮 */}
          <button
            className="model-chip model-trigger"
            type="button"
            onClick={onOpenModelInfo}
            title={escapeHtml(String(config?.model || ''))}
          >
            <span className="model-chip-icon">☯</span>
            <span className="model-chip-label">{escapeHtml(modelName(String(config?.model)))}</span>
          </button>
          {/* 发送/停止按钮 */}
          <button
            className={`send-btn ${chatBusy ? 'stop-btn' : (chatInput.trim() || attachments.length ? 'active' : '')}`}
            type="button"
            onClick={chatBusy ? onAbort : onSend}
            disabled={!chatBusy && chatInput.trim() === '' && attachments.length === 0}
          >
            {chatBusy ? '■' : '↑'}
          </button>
        </div>
        <div className="composer-hint">按住 Enter 发送，Shift + Enter 换行</div>
      </div>

      {/* 附件选择菜单 */}
      {attachmentMenuOpen && attachmentMenuPosition && (
        <>
          <div className="attach-menu-backdrop" onClick={() => setAttachmentMenuOpen(false)}></div>
          <div
            className="attach-menu"
            style={{ left: attachmentMenuPosition.left, top: attachmentMenuPosition.top }}
          >
            <button type="button" onClick={() => { onPickAttachment('image'); setAttachmentMenuOpen(false) }}>
              <span>🖼</span>
              <span>图片</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('text'); setAttachmentMenuOpen(false) }}>
              <span>📄</span>
              <span>文本文件</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('pdf'); setAttachmentMenuOpen(false) }}>
              <span>📕</span>
              <span>PDF 文件</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('file'); setAttachmentMenuOpen(false) }}>
              <span>📁</span>
              <span>其他文件</span>
            </button>
          </div>
        </>
      )}
    </>
  )
}
