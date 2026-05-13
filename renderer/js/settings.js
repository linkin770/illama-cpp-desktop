import { state } from './state.js'
import { escapeHtml } from './utils.js'
import { renderSettingsTabIcon, renderModelChipIcon } from './icons.js'
import { modelName } from './messages.js'
import { settingsTabs } from './constants.js'
import { visibleLogs, renderLogRow } from './messages.js'

function currentSettingsTabId() {
  return settingsTabs.some(([id]) => id === state.active) ? state.active : 'overview'
}

function currentSettingsTabMeta() {
  return settingsTabs.find(([id]) => id === currentSettingsTabId()) || settingsTabs[0]
}

function pill(ok, labelOk = '就绪', labelBad = '缺失') {
  return `<span class="pill ${ok ? 'good' : 'bad'}">${ok ? labelOk : labelBad}</span>`
}

function field(name, label, options = {}) {
  const directMode = (state.config?.launch_mode || 'direct') !== 'launcher'
  if (directMode && ['config_path', 'launcher_path', 'llama_server_path'].includes(name)) {
    return ''
  }

  const value = state.config?.[name] ?? ''
  const type = options.type || 'text'
  const picker = options.pick
    ? `<button class="icon-btn text-btn" type="button" data-pick="${name}" data-kind="${options.pick}">选择</button>`
    : ''
  const hint = options.hint ? `<div class="hint">${escapeHtml(options.hint)}</div>` : ''
  const input = options.textarea
    ? `<textarea data-field="${name}" spellcheck="false">${escapeHtml(value)}</textarea>`
    : `<input data-field="${name}" type="${type}" value="${escapeHtml(value)}" ${options.min !== undefined ? `min="${options.min}"` : ''} />`

  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <div class="${picker ? 'field-row' : ''}">
        ${input}
        ${picker}
      </div>
      ${hint}
    </label>
  `
}

function selectField(name, label, choices, hint = '') {
  const value = state.config?.[name] ?? ''
  const directMode = (state.config?.launch_mode || 'direct') !== 'launcher'
  const extra = name === 'launch_mode' && directMode
    ? field('llama_bin_dir', 'llama.cpp 原文件目录', { pick: 'dir', hint: '选择包含 llama-server.exe 和 CUDA / ggml DLL 的原始目录。' })
    : ''
  const options = choices
    .map(choice => `<option value="${escapeHtml(choice)}" ${String(choice) === String(value) ? 'selected' : ''}>${escapeHtml(choice || 'auto')}</option>`)
    .join('')
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select data-field="${name}">${options}</select>
      ${hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ''}
    </label>
  ${extra}`
}

function switchField(name, label, hint) {
  return `
    <label class="switch">
      <span>
        <strong>${escapeHtml(label)}</strong>
        <em>${escapeHtml(hint)}</em>
      </span>
      <input data-field="${name}" type="checkbox" ${state.config?.[name] ? 'checked' : ''} />
    </label>
  `
}

function renderModernSettingsCard(title, text, body) {
  return `
    <section class="settings-stack-card">
      <header>
        <strong>${escapeHtml(title)}</strong>
        ${text ? `<span>${escapeHtml(text)}</span>` : ''}
      </header>
      ${body}
    </section>
  `
}

