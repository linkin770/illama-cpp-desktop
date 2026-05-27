// 系统提示词设置弹窗组件
import { Modal, Input } from 'antd'
import { useState, useEffect } from 'react'

interface SystemPromptModalProps {
  open: boolean
  currentPrompt: string
  onSave: (prompt: string) => void
  onCancel: () => void
}

export function SystemPromptModal({ open, currentPrompt, onSave, onCancel }: SystemPromptModalProps) {
  const [value, setValue] = useState(currentPrompt)

  // 当弹窗打开时，同步当前提示词
  useEffect(() => {
    if (open) {
      setValue(currentPrompt)
    }
  }, [open, currentPrompt])

  const handleOk = () => {
    onSave(value)
  }

  const handleCancel = () => {
    setValue(currentPrompt) // 重置为原值
    onCancel()
  }

  return (
    <Modal
      title="设置对话提示词"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={600}
      centered
    >
      <div style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
        设置后，模型将在当前对话中始终遵循此提示词回复。优先级高于技能。
      </div>
      <Input.TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="例如：你是一个专业的编程助手，擅长解答技术问题..."
        rows={8}
        maxLength={2000}
        showCount
        style={{ resize: 'vertical' }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
        提示：留空可清除当前对话的提示词
      </div>
    </Modal>
  )
}
