import { useRef, useEffect, useMemo } from 'react'
import { Conversations } from '@ant-design/x'
import type { MenuProps } from 'antd'
import { EditOutlined, DownloadOutlined, DeleteOutlined, MessageOutlined, SettingOutlined, SearchOutlined, CodeOutlined } from '@ant-design/icons'
import type { Session, Status } from '../types'
import { escapeHtml, statusLabel, statusClass, shortTime } from '../utils'

interface SidebarProps {
  sessions: Session[]
  currentSessionId: string
  historySearch: string
  historyMenuId: string
  sidebarCollapsed: boolean
  view: 'chat' | 'terminal'
  chatMessages: unknown[]
  status: Status
  settingsOpen: boolean
  busy: boolean
  onNewChat: () => void
  onFocusChat: () => void
  onShowTerminal: () => void
  onSearchChange: (value: string) => void
  onOpenSession: (sessionId: string) => void
  onToggleHistoryMenu: (sessionId: string) => void
  onEditSession: (sessionId: string) => void
  onExportSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onToggleSettings: () => void
  onToggleSidebar: () => void
  onSave: () => void
  onStart: () => void
  onStop: () => void
}


function getTimeGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);
  if (date >= today) return "今天";
  if (date >= yesterday) return "昨天";
  if (date >= lastWeek) return "上周";
  return "更早";
}

export function Sidebar({
  sessions,
  currentSessionId,
  historySearch,
  historyMenuId,
  sidebarCollapsed,
  view,
  chatMessages,
  status,
  settingsOpen,
  busy,
  onNewChat,
  onFocusChat,
  onShowTerminal,
  onSearchChange,
  onOpenSession,
  onToggleHistoryMenu,
  onEditSession,
  onExportSession,
  onDeleteSession,
  onToggleSettings,
  onSave,
  onStart,
  onStop,
}: SidebarProps) {
  const filteredSessions = sessions
    .filter(session => !historySearch || String(session.title || '').toLowerCase().includes(historySearch.toLowerCase()))
    .slice(0, 28)

  const historyListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!historyListRef.current) return
    const activeEl = historyListRef.current.querySelector('.ant-conversations-item-active')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentSessionId])

  const conversationItems = useMemo(() => {
    return filteredSessions.map(session => ({
      key: session.id,
      group: getTimeGroup(session.updatedAt),
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
            {escapeHtml(session.title || '新聊天')}
          </span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            {escapeHtml(shortTime(new Date(session.updatedAt)))}
          </span>
        </div>
      ),
      icon: <MessageOutlined style={{ fontSize: 14, opacity: 0.7 }} />,
    }))
  }, [filteredSessions])

  const getMenuItems = (sessionId: string): MenuProps['items'] => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => onEditSession(sessionId),
    },
    {
      key: 'export',
      label: '导出',
      icon: <DownloadOutlined />,
      onClick: () => onExportSession(sessionId),
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDeleteSession(sessionId),
    },
  ]

  const running = status.state === 'running' || status.state === 'starting'

  const handleStatusAction = () => {
    if (busy) return
    if (running) {
      onStop()
    } else {
      onSave()
      onStart()
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="app-mark">Ai</div>
        <div className="brand-copy">
          <strong>AI本地部署工具</strong>
        </div>
      </div>

      <button
        type="button"
        className={`side-action ${view === 'chat' && chatMessages.length === 0 ? 'active' : ''}`}
        data-action="new-chat"
        onClick={onNewChat}
      >
        <MessageOutlined />
        新聊天
      </button>
      <button
        type="button"
        className={`side-action ${view === 'chat' ? 'active' : ''}`}
        data-action="focus-chat"
        onClick={onFocusChat}
      >
        <SearchOutlined />
        搜索对话
      </button>
      <button
        type="button"
        className={`side-action ${view === 'terminal' ? 'active' : ''}`}
        data-action="show-terminal"
        onClick={onShowTerminal}
      >
        <CodeOutlined />
        终端日志
      </button>

      <input
        className="history-search"
        data-history-search
        placeholder="搜索历史对话..."
        value={historySearch}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <div className="side-section-label">历史对话</div>
      <div className="history-list" ref={historyListRef}>
        {filteredSessions.length > 0 ? (
          <Conversations
            activeKey={currentSessionId}
            onActiveChange={(key) => onOpenSession(String(key))}
            items={conversationItems}
            menu={(item) => ({
              items: getMenuItems(String(item.key)),
            })}
            groupable={{
              collapsible: true,
              defaultExpandedKeys: ['今天', '昨天', '上周', '更早'],
            }}
            styles={{
              item: { padding: '8px 12px' },
            }}
          />
        ) : (
          <div className="terminal-empty">还没有历史对话。发出第一条消息后会自动保存。</div>
        )}
      </div>

      <div className="side-bottom">
        <button
          type="button"
          className={`settings-btn ${settingsOpen ? 'active' : ''}`}
          data-action="toggle-settings"
          title="打开设置"
          onClick={onToggleSettings}
        >
          <SettingOutlined />
          <span>设置</span>
        </button>
        <button type="button" className="status-card" onClick={handleStatusAction} disabled={busy}>
          <span className={`status-dot ${statusClass(status.state)}`}></span>
          <span>
            <strong>{statusLabel(status.state)}</strong>
            <em>{escapeHtml(status.url || '')}</em>
          </span>
        </button>
      </div>
    </aside>
  )
}