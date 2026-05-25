// 服务栏组件 - 显示服务状态
import React from 'react'
import type { Status } from '../types'
import { escapeHtml, statusLabel, statusClass, compactStatusMessage } from '../utils'

interface ServiceBarProps {
  status: Status
}

export function ServiceBar({ status }: ServiceBarProps) {
  return (
    <footer className="service-bar">
      <div className="service-left">
        <span className={`status-dot ${statusClass(status.state)}`}></span>
        <span>{statusLabel(status.state)} · {escapeHtml(compactStatusMessage(status.message || ''))}</span>
        <code>{escapeHtml(status.url || '')}</code>
      </div>
    </footer>
  )
}
