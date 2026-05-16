import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatMessage } from '../types'

interface ChatNavProps {
  chatMessages: ChatMessage[]
}

export function ChatNav({ chatMessages }: ChatNavProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [tooltipText, setTooltipText] = useState('')
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ display: 'none' })
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mouseInNavRef = useRef(false)
  const activeIdxRef = useRef(-1)
  const [navRight, setNavRight] = useState(16)

  const userMessages = chatMessages
    .map((msg, i) => ({ msg, i }))
    .filter(({ msg }) => msg.role === 'user' && String(msg.content || '').trim())

  const updateCurrentMessage = useCallback(() => {
    const userEls = [...document.querySelectorAll('.message.user')]
    if (!userEls.length) return

    const feed = document.getElementById('chatFeed')
    let target: number
    if (feed) {
      const feedRect = feed.getBoundingClientRect()
      target = feedRect.top + feedRect.height * 0.4
    } else {
      target = window.innerHeight * 0.4
    }

    let bestIdx = 0
    let bestDist = Infinity
    userEls.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(rect.top + rect.height / 2 - target)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })

    if (bestIdx !== activeIdxRef.current) {
      activeIdxRef.current = bestIdx
      setActiveIdx(bestIdx)

      const navBar = document.getElementById('chat-nav-bar')
      const activeItem = navBar?.querySelector('.nav-item.active') as HTMLElement
      if (navBar && activeItem) {
        const navRect = navBar.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const targetScroll = navBar.scrollTop + itemRect.top - navRect.top - navRect.height / 2 + itemRect.height / 2
        navBar.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
      }
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!scrollThrottleRef.current) {
        scrollThrottleRef.current = setTimeout(() => {
          updateCurrentMessage()
          scrollThrottleRef.current = null
        }, 100)
      }
    }

    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    const lastUserIdx = userMessages.length - 1
    if (lastUserIdx >= 0) {
      activeIdxRef.current = lastUserIdx
      setActiveIdx(lastUserIdx)
    }

    setTimeout(() => {
      updateCurrentMessage()
      const navBar = document.getElementById('chat-nav-bar')
      const activeItem = navBar?.querySelector('.nav-item.active') as HTMLElement
      if (navBar && activeItem) {
        const navRect = navBar.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const targetScroll = navBar.scrollTop + itemRect.top - navRect.top - navRect.height / 2 + itemRect.height / 2
        navBar.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
      }
    }, 300)

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      if (scrollThrottleRef.current) clearTimeout(scrollThrottleRef.current)
    }
  }, [chatMessages, userMessages.length, updateCurrentMessage])

  useEffect(() => {
    const updateNavPosition = () => {
      const composer = document.querySelector('.composer') as HTMLElement
      if (composer) {
        const composerRect = composer.getBoundingClientRect()
        const rightSpace = window.innerWidth - composerRect.right
        setNavRight(Math.max(8, rightSpace + 16))
      }
    }

    updateNavPosition()
    window.addEventListener('resize', updateNavPosition)

    const observer = new MutationObserver(updateNavPosition)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      window.removeEventListener('resize', updateNavPosition)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const navBar = navRef.current
    if (!navBar) return

    const handleMouseEnter = () => {
      mouseInNavRef.current = true
      setExpanded(true)
    }

    const handleMouseLeave = () => {
      mouseInNavRef.current = false
      setExpanded(false)
      handleMouseLeaveItem()
    }

    navBar.addEventListener('mouseenter', handleMouseEnter)
    navBar.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      navBar.removeEventListener('mouseenter', handleMouseEnter)
      navBar.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [userMessages])

  const handleNavClick = (idx: number) => {
    const userEls = [...document.querySelectorAll('.message.user')]
    const el = userEls[idx]
    if (!el) return

    const feed = document.getElementById('chatFeed')
    if (feed) {
      const feedRect = feed.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const targetScroll = feed.scrollTop + elRect.top - feedRect.top - feedRect.height / 2 + elRect.height / 2
      feed.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const bubble = el.querySelector('.bubble') || el
    bubble.classList.remove('nav-flash')
    void (bubble as HTMLElement).offsetWidth
    bubble.classList.add('nav-flash')
    setTimeout(() => bubble.classList.remove('nav-flash'), 700)
  }

  const handleMouseEnterItem = (idx: number, text: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => {
      const navBar = navRef.current
      const items = navBar?.querySelectorAll('.nav-item')
      const item = items?.[idx] as HTMLElement
      if (!item || !navBar) return

      const textSpan = item.querySelector('.nav-text') as HTMLElement
      if (textSpan && textSpan.scrollWidth <= textSpan.clientWidth) return

      setTooltipText(text)
      const rect = item.getBoundingClientRect()
      const navRect = navBar.getBoundingClientRect()
      setTooltipStyle({
        top: Math.max(10, Math.min(rect.top, window.innerHeight - 220)) + 'px',
        right: (window.innerWidth - navRect.left + 8) + 'px',
        left: 'auto',
        display: 'block',
      })
    }, 800)
  }

  const handleMouseLeaveItem = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setTooltipText('')
    setTooltipStyle({ display: 'none' })
  }

  if (userMessages.length === 0) return null

  return (
    <>
      <div
        ref={navRef}
        id="chat-nav-bar"
        className={expanded ? 'expanded' : ''}
        style={{ right: navRight }}
      >
        {userMessages.map(({ msg }, idx) => (
          <div
            key={idx}
            className={`nav-item${idx === activeIdx ? ' active' : ''}`}
            data-idx={idx}
            onClick={() => handleNavClick(idx)}
            onMouseEnter={() => handleMouseEnterItem(idx, String(msg.content || '').trim())}
            onMouseLeave={handleMouseLeaveItem}
          >
            <span className="nav-text">{String(msg.content || '').trim()}</span>
            <span className="nav-dash">—</span>
          </div>
        ))}
      </div>
      <div ref={tooltipRef} id="chat-nav-tooltip" style={tooltipStyle}>
        {tooltipText && <div className="nav-tooltip-inner">{tooltipText}</div>}
      </div>
    </>
  )
}
