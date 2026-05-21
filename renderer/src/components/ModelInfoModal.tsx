// 模型信息弹窗 - 显示模型详细信息
import React from 'react'
import { escapeHtml, formatBytes } from '../utils'

interface ModelInfoModalProps {
  modelInfoOpen: boolean
  modelInfo: null | { loading?: boolean; error?: string } | Record<string, unknown>
  onClose: () => void
}

const FIELD_LABELS: Record<string, string> = {
  name: '模型名称 / Model',
  family: '模型家族 / Family',
  parameterScale: '参数规模 / Params',
  parameterLabel: '参数量 / Param Count',
  quantization: '量化级别 / Quantization',
  filePath: '文件路径 / File Path',
  fileSize: '文件大小 / File Size',
  ctxSize: '上下文大小 / Context Size',
  trainingContext: '训练上下文 / Training Context',
  embeddingSize: '嵌入维度 / Embedding Dim',
  vocabSize: '词表大小 / Vocab Size',
  vocabType: '词表类型 / Vocab Type',
  nParams: '参数总量 / Total Params',
  parallelSlots: '并行槽位 / Parallel Slots',
  nPredict: '最大输出 / Max Predict',
  gpuLayers: 'GPU 层数 / GPU Layers',
  temperature: '温度 / Temperature',
  topP: 'Top-P',
  topK: 'Top-K',
  minP: 'Min-P',
  presencePenalty: '存在惩罚 / Presence Penalty',
  repeatPenalty: '重复惩罚 / Repeat Penalty',
  serverUrl: '服务地址 / Server URL',
  build: '构建版本 / Build',
  chatTemplateText: '对话模板 / Chat Template',
}

const FIELD_ORDER = [
  'name', 'family', 'parameterScale', 'quantization',
  'filePath', 'fileSize',
  'ctxSize', 'trainingContext', 'nParams', 'embeddingSize', 'vocabSize',
  'temperature', 'topP', 'topK', 'minP', 'presencePenalty',
  'parallelSlots', 'nPredict', 'gpuLayers',
  'serverUrl', 'build', 'chatTemplateText',
]

function formatValue(key: string, value: unknown): string {
  if (key === 'fileSize' && typeof value === 'number' && value > 0) {
    return formatBytes(value)
  }
  if (key === 'chatTemplateText') {
    const s = String(value || '')
    return s.length > 200 ? s.slice(0, 200) + '…' : s
  }
  return String(value ?? '')
}

export function ModelInfoModal({ modelInfoOpen, modelInfo, onClose }: ModelInfoModalProps) {
  if (!modelInfoOpen) return null

  const info = (modelInfo && !modelInfo.loading && !modelInfo.error) ? modelInfo as Record<string, unknown> : null;
  const entries = info
    ? FIELD_ORDER
        .filter(key => key in info)
        .map(key => [key, info[key]] as [string, unknown])
    : []

  return (
    <div className="modal-overlay">
      <div className="modal-content model-info-modal">
        <div className="modal-header">
          <h2>模型信息 / Model Info</h2>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {modelInfo?.loading ? (
            <div className="loading">加载中… / Loading…</div>
          ) : modelInfo?.error ? (
            <div className="error-message">{escapeHtml(String(modelInfo.error))}</div>
          ) : entries.length > 0 ? (
            <div className="model-info-content">
              {entries.map(([key, value]) => (
                <div key={key} className="info-row">
                  <span className="info-label">{FIELD_LABELS[key] || key}</span>
                  <span className="info-value">{escapeHtml(formatValue(key, value))}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">暂无模型信息 / No model info</div>
          )}
        </div>
      </div>
    </div>
  )
}
