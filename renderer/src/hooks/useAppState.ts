// 应用状态管理 Hook - 管理整个应用的状态和交互
import { useState, useCallback, useEffect, useRef } from 'react'
import type { AppState, Config, ChatMessage, Session } from '../types'

// 默认应用状态
const defaultState: AppState = {
  active: 'overview',
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

// localStorage 会话存储的键名
const SESSIONS_KEY = 'llama.cpp.desktop.sessions'

// 从 localStorage 加载会话历史
function loadSessions(): Session[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// 将会话历史保存到 localStorage（最多保留 80 条）
function persistSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 80)))
}

// 生成唯一的会话 ID
function makeSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 从消息列表中提取会话标题（取第一条用户消息）
function titleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find(msg => msg.role === 'user' && String(msg.content || '').trim())
  return String(firstUser?.content || '新聊天').replace(/\s+/g, ' ').slice(0, 36)
}

// 应用状态 Hook
export function useAppState() {
  // 初始化状态，从 localStorage 加载会话历史
  const [state, setState] = useState<AppState>(() => ({
    ...defaultState,
    sessions: loadSessions(),
    currentSessionId: makeSessionId(),
  }))

  // Toast 定时器引用
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 显示 Toast 提示（自动在 2.8 秒后消失）
  const setToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setState(prev => ({ ...prev, toast: message }))
    toastTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, toast: '' }))
    }, 2800)
  }, [])

  // 从后端更新状态（配置、验证、服务状态、日志等）
  const patchFromBackend = useCallback((payload: Partial<Pick<AppState, 'config' | 'validation' | 'status' | 'logs' | 'launch'>>) => {
    setState(prev => ({
      ...prev,
      ...payload,
      dirty: false,
    }))
  }, [])

  // 保存当前会话到历史
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

  // 打开历史会话
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

  // 开始新会话
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

  // 重命名会话
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setState(prev => {
      const updatedSessions = prev.sessions.map(s =>
        s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
      )
      persistSessions(updatedSessions)
      return { ...prev, sessions: updatedSessions }
    })
  }, [])

  // 删除会话
  const deleteSession = useCallback((sessionId: string) => {
    setState(prev => {
      const updatedSessions = prev.sessions.filter(s => s.id !== sessionId)
      persistSessions(updatedSessions)
      if (prev.currentSessionId === sessionId) {
        const newId = makeSessionId()
        return {
          ...prev,
          sessions: updatedSessions,
          currentSessionId: newId,
          chatMessages: [],
          chatInput: '',
          attachments: [],
          attachmentMenuOpen: false,
        }
      }
      return { ...prev, sessions: updatedSessions }
    })
  }, [])

  // 更新配置项
  const updateConfig = useCallback((key: keyof Config, value: unknown) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value },
      dirty: true,
    }))
  }, [])

  // 更新聊天输入框内容
  const updateChatInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, chatInput: value }))
  }, [])

  // 添加附件
  const addAttachments = useCallback((attachments: AppState['attachments']) => {
    setState(prev => ({ ...prev, attachments: [...prev.attachments, ...attachments] }))
  }, [])

  // 移除附件
  const removeAttachment = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }, [])

  // 清空所有附件
  const clearAttachments = useCallback(() => {
    setState(prev => ({ ...prev, attachments: [] }))
  }, [])

  // 添加聊天消息
  const addChatMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, message],
    }))
  }, [])

  // 更新聊天消息（支持函数式更新）
  const updateChatMessage = useCallback((index: number, updates: Partial<ChatMessage> | ((prev: ChatMessage) => Partial<ChatMessage>)) => {
    setState(prev => ({
      ...prev,
      chatMessages: prev.chatMessages.map((msg, i) =>
        i === index ? { ...msg, ...(typeof updates === 'function' ? updates(msg) : updates) } : msg
      ),
    }))
  }, [])

  // 移除聊天消息
  const removeChatMessage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      chatMessages: prev.chatMessages.filter((_, i) => i !== index),
    }))
  }, [])

  // 设置聊天消息列表
  const setChatMessages = useCallback((messages: ChatMessage[]) => {
    setState(prev => ({ ...prev, chatMessages: messages }))
  }, [])

  // 设置聊天是否忙碌
  const setChatBusy = useCallback((busy: boolean) => {
    setState(prev => ({ ...prev, chatBusy: busy }))
  }, [])

  // 设置流式请求 ID
  const setStreamRequestId = useCallback((id: string) => {
    setState(prev => ({ ...prev, streamRequestId: id }))
  }, [])

  // 切换视图（聊天/终端）
  const setView = useCallback((view: 'chat' | 'terminal') => {
    setState(prev => ({ ...prev, view }))
  }, [])

  // 设置当前激活面板
  const setActive = useCallback((active: string) => {
    setState(prev => ({ ...prev, active }))
  }, [])

  // 设置设置面板是否打开
  const setSettingsOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, settingsOpen: open }))
  }, [])

  // 设置侧边栏是否折叠
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }))
  }, [])

  // 设置历史搜索词
  const setHistorySearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, historySearch: search }))
  }, [])

  // 设置历史菜单 ID
  const setHistoryMenuId = useCallback((id: string) => {
    setState(prev => ({ ...prev, historyMenuId: id }))
  }, [])

  // 设置附件菜单是否打开及位置
  const setAttachmentMenuOpen = useCallback((open: boolean, position?: { left: number; top: number }) => {
    setState(prev => ({
      ...prev,
      attachmentMenuOpen: open,
      attachmentMenuPosition: open ? position || null : null,
    }))
  }, [])

  // 设置深色模式
  const setDarkMode = useCallback((dark: boolean) => {
    setState(prev => ({ ...prev, darkMode: dark }))
  }, [])

  // 设置模型信息
  const setModelInfo = useCallback((info: AppState['modelInfo']) => {
    setState(prev => ({ ...prev, modelInfo: info }))
  }, [])

  // 设置模型信息面板是否打开
  const setModelInfoOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, modelInfoOpen: open }))
  }, [])

  // 设置是否有未保存的更改
  const setDirty = useCallback((dirty: boolean) => {
    setState(prev => ({ ...prev, dirty }))
  }, [])

  // 设置是否忙碌
  const setBusy = useCallback((busy: boolean) => {
    setState(prev => ({ ...prev, busy }))
  }, [])

  // 设置服务状态
  const setStatus = useCallback((status: AppState['status']) => {
    setState(prev => ({ ...prev, status }))
  }, [])

  // 设置日志列表
  const setLogs = useCallback((logs: AppState['logs']) => {
    setState(prev => ({ ...prev, logs }))
  }, [])

  // 监听深色模式变化，同步到 body 类名
  useEffect(() => {
    if (state.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [state.darkMode])

  // 组件卸载时清理 Toast 定时器
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  // 返回状态和所有操作方法
  return {
    state,
    setToast,
    patchFromBackend,
    saveCurrentSession,
    openSession,
    startFreshSession,
    renameSession,
    deleteSession,
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

// 应用状态操作类型
export type AppStateActions = ReturnType<typeof useAppState>