import { useState, useEffect } from 'react'
import { Sender } from '@ant-design/x'
import type { Attachment } from '../types'
import { escapeHtml, modelName } from '../utils'

interface ChatInputProps {
  chatInput: string
  attachments: Attachment[]
  chatBusy: boolean
  config: Record<string, unknown> | null
  onInputChange: (value: string) => void
  onSend: (content: string) => void
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
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [attachmentMenuPosition, setAttachmentMenuPosition] = useState<{ left: number; top: number } | null>(null)

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

  const handleAttachButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 206
    const menuHeight = 252
    const gap = 8
    const minPad = 12
    const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
    const below = rect.bottom + gap
    const above = rect.top - menuHeight - gap
    const top = below + menuHeight < window.innerHeight - minPad
      ? below
      : Math.max(minPad, above)

    setAttachmentMenuPosition({ left: Math.round(left), top: Math.round(top) })
    setAttachmentMenuOpen(true)
  }

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

  const prefixNode = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
      <button
        className="model-chip model-trigger"
        type="button"
        onClick={onOpenModelInfo}
        title={escapeHtml(String(config?.model || ''))}
      >
        <span className="model-chip-icon">{'☯'}</span>
        <span className="model-chip-label">{escapeHtml(modelName(String(config?.model)))}</span>
      </button>
    </div>
  )

  return (
    <div className="composer-wrap">
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
                {'\u00D7'}
              </button>
            </span>
          ))}
        </div>
      )}

      <Sender
        value={chatInput}
        onChange={(val) => onInputChange(val)}
        onSubmit={(val) => onSend(val)}
        onCancel={onAbort}
        loading={chatBusy}
        placeholder="输入一条消息……"
        prefix={prefixNode}
        footer={
          <div className="composer-hint">按住 Enter 发送，Shift + Enter 换行</div>
        }
      />

      {attachmentMenuOpen && attachmentMenuPosition && (
        <>
          <div className="attach-menu-backdrop" onClick={() => setAttachmentMenuOpen(false)} />
          <div
            className="attach-menu"
            style={{ left: attachmentMenuPosition.left, top: attachmentMenuPosition.top }}
          >
            <button type="button" onClick={() => { onPickAttachment('image'); setAttachmentMenuOpen(false) }}>
              <span>{'\uD83D\uDDBC'}</span>
              <span>图片</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('text'); setAttachmentMenuOpen(false) }}>
              <span>{'\uD83D\uDCC4'}</span>
              <span>文本文件</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('pdf'); setAttachmentMenuOpen(false) }}>
              <span>{'\uD83D\uDCD5'}</span>
              <span>PDF 文件</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('file'); setAttachmentMenuOpen(false) }}>
              <span>{'\uD83D\uDCC1'}</span>
              <span>其他文件</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}