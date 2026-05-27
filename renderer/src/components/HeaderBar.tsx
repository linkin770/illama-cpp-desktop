import { useState, useEffect } from 'react'

interface HeaderBarProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export default function HeaderBar({ sidebarCollapsed, onToggleSidebar }: HeaderBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.llamaDesktop.isWindowMaximized()
      setIsMaximized(maximized)
    }
    checkMaximized()
  }, [])

  const handleClose = () => {
    window.llamaDesktop.closeWindow()
  }

  const handleMinimize = () => {
    window.llamaDesktop.minimizeWindow()
  }

  const handleMaximize = () => {
    window.llamaDesktop.maximizeWindow()
    setIsMaximized(prev => !prev)
  }

  return (
    <div className="header-bar">
      <div className="header-drag-region"></div>
      <div className="header-content">
        <div className="header-left">
          <button 
            type="button" 
            className="sidebar-toggle" 
            data-action="toggle-sidebar" 
            title={sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'} 
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <div className="header-center">
          {/* 标签栏已移除 */}
        </div>
        <div className="header-actions">
          <button className="window-btn minimize-btn" onClick={handleMinimize} title="最小化">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="window-btn maximize-btn" onClick={handleMaximize} title={isMaximized ? '还原' : '最大化'}>
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 3L1 9H7L7 3H1ZM2 4H6V8H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 1L3 1L3 7L9 7L9 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 1L9 9L1 9L1 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button className="window-btn close-btn" onClick={handleClose} title="关闭">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}