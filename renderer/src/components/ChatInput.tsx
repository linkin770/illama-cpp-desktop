import { useState, useEffect } from 'react'
import { FileImageOutlined, FileTextOutlined, ToolOutlined, SettingOutlined, BulbOutlined } from '@ant-design/icons'
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
  onPickSkill: (skill: Skill) => void
  selectedSkill: Skill | null
  onRemoveSkill: () => void
  onOpenModelInfo: () => void
  systemPrompt?: string
  onOpenSystemPromptModal: () => void
  onUpdateConfig?: (key: string, value: unknown) => void
  onSetToast?: (message: string) => void
  onRestartServer?: () => Promise<void>
  isServerRunning?: boolean
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
  onPickSkill,
  selectedSkill,
  onRemoveSkill,
  onOpenModelInfo,
  systemPrompt,
  onOpenSystemPromptModal,
  onUpdateConfig,
  onSetToast,
  onRestartServer,
  isServerRunning,
}: ChatInputProps) {
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [attachmentMenuPosition, setAttachmentMenuPosition] = useState<{ left: number; bottom: number } | null>(null)
  const [skillMenuOpen, setSkillMenuOpen] = useState(false)
  const [skillMenuPosition, setSkillMenuPosition] = useState<{ left: number; bottom: number } | null>(null)
  const [skillMenuSkills, setSkillMenuSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  
  // 模型选择状态
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [modelMenuPosition, setModelMenuPosition] = useState<{ left: number; bottom: number } | null>(null)
  const [modelsList, setModelsList] = useState<Array<{
    name: string
    path: string
    mmprojPath: string | null
    hasVision: boolean
  }>>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.attach-wrap') && !target.closest('.skill-wrap') && !target.closest('.model-wrap') && !target.closest('.attach-menu')) {
        setAttachmentMenuOpen(false)
        setSkillMenuOpen(false)
        setModelMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSkillButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (skillMenuOpen) { setSkillMenuOpen(false); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - 236 - 12)
    const bottom = window.innerHeight - rect.top + 6
    setSkillMenuPosition({ left: Math.round(left), bottom: Math.round(bottom) })
    setSkillMenuOpen(true)
    setSkillsLoading(true)
    try { const list = await window.llamaDesktop.listSkills(); setSkillMenuSkills(list) } catch (_) { setSkillMenuSkills([]) }
    setSkillsLoading(false)
  }

  const handleAttachButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 236
    const gap = 6
    const minPad = 12
    const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
    const bottom = window.innerHeight - rect.top + gap
    setAttachmentMenuPosition({ left: Math.round(left), bottom: Math.round(bottom) })
    setAttachmentMenuOpen(true)
  }

  // 处理模型选择按钮点击
  const handleModelButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (modelMenuOpen) { setModelMenuOpen(false); return }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 420
    const gap = 6
    const minPad = 12
    const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
    const bottom = window.innerHeight - rect.top + gap
    setModelMenuPosition({ left: Math.round(left), bottom: Math.round(bottom) })
    setModelMenuOpen(true)
    setModelsLoading(true)
    
    try {
      const result = await window.llamaDesktop.scanModels()
      if (result.error) {
        onSetToast?.(result.error)
        setModelsList([])
      } else {
        setModelsList(result.models || [])
      }
    } catch (error) {
      onSetToast?.(`扫描失败: ${error instanceof Error ? error.message : String(error)}`)
      setModelsList([])
    } finally {
      setModelsLoading(false)
    }
  }

  // 处理模型选择
  const handleModelSelect = async (model: typeof modelsList[0]) => {
    // 更新模型配置
    onUpdateConfig?.('model', model.path)
    
    // 如果有 mmproj，自动更新
    if (model.mmprojPath) {
      onUpdateConfig?.('mmproj', model.mmprojPath)
      onSetToast?.(`已选择 ${model.name}，自动匹配投影文件`)
    } else {
      // 清空 mmproj
      onUpdateConfig?.('mmproj', '')
      onSetToast?.(`已选择 ${model.name}，该模型仅支持文本聊天，不能识别图片`)
    }
    
    // 如果服务正在运行，自动重启以加载新模型
    if (isServerRunning && onRestartServer) {
      try {
        await onRestartServer()
        // 不在这里显示成功提示，等待服务状态变为 running 时再显示
      } catch (error) {
        onSetToast?.(`重启失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    setModelMenuOpen(false)
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
      {systemPrompt && (
        <div className="attachment-row">
          <span className="attachment-chip" style={{ backgroundColor: '#e6f4ff', color: '#1677ff', borderColor: '#91caff' }} title="已设置对话提示词">
            <strong><BulbOutlined /> 对话提示词</strong>
            <button
              type="button"
              className="attachment-remove"
              onClick={onOpenSystemPromptModal}
              title="编辑提示词"
            >
              <SettingOutlined style={{ fontSize: 12 }} />
            </button>
          </span>
        </div>
      )}
      {selectedSkill && !systemPrompt && (
        <div className="attachment-row">
          <span className="attachment-chip skill-chip" title={selectedSkill.name}>
            <strong>{"🔧 " + selectedSkill.name}</strong>
            <button
              type="button"
              className="attachment-remove"
              onClick={onRemoveSkill}
              title="移除技能"
            >
              {"\u00D7"}
            </button>
          </span>
        </div>
      )}
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
                className="round-btn"
                type="button"
                onClick={onOpenSystemPromptModal}
                title={systemPrompt ? "编辑对话提示词" : "设置对话提示词"}
                style={{ color: systemPrompt ? '#1677ff' : undefined }}
              >
                <BulbOutlined />
              </button>
            </div>
            <div className="model-wrap" style={{ position: "static" }}>
              <button
                className="model-chip model-trigger"
                type="button"
                onClick={handleModelButtonClick}
                title="选择模型"
              >
                <span className="model-chip-icon">☯</span>
                <span className="model-chip-label">
                  {config?.model ? String(config.model).split(/[\\/]/).pop() : '选择模型'}
                </span>
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
            style={{ left: attachmentMenuPosition.left, bottom: attachmentMenuPosition.bottom }}
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
      {modelMenuOpen && modelMenuPosition && (
        <>
          <div className="attach-menu-backdrop" onClick={() => setModelMenuOpen(false)} />
          <div className="attach-menu floating slide-up model-menu" style={{ left: modelMenuPosition.left, bottom: modelMenuPosition.bottom, maxHeight: 400, overflowY: "auto", width: 420 }}>
            {modelsLoading ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>扫描中...</div>
            ) : modelsList.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>models 文件夹中没有 .gguf 文件</div>
            ) : (
              modelsList.map(model => (
                <button 
                  key={model.path} 
                  type="button" 
                  onClick={() => handleModelSelect(model)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <span style={{ fontSize: 16 }}>☯</span>
                    <strong style={{ fontSize: 12, flex: 1, textAlign: "left" }}>{model.name}</strong>
                    {model.hasVision ? (
                      <span style={{ fontSize: 10, color: "#52c41a", background: "#f6ffed", padding: "2px 6px", borderRadius: 4 }}>✅ 支持视觉</span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#faad14", background: "#fffbe6", padding: "2px 6px", borderRadius: 4 }}>⚠️ 仅文本</span>
                    )}
                  </div>
                  {model.mmprojPath && (
                    <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 24 }}>
                      已匹配: {model.mmprojPath.split(/[\\/]/).pop()}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
