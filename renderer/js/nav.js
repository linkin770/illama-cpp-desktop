import { state } from './state.js'

let navBar = null
let tooltip = null
let currentActiveIdx = -1
let tooltipTimer = null
let hoveredItem = null
let mouseInNav = false
let initialized = false

const EDGE_ZONE = 56

/**
 * 确保导航栏和提示框已挂载到 DOM
 */
function ensureNavMounted() {
  if (!document.body.contains(navBar)) {
    document.body.appendChild(navBar)
  }
  if (!document.body.contains(tooltip)) {
    document.body.appendChild(tooltip)
  }
}

/**
 * 获取所有用户消息元素
 * @returns {Array<HTMLElement>} 用户消息元素数组
 */
function getUserMessages() {
  return [...document.querySelectorAll('.message.user')]
}

/**
 * 获取消息文本内容
 * @param {HTMLElement} el - 消息元素
 * @returns {string} 消息文本
 */
function getMessageText(el) {
  const bubble = el.querySelector('.bubble')
  return (bubble?.textContent || '').trim()
}

/**
 * 查找消息气泡元素
 * @param {HTMLElement} msgEl - 消息元素
 * @returns {HTMLElement} 气泡元素
 */
function findBubble(msgEl) {
  return msgEl.querySelector('.bubble') || msgEl
}

/**
 * 清除提示框
 */
function clearTooltip() {
  clearTimeout(tooltipTimer)
  tooltipTimer = null
  tooltip.style.display = 'none'
}

/**
 * 平滑滚动到指定消息
 * @param {HTMLElement} el - 目标消息元素
 */
function scrollToMessage(el) {
  const feed = document.getElementById('chatFeed')
  if (!feed) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  const feedRect = feed.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const targetScroll = feed.scrollTop + elRect.top - feedRect.top - feedRect.height / 2 + elRect.height / 2

  feed.scrollTo({
    top: Math.max(0, targetScroll),
    behavior: 'smooth',
  })
}

/**
 * 闪烁消息气泡以突出显示
 * @param {HTMLElement} msgEl - 消息元素
 */
function flashBubble(msgEl) {
  const bubble = findBubble(msgEl)
  bubble.classList.remove('nav-flash')
  void bubble.offsetWidth
  bubble.classList.add('nav-flash')
  setTimeout(() => bubble.classList.remove('nav-flash'), 700)
}

/**
 * 刷新导航栏内容
 */
function refreshNav() {
  ensureNavMounted()
  const msgs = getUserMessages()
  navBar.innerHTML = ''
  if (!msgs.length) {
    navBar.style.display = 'none'
    return
  }
  navBar.style.display = ''

  msgs.forEach((msg, i) => {
    const text = getMessageText(msg)
    if (!text) return

    const div = document.createElement('div')
    div.className = 'nav-item'
    div.dataset.idx = i
    div.dataset.full = text

    const textSpan = document.createElement('span')
    textSpan.className = 'nav-text'
    textSpan.textContent = text

    const dotSpan = document.createElement('span')
    dotSpan.className = 'nav-dot'

    div.appendChild(textSpan)
    div.appendChild(dotSpan)
    navBar.appendChild(div)
  })

  currentActiveIdx = -1
  updateCurrentMessage()
  setTimeout(updateCurrentMessage, 400)
}

/**
 * 更新当前活跃消息的高亮状态
 */
function updateCurrentMessage() {
  const msgs = getUserMessages()
  if (!msgs.length) return
  const target = window.innerHeight * 0.4
  let bestIdx = 0
  let bestDist = Infinity

  msgs.forEach((msg, i) => {
    const rect = msg.getBoundingClientRect()
    const dist = Math.abs(rect.top + rect.height / 2 - target)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  })

  if (bestIdx !== currentActiveIdx) {
    currentActiveIdx = bestIdx
    navBar.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.idx) === currentActiveIdx)
    })

    const activeItem = navBar.querySelector('.nav-item.active')
    if (activeItem) {
      const navRect = navBar.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()
      const targetScroll = navBar.scrollTop + itemRect.top - navRect.top - navRect.height / 2 + itemRect.height / 2
      navBar.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      })
    }
  }
}

let scrollThrottle = null

function onScroll() {
  if (!scrollThrottle) {
    scrollThrottle = setTimeout(() => {
      updateCurrentMessage()
      scrollThrottle = null
    }, 100)
  }
}

export function initChatNav() {
  if (initialized) return
  initialized = true

  navBar = document.createElement('div')
  navBar.id = 'chat-nav-bar'
  document.body.appendChild(navBar)

  tooltip = document.createElement('div')
  tooltip.id = 'chat-nav-tooltip'
  document.body.appendChild(tooltip)

  navBar.addEventListener('mouseenter', () => {
    mouseInNav = true
  })

  navBar.addEventListener('mouseleave', () => {
    mouseInNav = false
    clearTooltip()
    hoveredItem = null
  })

  document.addEventListener('mousemove', (e) => {
    const dist = window.innerWidth - e.clientX
    if (dist < EDGE_ZONE || mouseInNav) {
      navBar.classList.add('expanded')
    } else {
      navBar.classList.remove('expanded')
      tooltip.style.display = 'none'
    }
  })

  navBar.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.nav-item')
    if (item === hoveredItem) return
    clearTooltip()
    hoveredItem = item
    if (!item) return
    const fullText = item.dataset.full
    if (!fullText) return

    tooltipTimer = setTimeout(() => {
      const textSpan = item.querySelector('.nav-text')
      if (!textSpan || textSpan.scrollWidth <= textSpan.clientWidth) return

      const tipInner = document.createElement('div')
      tipInner.className = 'nav-tooltip-inner'
      tipInner.textContent = fullText
      tooltip.innerHTML = ''
      tooltip.appendChild(tipInner)
      tooltip.style.display = 'block'

      const rect = item.getBoundingClientRect()
      const navRect = navBar.getBoundingClientRect()
      tooltip.style.top = Math.max(10, Math.min(rect.top, window.innerHeight - 220)) + 'px'
      tooltip.style.right = (window.innerWidth - navRect.left + 8) + 'px'
      tooltip.style.left = 'auto'
    }, 800)
  })

  navBar.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item')
    if (!item) return
    const idx = parseInt(item.dataset.idx, 10)
    const msgs = getUserMessages()
    if (!msgs[idx]) return

    scrollToMessage(msgs[idx])

    setTimeout(() => {
      flashBubble(msgs[idx])
    }, 350)
  })

  document.addEventListener('scroll', onScroll, { passive: true, capture: true })
}

export function refreshChatNav() {
  if (!initialized) initChatNav()
  refreshNav()
}

export function destroyChatNav() {
  if (navBar?.parentNode) navBar.parentNode.removeChild(navBar)
  if (tooltip?.parentNode) tooltip.parentNode.removeChild(tooltip)
  document.removeEventListener('scroll', onScroll, { capture: true })
  initialized = false
}
