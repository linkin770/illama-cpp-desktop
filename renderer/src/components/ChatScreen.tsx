import React, { useRef, useEffect, useState } from 'react'
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

  useEffect(() => {
    const handleScroll = () => {
      if (chatFeedRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = chatFeedRef.current
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200)
      }
    }

    const feed = chatFeedRef.current
    feed?.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => feed?.removeEventListener('scroll', handleScroll)
  }, [chatMessages.length])

  useEffect(() => {
    if (chatFeedRef.current && chatMessages.length > 0) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }, [chatMessages])

  const scrollToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }

  if (chatMessages.length === 0) {
    return (
      <section className="chat-screen empty-chat">
        <div className="chat-feed" ref={chatFeedRef}>
          <div className="empty-state">
            <h1>illama.exe</h1>
            <p>无需命令行，就能管理本地AI服务。它既是控制台，也是聊天室，更是连接OpenClaw、Claude Code等外部工具的桥梁。</p>
          </div>
        </div>
        <button className="scroll-to-bottom-btn" data-action="scroll-to-bottom" title="回到最新" onClick={scrollToBottom}>
          ↓回到最新
        </button>
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

  return (
    <section className="chat-screen">
      <div className="chat-feed" ref={chatFeedRef}>
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
      {showScrollButton && (
        <button className="scroll-to-bottom-btn" data-action="scroll-to-bottom" title="回到最新" onClick={scrollToBottom}>
          ↓回到最新
        </button>
      )}
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