function renderModernSettingsContent() {
  const tab = currentSettingsTabId()
  const v = state.validation || {}
  const launch = state.launch || {}
  const checks = `
    <div class="checks">
      <div><span>配置文件</span>${pill(v.configExists)}</div>
      <div><span>启动器</span>${pill(v.launcherExists)}</div>
      <div><span>llama-server</span>${pill(v.serverExists)}</div>
      <div><span>模型文件</span>${pill(v.modelExists)}</div>
      <div><span>保存状态</span>${state.dirty ? '<span class="pill warn">未保存</span>' : '<span class="pill good">已保存</span>'}</div>
    </div>
  `

  if (tab === 'overview') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('当前接入状态', '这里集中放服务入口、上下文和启动模式。', `
          ${checks}
          <div class="endpoint-box">
            <span>OpenAI Base URL</span>
            <strong>${escapeHtml(state.status.url || '')}/v1</strong>
          </div>
          <div class="endpoint-box">
            <span>Chat Completions</span>
            <strong>${escapeHtml(state.status.url || '')}/v1/chat/completions</strong>
          </div>
        `)}
        ${renderModernSettingsCard('运行参数', '桌面端直连 llama.cpp 时，这一组就是最常用的核心参数。', `
          <div class="form-grid two">
            ${selectField('launch_mode', '启动方式', ['direct', 'launcher'], 'direct = 直接调用 llama-server.exe；launcher = 兼容旧启动器')}
            ${field('host', 'Host')}
            ${field('port', 'Port', { type: 'number', min: 1 })}
            ${field('ctx_size', '上下文大小 ctx_size', { type: 'number', min: 1 })}
            ${field('n_predict', '最大输出 n_predict', { type: 'number' })}
            ${field('n_gpu_layers', 'GPU 层数', { type: 'number' })}
            ${field('request_timeout_ms', '请求超时 ms', { type: 'number', min: 30000 })}
          </div>
          <div class="settings-callout">32GB 内存建议先用 32768 或 65536 上下文。131072 这类超长上下文会显著增加 KV cache，占满内存是正常风险。</div>
        `)}
        ${renderModernSettingsCard('最终启动命令', '速度或参数不对时，先复制这里和原生命令行对比。', `
          <div class="command-preview ${launch.error ? 'has-error' : ''}">
            <pre>${escapeHtml(launch.error || launch.preview || '保存配置后会在这里生成完整命令。')}</pre>
            <button type="button" class="outline-btn small-btn" data-action="copy-launch-command" ${launch.preview && !launch.error ? '' : 'disabled'}>复制命令</button>
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'display') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('当前模型', '这里补上了网页端那种可查看详情的模型入口。', `
          <div class="settings-inline-actions">
            <button type="button" class="model-chip model-trigger wide" data-action="open-model-info" title="${escapeHtml(state.config?.model || '')}">
              <span class="model-chip-icon">${renderModelChipIcon()}</span>
              <span class="model-chip-label">${escapeHtml(modelName())}</span>
            </button>
            <button type="button" class="outline-btn" data-action="open-model-info">查看模型信息</button>
          </div>
        `)}
        ${renderModernSettingsCard('模型与模板', '切换 GGUF、视觉投影和模板参数。', `
          <div class="form-grid single">
            ${field('model', '模型文件', { pick: 'gguf', hint: '例如 Qwen3.5-9B.Q4_K_M.gguf' })}
            ${field('mmproj', 'mmproj 投影文件', { pick: 'gguf', hint: '视觉或多模态模型才需要' })}
            ${field('chat_template_kwargs', 'Chat Template Kwargs', { textarea: true, hint: '会同时作为启动参数和每次请求参数发送。可写 {"enable_thinking":false}，也兼容 --chat-template-kwargs \'{\\"enable_thinking\\":false}\'。支持的模型还可加 "thinking_budget": 0。' })}
          </div>
          <div class="settings-callout">注意：这是控制模型是否生成思考；下面的“显示思考过程”只是控制桌面端是否把已返回的 <think> 展示出来。图片理解需要视觉模型和 mmproj。</div>
        `)}
        ${renderModernSettingsCard('展示开关', '把网页端常见的显示项集中到一起。', `
          <div class="switch-grid">
            ${switchField('show_thinking', '显示思考过程', '解析模型返回的 <think> 区块。')}
            ${switchField('expand_thinking', '默认展开思考', '关闭时会折叠成一行。')}
            ${switchField('show_raw_output', '显示原始输出', '排查模板和思考模式时使用。')}
            ${switchField('webui', '保留 llama.cpp Web UI', '保留浏览器页入口，方便双开调试。')}
            ${switchField('verbose', '显示详细日志', '输出更多服务端信息，便于排查。')}
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'sampling') {
    return renderModernSettingsCard('采样', '控制回答的随机性和分布范围。', `
      <div class="form-grid two">
        ${field('temp', 'Temperature', { type: 'number' })}
        ${field('top_k', 'Top-K', { type: 'number' })}
        ${field('top_p', 'Top-P', { type: 'number' })}
        ${field('min_p', 'Min-P', { type: 'number' })}
      </div>
    `)
  }

  if (tab === 'penalty') {
    return renderModernSettingsCard('惩罚项', '把重复控制单独抽出来，更接近网页端设置分栏。', `
      <div class="form-grid two">
        ${field('presence_penalty', 'Presence penalty', { type: 'number' })}
        ${field('repeat_penalty', 'Repeat penalty', { type: 'number' })}
      </div>
    `)
  }

  if (tab === 'io') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('路径', '桌面端直连模式下，真正关键的是 llama-server.exe 和模型文件。', `
          <div class="form-grid single">
            ${field('config_path', '配置文件', { pick: 'toml', hint: '仅在兼容旧启动器时使用' })}
            ${field('launcher_path', '启动器 EXE', { pick: 'exe', hint: '仅在 launcher 模式下需要' })}
            ${field('llama_server_path', 'llama-server.exe', { pick: 'exe', hint: 'direct 模式会直接调用它' })}
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'mcp') {
    return renderModernSettingsCard('MCP 服务', '这里先把界面结构预留成网页端那种独立分类。', `
      <div class="settings-mcp-placeholder">
        <strong>未接入原生 MCP 服务</strong>
        <p>当前这个桌面端仍以 llama.cpp 的 OpenAI 兼容接口为主。后续如果你想把工具服务接进来，我们可以继续把这里做成真正可配置的面板。</p>
      </div>
    `)
  }

  if (tab === 'developer') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('线程与设备', '批处理、线程和 GPU 分配都放在开发者页。', `
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
            ${field('log_verbosity', '日志等级', { type: 'number' })}
          </div>
          <div class="settings-callout">多 GPU 取决于本地 llama.cpp 的编译版本和硬件环境。常见参数是 split-mode、tensor-split 和 main-gpu。</div>
        `)}
        ${renderModernSettingsCard('自定义附加参数', '临时放 ngram、多卡、speculative decoding 等高级参数。', `
          <div class="form-grid single">
            ${field('extra_args', '追加到 llama-server 的参数', { textarea: true, hint: '例如 --flash-attn --no-mmap。参数会追加到最终启动命令末尾，需要与你本机 llama.cpp 版本匹配。' })}
          </div>
          <div class="command-preview compact ${launch.error ? 'has-error' : ''}">
            <pre>${escapeHtml(launch.error || launch.preview || '保存配置后会在这里生成完整命令。')}</pre>
            <button type="button" class="outline-btn small-btn" data-action="copy-launch-command" ${launch.preview && !launch.error ? '' : 'disabled'}>复制命令</button>
          </div>
        `)}
        ${renderModernSettingsCard('开发者开关', '保留性能和调试相关开关。', `
          <div class="switch-grid">
            ${switchField('cpu_moe', 'MoE 放在 CPU', '显存紧张时更稳。')}
            ${switchField('embeddings', 'Embeddings', '需要向量接口时开启。')}
            ${switchField('continuous_batching', 'Continuous batching', '多请求场景更平滑。')}
            ${switchField('verbose', 'Verbose', '输出更细的服务端日志。')}
          </div>
        `)}
      </div>
    `
  }

  return renderModernSettingsCard('日志', 'ANSI 颜色码已被过滤，方便直接看真正的 llama.cpp 输出。', `
    <div class="log-box" id="logBox">
      ${
        visibleLogs().length
          ? visibleLogs().map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('')
          : '<div class="empty-log">还没有日志。启动服务后会在这里实时显示。</div>'
      }
    </div>
  `)
}

