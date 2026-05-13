import { state } from './state.js'
import { getAppEl } from './constants.js'
import { escapeHtml, isNearBottom } from './utils.js'
import { renderModelChipIcon } from './icons.js'
import {
  modelName,
  statusLabel,
  statusClass,
  compactStatusMessage,
  renderMessageContent,
  renderMessageActions,
  renderMessageMeta,
} from './messages.js'

function updateSendButton() {
  const sendBtn = document.querySelector('.send-btn')
  if (!sendBtn) return
  
  const hasContent = state.chatInput.trim() || state.attachments.length
  const isBusy = state.chatBusy
  
  sendBtn.classList.toggle('stop-btn', isBusy)
  sendBtn.classList.toggle('active', !isBusy && hasContent)
  sendBtn.disabled = !isBusy && !hasContent
  sendBtn.textContent = isBusy ? '■' : '↑'
  sendBtn.dataset.action = isBusy ? 'abort-chat' : 'send-chat'
}

function setToast(message) {
  state.toast = message
  render({ updateToast: true })
  window.clearTimeout(setToast.timer)
  setToast.timer = window.setTimeout(() => {
    state.toast = ''
    render({ updateToast: true })
  }, 4000)
}

export {
  updateSendButton,
  setToast,
}
