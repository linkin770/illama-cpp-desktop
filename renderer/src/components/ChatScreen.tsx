// 聊天屏幕组件 - 展示消息列表和输入区域
import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { ChatMessage, Attachment } from '../types'
import { ChatMessage as ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface ChatScreenProps {
  chatMessages: ChatMessage[]
  chatInput: string
  attachments: Attachment[]
  chatBusy: boolean
  config: Record<string, unknown> | null
  onInputChange: (value: string) => void
  onSend: () => void
  onAbort: () => void
  onPickAttachment: (kind: string) => void
  onRemoveAttachment: (index: number) => void
  onOpenModelInfo: () => void
  onCopyMessage: (index: number) => void
  onEditMessage: (index: number) => void
  onRetryMessage: (index: number) => void
  onDeleteMessage: (index: number) => void
}

export function ChatScreen({
  chatMessages,
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
  onCopyMessage,
  onEditMessage,
  onRetryMessage,
  onDeleteMessage,
}: ChatScreenProps) {
  const chatFeedRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const stickToBottomRef = useRef(true)
  const isDraggingScrollbarRef = useRef(false)

  // 检查是否滚动到底部附近
  const isNearBottom = useCallback((el: HTMLDivElement) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 96
  }, [])

  // 监听滚动事件
  useEffect(() => {
    const feed = chatFeedRef.current
    if (!feed) return

    const handleScroll = () => {
      if (isDraggingScrollbarRef.current) return
      const near = isNearBottom(feed)
      // 更新是否要保持在底部
      if (stickToBottomRef.current && !near) {
        stickToBottomRef.current = false
      } else if (!stickToBottomRef.current && near) {
        stickToBottomRef.current = true
      }
      setShowScrollButton(!near)
    }

    feed.addEventListener('scroll', handleScroll, { passive: true })
    return () => feed.removeEventListener('scroll', handleScroll)
  }, [isNearBottom])

  // 处理滚动条拖拽
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target === chatFeedRef.current || target.closest('.chat-feed')) {
        const feed = chatFeedRef.current
        if (!feed) return
        const rect = feed.getBoundingClientRect()
        // 检查是否点击在滚动条区域
        if (event.clientX > rect.right - 12) {
          isDraggingScrollbarRef.current = true
          stickToBottomRef.current = false
        }
      }
    }

    const handleMouseUp = () => {
      if (isDraggingScrollbarRef.current) {
        isDraggingScrollbarRef.current = false
        const feed = chatFeedRef.current
        if (feed && isNearBottom(feed)) {
          stickToBottomRef.current = true
        }
      }
    }

    const handleTouchStart = () => {
      isDraggingScrollbarRef.current = true
      stickToBottomRef.current = false
    }

    const handleTouchEnd = () => {
      if (isDraggingScrollbarRef.current) {
        isDraggingScrollbarRef.current = false
        const feed = chatFeedRef.current
        if (feed && isNearBottom(feed)) {
          stickToBottomRef.current = true
        }
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isNearBottom])

  // 新消息时自动滚动到底部
  useEffect(() => {
    const feed = chatFeedRef.current
    if (!feed || chatMessages.length === 0) return
    if (stickToBottomRef.current && !isDraggingScrollbarRef.current) {
      feed.scrollTop = feed.scrollHeight
    }
  }, [chatMessages])

  // 手动滚动到底部
  const scrollToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({ top: chatFeedRef.current.scrollHeight, behavior: 'smooth' })
      stickToBottomRef.current = true
    }
  }

  // 空状态
  if (chatMessages.length === 0) {
    return (
      <section className="chat-screen empty-chat">
        <div className="chat-feed" id="chatFeed" ref={chatFeedRef}>
          <div className="empty-state">
            <h1>illama.exe</h1>
            <p>无需命令行，就能管理本地AI服务。它既是控制台，也是聊天室，更是连接OpenClaw、Claude Code等外部工具的桥梁。</p>
          </div>
        </div>
        <ChatInput
          chatInput={chatInput}
          attachments={attachments}
          chatBusy={chatBusy}
          config={config}
          onInputChange={onInputChange}
          onSend={onSend}
          onAbort={onAbort}
          onPickAttachment={onPickAttachment}
          onRemoveAttachment={onRemoveAttachment}
          onOpenModelInfo={onOpenModelInfo}
        />
      </section>
    )
  }

  // 正常聊天状态
  return (
    <section className="chat-screen">
      <div className="chat-feed" id="chatFeed" ref={chatFeedRef}>
        {/* 渲染所有消息 */}
        {chatMessages.map((message, index) => (
          <ChatMessageComponent
            key={index}
            message={message}
            index={index}
            chatBusy={chatBusy}
            onCopy={onCopyMessage}
            onEdit={onEditMessage}
            onRetry={onRetryMessage}
            onDelete={onDeleteMessage}
          />
        ))}
      </div>
      {/* 回到最新按钮 */}
      {showScrollButton && (
        <button className="scroll-to-bottom-btn visible" data-action="scroll-to-bottom" title="回到最新" onClick={scrollToBottom}>
          ↓回到最新
        </button>
      )}
      {/* 输入框 */}
      <ChatInput
        chatInput={chatInput}
        attachments={attachments}
        chatBusy={chatBusy}
        config={config}
        onInputChange={onInputChange}
        onSend={onSend}
        onAbort={onAbort}
        onPickAttachment={onPickAttachment}
        onRemoveAttachment={onRemoveAttachment}
        onOpenModelInfo={onOpenModelInfo}
      />
    </section>
  )
}
