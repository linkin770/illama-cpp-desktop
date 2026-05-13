
import { sections, settingsTabs, getAppEl } from './js/constants.js'
import {
  currentSettingsTabId,
  currentSettingsTabMeta,
  pill,
  field,
  selectField,
  switchField,
  renderModernSettingsPanel,
} from './js/settings.js'
import {
  renderPreviewModal,
  renderHistoryDialog,
  renderModelInfoModal,
  renderAttachmentMenuPortal,
  buildBetterModelInfoRows,
} from './js/components.js'
import { state } from './js/state.js'
import {
  escapeHtml,
  escapeAttribute,
  isNearBottom,
  basename,
  formatBytes,
  modelFamilyFromName,
  quantLabelFromName,
  paramScaleFromName,
  splitCodeParts,
  renderTextBlock,
  canPreviewCode,
  estimateTokens,
  splitThinkingOutput,
  highlightCode,
} from './js/utils.js'
import {
  renderCopyIcon,
  renderModelChipIcon,
  renderSidebarToggleIcon,
  renderGearIcon,
  renderSettingsTabIcon,
} from './js/icons.js'
import {
  modelName,
  statusLabel,
  statusClass,
  compactStatusMessage,
  friendlyErrorMessage,
  shortTime,
  makeSessionId,
  titleFromMessages,
  loadSessions,
  persistSessions,
  saveCurrentSession,
  buildApiMessages,
  openSession,
  startFreshSession,
  attachmentLabel,
  renderAttachmentItem,
  renderMessageActions,
  renderMessageMeta,
  renderMessageContent,
  renderCodeAwareText,
  getCodeBlock,
  scrollOpenRawOutputs,
  stickStreamingMessage,
  updateLiveStats,
  updateMessageDom,
  compactLogLineForDisplay,
  visibleLogs,
  terminalLineForDisplay,
  visibleTerminalLogs,
} from './js/messages.js'
import {
  renderChat,
  applyStreamDelta,
  renderAttachmentChips,
} from './js/chat.js'
import { updateSendButton } from './js/ui.js'
import { setupEventListeners } from './js/events.js'
import { initChatNav, refreshChatNav } from './js/nav.js'
import { 
  render, 
  renderSidebar, 
  renderTerminalPanel, 
  restoreScrollPosition, 
  applyDarkMode 
} from './js/render.js'











function openAttachmentMenu(button) {
  const rect = button.getBoundingClientRect()
  const menuWidth = 206
  const menuHeight = 252
  const gap = 8
  const minPad = 12
  const left = Math.min(Math.max(rect.left, minPad), window.innerWidth - menuWidth - minPad)
  const below = rect.bottom + gap
  const above = rect.top - menuHeight - gap
  const top = below + menuHeight < window.innerHeight - minPad
    ? below
    : Math.max(minPad, above)

  state.attachmentMenuOpen = true
  state.attachmentMenuPosition = {
    left: Math.round(left),
    top: Math.round(top),
  }
}

function renderSettingsSection(id, content) {
  return `<section class="settings-section ${state.active === id ? 'active' : ''}">${content}</section>`
}

