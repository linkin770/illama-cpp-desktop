// 服务栏组件 - 显示服务状态和控制按钮
import React from 'react'
import type { Status } from '../types'
import { escapeHtml, statusLabel, statusClass, compactStatusMessage } from '../utils'

interface ServiceBarProps {
  status: Status
  busy: boolean
  dirty: boolean
  onSave: () => void
  onHealth: () => void
  onStart: () => void
  onStop: () => void
}

export function ServiceBar({
  status,
  busy,
  dirty,
  onSave,
  onHealth,
  onStart,
  onStop,
}: ServiceBarProps) {
  const running = status.state === 'running' || status.state === 'starting'

  return (
    <footer className="service-bar">
      <div className="service-left">
        {/* 状态指示点 */}
        <span className={`status-dot ${statusClass(status.state)}`}></span>
        {/* 状态文字和 URL */}
        <span>{statusLabel(status.state)} · {escapeHtml(compactStatusMessage(status.message || ''))}</span>
        <code>{escapeHtml(status.url || '')}</code>
      </div>
      <div className="service-actions">
        {/* 保存配置按钮 */}
        <button
          className="outline-btn"
          type="button"
          data-action="save"
          disabled={busy}
          onClick={onSave}
        >
          {dirty ? '保存配置*' : '保存配置'}
        </button>
        {/* 检查端口按钮 */}
        <button className="outline-btn" type="button" data-action="health" onClick={onHealth}>
          检查端口
        </button>
        {/* 停止或启动按钮 */}
        {running ? (
          <button
            className="danger-btn"
            type="button"
            data-action="stop"
            disabled={busy}
            onClick={onStop}
          >
            停止服务
          </button>
        ) : (
          <button
            className="primary-btn"
            type="button"
            data-action="start"
            disabled={busy}
            onClick={onStart}
          >
            保存并启动
          </button>
        )}
      </div>
    </footer>
  )
}
