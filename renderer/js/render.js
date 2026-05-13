import { state } from './state.js'
import { getAppEl } from './constants.js'
import { escapeHtml, escapeAttribute, isNearBottom } from './utils.js'
import { 
  modelName, 
  statusLabel, 
  statusClass, 
  compactStatusMessage,
  shortTime,
  visibleLogs,
  visibleTerminalLogs,
  scrollOpenRawOutputs,
} from './messages.js'
import { renderChat } from './chat.js'
import { renderModernSettingsPanel } from './settings.js'
import { 
  renderPreviewModal, 
  renderHistoryDialog, 
  renderModelInfoModal, 
  renderAttachmentMenuPortal,
} from './components.js'
import { renderSidebarToggleIcon } from './icons.js'
import { tabScrollPositions } from './events.js'

const domCache = {
  chatFeed: null,
  chatInput: null,
  serviceBar: null,
  sidebar: null,
  toast: null,
}

function renderSidebarLogs() {
  const logs = state.logs?.slice(-80) || []
  if (!logs.length) {
    return '<div class="terminal-empty">还没有终端日志。启动服务后，这里会实时出现 llama.cpp 输出。</div>'
  }

  return logs
    .reverse()
    .map(entry => `
      <button type="button" class="terminal-item" data-action="open-log-settings">
        <span>${escapeHtml(shortTime(entry.at))}</span>
        <strong>${escapeHtml(entry.source || 'log')}</strong>
        <em>${escapeHtml(entry.line || '')}</em>
      </button>
    `)
    .join('')
}

function renderSidebar() {
  const query = state.historySearch.trim().toLowerCase()
  const sessions = state.sessions
    .filter(session => !query || String(session.title || '').toLowerCase().includes(query))
    .slice(0, 28)
    .map(session => `
      <div class="history-row ${session.id === state.currentSessionId ? 'active' : ''}">
        <button type="button" class="history-item" data-session="${escapeHtml(session.id)}" title="${escapeAttribute(session.title || '')}">
          <strong>${escapeHtml(session.title || '新聊天')}</strong>
          <span>${escapeHtml(shortTime(session.updatedAt))}</span>
        </button>
        <button type="button" class="history-more" data-action="toggle-history-menu" data-session-id="${escapeHtml(session.id)}" title="More">...</button>
        ${
          state.historyMenuId === session.id
            ? `<div class="history-menu">
                <button type="button" data-action="history-edit" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#9998;</span>Edit</button>
                <button type="button" data-action="history-export" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#8681;</span>Export</button>
                <button type="button" class="danger" data-action="history-delete" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#128465;</span>Delete</button>
              </div>`
            : ''
        }
      </div>
    `)
    .join('')

  return `
    <aside class="sidebar">
      <div class="brand-row">
        <div class="app-mark">Ai</div>
        <div class="brand-copy">
          <strong>AI本地部署工具</strong>
        </div>
      </div>

      <button type="button" class="side-action ${state.view === 'chat' && state.chatMessages.length === 0 ? 'active' : ''}" data-action="new-chat">新聊天</button>
      <button type="button" class="side-action ${state.sidebarPanel === 'chats' ? 'active' : ''}" data-action="focus-chat">搜索对话</button>
      <button type="button" class="side-action ${state.view === 'terminal' ? 'active' : ''}" data-action="show-terminal">终端日志</button>

      <input class="history-search" data-history-search placeholder="搜索历史对话..." value="${escapeHtml(state.historySearch)}" />

      <div class="side-section-label">历史对话</div>
      <div class="history-list">
        ${sessions || '<div class="terminal-empty">还没有历史对话。发出第一条消息后会自动保存。</div>'}
      </div>

      <div class="side-bottom">
        <button type="button" class="theme-toggle-btn" data-action="toggle-theme" title="${state.darkMode ? '切换到浅色模式' : '切换到深色模式'}">
          <span>${state.darkMode ? '☀' : '☽'}</span>
          <span>${state.darkMode ? '浅色模式' : '深色模式'}</span>
        </button>
        <button type="button" class="settings-btn" data-action="toggle-settings" title="打开设置">
          <span>⚙</span>
          <span>设置</span>
        </button>
        <button type="button" class="status-card">
          <span class="status-dot ${statusClass()}"></span>
          <span>
            <strong>${statusLabel()}</strong>
            <em>${escapeHtml(state.status.url || '')}</em>
          </span>
        </button>
      </div>
    </aside>
  `
}