function renderModernSettingsPanel() {
  const v = state.validation || {}
  const [activeId, activeIcon, activeLabel, activeHint] = currentSettingsTabMeta()
  return `
    <div class="settings-backdrop ${state.settingsOpen ? 'show' : ''}" data-action="close-settings"></div>
    <aside class="settings-panel ${state.settingsOpen ? 'show' : ''}">
      <div class="settings-rail">
        <div class="settings-badge">⚙ 设置</div>
        <nav class="settings-rail-tabs">
          ${settingsTabs
            .map(([id, _icon, label, hint]) => `
              <button type="button" class="${activeId === id ? 'active' : ''}" data-section="${id}">
                <span class="settings-tab-icon">${renderSettingsTabIcon(id)}</span>
                <span class="settings-tab-copy">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(hint)}</span>
                </span>
              </button>
            `)
            .join('')}
        </nav>
        <div class="progress-card">
          <strong>当前进度</strong>
          <div><span>配置文件</span>${pill(v.configExists)}</div>
          <div><span>启动器</span>${pill(v.launcherExists)}</div>
          <div><span>llama-server</span>${pill(v.serverExists)}</div>
          <div><span>模型文件</span>${pill(v.modelExists)}</div>
        </div>
      </div>
      <div class="settings-main">
        <div class="settings-head">
          <div>
            <span>设置</span>
            <strong>${escapeHtml(activeLabel)}</strong>
            <em>${escapeHtml(activeHint)}</em>
          </div>
          <button type="button" class="icon-btn" data-action="close-settings">×</button>
        </div>
        <div class="settings-body">${renderModernSettingsContent()}</div>
        <div class="settings-foot">
          <button class="outline-btn" type="button" data-action="save">保存</button>
          <button class="primary-btn" type="button" data-action="close-settings">完成</button>
        </div>
      </div>
    </aside>
  `
}

export {
  currentSettingsTabId,
  currentSettingsTabMeta,
  pill,
  field,
  selectField,
  switchField,
  renderModernSettingsCard,
  renderModernSettingsContent,
  renderModernSettingsPanel,
}
