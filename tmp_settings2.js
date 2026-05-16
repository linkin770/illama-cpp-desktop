import { state } from './state.js'
import { escapeHtml } from './utils.js'
import { renderSettingsTabIcon, renderModelChipIcon } from './icons.js'
import { modelName } from './messages.js'
import { settingsTabs } from './constants.js'
import { visibleLogs, renderLogRow } from './messages.js'

/**
 * 鑾峰彇褰撳墠璁剧疆闈㈡澘鐨勬爣绛鹃〉 ID
 * @returns {string} 褰撳墠鏍囩椤?ID
 */
function currentSettingsTabId() {
  return settingsTabs.some(([id]) => id === state.active) ? state.active : 'overview'
}

/**
 * 鑾峰彇褰撳墠璁剧疆闈㈡澘鏍囩椤电殑鍏冩暟鎹? * @returns {Array} 鏍囩椤靛厓鏁版嵁鏁扮粍 [id, icon, label, hint]
 */
function currentSettingsTabMeta() {
  return settingsTabs.find(([id]) => id === currentSettingsTabId()) || settingsTabs[0]
}

/**
 * 鐢熸垚鐘舵€佽嵂涓告寚绀哄櫒
 * @param {boolean} ok - 鏄惁鎴愬姛
 * @param {string} [labelOk='灏辩华'] - 鎴愬姛鏃剁殑鏍囩
 * @param {string} [labelBad='缂哄け'] - 澶辫触鏃剁殑鏍囩
 * @returns {string} 鑽父鎸囩ず鍣ㄧ殑 HTML 瀛楃涓? */
function pill(ok, labelOk = '灏辩华', labelBad = '缂哄け') {
  return `<span class="pill ${ok ? 'good' : 'bad'}">${ok ? labelOk : labelBad}</span>`
}

/**
 * 鐢熸垚琛ㄥ崟杈撳叆瀛楁
 * @param {string} name - 瀛楁鍚? * @param {string} label - 瀛楁鏍囩
 * @param {Object} [options={}] - 瀛楁閫夐」
 * @param {string} [options.type='text'] - 杈撳叆绫诲瀷
 * @param {string} [options.pick] - 鏂囦欢閫夋嫨绫诲瀷
 * @param {string} [options.hint] - 鎻愮ず鏂囨湰
 * @param {boolean} [options.textarea] - 鏄惁涓烘枃鏈煙
 * @param {number} [options.min] - 鏈€灏忓€硷紙鏁板瓧绫诲瀷锛? * @returns {string} 瀛楁鐨?HTML 瀛楃涓? */