function renderTerminalPanel() {
  const allLogs = state.logs || []
  const logs = allLogs.slice(-500)
  const hiddenCount = Math.max(0, allLogs.length - logs.length)
  const logRows = logs.length
    ? logs.map(line => `<div class="terminal-line">${escapeHtml(line)}</div>`).join('')
    : '<div class="terminal-line terminal-muted">Waiting for llama.cpp server output...</div>'

  return `
    <section class="terminal-screen">
      <div class="terminal-head">
        <div>
          <span>终端日志</span>
          <strong>llama.cpp server output</strong>
        </div>
        <button type="button" class="outline-btn" data-action="return-chat">回到聊天</button>
      </div>
      <div class="terminal-summary">
        <span>正常终端视图：只显示 llama.cpp/server/runtime 输出。</span>
        ${hiddenCount ? `<strong>已隐藏 ${hiddenCount} 条聊天回显、JSON chunk、prompt 或轮询日志。</strong>` : ''}
      </div>
      <div class="terminal-console" id="inlineLogBox">${logRows}</div>
    </section>
  `
}

function performFullRender(options = {}) {
  const previousFeed = document.getElementById('chatFeed')
  const previousFeedTop = previousFeed?.scrollTop || 0
  const previousFeedHeight = previousFeed?.scrollHeight || 0
  const shouldStick = options.stickToBottom ?? isNearBottom(previousFeed)

  // 保存设置面板当前 tab 的滚动位置（innerHTML 替换会销毁 DOM）
  const previousSettingsBody = document.querySelector('.settings-body')
  if (previousSettingsBody && state.settingsOpen) {
    const tabId = state.active || 'overview'
    tabScrollPositions[tabId] = previousSettingsBody.scrollTop
  }

  const running = state.status.state === 'running' || state.status.state === 'starting'
  getAppEl().innerHTML = `
    <div class="drag-region">
      <button type="button" class="sidebar-toggle" data-action="toggle-sidebar" title="${state.sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'}">${renderSidebarToggleIcon()}</button>
    </div>
    <div class="app-shell ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
      ${renderSidebar()}
      <main class="main-area">
        ${state.view === 'terminal' ? renderTerminalPanel() : renderChat()}
        <footer class="service-bar">
          <div class="service-left">
            <span class="status-dot ${statusClass()}"></span>
            <span>${statusLabel()} · ${escapeHtml(compactStatusMessage(state.status.message || ''))}</span>
            <code>${escapeHtml(state.status.url || '')}</code>
          </div>
          <div class="service-actions">
            <button class="outline-btn" type="button" data-action="save" ${state.busy ? 'disabled' : ''}>保存配置</button>
            <button class="outline-btn" type="button" data-action="health">检查端口</button>
            ${
              running
                ? `<button class="danger-btn" type="button" data-action="stop" ${state.busy ? 'disabled' : ''}>停止服务</button>`
                : `<button class="primary-btn" type="button" data-action="start" ${state.busy ? 'disabled' : ''}>保存并启动</button>`
            }
          </div>
        </footer>
      </main>
      ${renderModernSettingsPanel()}
    </div>
    ${renderPreviewModal()}
    ${renderModelInfoModal()}
    ${renderHistoryDialog()}
    ${renderAttachmentMenuPortal()}
    <div class="toast ${state.toast ? 'show' : ''}">${escapeHtml(state.toast)}</div>
  `

  domCache.chatFeed = document.getElementById('chatFeed')
  domCache.chatInput = document.querySelector('[data-chat-input]')
  domCache.serviceBar = document.querySelector('.service-bar')
  domCache.sidebar = document.querySelector('.sidebar')
  domCache.toast = document.querySelector('.toast')

  restoreScrollPosition(options, previousFeed, previousFeedTop, previousFeedHeight, shouldStick)
  applyDarkMode()

  // 全量渲染后：直接在 .chat-feed 上绑定滚动监听，并更新按钮状态和位置
  if (window.__attachChatFeedScroll) window.__attachChatFeedScroll()
  if (window.__updateScrollToBottomBtn) window.__updateScrollToBottomBtn()
}