function renderSettingsContent() {
  const v = state.validation || {}
  const checks = `
    <div class="checks">
      <div><span>配置文件</span>${pill(v.configExists)}</div>
      <div><span>启动器</span>${pill(v.launcherExists)}</div>
      <div><span>llama-server</span>${pill(v.serverExists)}</div>
      <div><span>模型文件</span>${pill(v.modelExists)}</div>
      <div><span>保存状态</span>${state.dirty ? '<span class="pill warn">未保存</span>' : '<span class="pill good">已保存</span>'}</div>
    </div>
  `

  return `
    ${renderSettingsSection('paths', `
      <div class="settings-note">这里控制桌面端调用哪个启动器，以及启动器使用哪个 llama-server.exe。</div>
      <div class="form-grid single">
        ${selectField('launch_mode', '启动方式', ['direct', 'launcher'], 'direct = 直接启动 llama-server.exe；launcher = 兼容旧启动器')}
        ${field('config_path', '配置文件', { pick: 'toml', hint: '默认使用启动器目录下的 config.toml。' })}
        ${field('launcher_path', '启动器 EXE', { pick: 'exe', hint: '桌面端启动服务时调用这个程序。' })}
        ${field('llama_server_path', 'llama-server.exe', { pick: 'exe', hint: '保存后写入 config.toml 的 llama_server_path。' })}
      </div>
    `)}

    ${renderSettingsSection('model', `
      <div class="settings-note">选择 GGUF 模型。纯文本模型可以不填 mmproj。</div>
      <div class="form-grid single">
        ${field('llama_bin_dir', 'llama.cpp 目录', { pick: 'dir', hint: '包含 llama-server.exe 和 CUDA/ggml DLL 的目录。' })}
        ${field('model', '模型文件', { pick: 'gguf', hint: '例如 Qwen3.5-9B.Q4_K_M.gguf。' })}
        ${field('mmproj', 'mmproj 投影文件', { pick: 'gguf', hint: '视觉或多模态模型才需要。' })}
        ${field('chat_template_kwargs', 'Chat Template Kwargs', { textarea: true, hint: '例如 {"enable_thinking": false}。' })}
      </div>
    `)}

    ${renderSettingsSection('runtime', `
      <div class="settings-note">给外部客户端接入时，通常保留 host=0.0.0.0 和 port=8080。</div>
      <div class="form-grid two">
        ${field('host', 'Host')}
        ${field('port', 'Port', { type: 'number', min: 1 })}
        ${field('ctx_size', '上下文长度 ctx_size', { type: 'number', min: 1 })}
        ${field('n_predict', '输出长度 n_predict', { type: 'number' })}
        ${field('n_gpu_layers', 'GPU 层数 n_gpu_layers', { type: 'number' })}
        ${field('request_timeout_ms', '请求超时 ms', { type: 'number', min: 30000 })}
        ${field('log_verbosity', '日志等级', { type: 'number' })}
      </div>
      <div class="switch-grid">
        ${switchField('verbose', '详细日志', '排查问题时打开。')}
        ${switchField('webui', 'llama.cpp Web UI', '不是桌面端主入口，但可保留。')}
        ${switchField('embeddings', 'Embeddings', '需要向量接口时打开。')}
        ${switchField('continuous_batching', 'Continuous batching', '多客户端请求更平稳。')}
      </div>
    `)}

    ${renderSettingsSection('sampling', `
      <div class="settings-note">这些参数影响回答风格和随机性。</div>
      <div class="form-grid two">
        ${field('temp', 'Temperature', { type: 'number' })}
        ${field('top_k', 'Top-K', { type: 'number' })}
        ${field('top_p', 'Top-P', { type: 'number' })}
        ${field('min_p', 'Min-P', { type: 'number' })}
        ${field('presence_penalty', 'Presence penalty', { type: 'number' })}
        ${field('repeat_penalty', 'Repeat penalty', { type: 'number' })}
      </div>
    `)}

    ${renderSettingsSection('system', `
      <div class="settings-note">没有明确需求时可以留空，由 llama.cpp 自动决定。</div>
      <div class="form-grid two">
        ${field('threads', 'Threads', { type: 'number' })}
        ${field('threads_batch', 'Threads batch', { type: 'number' })}
        ${field('batch_size', 'Batch size', { type: 'number' })}
        ${field('ubatch_size', 'Ubatch size', { type: 'number' })}
        ${selectField('split_mode', 'Split mode', ['', 'layer', 'row', 'none'])}
        ${field('tensor_split', 'Tensor split')}
        ${field('device', 'Device')}
        ${field('main_gpu', 'Main GPU', { type: 'number' })}
        ${field('n_cpu_moe', 'n_cpu_moe', { type: 'number' })}
      </div>
      <div class="switch-grid">${switchField('cpu_moe', 'MoE 权重保留在 CPU', '显存紧张时有用。')}</div>
    `)}

    ${renderSettingsSection('logs', `
      <div class="settings-note">ANSI 颜色码会被过滤，方便直接看真正的 llama.cpp 输出。</div>
      <div class="log-box" id="logBox">
        ${
          visibleLogs().length
            ? visibleLogs().map(entry => renderLogRow(entry, 'log-entry')).join('')
            : '<div class="empty-log">还没有日志。启动服务后会在这里显示。</div>'
        }
      </div>
    `)}

    ${state.active === 'chat' ? `
      <section class="settings-section active">
        <div class="settings-note">服务状态和接入信息。</div>
        ${checks}
        <div class="endpoint-box">
          <span>OpenAI Base URL</span>
          <strong>${escapeHtml(state.status.url || '')}/v1</strong>
        </div>
        <div class="endpoint-box">
          <span>Chat Completions</span>
          <strong>${escapeHtml(state.status.url || '')}/v1/chat/completions</strong>
        </div>
      </section>
    ` : ''}
  `
}



