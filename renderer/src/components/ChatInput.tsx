import { useState, useEffect } from 'react'
import { FileImageOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons'
import { Sender } from '@ant-design/x'
import type { Attachment, Skill } from '../types'
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
  const [skillMenuOpen, setSkillMenuOpen] = useState(false)
  const [skillMenuPosition, setSkillMenuPosition] = useState<{ left: number; bottom: number } | null>(null)
  const [skillMenuSkills, setSkillMenuSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)

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

  const handleSkillButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - 236 - 12)
    const bottom = window.innerHeight - rect.top + 6
    setSkillMenuPosition({ left: Math.round(left), bottom: Math.round(bottom) })
    setSkillMenuOpen(true)
    if (skillMenuSkills.length === 0 && !skillsLoading) {
      setSkillsLoading(true)
      try { const list = await window.llamaDesktop.listSkills(); setSkillMenuSkills(list) } catch (_) {}
      setSkillsLoading(false)
    }
  }

  const handleAttachButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 206
    const menuHeight = 120
    const gap = 8
    const minPad = 12
    const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
    const top = Math.max(minPad, rect.top - menuHeight - gap)

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
        footer={(actionNode) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="attach-wrap" style={{ position: "static" }}>
                <button
                  className="round-btn"
                  type="button"
                  onClick={handleAttachButtonClick}
                  title="添加内容"
                >
                  +
                </button>
              </div>
              <div className="skill-wrap" style={{ position: "static" }}>
                <button className="round-btn" type="button" onClick={handleSkillButtonClick} title="选择技能"><ToolOutlined /></button>
              </div>
              <button
                className="model-chip model-trigger"
                type="button"
                onClick={onOpenModelInfo}
                title={escapeHtml(String(config?.model || ""))}
              >
                <span className="model-chip-icon">{"☯"}</span>
                <span className="model-chip-label">{escapeHtml(modelName(String(config?.model)))}</span>
              </button>
            </div>
            <div className="composer-hint" style={{ flex: 1, textAlign: "center", margin: 0, fontSize: 12 }}>按住 Enter 发送，Shift + Enter 换行 </div>
            {actionNode}
          </div>
        )}
            suffix={false}
/>

      {attachmentMenuOpen && attachmentMenuPosition && (
        <>
          <div className="attach-menu-backdrop" onClick={() => setAttachmentMenuOpen(false)} />
          <div
            className="attach-menu floating slide-up"
            style={{ left: attachmentMenuPosition.left, top: attachmentMenuPosition.top }}
          >
            <button type="button" onClick={() => { onPickAttachment('image'); setAttachmentMenuOpen(false) }}>
              <FileImageOutlined />
              <span>图片</span>
            </button>
            <button type="button" onClick={() => { onPickAttachment('text'); setAttachmentMenuOpen(false) }}>
              <FileTextOutlined />
              <span>文本文件</span>
            </button>
          </div>
        </>
      )}
      {skillMenuOpen && skillMenuPosition && (
        <>
          <div className="attach-menu-backdrop" onClick={() => setSkillMenuOpen(false)} />
          <div className="attach-menu floating slide-up skill-menu" style={{ left: skillMenuPosition.left, bottom: skillMenuPosition.bottom, maxHeight: 192, overflowY: "auto" }}>
            {skillsLoading ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>加载中...</div>
            ) : skillMenuSkills.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>还没有技能<br /><span style={{ fontSize: 10 }}>去设置中创建</span></div>
            ) : (
              skillMenuSkills.map(skill => (
                <button key={skill.dirName} type="button" onClick={() => { setSkillMenuOpen(false); onPickSkill(skill) }}>
                  <ToolOutlined />
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                    <strong style={{ fontSize: 12 }}>{skill.name}</strong>
                    {skill.description && <small style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>{skill.description.slice(0, 30)}{skill.description.length > 30 ? "..." : ""}</small>}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
