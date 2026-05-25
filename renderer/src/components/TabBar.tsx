// 标签栏组件 - 浏览器风格的多标签切换
import React from 'react'
import { Tabs } from 'antd'
import type { Session } from '../types'

interface TabBarProps {
  openTabs: string[]
  sessions: Session[]
  activeKey: string
  onChange: (key: string) => void
  onClose: (key: string) => void
  onAdd: () => void
}

export function TabBar({ openTabs, sessions, activeKey, onChange, onClose, onAdd }: TabBarProps) {
  const items = openTabs.map(id => {
    const session = sessions.find(s => s.id === id)
    return {
      key: id,
      label: session?.title || '新聊天',
      closable: openTabs.length > 1,
    }
  })

  return (
    <div className="chat-tab-bar">
      <Tabs
        type="editable-card"
        size="small"
        activeKey={activeKey}
        onChange={onChange}
        onEdit={(key, action) => {
          if (action === 'add') {
            onAdd()
          } else if (action === 'remove') {
            onClose(key as string)
          }
        }}
        items={items}
        hideAdd={false}
      />
    </div>
  )
}