function setToast(message) {
  state.toast = message
  render({ updateToast: true })
  window.clearTimeout(setToast.timer)
  setToast.timer = window.setTimeout(() => {
    state.toast = ''
    render({ updateToast: true })
  }, 2800)
}

function patchFromBackend(payload) {
  if (payload.config) state.config = payload.config
  if (payload.validation) state.validation = payload.validation
  if (payload.status) state.status = payload.status
  if (payload.logs) state.logs = payload.logs
  if (payload.launch) state.launch = payload.launch
  state.dirty = false
}

function localNumberValue(input) {
  if (input.value === '') return ''
  const next = Number(input.value)
  return Number.isFinite(next) ? next : input.value
}

async function save() {
  state.busy = true
  render({ preserveChatScroll: true })
  try {
    patchFromBackend(await window.llamaDesktop.saveConfig({ config: state.config }))
    setToast('配置已保存')
  } catch (error) {
    setToast(error.message || String(error))
  } finally {
    state.busy = false
    render({ preserveChatScroll: true })
  }
}

async function start() {
  state.busy = true
  render({ preserveChatScroll: true })
  try {
    patchFromBackend(await window.llamaDesktop.startServer({ config: state.config }))
    state.active = 'chat'
    setToast('服务正在启动。关闭窗口后会继续在托盘运行。')
  } catch (error) {
    setToast(error.message || String(error))
  } finally {
    state.busy = false
    render({ preserveChatScroll: true })
  }
}

async function stop() {
  state.busy = true
  render({ preserveChatScroll: true })
  try {
    patchFromBackend(await window.llamaDesktop.stopServer())
    setToast('服务已停止')
  } catch (error) {
    setToast(error.message || String(error))
  } finally {
    state.busy = false
    render({ preserveChatScroll: true })
  }
}

async function health() {
  const result = await window.llamaDesktop.testHealth({ config: state.config })
  setToast(result.ok ? `端口正常：${result.url}` : `端口未响应：${result.message || result.url}`)
}

async function openModelInfo() {
  state.modelInfoOpen = true
  state.modelInfo = { loading: true }
  render({ preserveChatScroll: true })
  try {
    state.modelInfo = await window.llamaDesktop.getModelInfo({ config: state.config })
  } catch (error) {
    state.modelInfo = { error: error?.message || String(error) }
  }
  render({ preserveChatScroll: true })
}