function performIncrementalUpdate(options = {}) {
  if (options.updateToast && domCache.toast) {
    domCache.toast.textContent = escapeHtml(state.toast)
    domCache.toast.classList.toggle('show', !!state.toast)
    return
  }

  if (options.updateServiceBar && domCache.serviceBar) {
    const running = state.status.state === 'running' || state.status.state === 'starting'
    domCache.serviceBar.innerHTML = `
      <div class="service-left">
        <span class="status-dot ${statusClass()}"></span>
        <span>${statusLabel()} · ${escapeHtml(compactStatusMessage(state.status.message || ''))}</span>
        <code>${escapeHtml(state.status.url || '')}</code>
      </div>
      <div class="service-actions">
        <button class="outline-btn" type="button" data-action="save" ${state.busy ? 'disabled' : ''}>保存配置</button>
        <button class="outline-btn" type="button" data-action="health">检查端口</button>
        ${
          running
            ? `<button class="danger-btn" type="button" data-action="stop" ${state.busy ? 'disabled' : ''}>停止服务</button>`
            : `<button class="primary-btn" type="button" data-action="start" ${state.busy ? 'disabled' : ''}>保存并启动</button>`
        }
      </div>
    `
    return
  }

  if (options.updateSidebar && domCache.sidebar) {
    // 只更新历史列表部分，不重新渲染搜索框，避免干扰输入法
    const historyList = document.querySelector('.history-list')
    if (historyList) {
      const query = state.historySearch.trim().toLowerCase()
      const sessions = state.sessions
        .filter(session => !query || String(session.title || '').toLowerCase().includes(query))
        .slice(0, 28)
        .map(session => {
          const isActive = session.id === state.currentSessionId
          return `
            <div class="history-row ${isActive ? 'active' : ''}">
              <button type="button" class="history-item" data-session="${escapeHtml(session.id)}" title="${escapeAttribute(session.title || '')}">
                <strong>${escapeHtml(session.title || '新聊天')}</strong>
                <span>${escapeHtml(shortTime(session.updatedAt))}</span>
              </button>
              <button type="button" class="history-more" data-action="toggle-history-menu" data-session-id="${escapeHtml(session.id)}" title="More">...</button>
              ${
                state.historyMenuId === session.id
                  ? `<div class="history-menu">
                      <button type="button" data-action="history-edit" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#9998;</span>Edit</button>
                      <button type="button" data-action="history-export" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#8681;</span>Export</button>
                      <button type="button" class="danger" data-action="history-delete" data-session-id="${escapeHtml(session.id)}"><span class="history-menu-icon">&#128465;</span>Delete</button>
                    </div>`
                  : ''
              }
            </div>
          `
        })
        .join('')

      historyList.innerHTML = sessions || '<div class="terminal-empty">还没有历史对话。发出第一条消息后会自动保存。</div>'
    }
    return
  }

  if (options.updateChatInput && domCache.chatInput) {
    const wasFocused = domCache.chatInput === document.activeElement
    const cursorPos = domCache.chatInput.selectionStart
    domCache.chatInput.value = escapeHtml(state.chatInput)
    if (wasFocused) {
      domCache.chatInput.focus()
      domCache.chatInput.setSelectionRange(cursorPos, cursorPos)
    }
    return
  }

  if (options.updateComposerAttachments) {
    const composerWrapEl = document.querySelector('.composer-wrap')
    if (composerWrapEl) {
      // 移除旧的附件
      const existingAttachments = composerWrapEl.querySelectorAll('[data-kind]')
      existingAttachments.forEach(el => el.remove())
      const existingRows = composerWrapEl.querySelectorAll('.attachment-row')
      existingRows.forEach(el => el.remove())
      
      // 添加新的附件
      const newAttachmentHtml = window.appRenderAttachmentChips(state.attachments, true, 'composer')
      if (newAttachmentHtml) {
        const composerEl = composerWrapEl.querySelector('.composer')
        if (composerEl) {
          composerEl.insertAdjacentHTML('beforebegin', newAttachmentHtml)
        }
      }
    }
    return
  }

  if (options.appendMessage !== undefined) {
    const index = options.appendMessage
    const message = state.chatMessages[index]
    if (message && domCache.chatFeed) {
      const content = window.appRenderMessageContent(message, index)
      const attachments = window.appRenderAttachmentChips(message.attachments || [], false, message.role)
      const body = message.role === 'user'
        ? `
            ${attachments}
            ${content ? `<div class="bubble">${content}</div>` : ''}
          `
        : `
            <div class="bubble">
              ${content}
            </div>
            ${attachments}
          `

      const article = document.createElement('article')
      article.className = `message ${escapeHtml(message.role)}`
      article.dataset.messageIndex = index
      article.innerHTML = `
        <div class="avatar">${message.role === 'user' ? '你' : message.role === 'assistant' ? 'll' : 'sys'}</div>
        <div class="message-body">
          ${body}
          ${window.appRenderMessageMeta ? window.appRenderMessageMeta(message) : ''}
          ${window.appRenderMessageActions ? window.appRenderMessageActions(index, message) : ''}
        </div>
      `
      domCache.chatFeed.appendChild(article)
      
      if (options.jumpToBottom || isNearBottom(domCache.chatFeed)) {
        domCache.chatFeed.scrollTop = domCache.chatFeed.scrollHeight
      }
    }
    return
  }

  if (options.updateMessage !== undefined) {
    const index = options.updateMessage
    const message = state.chatMessages[index]
    if (message && domCache.chatFeed) {
      const selector = `[data-message-index="${index}"]`
      const el = domCache.chatFeed.querySelector(selector)
      if (el) {
        el.innerHTML = window.appRenderMessageContent(message, index)
      }
    }
    return
  }

  performFullRender(options)
}

