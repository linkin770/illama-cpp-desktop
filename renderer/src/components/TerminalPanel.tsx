import React, { useEffect, useRef } from 'react'
import type { LogEntry } from '../types'
import { escapeHtml, visibleTerminalLogs } from '../utils'

interface TerminalPanelProps {
  logs: LogEntry[]
  onReturnChat: () => void
}

export function TerminalPanel({ logs, onReturnChat }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  
  const allLogs = logs || []
  const visibleLogs = visibleTerminalLogs(allLogs)
  const hiddenCount = Math.max(0, allLogs.length - visibleLogs.length)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [visibleLogs])

  return (
    <section className="terminal-screen">
      <div className="terminal-head">
        <div>
          <span>终端日志</span>
          <strong>llama.cpp server output</strong>
        </div>
        <button className="outline-btn" type="button" data-action="return-chat" onClick={onReturnChat}>
          回到聊天
        </button>
      </div>
      <div className="terminal-summary">
        <span>正常终端视图：只显示 llama.cpp/server/runtime 输出。</span>
        {hiddenCount > 0 && (
          <strong>已隐藏 {hiddenCount} 条聊天回显、JSON chunk、prompt 或轮询日志。</strong>
        )}
      </div>
      <div className="terminal-console" id="inlineLogBox" ref={terminalRef}>
        {visibleLogs.length > 0 ? (
          visibleLogs.map((line, index) => (
            <div key={index} className="terminal-line">
              {escapeHtml(line)}
            </div>
          ))
        ) : (
          <div className="terminal-line terminal-muted">Waiting for llama.cpp server output...</div>
        )}
      </div>
    </section>
  )
}