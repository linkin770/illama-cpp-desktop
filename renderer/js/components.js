import { state } from './state.js'
import { escapeHtml, escapeAttribute, canPreviewCode, basename, formatBytes, modelFamilyFromName, quantLabelFromName, paramScaleFromName } from './utils.js'
import { renderCopyIcon } from './icons.js'

function renderPreviewModal() {
  if (!state.preview) return ''
  const previewType = state.preview.type || 'code'
  const code = state.preview.code || ''
  const language = state.preview.language || 'html'
  const srcdoc = canPreviewCode(language, code)
    ? code
    : `<pre style="font: 14px/1.6 Consolas, monospace; white-space: pre-wrap;">${escapeHtml(code)}</pre>`
  const body = previewType === 'image'
    ? `
      <div class="preview-image-wrap">
        <img src="${escapeAttribute(state.preview.src || '')}" alt="${escapeAttribute(state.preview.title || '图片预览')}" />
      </div>
    `
    : `<iframe sandbox="allow-scripts allow-same-origin" srcdoc="${escapeAttribute(srcdoc)}"></iframe>`

  return `
    <div class="preview-backdrop" data-action="close-preview"></div>
    <section class="preview-panel">
      <div class="preview-head">
        <div>
          <span>预览</span>
          <strong>${escapeHtml(state.preview.title || (previewType === 'image' ? '图片预览' : language.toUpperCase()))}</strong>
        </div>
        <button type="button" class="icon-btn" data-action="close-preview">X</button>
      </div>
      ${body}
    </section>
  `
}

function renderHistoryDialog() {
  if (!state.historyDialog) return ''
  const session = state.sessions.find(item => item.id === state.historyDialog.sessionId)
  if (!session) return ''
  const title = session.title || '新聊天'

  if (state.historyDialog.type === 'edit') {
    return `
      <div class="dialog-backdrop" data-action="close-history-dialog"></div>
      <section class="history-dialog">
        <h2>编辑对话名称</h2>
        <input data-history-title-input value="${escapeAttribute(title)}" />
        <div class="dialog-actions">
          <button type="button" class="outline-btn" data-action="close-history-dialog">取消</button>
          <button type="button" class="primary-btn" data-action="history-save-title" data-session-id="${escapeHtml(session.id)}">保存</button>
        </div>
      </section>
    `
  }

  return `
    <div class="dialog-backdrop" data-action="close-history-dialog"></div>
    <section class="history-dialog">
      <h2><span class="danger-glyph">&#128465;</span>删除对话</h2>
      <p>你确定要删除“${escapeHtml(title)}”吗？此操作无法撤销，且会永久删除本次对话中的所有信息。</p>
      <div class="dialog-actions">
        <button type="button" class="outline-btn" data-action="close-history-dialog">取消</button>
        <button type="button" class="danger-solid-btn" data-action="history-confirm-delete" data-session-id="${escapeHtml(session.id)}">删除</button>
      </div>
    </section>
  `
}

function renderModelInfoModal() {
  if (!state.modelInfoOpen) return ''

  const info = state.modelInfo || {}
  const { rows, runtimeRows, templateText } = buildBetterModelInfoRows(info)
  const body = info.loading
    ? '<div class="model-info-empty">正在读取当前模型信息...</div>'
    : info.error
      ? `<div class="model-info-empty error">${escapeHtml(info.error)}</div>`
      : `
        <div class="model-info-columns">
          <div class="model-info-card">
            <div class="model-template-head compact-head"><span>模型信息</span></div>
            <div class="model-info-grid">
              ${rows
                .map(row => `
                  <div class="model-info-row">
                    <span>${escapeHtml(row.label)}</span>
                    <strong title="${escapeAttribute(row.value)}">${escapeHtml(row.value)}</strong>
                    ${row.copy ? `<button type="button" class="icon-copy-btn" data-action="copy-model-info" data-copy="${escapeAttribute(row.copy)}" title="复制">${renderCopyIcon()}</button>` : '<div></div>'}
                  </div>
                `)
                .join('')}
            </div>
          </div>
          <div class="model-info-card">
            <div class="model-template-head compact-head"><span>本地运行参数</span></div>
            <div class="model-info-grid">
              ${runtimeRows
                .map(row => `
                  <div class="model-info-row">
                    <span>${escapeHtml(row.label)}</span>
                    <strong title="${escapeAttribute(row.value)}">${escapeHtml(row.value)}</strong>
                    ${row.copy ? `<button type="button" class="icon-copy-btn" data-action="copy-model-info" data-copy="${escapeAttribute(row.copy)}" title="复制">${renderCopyIcon()}</button>` : '<div></div>'}
                  </div>
                `)
                .join('')}
            </div>
          </div>
        </div>
        <div class="model-template-card">
          <div class="model-template-head">
            <span>聊天模板</span>
            <button type="button" class="outline-btn small-btn" data-action="copy-model-info" data-copy="${escapeAttribute(templateText)}">复制</button>
          </div>
          <pre>${escapeHtml(templateText)}</pre>
        </div>
      `

  return `
    <div class="dialog-backdrop" data-action="close-model-info"></div>
    <section class="model-info-panel">
      <div class="model-info-head">
        <div>
          <span>模型信息</span>
          <strong>当前模型细节与本地运行参数</strong>
        </div>
        <button type="button" class="icon-btn" data-action="close-model-info">&times;</button>
      </div>
      <div class="model-info-body">${body}</div>
    </section>
  `
}