async function pick(fieldName, kind) {
  const filters = {
    exe: [
      { name: 'Executable', extensions: ['exe', 'cmd', 'bat'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    gguf: [
      { name: 'GGUF', extensions: ['gguf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    toml: [
      { name: 'TOML', extensions: ['toml'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  }[kind] || [{ name: 'All Files', extensions: ['*'] }]

  const selected = await window.llamaDesktop.pickFile(kind === 'dir' ? { properties: ['openDirectory'] } : filters)
  if (selected) {
    state.config[fieldName] = selected
    if (fieldName === 'llama_bin_dir') {
      state.config.llama_server_path = `${selected.replace(/[\\/]+$/, '')}\\llama-server.exe`
    }
    state.dirty = true
    render()
  }
}

async function pickAttachment(kind) {
  try {
    const picked = await window.llamaDesktop.pickAttachments({ kind })
    if (picked?.length) {
      state.attachments = [...state.attachments, ...picked]
      const hasImage = picked.some(item => item.kind === 'image')
      const hasLargeImage = picked.some(item => item.kind === 'image' && !item.dataUrl)
      if (hasLargeImage) {
        setToast('图片已添加，但文件较大，只会作为附件记录路径。')
      } else if (hasImage && !state.config?.mmproj) {
        setToast('图片已添加；未配置 mmproj 时，普通文本模型可能看不懂图片。')
      } else {
        setToast(`${attachmentLabel(kind)}已添加`)
      }
    }
    state.attachmentMenuOpen = false
    state.attachmentMenuPosition = null
    const backdrop = document.querySelector('.attach-menu-backdrop')
    const menu = document.querySelector('.attach-menu')
    backdrop?.remove()
    menu?.remove()
    updateSendButton()
    render({ updateComposerAttachments: true })
  } catch (error) {
    setToast(error.message || String(error))
  }
}



async function init() {
  try {
    loadSessions()
    if (!state.currentSessionId) state.currentSessionId = makeSessionId()
    
    try {
      patchFromBackend(await window.llamaDesktop.getState())
    } catch (backendError) {
      console.warn('Failed to get state from backend:', backendError)
    }
    
    if (!state.config) {
      state.config = {}
    }
    
    render()
    setupEventListeners()
    initChatNav()
    refreshChatNav()
  } catch (error) {
    const appElement = getAppEl()
    if (appElement) {
      appElement.innerHTML = `<div class="boot">${escapeHtml(error.message || String(error))}</div>`
    }
  }

  window.llamaDesktop.onEvent(payload => {
    if (payload.type === 'status') {
      state.status = payload.status
      render({ preserveChatScroll: true })
      return
    }
    if (payload.type === 'logs') {
      state.logs = payload.logs
      if (state.view === 'terminal') render({ preserveChatScroll: true })
      return
    }
    if (payload.type === 'chat-stream') {
      applyStreamDelta(payload)
      return
    }
    render({ preserveChatScroll: true })
  })
}

async function abortChat() {
  if (!state.chatBusy) return
  try {
    await window.llamaDesktop.abortChat()
  } catch (error) {
    // Ignore abort errors
  }
  state.chatBusy = false
  state.streamRequestId = ''
  updateSendButton()
  render({ updateServiceBar: true })
}

async function retryMessage(index) {
  if (state.chatBusy) return
  const previousUserIndex = state.chatMessages
    .slice(0, index)
    .map((message, itemIndex) => ({ message, itemIndex }))
    .reverse()
    .find(item => item.message.role === 'user')?.itemIndex

  if (previousUserIndex === undefined) {
    setToast('没有找到可以重试的用户消息')
    return
  }

  const userMessage = state.chatMessages[previousUserIndex]
  state.chatMessages = state.chatMessages.slice(0, index)
  const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
  state.chatMessages.push({
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    startedAt: Date.now(),
    model: modelName(),
    tokens: 0,
    estimatedTokens: 0,
    latencyMs: 0,
    speed: '',
    streaming: true,
  })
  state.streamRequestId = requestId
  state.chatBusy = true
  render({ jumpToBottom: true })

  try {
    const startedAt = performance.now()
    const result = await window.llamaDesktop.streamChat({
      requestId,
      config: state.config,
      messages: buildApiMessages(state.chatMessages.slice(0, -1)),
    })
    const latencyMs = Math.round(performance.now() - startedAt)
    const usage = result.raw?.usage
    const completionTokens = usage?.completion_tokens || ''
    const totalTokens = usage?.total_tokens || ''
    const displayTokens = totalTokens || completionTokens || ''
    const speedTokens = completionTokens || totalTokens || ''
    const speed = speedTokens && latencyMs ? `${(Number(speedTokens) / (latencyMs / 1000)).toFixed(2)} t/s` : ''
    const assistant = state.chatMessages[state.chatMessages.length - 1]
    if (assistant?.role === 'assistant') {
      const estimatedTokens = estimateTokens(assistant.content || result.content)
      assistant.content = result.content || assistant.content || `基于"${userMessage.content}"重试后，模型返回了空内容。`
      assistant.tokens = displayTokens || estimatedTokens
      assistant.estimatedTokens = estimatedTokens
      assistant.latencyMs = latencyMs
      assistant.speed = speed || (assistant.tokens ? `${(Number(assistant.tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')
      assistant.streaming = false
    }
    saveCurrentSession()
  } catch (error) {
    const assistant = state.chatMessages[state.chatMessages.length - 1]
    if (assistant?.role === 'assistant' && !assistant.content) {
      state.chatMessages.pop()
    }
    state.chatMessages.push({ role: 'system', content: friendlyErrorMessage(error).replace(/^发送失败/, '重试失败'), createdAt: Date.now(), localOnly: true })
    saveCurrentSession()
  } finally {
    state.chatBusy = false
    state.streamRequestId = ''
    render({ preserveChatScroll: true })
  }
}

async function sendChat() {
  const content = state.chatInput.trim()
  if ((!content && state.attachments.length === 0) || state.chatBusy) return
  state.chatBusy = true
  updateSendButton()

  const hasImage = state.attachments.some(item => item.kind === 'image')
  if (hasImage && !state.config?.mmproj) {
    setToast('请先在设置中配置 mmproj 投影文件，否则图片无法被模型理解。')
    return
  }

  if (!state.currentSessionId) state.currentSessionId = makeSessionId()
  const attachments = state.attachments
  
  const userIndex = state.chatMessages.length
  state.chatMessages.push({ role: 'user', content, attachments, createdAt: Date.now() })
  
  const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
  
  const assistantIndex = state.chatMessages.length
  state.chatMessages.push({
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    startedAt: Date.now(),
    model: modelName(),
    tokens: 0,
    estimatedTokens: 0,
    latencyMs: 0,
    speed: '',
    streaming: true,
  })
  state.streamRequestId = requestId
  state.chatInput = ''
  state.attachments = []
  state.attachmentMenuOpen = false
  state.chatBusy = true
  state.view = 'chat'
  state.stickToBottom = true
  saveCurrentSession()
  const chatInputEl = document.querySelector('[data-chat-input]')
  if (chatInputEl) chatInputEl.value = ''
  updateSendButton()
  render({ updateComposerAttachments: true, updateSidebar: true })
  
  render({ appendMessage: userIndex, jumpToBottom: true })
  render({ appendMessage: assistantIndex, jumpToBottom: true })
  render({ updateServiceBar: true })

  try {
    const startedAt = performance.now()
    const result = await window.llamaDesktop.streamChat({
      requestId,
      config: state.config,
      messages: buildApiMessages(state.chatMessages.slice(0, -1)),
    })
    const latencyMs = Math.round(performance.now() - startedAt)
    const usage = result.raw?.usage
    const completionTokens = usage?.completion_tokens || ''
    const totalTokens = usage?.total_tokens || ''
    const displayTokens = totalTokens || completionTokens || ''
    const speedTokens = completionTokens || totalTokens || ''
    const speed = speedTokens && latencyMs ? `${(Number(speedTokens) / (latencyMs / 1000)).toFixed(2)} t/s` : ''
    const assistant = state.chatMessages[state.chatMessages.length - 1]
    if (assistant?.role === 'assistant') {
      const estimatedTokens = estimateTokens(assistant.content || result.content)
      assistant.content = result.content || assistant.content || '模型返回了空内容。'
      assistant.tokens = displayTokens || estimatedTokens
      assistant.estimatedTokens = estimatedTokens
      assistant.latencyMs = latencyMs
      assistant.speed = speed || (assistant.tokens ? `${(Number(assistant.tokens) / (latencyMs / 1000)).toFixed(2)} t/s` : '')
      assistant.streaming = false
    }
    saveCurrentSession()
  } catch (error) {
    const assistant = state.chatMessages[state.chatMessages.length - 1]
    if (assistant?.role === 'assistant' && !assistant.content) {
      state.chatMessages.pop()
    }
    state.chatMessages.push({ role: 'system', content: friendlyErrorMessage(error), createdAt: Date.now(), localOnly: true })
    saveCurrentSession()
  } finally {
    state.chatBusy = false
    state.streamRequestId = ''
    updateSendButton()
    render({ updateServiceBar: true })
  }
}

window.appRender = render
window.appSave = save
window.appStart = start
window.appStop = stop
window.appHealth = health
window.appSendChat = sendChat
window.appAbortChat = abortChat
window.appRetryMessage = retryMessage
window.appUpdateSendButton = updateSendButton
window.appOpenModelInfo = openModelInfo
window.appPickAttachment = pickAttachment
window.appRenderAttachmentChips = renderAttachmentChips
window.appRenderMessageContent = renderMessageContent
window.appRenderMessageMeta = renderMessageMeta
window.appRenderMessageActions = renderMessageActions

void init()

export {
  renderPreviewModal,
  renderModelInfoModal,
  renderHistoryDialog,
  renderAttachmentMenuPortal,
} from './js/components.js'

export {
  render,
  renderSidebar,
  renderTerminalPanel,
  restoreScrollPosition,
  applyDarkMode,
} from './js/render.js'

export {
  renderModernSettingsPanel,
} from './js/settings.js'

