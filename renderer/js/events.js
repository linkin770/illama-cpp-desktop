import { state } from './state.js'
import { getAppEl } from './constants.js'
import { setToast } from './ui.js'
import { 
  openSession, 
  startFreshSession, 
  loadSessions,
  persistSessions, 
  saveCurrentSession,
  makeSessionId,
  getCodeBlock,
} from './messages.js'
import { localNumberValue } from './utils.js'

let tabScrollPositions = {}

export function setupEventListeners() {
  getAppEl().addEventListener('click', async event => {
    const target = event.target.closest('button, .settings-backdrop, .preview-backdrop, .dialog-backdrop, .attach-menu-backdrop')
    
    // 点击空白处关闭 history-menu
    if (!target) {
      if (state.historyMenuId) {
        state.historyMenuId = ''
        window.appRender({ preserveChatScroll: true })
      }
      return
    }

    const seed = target.dataset.seed
    if (seed) {
      state.chatInput = seed
      state.active = 'chat'
      state.view = 'chat'
      window.appRender()
      return
    }

    const sessionId = target.dataset.session
    if (sessionId) {
      openSession(sessionId)
      window.appRender({ jumpToBottom: true })
      return
    }

    const section = target.dataset.section
    if (section) {
      const previousSettingsBody = document.querySelector('.settings-body')
      const currentTabId = state.active || 'overview'
      if (previousSettingsBody && state.settingsOpen) {
        tabScrollPositions[currentTabId] = previousSettingsBody.scrollTop
      }
      state.active = section
      state.settingsOpen = true
      window.appRender()
      return
    }

    const action = target.dataset.action
    if (action === 'toggle-history-menu') {
      state.historyMenuId = state.historyMenuId === target.dataset.sessionId ? '' : target.dataset.sessionId
      window.appRender({ preserveChatScroll: true })
    }
    if (action === 'open-model-info') {
      void window.appOpenModelInfo()
      return
    }
    if (action === 'close-model-info') {
      state.modelInfoOpen = false
      window.appRender({ preserveChatScroll: true })
      return
    }
    if (action === 'copy-model-info') {
      void navigator.clipboard.writeText(String(target.dataset.copy || ''))
      setToast('已复制到剪贴板')
      return
    }
    if (action === 'copy-launch-command') {
      const command = state.launch?.preview || ''
      if (command && !state.launch?.error) {
        void navigator.clipboard.writeText(command)
        setToast('启动命令已复制')
      }
      return
    }
    if (action === 'history-edit') {
      const session = state.sessions.find(item => item.id === target.dataset.sessionId)
      if (session) {
        state.historyDialog = { type: 'edit', sessionId: session.id }
        state.historyMenuId = ''
        window.appRender({ preserveChatScroll: true })
        setTimeout(() => document.querySelector('[data-history-title-input]')?.focus(), 0)
      }
    }
    if (action === 'history-export') {
      const session = state.sessions.find(item => item.id === target.dataset.sessionId)
      if (session) {
        state.historyMenuId = ''
        window.appRender({ preserveChatScroll: true, updateSidebar: true })
        const content = JSON.stringify(session, null, 2)
        const defaultName = `${session.title || 'conversation'}.json`
        const result = await window.llamaDesktop.saveFile({
          content,
          defaultPath: defaultName,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'Text Files', extensions: ['txt'] },
          ],
        })
        if (result.ok) {
          setToast(`对话已导出到: ${result.filePath}`)
        } else if (!result.canceled) {
          setToast(`导出失败: ${result.error}`)
        }
      }
    }
    if (action === 'history-delete') {
      state.historyDialog = { type: 'delete', sessionId: target.dataset.sessionId }
      state.historyMenuId = ''
      window.appRender({ preserveChatScroll: true })
    }
    if (action === 'close-history-dialog') {
      state.historyDialog = null
      window.appRender({ preserveChatScroll: true })
    }
    if (action === 'history-save-title') {
      const session = state.sessions.find(item => item.id === target.dataset.sessionId)
      const input = document.querySelector('[data-history-title-input]')
      const nextTitle = String(input?.value || '').trim()
      if (session && nextTitle) {
        session.title = nextTitle.slice(0, 80)
        session.updatedAt = Date.now()
        state.historyDialog = null
        persistSessions()
        window.appRender({ preserveChatScroll: true, resetHistoryScroll: true })
      }
    }
    if (action === 'history-confirm-delete') {
      const sessionId = target.dataset.sessionId
      state.sessions = state.sessions.filter(item => item.id !== sessionId)
      if (state.currentSessionId === sessionId) {
        state.currentSessionId = makeSessionId()
        state.chatMessages = []
        state.chatInput = ''
        state.attachments = []
      }
      state.historyDialog = null
      persistSessions()
      window.appRender({ jumpToBottom: true, resetHistoryScroll: true })
    }
    if (action === 'toggle-settings') {
      if (state.settingsOpen) {
        const previousSettingsBody = document.querySelector('.settings-body')
        const currentTabId = state.active || 'overview'
        if (previousSettingsBody) {
          tabScrollPositions[currentTabId] = previousSettingsBody.scrollTop
        }
      }
      state.settingsOpen = !state.settingsOpen
      state.attachmentMenuOpen = false
      state.attachmentMenuPosition = null
      window.appRender()
    }
    if (action === 'toggle-theme') {
      state.darkMode = !state.darkMode
      void window.llamaDesktop.setTheme(state.darkMode)
      window.appRender()
      return
    }
    if (action === 'toggle-attachment-menu') {
      if (state.attachmentMenuOpen) {
        state.attachmentMenuOpen = false
        state.attachmentMenuPosition = null
      } else {
        const rect = target.getBoundingClientRect()
        const menuWidth = 206
        const menuHeight = 252
        let left = rect.left - menuWidth / 2 + rect.width / 2
        let top = rect.top - menuHeight - 8
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        if (left < 8) left = 8
        if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8
        if (top < 8) top = rect.bottom + 8
        if (top + menuHeight > viewportHeight - 8) top = viewportHeight - menuHeight - 8
        state.attachmentMenuPosition = { left, top }
        state.attachmentMenuOpen = true
      }
      window.appRender()
      return
    }
    if (action === 'close-attachment-menu') {
      state.attachmentMenuOpen = false
      state.attachmentMenuPosition = null
      window.appRender()
      return
    }
    if (action === 'copy-code') {
      const block = getCodeBlock(target.dataset.messageIndex, target.dataset.codeIndex)
      if (block) {
        void navigator.clipboard.writeText(block.value || '')
        setToast('代码已复制到剪贴板')
      }
    }
    if (action === 'preview-code') {
      const block = getCodeBlock(target.dataset.messageIndex, target.dataset.codeIndex)
      if (block) {
        state.preview = {
          type: 'code',
          code: block.value || '',
          language: block.language || 'html',
          title: `${String(block.language || 'HTML').toUpperCase()} 预览`,
        }
        window.appRender({ preserveChatScroll: true })
      }
    }
    if (action === 'preview-image') {
      state.preview = {
        type: 'image',
        src: target.dataset.src || '',
        title: target.dataset.title || '图片预览',
      }
      window.appRender({ preserveChatScroll: true })
    }
    if (action === 'close-preview') {
      state.preview = null
      window.appRender({ preserveChatScroll: true })
    }
    if (action === 'pick-file') void window.appPickAttachment('file')
    if (action === 'pick-image') void window.appPickAttachment('image')
    if (action === 'pick-audio') void window.appPickAttachment('audio')
    if (action === 'pick-text') void window.appPickAttachment('text')
    if (action === 'pick-pdf') void window.appPickAttachment('pdf')
    if (action === 'insert-system-message') {
      if (!state.currentSessionId) state.currentSessionId = makeSessionId()
      state.chatMessages.push({
        role: 'system',
        content: '系统消息：请在这里写给模型的长期要求，发送下一条消息时会一起带上。',
        createdAt: Date.now(),
      })
      state.attachmentMenuOpen = false
      state.attachmentMenuPosition = null
      saveCurrentSession()
      window.appRender()
    }
    if (action === 'remove-attachment') {
      state.attachments.splice(Number(target.dataset.index), 1)
      window.appRender()
    }
    if (action === 'copy-message') {
      const message = state.chatMessages[Number(target.dataset.index)]
      if (message) {
        void navigator.clipboard.writeText(message.content || '')
        setToast('已复制到剪贴板')
      }
    }
    if (action === 'edit-message') {
      const index = Number(target.dataset.index)
      const message = state.chatMessages[index]
      if (message) {
        state.chatInput = message.content || ''
        state.attachments = message.attachments || []
        state.chatMessages.splice(index, 1)
        saveCurrentSession()
        window.appRender()
        setTimeout(() => document.querySelector('[data-chat-input]')?.focus(), 0)
      }
    }
    if (action === 'delete-message') {
      state.chatMessages.splice(Number(target.dataset.index), 1)
      saveCurrentSession()
      window.appRender()
    }
    if (action === 'retry-message') void window.appRetryMessage(Number(target.dataset.index))
    if (action === 'close-settings') {
      state.settingsOpen = false
      window.appRender()
    }
    if (action === 'toggle-sidebar') {
      state.sidebarCollapsed = !state.sidebarCollapsed
      window.appRender()
    }
    if (action === 'focus-chat') {
      state.active = 'chat'
      state.view = 'chat'
      state.sidebarPanel = 'chats'
      window.appRender({ resetHistoryScroll: true })
      setTimeout(() => {
        const search = document.querySelector('[data-history-search]')
        search?.focus()
        search?.select?.()
      }, 0)
    }
    if (action === 'return-chat') {
      state.active = 'chat'
      state.view = 'chat'
      state.sidebarPanel = 'chats'
      window.appRender()
      setTimeout(() => document.querySelector('[data-chat-input]')?.focus(), 0)
    }
    if (action === 'show-terminal') {
      state.view = 'terminal'
      state.sidebarPanel = 'chats'
      state.attachmentMenuOpen = false
      window.appRender()
    }
    if (action === 'open-log-settings') {
      state.active = 'logs'
      state.settingsOpen = true
      state.view = 'terminal'
      state.sidebarPanel = 'chats'
      window.appRender()
    }
    if (action === 'new-chat') {
      startFreshSession()
      window.appRender()
    }
    if (action === 'save') void window.appSave()
    if (action === 'start') void window.appStart()
    if (action === 'stop') void window.appStop()
    if (action === 'health') void window.appHealth()
    if (action === 'send-chat') void window.appSendChat()
    if (action === 'abort-chat') void window.appAbortChat()
  })

  getAppEl().addEventListener('input', event => {
    const input = event.target
    if (input.dataset?.chatInput !== undefined) {
      state.chatInput = input.value
      window.appUpdateSendButton()
      return
    }

    if (input.dataset?.historySearch !== undefined) {
      state.historySearch = input.value
      state.historyMenuId = ''
      // 只更新侧边栏，不要全量渲染，避免搜索框失去焦点
      window.appRender({ updateSidebar: true })
      return
    }

    const name = input.dataset?.field
    if (!name) return

    if (input.type === 'checkbox') {
      state.config[name] = input.checked
    } else if (input.type === 'number') {
      state.config[name] = localNumberValue(input)
    } else {
      state.config[name] = input.value
    }
    if (name === 'llama_bin_dir') {
      state.config.llama_server_path = `${String(input.value || '').replace(/[\\/]+$/, '')}\\llama-server.exe`
    }
    state.dirty = true
  })

  getAppEl().addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.historyDialog) {
      state.historyDialog = null
      window.appRender({ preserveChatScroll: true })
      return
    }
    if (event.key === 'Escape' && state.modelInfoOpen) {
      state.modelInfoOpen = false
      window.appRender({ preserveChatScroll: true })
      return
    }
    if (event.target?.dataset?.historyTitleInput !== undefined && event.key === 'Enter') {
      event.preventDefault()
      document.querySelector('[data-action="history-save-title"]')?.click()
      return
    }
    if (event.target?.dataset?.chatInput !== undefined && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void window.appSendChat()
    }
  })
}