function field(name, label, options = {}) {
  const directMode = (state.config?.launch_mode || 'direct') !== 'launcher'
  if (directMode && ['config_path', 'launcher_path', 'llama_server_path'].includes(name)) {
    return ''
  }

  const value = state.config?.[name] ?? ''
  const type = options.type || 'text'
  const picker = options.pick
    ? `<button class="icon-btn text-btn" type="button" data-pick="${name}" data-kind="${options.pick}">閫夋嫨</button>`
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

/**
 * 鐢熸垚涓嬫媺閫夋嫨瀛楁
 * @param {string} name - 瀛楁鍚? * @param {string} label - 瀛楁鏍囩
 * @param {Array} choices - 閫夐」鏁扮粍
 * @param {string} [hint=''] - 鎻愮ず鏂囨湰
 * @returns {string} 涓嬫媺閫夋嫨瀛楁鐨?HTML 瀛楃涓? */
function selectField(name, label, choices, hint = '') {
  const value = state.config?.[name] ?? ''
  const directMode = (state.config?.launch_mode || 'direct') !== 'launcher'
  const extra = name === 'launch_mode' && directMode
    ? field('llama_bin_dir', 'llama.cpp 鍘熸枃浠剁洰褰?, { pick: 'dir', hint: '閫夋嫨鍖呭惈 llama-server.exe 鍜?CUDA / ggml DLL 鐨勫師濮嬬洰褰曘€? })
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

/**
 * 鐢熸垚寮€鍏冲瓧娈? * @param {string} name - 瀛楁鍚? * @param {string} label - 瀛楁鏍囩
 * @param {string} hint - 鎻愮ず鏂囨湰
 * @returns {string} 寮€鍏冲瓧娈电殑 HTML 瀛楃涓? */
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

/**
 * 娓叉煋鐜颁唬璁剧疆鍗＄墖
 * @param {string} title - 鍗＄墖鏍囬
 * @param {string} text - 鍗＄墖鎻忚堪鏂囨湰
 * @param {string} body - 鍗＄墖鍐呭
 * @returns {string} 鍗＄墖鐨?HTML 瀛楃涓? */
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

/**
 * 娓叉煋鐜颁唬璁剧疆闈㈡澘鐨勫唴瀹? * @returns {string} 璁剧疆鍐呭鐨?HTML 瀛楃涓? */
function renderModernSettingsContent() {
  const tab = currentSettingsTabId()
  const v = state.validation || {}
  const launch = state.launch || {}
  const checks = `
    <div class="checks">
      <div><span>閰嶇疆鏂囦欢</span>${pill(v.configExists)}</div>
      <div><span>鍚姩鍣?/span>${pill(v.launcherExists)}</div>
      <div><span>llama-server</span>${pill(v.serverExists)}</div>
      <div><span>妯″瀷鏂囦欢</span>${pill(v.modelExists)}</div>
      <div><span>淇濆瓨鐘舵€?/span>${state.dirty ? '<span class="pill warn">鏈繚瀛?/span>' : '<span class="pill good">宸蹭繚瀛?/span>'}</div>
    </div>
  `

  if (tab === 'overview') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('褰撳墠鎺ュ叆鐘舵€?, '杩欓噷闆嗕腑鏀炬湇鍔″叆鍙ｃ€佷笂涓嬫枃鍜屽惎鍔ㄦā寮忋€?, `
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
        ${renderModernSettingsCard('杩愯鍙傛暟', '妗岄潰绔洿杩?llama.cpp 鏃讹紝杩欎竴缁勫氨鏄渶甯哥敤鐨勬牳蹇冨弬鏁般€?, `
          <div class="form-grid two">
            ${selectField('launch_mode', '鍚姩鏂瑰紡', ['direct', 'launcher'], 'direct = 鐩存帴璋冪敤 llama-server.exe锛沴auncher = 鍏煎鏃у惎鍔ㄥ櫒')}
            ${field('host', 'Host')}
            ${field('port', 'Port', { type: 'number', min: 1 })}
            ${field('ctx_size', '涓婁笅鏂囧ぇ灏?ctx_size', { type: 'number', min: 1 })}
            ${field('n_predict', '鏈€澶ц緭鍑?n_predict', { type: 'number' })}
            ${field('n_gpu_layers', 'GPU 灞傛暟', { type: 'number' })}
            ${field('request_timeout_ms', '璇锋眰瓒呮椂 ms', { type: 'number', min: 30000 })}
          </div>
          <div class="settings-callout">32GB 鍐呭瓨寤鸿鍏堢敤 32768 鎴?65536 涓婁笅鏂囥€?31072 杩欑被瓒呴暱涓婁笅鏂囦細鏄捐憲澧炲姞 KV cache锛屽崰婊″唴瀛樻槸姝ｅ父椋庨櫓銆?/div>
        `)}
        ${renderModernSettingsCard('鏈€缁堝惎鍔ㄥ懡浠?, '閫熷害鎴栧弬鏁颁笉瀵规椂锛屽厛澶嶅埗杩欓噷鍜屽師鐢熷懡浠よ瀵规瘮銆?, `
          <div class="command-preview ${launch.error ? 'has-error' : ''}">
            <pre>${escapeHtml(launch.error || launch.preview || '淇濆瓨閰嶇疆鍚庝細鍦ㄨ繖閲岀敓鎴愬畬鏁村懡浠ゃ€?)}</pre>
            <button type="button" class="outline-btn small-btn" data-action="copy-launch-command" ${launch.preview && !launch.error ? '' : 'disabled'}>澶嶅埗鍛戒护</button>
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'display') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('褰撳墠妯″瀷', '杩欓噷琛ヤ笂浜嗙綉椤电閭ｇ鍙煡鐪嬭鎯呯殑妯″瀷鍏ュ彛銆?, `
          <div class="settings-inline-actions">
            <button type="button" class="model-chip model-trigger wide" data-action="open-model-info" title="${escapeHtml(state.config?.model || '')}">
              <span class="model-chip-icon">${renderModelChipIcon()}</span>
              <span class="model-chip-label">${escapeHtml(modelName())}</span>
            </button>
            <button type="button" class="outline-btn" data-action="open-model-info">鏌ョ湅妯″瀷淇℃伅</button>
          </div>
        `)}
        ${renderModernSettingsCard('妯″瀷涓庢ā鏉?, '鍒囨崲 GGUF銆佽瑙夋姇褰卞拰妯℃澘鍙傛暟銆?, `
          <div class="form-grid single">
            ${field('model', '妯″瀷鏂囦欢', { pick: 'gguf', hint: '渚嬪 Qwen3.5-9B.Q4_K_M.gguf' })}
            ${field('mmproj', 'mmproj 鎶曞奖鏂囦欢', { pick: 'gguf', hint: '瑙嗚鎴栧妯℃€佹ā鍨嬫墠闇€瑕? })}
            ${field('chat_template_kwargs', 'Chat Template Kwargs', { textarea: true, hint: '浼氬悓鏃朵綔涓哄惎鍔ㄥ弬鏁板拰姣忔璇锋眰鍙傛暟鍙戦€併€傚彲鍐?{"enable_thinking":false}锛屼篃鍏煎 --chat-template-kwargs \'{\\"enable_thinking\\":false}\'銆傛敮鎸佺殑妯″瀷杩樺彲鍔?"thinking_budget": 0銆? })}
          </div>
          <div class="settings-callout">娉ㄦ剰锛氳繖鏄帶鍒舵ā鍨嬫槸鍚︾敓鎴愭€濊€冿紱涓嬮潰鐨勨€滄樉绀烘€濊€冭繃绋嬧€濆彧鏄帶鍒舵闈㈢鏄惁鎶婂凡杩斿洖鐨?<think> 灞曠ず鍑烘潵銆傚浘鐗囩悊瑙ｉ渶瑕佽瑙夋ā鍨嬪拰 mmproj銆?/div>
        `)}
        ${renderModernSettingsCard('灞曠ず寮€鍏?, '鎶婄綉椤电甯歌鐨勬樉绀洪」闆嗕腑鍒颁竴璧枫€?, `
          <div class="switch-grid">
            ${switchField('show_thinking', '鏄剧ず鎬濊€冭繃绋?, '瑙ｆ瀽妯″瀷杩斿洖鐨?<think> 鍖哄潡銆?)}
            ${switchField('expand_thinking', '榛樿灞曞紑鎬濊€?, '鍏抽棴鏃朵細鎶樺彔鎴愪竴琛屻€?)}
            ${switchField('show_raw_output', '鏄剧ず鍘熷杈撳嚭', '鎺掓煡妯℃澘鍜屾€濊€冩ā寮忔椂浣跨敤銆?)}
            ${switchField('webui', '淇濈暀 llama.cpp Web UI', '淇濈暀娴忚鍣ㄩ〉鍏ュ彛锛屾柟渚垮弻寮€璋冭瘯銆?)}
            ${switchField('verbose', '鏄剧ず璇︾粏鏃ュ織', '杈撳嚭鏇村鏈嶅姟绔俊鎭紝渚夸簬鎺掓煡銆?)}
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'sampling') {
    return renderModernSettingsCard('閲囨牱', '鎺у埗鍥炵瓟鐨勯殢鏈烘€у拰鍒嗗竷鑼冨洿銆?, `
      <div class="form-grid two">
        ${field('temp', 'Temperature', { type: 'number' })}
        ${field('top_k', 'Top-K', { type: 'number' })}
        ${field('top_p', 'Top-P', { type: 'number' })}
        ${field('min_p', 'Min-P', { type: 'number' })}
      </div>
    `)
  }

  if (tab === 'penalty') {
    return renderModernSettingsCard('鎯╃綒椤?, '鎶婇噸澶嶆帶鍒跺崟鐙娊鍑烘潵锛屾洿鎺ヨ繎缃戦〉绔缃垎鏍忋€?, `
      <div class="form-grid two">
        ${field('presence_penalty', 'Presence penalty', { type: 'number' })}
        ${field('repeat_penalty', 'Repeat penalty', { type: 'number' })}
      </div>
    `)
  }

  if (tab === 'io') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('璺緞', '妗岄潰绔洿杩炴ā寮忎笅锛岀湡姝ｅ叧閿殑鏄?llama-server.exe 鍜屾ā鍨嬫枃浠躲€?, `
          <div class="form-grid single">
            ${field('config_path', '閰嶇疆鏂囦欢', { pick: 'toml', hint: '浠呭湪鍏煎鏃у惎鍔ㄥ櫒鏃朵娇鐢? })}
            ${field('launcher_path', '鍚姩鍣?EXE', { pick: 'exe', hint: '浠呭湪 launcher 妯″紡涓嬮渶瑕? })}
            ${field('llama_server_path', 'llama-server.exe', { pick: 'exe', hint: 'direct 妯″紡浼氱洿鎺ヨ皟鐢ㄥ畠' })}
          </div>
        `)}
      </div>
    `
  }

  if (tab === 'mcp') {
    return renderModernSettingsCard('MCP 鏈嶅姟', '杩欓噷鍏堟妸鐣岄潰缁撴瀯棰勭暀鎴愮綉椤电閭ｇ鐙珛鍒嗙被銆?, `
      <div class="settings-mcp-placeholder">
        <strong>鏈帴鍏ュ師鐢?MCP 鏈嶅姟</strong>
        <p>褰撳墠杩欎釜妗岄潰绔粛浠?llama.cpp 鐨?OpenAI 鍏煎鎺ュ彛涓轰富銆傚悗缁鏋滀綘鎯虫妸宸ュ叿鏈嶅姟鎺ヨ繘鏉ワ紝鎴戜滑鍙互缁х画鎶婅繖閲屽仛鎴愮湡姝ｅ彲閰嶇疆鐨勯潰鏉裤€?/p>
      </div>
    `)
  }

  if (tab === 'developer') {
    return `
      <div class="settings-stack">
        ${renderModernSettingsCard('绾跨▼涓庤澶?, '鎵瑰鐞嗐€佺嚎绋嬪拰 GPU 鍒嗛厤閮芥斁鍦ㄥ紑鍙戣€呴〉銆?, `
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
            ${field('log_verbosity', '鏃ュ織绛夌骇', { type: 'number' })}
          </div>
          <div class="settings-callout">澶?GPU 鍙栧喅浜庢湰鍦?llama.cpp 鐨勭紪璇戠増鏈拰纭欢鐜銆傚父瑙佸弬鏁版槸 split-mode銆乼ensor-split 鍜?main-gpu銆?/div>
        `)}
        ${renderModernSettingsCard('鑷畾涔夐檮鍔犲弬鏁?, '涓存椂鏀?ngram銆佸鍗°€乻peculative decoding 绛夐珮绾у弬鏁般€?, `
          <div class="form-grid single">
            ${field('extra_args', '杩藉姞鍒?llama-server 鐨勫弬鏁?, { textarea: true, hint: '渚嬪 --flash-attn --no-mmap銆傚弬鏁颁細杩藉姞鍒版渶缁堝惎鍔ㄥ懡浠ゆ湯灏撅紝闇€瑕佷笌浣犳湰鏈?llama.cpp 鐗堟湰鍖归厤銆? })}
          </div>
          <div class="command-preview compact ${launch.error ? 'has-error' : ''}">
            <pre>${escapeHtml(launch.error || launch.preview || '淇濆瓨閰嶇疆鍚庝細鍦ㄨ繖閲岀敓鎴愬畬鏁村懡浠ゃ€?)}</pre>
            <button type="button" class="outline-btn small-btn" data-action="copy-launch-command" ${launch.preview && !launch.error ? '' : 'disabled'}>澶嶅埗鍛戒护</button>
          </div>
        `)}
        ${renderModernSettingsCard('寮€鍙戣€呭紑鍏?, '淇濈暀鎬ц兘鍜岃皟璇曠浉鍏冲紑鍏炽€?, `
          <div class="switch-grid">
            ${switchField('cpu_moe', 'MoE 鏀惧湪 CPU', '鏄惧瓨绱у紶鏃舵洿绋炽€?)}
            ${switchField('embeddings', 'Embeddings', '闇€瑕佸悜閲忔帴鍙ｆ椂寮€鍚€?)}
            ${switchField('continuous_batching', 'Continuous batching', '澶氳姹傚満鏅洿骞虫粦銆?)}
            ${switchField('verbose', 'Verbose', '杈撳嚭鏇寸粏鐨勬湇鍔＄鏃ュ織銆?)}
          </div>
        `)}
      </div>
    `
  }

  return renderModernSettingsCard('鏃ュ織', 'ANSI 棰滆壊鐮佸凡琚繃婊わ紝鏂逛究鐩存帴鐪嬬湡姝ｇ殑 llama.cpp 杈撳嚭銆?, `
    <div class="log-box" id="logBox">
      ${
        visibleLogs().length
          ? visibleLogs().map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('')
          : '<div class="empty-log">杩樻病鏈夋棩蹇椼€傚惎鍔ㄦ湇鍔″悗浼氬湪杩欓噷瀹炴椂鏄剧ず銆?/div>'
      }
    </div>
  `)
}

/**
 * 娓叉煋鐜颁唬璁剧疆闈㈡澘
 * @returns {string} 璁剧疆闈㈡澘鐨?HTML 瀛楃涓? */
function renderModernSettingsPanel() {
  const v = state.validation || {}
  const [activeId, activeIcon, activeLabel, activeHint] = currentSettingsTabMeta()
  return `
    <div class="settings-backdrop ${state.settingsOpen ? 'show' : ''}" data-action="close-settings"></div>
    <aside class="settings-panel ${state.settingsOpen ? 'show' : ''}">
      <div class="settings-rail">
        <div class="settings-badge">鈿?璁剧疆</div>
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
          <strong>褰撳墠杩涘害</strong>
          <div><span>閰嶇疆鏂囦欢</span>${pill(v.configExists)}</div>
          <div><span>鍚姩鍣?/span>${pill(v.launcherExists)}</div>
          <div><span>llama-server</span>${pill(v.serverExists)}</div>
          <div><span>妯″瀷鏂囦欢</span>${pill(v.modelExists)}</div>
        </div>
      </div>
      <div class="settings-main">
        <div class="settings-head">
          <div>
            <span>璁剧疆</span>
            <strong>${escapeHtml(activeLabel)}</strong>
            <em>${escapeHtml(activeHint)}</em>
          </div>
          <button type="button" class="icon-btn" data-action="close-settings">脳</button>
        </div>
        <div class="settings-body">${renderModernSettingsContent()}</div>
        <div class="settings-foot">
          <button class="outline-btn" type="button" data-action="save">淇濆瓨</button>
          <button class="primary-btn" type="button" data-action="close-settings">瀹屾垚</button>
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