function attachmentMenuItems() {
  return `
    <button type="button" data-action="pick-image"><span class="menu-icon image"></span>图片</button>
    <button type="button" disabled title="暂不支持视频理解"><span class="menu-icon video"></span>视频文件</button>
    <button type="button" data-action="pick-audio"><span class="menu-icon audio"></span>音频文件</button>
    <button type="button" data-action="pick-text"><span class="menu-icon text"></span>文本文件</button>
    <button type="button" data-action="pick-pdf"><span class="menu-icon pdf"></span>PDF 文件</button>
    <button type="button" data-action="insert-system-message"><span class="menu-icon system"></span>系统消息</button>
  `
}

function renderAttachmentMenuPortal() {
  if (!state.attachmentMenuOpen) return ''
  const fallback = { left: 0, top: 0 }
  const position = state.attachmentMenuPosition || fallback
  return `
    <div class="attach-menu-backdrop" data-action="close-attachment-menu"></div>
    <div class="attach-menu floating" style="left: ${Number(position.left) || 0}px; top: ${Number(position.top) || 0}px;">
      ${attachmentMenuItems()}
    </div>
  `
}

function buildBetterModelInfoRows(info) {
  const config = state.config || {}
  const filePath = info?.filePath || config.model || ''
  const fileName = info?.name || basename(filePath) || '未选择模型'
  const formatCount = value => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) return '未读取'
    return number.toLocaleString('zh-CN')
  }
  const formatTokens = value => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) return '未读取'
    return `${number.toLocaleString('zh-CN')} 个代币`
  }
  const formatParams = value => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) {
      return info?.parameterLabel || info?.parameterScale || paramScaleFromName(fileName) || '未读取'
    }
    if (number >= 100000000) return `${(number / 100000000).toFixed(2)} 亿`
    if (number >= 1000000) return `${(number / 1000000).toFixed(2)} M`
    return number.toLocaleString('zh-CN')
  }
  const templateText = String(info?.chatTemplateText || config.chat_template_kwargs || '未读取').trim()

  return {
    rows: [
      { label: '模型', value: fileName, copy: fileName },
      { label: '文件路径', value: filePath || '未配置', copy: filePath || '' },
      { label: '上下文大小', value: formatTokens(info?.ctxSize) },
      { label: '训练上下文', value: formatTokens(info?.trainingContext) },
      { label: '模型大小', value: formatBytes(info?.fileSize) },
      { label: '参数量', value: formatParams(info?.nParams) },
      { label: '嵌入维度', value: formatCount(info?.embeddingSize) },
      { label: '词汇表大小', value: formatCount(info?.vocabSize) },
      { label: '词汇表类型', value: formatCount(info?.vocabType) },
      { label: '并行槽位', value: formatCount(info?.parallelSlots) },
      { label: '构建信息', value: info?.build || '未读取' },
    ],
    runtimeRows: [
      { label: '模型家族', value: info?.family || modelFamilyFromName(fileName) || '未识别' },
      { label: '量化等级', value: info?.quantization || quantLabelFromName(fileName) || '未识别' },
      { label: '服务地址', value: info?.serverUrl || state.status?.url || '未启动', copy: info?.serverUrl || state.status?.url || '' },
      { label: '最大输出', value: `${config.n_predict ?? info?.nPredict ?? '未设置'}` },
      { label: 'GPU 层数', value: `${config.n_gpu_layers ?? info?.gpuLayers ?? '未设置'}` },
      { label: '温度', value: `${config.temp ?? info?.temperature ?? '未设置'}` },
      { label: 'Top-P', value: `${config.top_p ?? info?.topP ?? '未设置'}` },
      { label: 'Top-K', value: `${config.top_k ?? info?.topK ?? '未设置'}` },
      { label: 'Min-P', value: `${config.min_p ?? info?.minP ?? '未设置'}` },
      { label: '存在惩罚', value: `${config.presence_penalty ?? info?.presencePenalty ?? '未设置'}` },
      { label: '重复惩罚', value: `${config.repeat_penalty ?? info?.repeatPenalty ?? '未设置'}` },
    ],
    templateText,
  }
}

export {
  renderPreviewModal,
  renderHistoryDialog,
  renderModelInfoModal,
  renderAttachmentMenuPortal,
  attachmentMenuItems,
  buildBetterModelInfoRows,
}
