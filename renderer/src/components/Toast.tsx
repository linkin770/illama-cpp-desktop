import React from 'react'
import { escapeHtml } from '../utils'

interface ToastProps {
  message: string
}

export function Toast({ message }: ToastProps) {
  if (!message) return null
  
  return (
    <div className={`toast ${message ? 'show' : ''}`}>
      {escapeHtml(message)}
    </div>
  )
}