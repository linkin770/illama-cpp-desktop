import { useState, useCallback, useEffect, useRef } from 'react'
import type { AppState, Config, ChatMessage, Session } from '../types'

const defaultState: AppState = {
  active: 'chat',
  config: null,
  validation: {},
  launch: {},
  status: { state: 'stopped', message: '服务未启动', url: 'http://127.0.0.1:8080' },
  logs: [],
  view: 'chat',
  sidebarPanel: 'chats',
  sidebarCollapsed: false,
  sessions: [],
  currentSessionId: '',
  historySearch: '',
  historyMenuId: '',
  historyDialog: null,
  chatMessages: [],
  chatInput: '',
  attachments: [],
  attachmentMenuOpen: false,
  attachmentMenuPosition: null,
  streamRequestId: '',
  preview: null,
  modelInfo: null,
  modelInfoOpen: false,
  chatBusy: false,
  dirty: false,
  busy: false,
  settingsOpen: false,
  toast: '',
  darkMode: false,
  stickToBottom: true,
  isDraggingScrollbar: false,
}

const SESSIONS_KEY = 'llama.cpp.desktop.sessions'

function loadSessions(): Session[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function persistSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 80)))
}

function makeSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function titleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find(msg => msg.role === 'user' && String(msg.content || '').trim())
  return String(firstUser?.content || '新聊天').replace(/\s+/g, ' ').slice(0, 36)
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => ({
    ...defaultState,
    sessions: loadSessions(),
    currentSessionId: makeSessionId(),
  }))

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setState(prev => ({ ...prev, toast: message }))
    toastTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, toast: '' }))
    }, 2800)
  }, [])

  const patchFromBackend = useCallback((payload: Partial<Pick<AppState, 'config' | 'validation' | 'status' | 'logs' | 'launch'>>) => {
    setState(prev => ({
      ...prev,
      ...payload,
      dirty: false,
    }))
  }, [])

  const saveCurrentSession = useCallback(() => {
    if (!state.currentSessionId || state.chatMessages.length === 0) return
    
    setState(prev => {
      const now = Date.now()
      const next: Session = {
        id: prev.currentSessionId,
        title: titleFromMessages(prev.chatMessages),
        messages: prev.chatMessages,
        updatedAt: now,
      }
      
      const existingIndex = prev.sessions.findIndex(s => s.id === prev.currentSessionId)
      let updatedSessions: Session[]
      
      if (existingIndex >= 0) {
        updatedSessions = [...prev.sessions]
        updatedSessions.splice(existingIndex, 1, next)
      } else {
        updatedSessions = [next, ...prev.sessions]
      }
      
      updatedSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      persistSessions(updatedSessions)
      
      return { ...prev, sessions: updatedSessions }
    })
  }, [state.currentSessionId, state.chatMessages.length])

  const openSession = useCallback((sessionId: string) => {
    saveCurrentSession()
    setState(prev => {
      const session = prev.sessions.find(s => s.id === sessionId)
      if (!session) return prev
      
      return {
        ...prev,
        currentSessionId: session.id,
        chatMessages: Array.isArray(session.messages) ? session.messages : [],
        chatInput: '',
        attachments: [],
        view: 'chat',
        sidebarPanel: 'chats',
        attachmentMenuOpen: false,
        historyMenuId: '',
        stickToBottom: true,
      }
    })
  }, [saveCurrentSession])

  const startFreshSession = useCallback(() => {
    saveCurrentSession()
    const newId = makeSessionId()
    
    setState(prev => {
      const exists = prev.sessions.some(s => s.id === newId)
      let updatedSessions = prev.sessions
      
      if (!exists) {
        updatedSessions = [{
          id: newId,
          title: '新聊天',
          messages: [],
          updatedAt: Date.now(),
        }, ...prev.sessions]
        persistSessions(updatedSessions)
      }
      
      return {
        ...prev,
        currentSessionId: newId,
        chatMessages: [],
        chatInput: '',
        attachments: [],
        attachmentMenuOpen: false,
        view: 'chat',
        sidebarPanel: 'chats',
        historyMenuId: '',
        sessions: updatedSessions,
      }
    })
  }, [saveCurrentSession])

  const updateConfig = useCallback((key: keyof Config, value: unknown) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value },
      dirty: true,
    }))
  }, [])

  const updateChatInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, chatInput: value }))
  }, [])

  const addAttachments = useCallback((attachments: AppState['attachments']) => {
    setState(prev => ({ ...prev, attachments: [...prev.attachments, ...attachments] }))
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }, [])

  const clearAttachments = useCallback(() => {
    setState(prev => ({ ...prev, attachments: [] }))
  }, [])

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, message],
    }))
  }, [])

  const updateChatMessage = useCallback((index: number, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      chatMessages: prev.chatMessages.map((msg, i) =>
        i === index ? { ...msg, ...updates } : msg
      ),
    }))
  }, [])

  const removeChatMessage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      chatMessages: prev.chatMessages.filter((_, i) => i !== index),
    }))
  }, [])

  const setChatMessages = useCallback((messages: ChatMessage[]) => {
    setState(prev => ({ ...prev, chatMessages: messages }))
  }, [])

  const setChatBusy = useCallback((busy: boolean) => {
    setState(prev => ({ ...prev, chatBusy: busy }))
  }, [])

  const setStreamRequestId = useCallback((id: string) => {
    setState(prev => ({ ...prev, streamRequestId: id }))
  }, [])

  const setView = useCallback((view: 'chat' | 'terminal') => {
    setState(prev => ({ ...prev, view }))
  }, [])

  const setActive = useCallback((active: string) => {
    setState(prev => ({ ...prev, active }))
  }, [])

  const setSettingsOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, settingsOpen: open }))
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }))
  }, [])

  const setHistorySearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, historySearch: search }))
  }, [])

  const setHistoryMenuId = useCallback((id: string) => {
    setState(prev => ({ ...prev, historyMenuId: id }))
  }, [])

  const setAttachmentMenuOpen = useCallback((open: boolean, position?: { left: number; top: number }) => {
    setState(prev => ({
      ...prev,
      attachmentMenuOpen: open,
      attachmentMenuPosition: open ? position || null : null,
    }))
  }, [])

  const setDarkMode = useCallback((dark: boolean) => {
    setState(prev => ({ ...prev, darkMode: dark }))
  }, [])

  const setModelInfo = useCallback((info: AppState['modelInfo']) => {
    setState(prev => ({ ...prev, modelInfo: info }))
  }, [])

  const setModelInfoOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, modelInfoOpen: open }))
  }, [])

  const setDirty = useCallback((dirty: boolean) => {
    setState(prev => ({ ...prev, dirty }))
  }, [])

  const setBusy = useCallback((busy: boolean) => {
    setState(prev => ({ ...prev, busy }))
  }, [])

  const setStatus = useCallback((status: AppState['status']) => {
    setState(prev => ({ ...prev, status }))
  }, [])

  const setLogs = useCallback((logs: AppState['logs']) => {
    setState(prev => ({ ...prev, logs }))
  }, [])

  useEffect(() => {
    if (state.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [state.darkMode])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  return {
    state,
    setToast,
    patchFromBackend,
    saveCurrentSession,
    openSession,
    startFreshSession,
    updateConfig,
    updateChatInput,
    addAttachments,
    removeAttachment,
    clearAttachments,
    addChatMessage,
    updateChatMessage,
    removeChatMessage,
    setChatMessages,
    setChatBusy,
    setStreamRequestId,
    setView,
    setActive,
    setSettingsOpen,
    setSidebarCollapsed,
    setHistorySearch,
    setHistoryMenuId,
    setAttachmentMenuOpen,
    setDarkMode,
    setModelInfo,
    setModelInfoOpen,
    setDirty,
    setBusy,
    setStatus,
    setLogs,
  }
}

export type AppStateActions = ReturnType<typeof useAppState>