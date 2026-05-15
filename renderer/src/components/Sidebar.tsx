import React from 'react'
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
  darkMode: boolean
  settingsOpen: boolean
  onNewChat: () => void
  onFocusChat: () => void
  onShowTerminal: () => void
  onSearchChange: (value: string) => void
  onOpenSession: (sessionId: string) => void
  onToggleHistoryMenu: (sessionId: string) => void
  onEditSession: (sessionId: string) => void
  onExportSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onToggleTheme: () => void
  onToggleSettings: () => void
  onToggleSidebar: () => void
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
  darkMode,
  settingsOpen,
  onNewChat,
  onFocusChat,
  onShowTerminal,
  onSearchChange,
  onOpenSession,
  onToggleHistoryMenu,
  onEditSession,
  onExportSession,
  onDeleteSession,
  onToggleTheme,
  onToggleSettings,
}: SidebarProps) {
  const filteredSessions = sessions
    .filter(session => !historySearch || String(session.title || '').toLowerCase().includes(historySearch.toLowerCase()))
    .slice(0, 28)

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
          新聊天
        </button>
        <button
          type="button"
          className={`side-action ${view === 'chat' ? 'active' : ''}`}
          data-action="focus-chat"
          onClick={onFocusChat}
        >
          搜索对话
        </button>
        <button
          type="button"
          className={`side-action ${view === 'terminal' ? 'active' : ''}`}
          data-action="show-terminal"
          onClick={onShowTerminal}
        >
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
        <div className="history-list">
          {filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <div key={session.id} className={`history-row ${session.id === currentSessionId ? 'active' : ''}`}>
                <button
                  type="button"
                  className="history-item"
                  data-session={escapeHtml(session.id)}
                  title={escapeHtml(session.title || '')}
                  onClick={() => onOpenSession(session.id)}
                >
                  <strong>{escapeHtml(session.title || '新聊天')}</strong>
                  <span>{escapeHtml(shortTime(session.updatedAt))}</span>
                </button>
                <button
                  type="button"
                  className="history-more"
                  data-action="toggle-history-menu"
                  data-session-id={escapeHtml(session.id)}
                  title="More"
                  onClick={() => onToggleHistoryMenu(session.id)}
                >
                  ...
                </button>
                {historyMenuId === session.id && (
                  <div className="history-menu">
                    <button type="button" data-action="history-edit" onClick={() => onEditSession(session.id)}>
                      <span className="history-menu-icon">&#9998;</span>Edit
                    </button>
                    <button type="button" data-action="history-export" onClick={() => onExportSession(session.id)}>
                      <span className="history-menu-icon">&#8681;</span>Export
                    </button>
                    <button type="button" className="danger" data-action="history-delete" onClick={() => onDeleteSession(session.id)}>
                      <span className="history-menu-icon">&#128465;</span>Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="terminal-empty">还没有历史对话。发出第一条消息后会自动保存。</div>
          )}
        </div>

        <div className="side-bottom">
          <button
            type="button"
            className="theme-toggle-btn"
            data-action="toggle-theme"
            title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
            onClick={onToggleTheme}
          >
            <span>{darkMode ? '☀' : '☽'}</span>
            <span>{darkMode ? '浅色模式' : '深色模式'}</span>
          </button>
          <button
            type="button"
            className={`settings-btn ${settingsOpen ? 'active' : ''}`}
            data-action="toggle-settings"
            title="打开设置"
            onClick={onToggleSettings}
          >
            <span>⚙</span>
            <span>设置</span>
          </button>
          <button type="button" className="status-card">
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