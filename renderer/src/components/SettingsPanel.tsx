import React from 'react'
import type { Config, Validation, LogEntry } from '../types'
import { escapeHtml, visibleLogs, statusLabel, statusClass } from '../utils'

interface SettingsPanelProps {
  settingsOpen: boolean
  active: string
  config: Config | null
  validation: Validation
  status: { state: string; message: string; url: string }
  logs: LogEntry[]
  dirty: boolean
  onClose: () => void
  onSelectSection: (sectionId: string) => void
  onUpdateConfig: (key: keyof Config, value: unknown) => void
  onPickFile: (fieldName: string, kind: string) => void
}

export function SettingsPanel({
  settingsOpen,
  active,
  config,
  validation,
  status,
  logs,
  dirty,
  onClose,
  onSelectSection,
  onUpdateConfig,
  onPickFile,
}: SettingsPanelProps) {
  if (!settingsOpen) return null

  const pill = (value: boolean | undefined) => (
    <span className={`pill ${value ? 'good' : 'bad'}`}>
      {value ? '✓' : '✗'}
    </span>
  )

  const field = (key: keyof Config, label: string, options: { pick?: string; hint?: string; textarea?: boolean; type?: string; min?: number } = {}) => {
    const value = config?.[key]
    const id = `setting-${String(key)}`
    
    return (
      <div className="form-field">
        <label htmlFor={id}>{label}</label>
        <div className="field-wrap">
          {options.textarea ? (
            <textarea
              id={id}
              value={String(value || '')}
              onChange={(e) => onUpdateConfig(key, e.target.value)}
              placeholder={options.hint}
            />
          ) : options.pick ? (
            <div className="field-with-picker">
              <input
                id={id}
                type="text"
                value={String(value || '')}
                onChange={(e) => onUpdateConfig(key, e.target.value)}
                placeholder={options.hint}
                readOnly
              />
              <button type="button" onClick={() => onPickFile(String(key), options.pick)}>浏览</button>
            </div>
          ) : (
            <input
              id={id}
              type={options.type || 'text'}
              value={options.type === 'number' ? String(value || '') : value}
              onChange={(e) => onUpdateConfig(key, options.type === 'number' ? Number(e.target.value) : e.target.value)}
              min={options.min}
              placeholder={options.hint}
            />
          )}
        </div>
        {options.hint && <span className="field-hint">{options.hint}</span>}
      </div>
    )
  }

  const selectField = (key: keyof Config, label: string, options: string[], hint?: string) => {
    const value = String(config?.[key] || '')
    
    return (
      <div className="form-field">
        <label>{label}</label>
        <select value={value} onChange={(e) => onUpdateConfig(key, e.target.value)}>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
    )
  }

  const switchField = (key: keyof Config, label: string, hint?: string) => {
    const value = config?.[key] === true
    
    return (
      <div className="switch-field">
        <label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onUpdateConfig(key, e.target.checked)}
          />
          <span className="switch-track"></span>
        </label>
        <span className="switch-label">{label}</span>
        {hint && <span className="switch-hint">{hint}</span>}
      </div>
    )
  }

  const renderSettingsSection = (sectionId: string, content: React.ReactNode) => (
    <section className={`settings-section ${active === sectionId ? 'active' : ''}`}>
      {content}
    </section>
  )

  const checks = (
    <div className="checks">
      <div><span>配置文件</span>{pill(validation.configExists)}</div>
      <div><span>启动器</span>{pill(validation.launcherExists)}</div>
      <div><span>llama-server</span>{pill(validation.serverExists)}</div>
      <div><span>模型文件</span>{pill(validation.modelExists)}</div>
      <div><span>保存状态</span>{dirty ? <span className="pill warn">未保存</span> : <span className="pill good">已保存</span>}</div>
    </div>
  )

  return (
    <>
      <div className={`settings-backdrop ${settingsOpen ? 'show' : ''}`} onClick={onClose}></div>
      <aside className={`settings-panel ${settingsOpen ? 'show' : ''}`}>
        <div className="settings-rail">
          <div className="settings-badge">⚙ 设置</div>
          <h2>设置</h2>
          <p>配置 llama.cpp 运行参数和模型路径</p>
          <nav className="settings-rail-tabs">
            {[
              { id: 'overview', label: '概览', hint: '服务状态和端点' },
              { id: 'paths', label: '路径', hint: '配置文件和可执行文件位置' },
              { id: 'model', label: '模型', hint: 'GGUF 模型文件设置' },
              { id: 'runtime', label: '运行时', hint: '服务器和推理参数' },
              { id: 'sampling', label: '采样', hint: '温度和采样参数' },
              { id: 'system', label: '系统', hint: '线程和设备设置' },
              { id: 'logs', label: '日志', hint: '终端输出日志' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`${active === tab.id ? 'active' : ''}`}
                onClick={() => onSelectSection(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.hint}</span>
              </button>
            ))}
          </nav>
          <div className="settings-rail-status">
            <span className={`status-dot ${statusClass(status.state)}`}></span>
            <span>{statusLabel(status.state)}</span>
          </div>
        </div>
        <div className="settings-main">
          <div className="settings-head">
            <div>
              <span>设置</span>
              <strong>
                {[
                  { id: 'overview', label: '概览' },
                  { id: 'paths', label: '路径设置' },
                  { id: 'model', label: '模型设置' },
                  { id: 'runtime', label: '运行时设置' },
                  { id: 'sampling', label: '采样参数' },
                  { id: 'system', label: '系统设置' },
                  { id: 'logs', label: '日志' },
                ].find(tab => tab.id === active)?.label || '概览'}
              </strong>
            </div>
            <button type="button" className="outline-btn" onClick={onClose}>关闭</button>
          </div>
          <div className="settings-body">
            {renderSettingsSection('overview', (
              <>
                <div className="settings-note">服务状态和接入信息。</div>
                {checks}
                <div className="endpoint-box">
                  <span>OpenAI Base URL</span>
                  <strong>{escapeHtml(status.url || '')}/v1</strong>
                </div>
                <div className="endpoint-box">
                  <span>Chat Completions</span>
                  <strong>{escapeHtml(status.url || '')}/v1/chat/completions</strong>
                </div>
              </>
            ))}

            {renderSettingsSection('paths', (
              <>
                <div className="settings-note">这里控制桌面端调用哪个启动器，以及启动器使用哪个 llama-server.exe。</div>
                <div className="form-grid single">
                  {selectField('launch_mode', '启动方式', ['direct', 'launcher'], 'direct = 直接启动 llama-server.exe；launcher = 兼容旧启动器')}
                  {field('config_path', '配置文件', { pick: 'toml', hint: '默认使用启动器目录下的 config.toml。' })}
                  {field('launcher_path', '启动器 EXE', { pick: 'exe', hint: '桌面端启动服务时调用这个程序。' })}
                  {field('llama_server_path', 'llama-server.exe', { pick: 'exe', hint: '保存后写入 config.toml 的 llama_server_path。' })}
                </div>
              </>
            ))}

            {renderSettingsSection('model', (
              <>
                <div className="settings-note">选择 GGUF 模型。纯文本模型可以不填 mmproj。</div>
                <div className="form-grid single">
                  {field('llama_bin_dir', 'llama.cpp 目录', { pick: 'dir', hint: '包含 llama-server.exe 和 CUDA/ggml DLL 的目录。' })}
                  {field('model', '模型文件', { pick: 'gguf', hint: '例如 Qwen3.5-9B.Q4_K_M.gguf。' })}
                  {field('mmproj', 'mmproj 投影文件', { pick: 'gguf', hint: '视觉或多模态模型才需要。' })}
                  {field('chat_template_kwargs', 'Chat Template Kwargs', { textarea: true, hint: '例如 {"enable_thinking": false}。' })}
                </div>
              </>
            ))}

            {renderSettingsSection('runtime', (
              <>
                <div className="settings-note">给外部客户端接入时，通常保留 host=0.0.0.0 和 port=8080。</div>
                <div className="form-grid two">
                  {field('host', 'Host')}
                  {field('port', 'Port', { type: 'number', min: 1 })}
                  {field('ctx_size', '上下文长度 ctx_size', { type: 'number', min: 1 })}
                  {field('n_predict', '输出长度 n_predict', { type: 'number' })}
                  {field('n_gpu_layers', 'GPU 层数 n_gpu_layers', { type: 'number' })}
                  {field('request_timeout_ms', '请求超时 ms', { type: 'number', min: 30000 })}
                  {field('log_verbosity', '日志等级', { type: 'number' })}
                </div>
                <div className="switch-grid">
                  {switchField('verbose', '详细日志', '排查问题时打开。')}
                  {switchField('webui', 'llama.cpp Web UI', '不是桌面端主入口，但可保留。')}
                  {switchField('embeddings', 'Embeddings', '需要向量接口时打开。')}
                  {switchField('continuous_batching', 'Continuous batching', '多客户端请求更平稳。')}
                </div>
              </>
            ))}

            {renderSettingsSection('sampling', (
              <>
                <div className="settings-note">这些参数影响回答风格和随机性。</div>
                <div className="form-grid two">
                  {field('temp', 'Temperature', { type: 'number' })}
                  {field('top_k', 'Top-K', { type: 'number' })}
                  {field('top_p', 'Top-P', { type: 'number' })}
                  {field('min_p', 'Min-P', { type: 'number' })}
                  {field('presence_penalty', 'Presence penalty', { type: 'number' })}
                  {field('repeat_penalty', 'Repeat penalty', { type: 'number' })}
                </div>
              </>
            ))}

            {renderSettingsSection('system', (
              <>
                <div className="settings-note">没有明确需求时可以留空，由 llama.cpp 自动决定。</div>
                <div className="form-grid two">
                  {field('threads', 'Threads', { type: 'number' })}
                  {field('threads_batch', 'Threads batch', { type: 'number' })}
                  {field('batch_size', 'Batch size', { type: 'number' })}
                  {field('ubatch_size', 'Ubatch size', { type: 'number' })}
                  {selectField('split_mode', 'Split mode', ['', 'layer', 'row', 'none'])}
                  {field('tensor_split', 'Tensor split')}
                  {field('device', 'Device')}
                  {field('main_gpu', 'Main GPU', { type: 'number' })}
                  {field('n_cpu_moe', 'n_cpu_moe', { type: 'number' })}
                </div>
                <div className="switch-grid">{switchField('cpu_moe', 'MoE 权重保留在 CPU', '显存紧张时有用。')}</div>
              </>
            ))}

            {renderSettingsSection('logs', (
              <>
                <div className="settings-note">ANSI 颜色码会被过滤，方便直接看真正的 llama.cpp 输出。</div>
                <div className="log-box" id="logBox">
                  {visibleLogs(logs).length > 0 ? (
                    visibleLogs(logs).map((entry, index) => (
                      <div key={index} className="log-entry">
                        <span>{escapeHtml(entry.at)}</span>
                        <strong>{escapeHtml(entry.source || 'log')}</strong>
                        <em>{escapeHtml(entry.line || '')}</em>
                      </div>
                    ))
                  ) : (
                    <div className="empty-log">还没有日志。启动服务后会在这里显示。</div>
                  )}
                </div>
              </>
            ))}
          </div>
          <div className="settings-foot">
            <div className="checks-inline">
              <span className={`pill ${validation.configExists ? 'good' : 'bad'}`}>{validation.configExists ? '✓ 配置有效' : '✗ 配置缺失'}</span>
              {dirty && <span className="pill warn">未保存</span>}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
