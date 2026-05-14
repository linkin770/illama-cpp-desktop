import { state } from './state.js'
import { escapeHtml, escapeAttribute } from './utils.js'
import { renderModelChipIcon } from './icons.js'
import {
  modelName,
  renderMessageContent,
  renderMessageMeta,
  renderMessageActions,
  renderAttachmentItem,
  updateMessageDom,
  updateLiveStats,
  saveCurrentSession,
} from './messages.js'

function renderAttachmentChips(attachments, removable, mode) {
  if (!attachments || !attachments.length) return ''
  return attachments
    .map((attachment, index) => renderAttachmentItem(attachment, index, removable, mode))
    .join('')
}

function renderChat() {
  const messages = state.chatMessages.length
    ? state.chatMessages
        .map((message, index) => {
          const content = renderMessageContent(message, index)
          const attachments = renderAttachmentChips(message.attachments || [], false, message.role)
          const body = message.role === 'user'
            ? `
              <div class="attachment-row">${attachments}</div>
              ${content ? `<div class="bubble">${content}</div>` : ''}
            `
            : `
              <div class="bubble">
                ${content}
              </div>
              <div class="attachment-row">${attachments}</div>
            `

          return `
            <article class="message ${escapeHtml(message.role)}" data-message-index="${index}">
              <div class="avatar">${message.role === 'user' ? '你' : message.role === 'assistant' ? 'll' : 'sys'}</div>
              <div class="message-body">
                ${body}
                ${renderMessageMeta(message)}
                ${renderMessageActions(index, message)}
              </div>
            </article>
          `
        })
        .join('')
    : `
      <div class="empty-state">
        <h1>illama.exe</h1>
        <p>无需命令行，就能管理本地AI服务。它既是控制台，也是聊天室，更是连接OpenClaw、Claude Code等外部工具的桥梁。</p>
      </div>
    `

  return `
    <section class="chat-screen ${state.chatMessages.length ? '' : 'empty-chat'}">
      <div class="chat-feed" id="chatFeed">${messages}</div>
      <button class="scroll-to-bottom-btn" data-action="scroll-to-bottom" title="回到最新">↓回到最新</button>
      <div class="composer-wrap">
        ${renderAttachmentChips(state.attachments, true, 'composer')}
        <div class="composer">
          <div class="attach-wrap">
            <button class="round-btn" type="button" data-action="toggle-attachment-menu" title="添加内容">+</button>
          </div>
          <textarea data-chat-input spellcheck="false" placeholder="输入一条消息……">${escapeHtml(state.chatInput)}</textarea>
          <button class="model-chip model-trigger" type="button" data-action="open-model-info" title="${escapeHtml(state.config?.model || '')}">
            <span class="model-chip-icon">${renderModelChipIcon()}</span>
            <span class="model-chip-label">${escapeHtml(modelName())}</span>
          </button>
          <button class="send-btn ${state.chatBusy ? 'stop-btn' : (state.chatInput.trim() || state.attachments.length ? 'active' : '')}" type="button" data-action="${state.chatBusy ? 'abort-chat' : 'send-chat'}" ${!state.chatBusy && state.chatInput.trim() === '' && state.attachments.length === 0 ? 'disabled' : ''}>
            ${state.chatBusy ? '■' : '↑'}
          </button>
        </div>
        <div class="composer-hint">按住 Enter 发送，Shift + Enter 换行</div>
      </div>
    </section>
  `
}

function applyStreamDelta(payload) {
  if (!payload || payload.requestId !== state.streamRequestId) return
  const last = state.chatMessages[state.chatMessages.length - 1]
  if (!last || last.role !== 'assistant') return
  const lastIndex = state.chatMessages.length - 1
  if (payload.delta) {
    last.content = `${last.content || ''}${payload.delta}`
    updateMessageDom(lastIndex)
  }
  if (payload.done) {
    last.content = payload.content || last.content || '模型返回了空内容。'
    updateLiveStats(last)
    last.streaming = false
    state.streamRequestId = ''
    saveCurrentSession()
    updateMessageDom(lastIndex)
  }
}

export {
  renderChat,
  applyStreamDelta,
  renderAttachmentChips,
}
