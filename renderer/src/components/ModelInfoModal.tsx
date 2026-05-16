// 模型信息弹窗 - 显示模型详细信息
import React from 'react'
import { escapeHtml } from '../utils'

interface ModelInfoModalProps {
  modelInfoOpen: boolean
  modelInfo: null | { loading?: boolean; error?: string } | Record<string, unknown>
  onClose: () => void
}

export function ModelInfoModal({ modelInfoOpen, modelInfo, onClose }: ModelInfoModalProps) {
  if (!modelInfoOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content model-info-modal">
        <div className="modal-header">
          <h2>模型信息</h2>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* 加载中 */}
          {modelInfo?.loading ? (
            <div className="loading">加载中...</div>
          ) : modelInfo?.error ? (
            /* 错误 */
            <div className="error-message">{escapeHtml(String(modelInfo.error))}</div>
          ) : typeof modelInfo === 'object' && modelInfo !== null ? (
            /* 成功 - 显示模型信息 */
            <div className="model-info-content">
              {Object.entries(modelInfo).map(([key, value]) => (
                <div key={key} className="info-row">
                  <span className="info-label">{escapeHtml(String(key))}</span>
                  <span className="info-value">{escapeHtml(String(value))}</span>
                </div>
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="empty-state">暂无模型信息</div>
          )}
        </div>
      </div>
    </div>
  )
}