function restoreScrollPosition(options, previousFeed, previousFeedTop, previousFeedHeight, shouldStick) {
  const chatFeed = document.getElementById('chatFeed')
  if (chatFeed) {
    if (options.jumpToBottom) {
      chatFeed.scrollTop = chatFeed.scrollHeight
      scrollOpenRawOutputs(chatFeed)
    } else if (previousFeed) {
      if (options.preserveChatScroll) {
        chatFeed.scrollTop = previousFeedTop
        scrollOpenRawOutputs(chatFeed)
      } else if (shouldStick && previousFeedHeight === previousFeed.scrollHeight) {
        chatFeed.scrollTop = chatFeed.scrollHeight
        scrollOpenRawOutputs(chatFeed)
      } else {
        chatFeed.scrollTop = previousFeedTop
        scrollOpenRawOutputs(chatFeed)
      }
    }
  }

  const logBox = document.getElementById('logBox')
  if (logBox) logBox.scrollTop = logBox.scrollHeight
  const inlineLogBox = document.getElementById('inlineLogBox')
  if (inlineLogBox) inlineLogBox.scrollTop = inlineLogBox.scrollHeight
  const historyList = document.querySelector('.history-list')
  if (historyList && options.resetHistoryScroll) historyList.scrollTop = 0

  const settingsBody = document.querySelector('.settings-body')
  const currentTabId = state.active || 'overview'
  if (settingsBody && state.settingsOpen) {
    const savedScroll = tabScrollPositions[currentTabId]
    if (savedScroll !== undefined && savedScroll > 0) {
      settingsBody.scrollTop = savedScroll
      setTimeout(() => { settingsBody.scrollTop = savedScroll }, 0)
    }
  }
}

function applyDarkMode() {
  if (state.darkMode) {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
}

function render(options = {}) {
  if (!state.config) {
    getAppEl().innerHTML = '<div class="boot">正在读取配置...</div>'
    return
  }

  if (options.fullRender || !domCache.chatFeed) {
    performFullRender(options)
    return
  }

  performIncrementalUpdate(options)
}

export {
  render,
  renderSidebar,
  renderTerminalPanel,
  restoreScrollPosition,
  applyDarkMode,
}
