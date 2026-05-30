// 设置面板组件 - 配置 llama 服务
import React, { useState, useEffect } from 'react'
import { SettingOutlined, DesktopOutlined, SlidersOutlined, ApiOutlined, CodeOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons'
import type { Config, Validation, LogEntry, Skill } from '../types'
import { escapeHtml, visibleLogs, statusLabel, statusClass } from '../utils'

interface SettingsPanelProps {
  settingsOpen: boolean
  active: string
  config: Config | null
  validation: Validation
  status: { state: string; message: string; url: string }
  logs: LogEntry[]
  dirty: boolean
  launch: Record<string, unknown>
  onClose: () => void
  onSelectSection: (sectionId: string) => void
  onUpdateConfig: (key: keyof Config, value: unknown) => void
  onPickFile: (fieldName: string, kind: string) => void
  onCopyLaunchCommand: () => void
  onOpenModelInfo: () => void
}

// 设置标签页定义
const settingsTabs = [
  { id: 'overview', icon: <SettingOutlined />, label: '概览', hint: '服务入口与基础运行信息' },
  { id: 'display', icon: <DesktopOutlined />, label: '展示', hint: '模型标签、模板与显示项' },
  { id: 'skills', icon: <ToolOutlined />, label: '技能', hint: '管理自定义技能提示词' },
  { id: 'sampling', icon: <SlidersOutlined />, label: '采样与惩罚', hint: '温度、Top-K/P、重复与 DRY' },
  { id: 'mcp', icon: <ApiOutlined />, label: 'MCP', hint: '预留扩展和工具接入' },
  { id: 'developer', icon: <CodeOutlined />, label: '开发者', hint: '线程、GPU 与批处理' },
  { id: 'logs', icon: <FileTextOutlined />, label: '日志', hint: '当前 llama.cpp 服务输出' },
]


// ========== NewSkillModal ==========
function NewSkillModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [whenToUse, setWhenToUse] = useState("")
  const [argHint, setArgHint] = useState("")
  const [genContent, setGenContent] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [genError, setGenError] = useState("")

  const handleGenerate = async () => {
    if (!name.trim()) { setGenError("请先填写技能名称"); return }
    setGenerating(true)
    setGenError("")
    setGenContent("")
    try {
      const result = await window.llamaDesktop.generateSkillContent({
        name: name.trim(),
        description: desc.trim(),
        whenToUse: whenToUse.trim(),
        argumentHint: argHint.trim(),
      })
      setGenContent(result.content)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    const content = genContent.trim()
    if (!content) { setGenError("请先生成 SKILL.md 内容"); return }
    if (!name.trim()) { setGenError("技能名称不能为空"); return }
    setSaving(true)
    try {
      await window.llamaDesktop.createSkill({ name: name.trim(), content })
      onSaved()
    } catch (e) {
      setGenError("保存失败: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100001,
      background: "rgba(0,0,0,0.4)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-lg)",
        padding: 24, width: 580, maxHeight: "88vh", overflow: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>新建技能</h3>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        <div style={{
          background: "var(--surface-soft)", borderRadius: "var(--radius-lg)",
          padding: "16px 18px", marginBottom: 16,
          border: "1px solid var(--line)",
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            填写基本信息后，点击下方按钮由本地 LLM 自动生成完整的 SKILL.md
          </div>
          <div className="form-grid single">
            <label className="field">
            <span>技能名称 <em style={{ color: "var(--danger)" }}>*</em></span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：代码审查" />
          </label>
          <label className="field">
            <span>描述</span>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="简要描述技能功能" />
          </label>
          <label className="field">
            <span>触发条件</span>
            <input value={whenToUse} onChange={e => setWhenToUse(e.target.value)} placeholder="例如：用户请求代码审查时" />
          </label>
          <label className="field">
            <span>参数提示</span>
            <input value={argHint} onChange={e => setArgHint(e.target.value)} placeholder="可选：${ARGUMENTS} 的说明" />
          </label>
          </div>
        </div>

        <button
          className="primary-btn"
          style={{
            width: "100%", minHeight: 44, fontSize: 14, marginBottom: 16,
            background: generating ? "var(--muted)" : "linear-gradient(135deg, #2563eb, #7c3aed)",
            border: "none", color: "#fff", fontWeight: 600,
            borderRadius: "var(--radius-md)", cursor: generating ? "not-allowed" : "pointer",
            opacity: generating ? 0.7 : 1,
          }}
          onClick={handleGenerate}
          disabled={generating || !name.trim()}
        >
          {generating ? "⏳ 正在调用本地 LLM 生成..." : "✨ 自动生成 SKILL.md"}
        </button>        {genError && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-sm)",
            background: "#fff5f5", color: "#c53030",
            fontSize: 12, marginBottom: 12, border: "1px solid #fed7d7",
            lineHeight: 1.5, wordBreak: "break-all",
          }}>{genError}</div>
        )}

        {genContent && (
          <div style={{
            background: "var(--surface-soft)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--line)", padding: "16px 18px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>SKILL.md 预览（可编辑）</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{genContent.split("\n").length} 行</span>
            </div>
            <textarea
              value={genContent}
              onChange={e => setGenContent(e.target.value)}
              rows={16}
              style={{
                width: "100%", fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                fontSize: 11, resize: "vertical", lineHeight: 1.6,
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                padding: "10px 12px", background: "var(--surface)", color: "var(--ink)",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="outline-btn" onClick={onClose}>取消</button>
          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={saving || !genContent.trim()}
          >{saving ? "保存中..." : "保存技能"}</button>
        </div>
      </div>
    </div>
  )
}

// ========== EditSkillModal ==========
function EditSkillModal({ skill, onClose, onSaved }: { skill: Skill; onClose: () => void; onSaved: () => void }) {
  const [ename, setEname] = useState(skill.name || "")
  const [edesc, setEdesc] = useState(skill.description || "")
  const [ewhen, setEwhen] = useState(skill.whenToUse || "")
  const [eargHint, setEargHint] = useState(skill.argumentHint || "")
  const [ebody, setEbody] = useState(skill.body || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!ename.trim()) { setError("技能名称不能为空"); return }
    setSaving(true)
    setError("")
    try {
      let fm = "---\r\n"
      fm += "name: " + ename.trim() + "\r\n"
      if (edesc.trim()) fm += "description: " + edesc.trim() + "\r\n"
      if (ewhen.trim()) fm += "whenToUse: " + ewhen.trim() + "\r\n"
      if (eargHint.trim()) fm += "argumentHint: " + eargHint.trim() + "\r\n"
      fm += "allowedTools:\r\n  - Read\r\n  - Write\r\n"
      fm += "---\r\n\r\n"
      const fullContent = fm + ebody.trim()
      await window.llamaDesktop.createSkill({ name: skill.dirName, content: fullContent })
      onSaved()
    } catch (e) {
      setError("保存失败: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100001,
      background: "rgba(0,0,0,0.4)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-lg)",
        padding: 24, width: 620, maxHeight: "88vh", overflow: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>修改技能</h3>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        <div style={{
          background: "var(--surface-soft)", borderRadius: "var(--radius-lg)",
          padding: "16px 18px", marginBottom: 16,
          border: "1px solid var(--line)",
        }}>
          <div className="form-grid single">
            <label className="field">
              <span>技能名称 <em style={{ color: "var(--danger)", fontStyle: "normal" }}>*</em></span>
              <input value={ename} onChange={e => setEname(e.target.value)} placeholder="例如：代码审查" />
            </label>
            <label className="field">
              <span>描述</span>
              <input value={edesc} onChange={e => setEdesc(e.target.value)} placeholder="简要描述技能功能" />
            </label>
            <label className="field">
              <span>触发条件</span>
              <input value={ewhen} onChange={e => setEwhen(e.target.value)} placeholder="例如：用户请求代码审查时" />
            </label>
            <label className="field">
              <span>参数提示</span>
              <input value={eargHint} onChange={e => setEargHint(e.target.value)} placeholder="可选：${ARGUMENTS} 的说明" />
            </label>
          </div>
        </div>

        <div style={{
          background: "var(--surface-soft)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--line)", padding: "16px 18px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>技能主体（系统提示词）</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{ebody.split("\n").length} 行</span>
          </div>
          <textarea
            value={ebody}
            onChange={e => setEbody(e.target.value)}
            rows={14}
            style={{
              width: "100%", fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              fontSize: 11, resize: "vertical", lineHeight: 1.6,
              border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
              padding: "10px 12px", background: "var(--surface)", color: "var(--ink)",
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-sm)",
            background: "#fff5f5", color: "#c53030",
            fontSize: 12, marginBottom: 12, border: "1px solid #fed7d7",
            lineHeight: 1.5, wordBreak: "break-all",
          }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="outline-btn" onClick={onClose}>取消</button>
          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={saving || !ename.trim()}
          >{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  )
}

export function SettingsPanel({
  settingsOpen,
  active,
  config,
  validation,
  status,
  logs,
  dirty,
  launch,
  onClose,
  onSelectSection,
  onUpdateConfig,
  onPickFile,
  onCopyLaunchCommand,
  onOpenModelInfo,
}: SettingsPanelProps) {
  if (!settingsOpen) return null

  const currentTab = settingsTabs.find(t => t.id === active) || settingsTabs[0]

  // 状态胶囊组件
  const pill = (value: boolean | undefined) => (
    <span className={`pill ${value ? 'good' : 'bad'}`}>
      {value ? '就绪' : '缺失'}
    </span>
  )

  // 通用输入字段组件
  const field = (key: keyof Config, label: string, options: { pick?: string; hint?: string; textarea?: boolean; type?: string; min?: number } = {}) => {
    const directMode = (config?.launch_mode || 'direct') !== 'launcher'
    // 直接模式下隐藏某些字段
    if (directMode && ['config_path', 'launcher_path', 'llama_server_path'].includes(String(key))) {
      return null
    }

    const value = config?.[key]
    const id = `setting-${String(key)}`

    return (
      <label className="field">
        <span>{label}</span>
        <div className={options.pick ? 'field-row' : ''}>
          {options.textarea ? (
            <textarea
              id={id}
              value={String(value || '')}
              onChange={(e) => onUpdateConfig(key, e.target.value)}
              placeholder={options.hint}
              spellCheck={false}
            />
          ) : options.pick ? (
            <>
              <input
                id={id}
                type="text"
                value={String(value || '')}
                onChange={(e) => onUpdateConfig(key, e.target.value)}
                placeholder={options.hint}
                readOnly
              />
              <button className={value ? "danger-btn" : "muted-btn"} type="button" disabled={!value} onClick={() => onUpdateConfig(key, '')}>清除</button>
              <button className="text-btn" type="button" onClick={() => onPickFile(String(key), options.pick!)}>选择</button>
            </>
          ) : (
            <input
              id={id}
              type={options.type || 'text'}
              value={options.type === 'number' ? String(value ?? '') : String(value ?? '')}
              onChange={(e) => onUpdateConfig(key, options.type === 'number' ? Number(e.target.value) : e.target.value)}
              min={options.min}
              placeholder={options.hint}
            />
          )}
        </div>
        {options.hint && <div className="hint">{options.hint}</div>}
      </label>
    )
  }

  // 选择字段组件
  const selectField = (key: keyof Config, label: string, choices: string[], hint?: string) => {
    const value = String(config?.[key] ?? '')
    const directMode = (config?.launch_mode || 'direct') !== 'launcher'
    const extra = key === 'launch_mode' && directMode
      ? field('llama_bin_dir', 'llama.cpp 原始目录', { pick: 'dir', hint: '选择包含 llama-server.exe 和 CUDA / ggml DLL 的原始目录。' })
      : null

    return (
      <>
        <label className="field">
          <span>{label}</span>
          <select value={value} onChange={(e) => onUpdateConfig(key, e.target.value)}>
            {choices.map(choice => (
              <option key={choice} value={choice}>{choice || 'auto'}</option>
            ))}
          </select>
          {hint && <div className="hint">{hint}</div>}
        </label>
        {extra}
      </>
    )
  }

  // 开关字段组件
  const switchField = (key: keyof Config, label: string, hint: string) => {
    const value = config?.[key] === true

    return (
      <label className="switch">
        <span>
          <strong>{label}</strong>
          <em>{hint}</em>
        </span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onUpdateConfig(key, e.target.checked)}
        />
      </label>
    )
  }

  // 设置卡片组件
  const settingsCard = (title: string, text: string, content: React.ReactNode) => (
    <section className="settings-stack-card">
      <header>
        <strong>{title}</strong>
        {text && <span>{text}</span>}
      </header>
      {content}
    </section>
  )

  // 检查项组件
  const checks = (
    <div className="checks">
      <div><span>配置文件</span>{pill(validation.configExists)}</div>
      <div><span>启动器</span>{pill(validation.launcherExists)}</div>
      <div><span>llama-server</span>{pill(validation.serverExists)}</div>
      <div><span>模型文件</span>{pill(validation.modelExists)}</div>
      <div><span>保存状态</span>{dirty ? <span className="pill warn">未保存</span> : <span className="pill good">已保存</span>}</div>
    </div>
  )

  const launchPreview = String((launch as Record<string, string>).preview || '')
  const launchError = String((launch as Record<string, string>).error || '')

  // 根据当前标签渲染内容
  const renderTabContent = () => {
    switch (currentTab.id) {
      case 'overview':
        return (
          <div className="settings-stack">
            {settingsCard('当前接入状态', '这里集中放服务入口、上下文和启动模式。', (
              <>
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
            {settingsCard('运行参数', '桌面端直连 llama.cpp 时，这一组就是最常用的核心参数。', (
              <>
                <div className="form-grid two">
                  {selectField('launch_mode', '启动方式', ['direct', 'launcher'], 'direct = 直接调用 llama-server.exe；launcher = 兼容旧启动器')}
                  {field('host', 'Host')}
                  {field('port', 'Port', { type: 'number', min: 1 })}
                  {field('ctx_size', '上下文大小 ctx_size', { type: 'number', min: 1 })}
                  {field('n_predict', '最大输出 n_predict', { type: 'number' })}
                  {field('n_gpu_layers', 'GPU 层数', { type: 'number' })}
                  {field('request_timeout_ms', '请求超时 ms', { type: 'number', min: 30000 })}
                </div>
                <div className="settings-callout">32GB 内存建议先用 32768 或 65536 上下文。31072 这类超长上下文会显著增加 KV cache，占满内存是正常风险。</div>
              </>
            ))}
            {settingsCard('最终启动命令', '速度或参数不对时，先复制这里和原生命令行对比。', (
              <div className={`command-preview ${launchError ? 'has-error' : ''}`}>
                <pre>{escapeHtml(launchError || launchPreview || '保存配置后会在这里生成完整命令。')}</pre>
                <button type="button" className="outline-btn small-btn" onClick={onCopyLaunchCommand} disabled={!launchPreview || !!launchError}>复制命令</button>
              </div>
            ))}
          </div>
        )

      case 'display':
        return (
          <div className="settings-stack">
            {settingsCard('模型与模板', '切换 GGUF、视觉投影和模板参数。', (
              <>
                <div className="form-grid single">
                  {field('model', '模型文件', { pick: 'gguf', hint: '例如 Qwen3.5-9B.Q4_K_M.gguf' })}
                  {field('mmproj', 'mmproj 投影文件', { pick: 'gguf', hint: '视觉或多模态模型才需要。' })}
                  {field('chat_template_kwargs', 'Chat Template Kwargs', { textarea: true, hint: '会同时作为启动参数和每次请求参数发送。可写 {"enable_thinking":false}，也兼容 --chat-template-kwargs \'{"enable_thinking":false}\'。支持的模型还可加 "thinking_budget": 0。' })}
                </div>
                <div className="settings-callout">注意：这是控制模型是否生成思考；下面的"显示思考过程"只是控制前端是否把已返回的 💭 展示出来。图片理解需要视觉模型和 mmproj。</div>
              </>
            ))}
            {settingsCard('当前模型', '点击可查看详细模型信息。', (
              <div 
                className="model-info-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                }}
                onClick={onOpenModelInfo}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>☯</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {config?.model ? String(config.model).split(/[\\/]/).pop() : '未配置模型'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {config?.model || '请在上方选择模型文件'}
                    </div>
                  </div>
                </div>
                <button className="outline-btn" style={{ fontSize: 12, padding: '4px 12px', minHeight: 32 }}>
                  查看详细信息
                </button>
              </div>
            ))}
            {settingsCard('展示开关', '把网页端常见的显示项集中到一起。', (
              <div className="switch-grid">
                {switchField('show_thinking', '显示思考过程', '解析模型返回的 💭 区块。')}
                {switchField('expand_thinking', '默认展开思考', '关闭时会折叠成一行。')}
                {switchField('show_raw_output', '显示原始输出', '排查模板和思考模式时使用。')}
                {switchField('webui', '保留 llama.cpp Web UI', '保留浏览器页入口，方便双开调试。')}
                {switchField('verbose', '显示详细日志', '输出更多服务端消息，便于排查。')}
              </div>
            ))}
          </div>
        )

      case 'skills': {
        const [skillsList, setSkillsList] = useState<Skill[]>([])
        const [skillsLoaded, setSkillsLoaded] = useState(false)
        const [deleting, setDeleting] = useState<string | null>(null)
        const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
        const [showNewSkillModal, setShowNewSkillModal] = useState(false)

        const loadSkills = () => {
          window.llamaDesktop.listSkills().then(list => {
            setSkillsList(list)
            setSkillsLoaded(true)
          }).catch(() => setSkillsLoaded(true))
        }

        useEffect(() => {
          if (!skillsLoaded) loadSkills()
        }, [skillsLoaded])

        const handleDelete = async (dirName: string, skillName: string) => {
          if (!window.confirm(`确定删除技能 "${skillName}" 吗？此操作不可恢复。`)) return
          setDeleting(dirName)
          try {
            await window.llamaDesktop.deleteSkill({ name: dirName })
            setSkillsList(prev => prev.filter(s => s.dirName !== dirName))
          } catch (e) {
            window.alert('删除失败: ' + (e instanceof Error ? e.message : String(e)))
          } finally {
            setDeleting(null)
          }
        }

        const handleEdit = async (dirName: string) => {
          try {
            const skill = await window.llamaDesktop.readSkill({ name: dirName })
            setEditingSkill(skill)
          } catch (e) {
            window.alert('读取技能失败: ' + (e instanceof Error ? e.message : String(e)))
          }
        }

        return (
          <div className="settings-stack">
            {settingsCard('技能管理', '新建、修改和删除自定义技能提示词', (
              <div>
                {!skillsLoaded ? (
                  <div className="empty-log">加载中...</div>
                ) : skillsList.length === 0 ? (
                  <div className="empty-log" style={{ padding: '24px 0', textAlign: 'center' }}>还没有技能，点击下方"新建技能"创建第一个。</div>
                ) : (
                  <div className="settings-stack">
                    {skillsList.map((skill) => (
                      <div key={skill.dirName} className="settings-card" style={{
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '14px 16px',
                        background: 'var(--surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{skill.name}</strong>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{skill.description}</p>
                          {skill.whenToUse && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0', opacity: 0.7 }}>触发: {skill.whenToUse}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            className="outline-btn"
                            style={{ minHeight: 32, fontSize: 12, padding: '0 12px' }}
                            onClick={() => handleEdit(skill.dirName)}
                          >修改</button>
                          <button
                            className="danger-btn"
                            style={{ minHeight: 32, fontSize: 12, padding: '0 12px' }}
                            onClick={() => handleDelete(skill.dirName, skill.name)}
                            disabled={deleting === skill.dirName}
                          >{deleting === skill.dirName ? '删除中...' : '删除'}</button>
                        </div>
                      </div>
                    ))}
                    <button
                      className="primary-btn"
                      style={{ width: '100%', minHeight: 40, fontSize: 13, marginTop: 4 }}
                      onClick={() => setShowNewSkillModal(true)}
                    >+ 新建技能</button>
                  </div>
                )}
              </div>
            ))}

                        {/* 新建技能弹窗 */}
            {showNewSkillModal && <NewSkillModal
              onClose={() => setShowNewSkillModal(false)}
              onSaved={() => { setShowNewSkillModal(false); setSkillsLoaded(false); }}
            />}

            {/* 编辑技能弹窗 */}
            {editingSkill && <EditSkillModal
              skill={editingSkill}
              onClose={() => setEditingSkill(null)}
              onSaved={() => { setEditingSkill(null); setSkillsLoaded(false); }}
            />}
          </div>
        )
      }

      case 'sampling':
        return (
          <div className="settings-stack">
            {settingsCard('采样', '控制回答的随机性和分布范围。', (
              <div className="form-grid two">
                {field('temp', 'Temperature', { type: 'number' })}
                {field('top_k', 'Top-K', { type: 'number' })}
                {field('top_p', 'Top-P', { type: 'number' })}
                {field('min_p', 'Min-P', { type: 'number' })}
              </div>
            ))}
            {settingsCard('高级采样', 'TFS 和 Typical 是更精细的采样策略，留空则不传。', (
              <div className="form-grid two">
                {field('tfs_z', 'TFS z', { type: 'number', hint: 'Tail Free Sampling，0 禁用，常用 0.5~1.0。' })}
                {field('typical_p', 'Typical p', { type: 'number', hint: 'Typical Sampling，1 禁用，常用 0.5~0.9。' })}
              </div>
            ))}
            {settingsCard('惩罚项', '控制重复和多样性。', (
              <div className="form-grid two">
                {field('presence_penalty', 'Presence penalty', { type: 'number' })}
                {field('frequency_penalty', 'Frequency penalty', { type: 'number' })}
                {field('repeat_penalty', 'Repeat penalty', { type: 'number' })}
                {field('repeat_last_n', 'Repeat last N', { type: 'number', hint: '参与 repeat penalty 计算的最近 token 数，默认 64。' })}
              </div>
            ))}
            {settingsCard('DRY 采样', 'Dynamic Repetition Yield — 更智能的重复惩罚，留空则不传。', (
              <div className="form-grid two">
                {field('dry_multiplier', 'DRY multiplier', { type: 'number', hint: '0 禁用，常用 0.5~1.5。' })}
                {field('dry_base', 'DRY base', { type: 'number', hint: '指数衰减基数，默认 1.75。' })}
                {field('dry_allowed_length', 'DRY allowed length', { type: 'number', hint: '允许的最大连续重复长度，默认 2。' })}
                {field('dry_penalty_last_n', 'DRY penalty last N', { type: 'number', hint: '参与 DRY 计算的最近 token 数，默认 -1（全部）。' })}
              </div>
            ))}
          </div>
        )

      case 'mcp':
        return settingsCard('MCP 服务', '这里先把界面结构预留成网页端那种独立分类。', (
          <div className="settings-mcp-placeholder">
            <strong>未接入原生 MCP 服务</strong>
            <p>当前这个桌面端仍以 llama.cpp 的 OpenAI 兼容接口为主。后续如果你想把工具服务接进来，我们可以继续把这里做成真正可配置的面板。</p>
          </div>
        ))

      case 'developer':
        return (
          <div className="settings-stack">
            {settingsCard('线程与设备', '批处理、线程和 GPU 分配都放在开发者页。', (
              <>
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
                  {field('log_verbosity', '日志等级', { type: 'number' })}
                </div>
                <div className="settings-callout">多 GPU 取决于本地 llama.cpp 的编译版本和硬件环境。常见参数是 split-mode、tensor-split 和 main-gpu。</div>
              </>
            ))}
            {settingsCard('自定义附加参数', '临时放 ngram、多卡、speculative decoding 等高级参数。', (
              <>
                <div className="form-grid single">
                  {field('extra_args', '追加到 llama-server 的参数', { textarea: true, hint: '例如 --flash-attn --no-mmap。参数会追加到最终启动命令末尾，需要与你本地 llama.cpp 版本匹配。' })}
                </div>
                <div className={`command-preview compact ${launchError ? 'has-error' : ''}`}>
                  <pre>{escapeHtml(launchError || launchPreview || '保存配置后会在这里生成完整命令。')}</pre>
                  <button type="button" className="outline-btn small-btn" onClick={onCopyLaunchCommand} disabled={!launchPreview || !!launchError}>复制命令</button>
                </div>
              </>
            ))}
            {settingsCard('开发者开关', '保留性能和调试相关开关。', (
              <div className="switch-grid">
                {switchField('cpu_moe', 'MoE 放在 CPU', '显存紧张时更稳。')}
                {switchField('embeddings', 'Embeddings', '需要向量接口时开启。')}
                {switchField('continuous_batching', 'Continuous batching', '多请求场景更平稳。')}
                {switchField('verbose', 'Verbose', '输出更详细的服务端日志。')}
              </div>
            ))}
          </div>
        )

      case 'logs':
      default:
        return settingsCard('日志', 'ANSI 颜色码已被过滤，方便直接看真正的 llama.cpp 输出。', (
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
              <div className="empty-log">还没有日志。启动服务后会在这里实时显示。</div>
            )}
          </div>
        ))
    }
  }

  return (
    <>
      <div className={`settings-backdrop ${settingsOpen ? 'show' : ''}`} onClick={onClose}></div>
      <aside className={`settings-panel ${settingsOpen ? 'show' : ''}`}>
        <div className="settings-rail">
          <div className="settings-badge"><SettingOutlined /> 设置</div>
          <nav className="settings-rail-tabs">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={currentTab.id === tab.id ? 'active' : ''}
                onClick={() => onSelectSection(tab.id)}
              >
                <span className="settings-tab-icon">{tab.icon}</span>
                <span className="settings-tab-copy">
                  <strong>{tab.label}</strong>
                  <span>{tab.hint}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="progress-card">
            <strong>当前进度</strong>
            <div><span>配置文件</span>{pill(validation.configExists)}</div>
            <div><span>启动器</span>{pill(validation.launcherExists)}</div>
            <div><span>llama-server</span>{pill(validation.serverExists)}</div>
            <div><span>模型文件</span>{pill(validation.modelExists)}</div>
          </div>
        </div>
        <div className="settings-main">
          <div className="settings-head">
            <div>
              <span>设置</span>
              <strong>{currentTab.label}</strong>
              <em>{currentTab.hint}</em>
            </div>
            <button type="button" className="icon-btn" onClick={onClose}>✕</button>
          </div>
          <div className="settings-body">
            {renderTabContent()}
          </div>
          <div className="settings-foot">
            <button className="outline-btn" type="button" onClick={onClose}>保存</button>
            <button className="primary-btn" type="button" onClick={onClose}>完成</button>
          </div>
        </div>
      </aside>
    </>
  )
}
