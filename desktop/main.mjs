/**
 * illama Desktop - Electron 主进程入口文件
 * 负责窗口管理、llama.cpp 服务启动/停止、IPC 通信、系统托盘管理等核心功能
 */

import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ============ 路径配置 ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')           // 项目根目录
const preloadPath = path.join(__dirname, 'preload.cjs') // Preload 脚本路径
const rendererPath = path.join(rootDir, 'renderer', 'index.html') // 渲染进程 HTML
const iconPath = path.join(rootDir, 'assets', 'llama-cpp.ico')   // 应用图标
const trayIconPath = path.join(rootDir, 'assets', 'llama-cpp-tray.png') // 托盘图标
const llamaDir = path.join(rootDir, 'llama')           // llama.cpp 目录
const authoredServerPath = path.join(llamaDir, 'llama-server.exe') // 默认服务器路径
const authoredServerDir = llamaDir                     // 默认服务器目录
const authoredBaseDir = llamaDir                       // 默认基础目录

// ============ 全局状态变量 ============
let mainWindow = null              // 主窗口实例
let tray = null                    // 系统托盘实例
let appIsQuitting = false          // 应用是否正在退出
let firstHideNoticeShown = false   // 是否显示过第一次隐藏通知
let serverChild = null             // 服务器进程实例
let stoppingServer = false         // 是否正在停止服务器
let runtimeStatus = {              // 运行时状态
  state: 'stopped',                // stopped | starting | running | stopping | error
  message: '服务未启动',
  pid: null,
  url: 'http://127.0.0.1:8080',
  startedAt: null,
}
let logs = []                      // 日志列表
let chatAbortController = null     // 聊天流中断控制器

// ============ 路径辅助函数 ============

/**
 * 获取默认基础目录 - 优先查找包含 config.toml 的目录
 */
function defaultBaseDir() {
  const candidates = [
    authoredBaseDir,
    path.resolve(rootDir, '..'),
    path.dirname(process.execPath),
    path.resolve(path.dirname(process.execPath), '..'),
  ]
  return candidates.find(candidate => existsSync(path.join(candidate, 'config.toml'))) || authoredBaseDir
}

/**
 * 获取默认配置文件路径
 */
function defaultConfigPath() {
  return path.join(defaultBaseDir(), 'config.toml')
}

/**
 * 获取默认启动器路径
 */
function defaultLauncherPath() {
  return path.join(defaultBaseDir(), 'llama-server-launcher.exe')
}

/**
 * 获取桌面状态文件路径（存储在用户数据目录）
 */
function defaultStatePath() {
  return path.join(app.getPath('userData'), 'desktop-state.json')
}

// ============ 默认配置 ============

/**
 * 获取默认配置对象
 * 包含所有 llama.cpp 启动参数的默认值
 */
function defaultConfig() {
  return {
    launch_mode: 'direct',              // 启动模式: direct 或 launcher
    launcher_path: defaultLauncherPath(),
    config_path: defaultConfigPath(),
    llama_bin_dir: authoredServerDir,
    llama_server_path: authoredServerPath,
    model: '',                          // 模型文件路径
    mmproj: '',                         // 多模态投影文件路径
    host: '0.0.0.0',                   // 绑定地址
    port: 8080,                         // 服务端口
    ctx_size: 32768,                    // 上下文窗口大小
    n_predict: -1,                      // 最大输出 token 数 (-1 表示无限)
    n_gpu_layers: 99,                   // GPU 分层数量
    chat_template_kwargs: '{"enable_thinking": false}', // 对话模板参数
    request_timeout_ms: 600000,         // 请求超时时间（毫秒）
    temp: 0.8,                          // 温度参数
    top_k: 20,                          // Top-K 采样
    top_p: 0.95,                        // Top-P 采样
    min_p: 0,                           // Min-P 采样
    presence_penalty: 1.5,              // 存在惩罚
    repeat_penalty: '',                 // 重复惩罚
    frequency_penalty: '',              // 频率惩罚
    repeat_last_n: '',                  // 重复惩罚窗口大小
    tfs_z: '',                          // Tail Free Sampling
    typical_p: '',                      // Typical Sampling
    dry_multiplier: '',                 // DRY 采样乘数
    dry_base: '',                       // DRY 采样基数
    dry_allowed_length: '',             // DRY 允许重复长度
    dry_penalty_last_n: '',             // DRY 惩罚窗口大小
    threads: '',                        // 线程数
    threads_batch: '',                  // 批处理线程数
    batch_size: '',                     // 批处理大小
    ubatch_size: '',                    // 微批处理大小
    cpu_moe: false,                     // MoE 层放在 CPU
    n_cpu_moe: '',                      // CPU MoE 线程数
    device: '',                         // 设备类型
    split_mode: 'layer',                // 多GPU分割模式
    tensor_split: '',                   // 张量分割比例
    main_gpu: '',                       // 主 GPU 索引
    extra_args: '',                     // 额外命令行参数
    show_thinking: true,                // 显示思考过程
    expand_thinking: false,             // 默认展开思考
    show_raw_output: false,             // 显示原始输出
    verbose: true,                      // 详细日志
    log_verbosity: 3,                   // 日志详细程度
    webui: true,                        // 启用 WebUI
    embeddings: false,                  // 启用 Embeddings
    continuous_batching: true,          // 启用连续批处理
  }
}

// ============ 模型文件名解析 ============

/**
 * 从模型文件名解析量化级别
 * @param fileName - 模型文件名
 * @returns 量化级别（如 Q4_K_M）或 '未标注'
 */
function parseQuantization(fileName) {
  const text = String(fileName || '')
  const match = text.match(/\.(q\d[^.]*)\.gguf$/i) || text.match(/\.(iq\d[^.]*)\.gguf$/i)
  return match?.[1]?.toUpperCase() || '未标注'
}

/**
 * 从模型文件名解析参数量级
 * @param fileName - 模型文件名
 * @returns 参数量级（如 7B）或 '未标注'
 */
function parseParameterScale(fileName) {
  const match = String(fileName || '').match(/(\d+(?:\.\d+)?)B/i)
  return match ? `${match[1]}B` : '未标注'
}

/**
 * 从模型文件名提取模型家族名称
 * @param fileName - 模型文件名
 * @returns 模型家族名称
 */
function parseFamily(fileName) {
  return String(fileName || '')
    .replace(/\.gguf$/i, '')
    .replace(/\.(q\d[^.]*)$/i, '')
    .replace(/\.(iq\d[^.]*)$/i, '')
}

// ============ 网络请求辅助函数 ============

/**
 * 安全地获取 JSON 数据
 * @param url - 请求 URL
 * @returns JSON 对象或 null（请求失败时）
 */
async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2800) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * 将数字转换为人类可读格式
 * @param value - 数字值
 * @returns 格式化后的字符串（如 1.5B, 2.3M）
 */
function humanParams(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return ''
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
  return String(number)
}

// ============ 事件发送与状态管理 ============

/**
 * 向渲染进程发送事件
 * @param payload - 事件负载
 */
function sendEvent(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }
  mainWindow.webContents.send('llama:event', payload)
}

/**
 * 更新运行时状态并通知渲染进程
 * @param next - 状态更新对象
 */
function setStatus(next) {
  runtimeStatus = { ...runtimeStatus, ...next }
  sendEvent({ type: 'status', status: runtimeStatus })
  updateTrayMenu()
}

// ============ 日志处理 ============

/**
 * 移除 ANSI 转义序列
 * @param value - 原始文本
 * @returns 清理后的文本
 */
function stripAnsi(value) {
  return String(value || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\[[0-9;]*m/g, '')
}

/**
 * 压缩日志行 - 过滤重复的例行日志
 * @param source - 日志来源（stdout/stderr/desktop）
 * @param line - 日志行
 * @returns 压缩后的日志行或 null（如果应该过滤）
 */
function compactLogLine(source, line) {
  const text = String(line || '').trim()
  const lower = text.toLowerCase()
  const isError = lower.includes('error') || lower.includes('fail') || lower.includes('exception')
  
  // 过滤例行的重复日志
  const routinePatterns = [
    'que start_loop: waiting for new tasks',
    'que start_loop: processing new tasks',
    'srv update_slots: all slots are idle',
    'srv update_slots: run slots completed',
    'srv update_slots: update slots',
  ]

  if (!isError && routinePatterns.some(pattern => lower.includes(pattern))) {
    return null
  }

  // 过滤流式输出的中间数据
  if (lower.includes('http: streamed chunk: data:')) {
    if (lower.includes('[done]')) {
      return 'stream chunk: [DONE]'
    }
    return null
  }

  // 过滤重复的消息内容（提示、响应等）
  if (!isError && (
    lower.startsWith('parsed message:') ||
    lower.startsWith('parsed chat message:') ||
    lower.startsWith('response:') ||
    lower.startsWith('assistant:') ||
    lower.startsWith('prompt:') ||
    text.includes('"prompt":') ||
    text.includes('<|im_start|>') ||
    text.includes('<!DOCTYPE html')
  )) {
    return null
  }

  // 截断过长的日志行
  if (text.length > 420) {
    return `${text.slice(0, 260)} ... [truncated ${text.length - 260} chars]`
  }

  return text
}

/**
 * 添加日志条目
 * @param source - 日志来源
 * @param chunk - 日志内容（Buffer 或字符串）
 */
function addLog(source, chunk) {
  const text = stripAnsi(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk))
  const entries = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => compactLogLine(source, line))
    .filter(Boolean)
    .map(line => ({ at: new Date().toISOString(), source, line }))

  if (entries.length === 0) {
    return
  }

  // 保留最近 1200 条日志
  logs = [...logs, ...entries].slice(-1200)
  
  // 检测服务启动状态
  for (const entry of entries) {
    if (entry.line.includes('server is listening')) {
      setStatus({ state: 'running', message: '服务正在监听', pid: serverChild?.pid || null })
    }
    if (entry.line.toLowerCase().includes('error')) {
      setStatus({ message: entry.line })
    }
  }
  
  sendEvent({ type: 'logs', logs })
}

// ============ TOML 解析与生成 ============

/**
 * 移除 TOML 行中的注释（保留字符串内的 #）
 * @param line - TOML 行
 * @returns 移除注释后的行
 */
function stripTomlComment(line) {
  let inString = false
  let escaped = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (char === '#' && !inString) {
      return line.slice(0, index)
    }
  }
  return line
}

/**
 * 解析 TOML 值
 * @param value - 原始值字符串
 * @returns 解析后的值（字符串、数字、布尔值）
 */
function parseTomlValue(value) {
  const text = value.trim()
  if (!text) {
    return ''
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text)
    } catch {
      return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  }
  if (text === 'true') {
    return true
  }
  if (text === 'false') {
    return false
  }
  if (/^[+-]?\d+$/.test(text)) {
    return Number.parseInt(text, 10)
  }
  if (/^[+-]?\d+\.\d+$/.test(text)) {
    return Number.parseFloat(text)
  }
  return text
}

/**
 * 解析 TOML 字符串
 * @param raw - TOML 原始文本
 * @returns 解析后的对象
 */
function parseToml(raw) {
  const result = {}
  for (const originalLine of raw.split(/\r?\n/)) {
    const line = stripTomlComment(originalLine).trim()
    if (!line || line.startsWith('[')) {
      continue
    }
    const equalIndex = line.indexOf('=')
    if (equalIndex < 0) {
      continue
    }
    const key = line.slice(0, equalIndex).trim()
    const value = line.slice(equalIndex + 1)
    result[key] = parseTomlValue(value)
  }
  return result
}

/**
 * 将值转换为数字（带默认值）
 * @param value - 输入值
 * @param fallback - 默认值
 * @returns 转换后的数字或默认值
 */
function toNumber(value, fallback = '') {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

/**
 * 将值转换为数字（空值返回空字符串）
 */
function toNumberEmpty(value) {
  return toNumber(value, '')
}

/**
 * 规范化配置对象
 * @param values - 输入配置值
 * @param state - 额外状态
 * @returns 规范化后的配置
 */
function normalizeConfig(values, state = {}) {
  const base = defaultConfig()
  const merged = { ...base, ...state, ...values }
  const launchMode = merged.launch_mode === 'launcher' ? 'launcher' : 'direct'
  const llamaBinDir = hasValue(merged.llama_bin_dir)
    ? String(merged.llama_bin_dir)
    : path.dirname(String(merged.llama_server_path || base.llama_server_path))
  
  return {
    ...merged,
    launch_mode: launchMode,
    llama_bin_dir: llamaBinDir,
    llama_server_path: path.join(llamaBinDir, 'llama-server.exe'),
    port: toNumber(merged.port, base.port),
    ctx_size: toNumber(merged.ctx_size, base.ctx_size),
    n_predict: toNumber(merged.n_predict, base.n_predict),
    n_gpu_layers: toNumber(merged.n_gpu_layers, base.n_gpu_layers),
    request_timeout_ms: toNumber(merged.request_timeout_ms, base.request_timeout_ms),
    temp: toNumber(merged.temp, base.temp),
    top_k: toNumber(merged.top_k, base.top_k),
    top_p: toNumber(merged.top_p, base.top_p),
    min_p: toNumber(merged.min_p, base.min_p),
    presence_penalty: toNumber(merged.presence_penalty, base.presence_penalty),
    repeat_penalty: toNumberEmpty(merged.repeat_penalty),
    frequency_penalty: toNumberEmpty(merged.frequency_penalty),
    repeat_last_n: toNumberEmpty(merged.repeat_last_n),
    tfs_z: toNumberEmpty(merged.tfs_z),
    typical_p: toNumberEmpty(merged.typical_p),
    dry_multiplier: toNumberEmpty(merged.dry_multiplier),
    dry_base: toNumberEmpty(merged.dry_base),
    dry_allowed_length: toNumberEmpty(merged.dry_allowed_length),
    dry_penalty_last_n: toNumberEmpty(merged.dry_penalty_last_n),
    log_verbosity: toNumber(merged.log_verbosity, base.log_verbosity),
    extra_args: String(merged.extra_args || ''),
    show_thinking: merged.show_thinking !== false,
    expand_thinking: Boolean(merged.expand_thinking),
    show_raw_output: Boolean(merged.show_raw_output),
    verbose: Boolean(merged.verbose),
    webui: Boolean(merged.webui),
    embeddings: Boolean(merged.embeddings),
    continuous_batching: Boolean(merged.continuous_batching),
    cpu_moe: Boolean(merged.cpu_moe),
  }
}

/**
 * 将值转换为 TOML 字符串格式
 * @param value - 输入值
 * @returns TOML 格式的字符串
 */
function tomlString(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 生成可选数字行（空值返回 null）
 * @param key - 参数名
 * @param value - 值
 * @returns TOML 行或 null
 */
function optionalNumberLine(key, value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  return `${key} = ${value}`
}

/**
 * 根据配置对象构建 TOML 字符串
 * @param config - 配置对象
 * @returns TOML 格式的配置文本
 */
function buildToml(config) {
  const lines = [
    '# config.toml',
    '# Generated by illama Desktop.',
    '',
    '# desktop launch mode: direct or launcher',
    `launch_mode = ${tomlString(config.launch_mode || 'direct')}`,
    '',
    '# llama-server.exe 的绝对路径',
    `llama_server_path = ${tomlString(config.llama_server_path)}`,
    '',
    '# 模型路径',
    `model = ${tomlString(config.model)}`,
  ]

  if (config.mmproj) {
    lines.push('', '# 多模态投影文件', `mmproj = ${tomlString(config.mmproj)}`)
  } else {
    lines.push('', '# mmproj = "G:\\\\llama.cpp\\\\models\\\\your-model\\\\mmproj.gguf"')
  }

  lines.push(
    '',
    '# 服务器设置',
    `host = ${tomlString(config.host)}`,
    `port = ${config.port}`,
    '',
    '# 常用参数',
    `ctx_size = ${config.ctx_size}`,
    `n_predict = ${config.n_predict}`,
    `n_gpu_layers = ${config.n_gpu_layers}`,
    `request_timeout_ms = ${config.request_timeout_ms}`,
    '',
    '# 对话模板参数',
    `chat_template_kwargs = ${tomlString(config.chat_template_kwargs)}`,
    '',
    '# 采样设置',
    `temp = ${config.temp}`,
    `top_k = ${config.top_k}`,
    `top_p = ${config.top_p}`,
    `min_p = ${config.min_p}`,
    `presence_penalty = ${config.presence_penalty}`,
  )

  const repeatPenalty = optionalNumberLine('repeat_penalty', config.repeat_penalty)
  if (repeatPenalty) {
    lines.push(repeatPenalty)
  }

  // 添加可选的采样参数
  for (const [key, value] of [
    ['frequency_penalty', config.frequency_penalty],
    ['repeat_last_n', config.repeat_last_n],
    ['tfs_z', config.tfs_z],
    ['typical_p', config.typical_p],
    ['dry_multiplier', config.dry_multiplier],
    ['dry_base', config.dry_base],
    ['dry_allowed_length', config.dry_allowed_length],
    ['dry_penalty_last_n', config.dry_penalty_last_n],
  ]) {
    const line = optionalNumberLine(key, value)
    if (line) lines.push(line)
  }

  lines.push('', '# 系统设置')
  for (const [key, value] of [
    ['threads', config.threads],
    ['threads_batch', config.threads_batch],
    ['batch_size', config.batch_size],
    ['ubatch_size', config.ubatch_size],
  ]) {
    const line = optionalNumberLine(key, value)
    lines.push(line || `# ${key} = `)
  }

  lines.push('', '# 混合专家模型设置')
  if (config.cpu_moe) {
    lines.push('cpu_moe = true')
  } else {
    lines.push('# cpu_moe = true')
  }
  const nCpuMoe = optionalNumberLine('n_cpu_moe', config.n_cpu_moe)
  lines.push(nCpuMoe || '# n_cpu_moe = 15')

  lines.push('', '# GPU 设置')
  if (config.device) {
    lines.push(`device = ${tomlString(config.device)}`)
  } else {
    lines.push('# device = ""')
  }
  if (config.split_mode) {
    lines.push(`split_mode = ${tomlString(config.split_mode)}`)
  }
  if (config.tensor_split) {
    lines.push(`tensor_split = ${tomlString(config.tensor_split)}`)
  } else {
    lines.push('# tensor_split = "3,1"')
  }
  const mainGpu = optionalNumberLine('main_gpu', config.main_gpu)
  lines.push(mainGpu || '# main_gpu = 0')

  lines.push(
    '',
    '# 日志与功能',
    `verbose = ${config.verbose ? 'true' : 'false'}`,
    `log_verbosity = ${config.log_verbosity}`,
    `webui = ${config.webui ? 'true' : 'false'}`,
    `embeddings = ${config.embeddings ? 'true' : 'false'}`,
    `continuous_batching = ${config.continuous_batching ? 'true' : 'false'}`,
    '',
    '# 额外 llama-server 参数，会追加到最终启动命令末尾',
    `extra_args = ${tomlString(config.extra_args)}`,
    `show_thinking = ${config.show_thinking ? 'true' : 'false'}`,
    `expand_thinking = ${config.expand_thinking ? 'true' : 'false'}`,
    `show_raw_output = ${config.show_raw_output ? 'true' : 'false'}`,
    '',
  )

  return lines.join('\n')
}

// ============ 文件读写 ============

/**
 * 读取 JSON 文件（带错误处理）
 * @param filePath - 文件路径
 * @param fallback - 失败时的默认值
 * @returns JSON 对象或默认值
 */
async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * 写入桌面状态文件
 * @param config - 配置对象
 */
async function writeDesktopState(config) {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(
    defaultStatePath(),
    JSON.stringify(
      {
        config_path: config.config_path,
        launch_mode: config.launch_mode,
        launcher_path: config.launcher_path,
        config,
      },
      null,
      2,
    ),
    'utf8',
  )
}

/**
 * 加载配置（从桌面状态和 TOML 文件）
 * @returns 规范化后的配置对象
 */
async function loadConfig() {
  const state = await readJson(defaultStatePath(), {})
  const configPath = state.config_path || defaultConfigPath()
  let parsed = {}
  if (existsSync(configPath)) {
    try {
      parsed = parseToml(await readFile(configPath, 'utf8'))
    } catch (error) {
      addLog('desktop', `读取配置失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const config = normalizeConfig({ ...parsed, ...(state.config || {}) }, {
    config_path: configPath,
    launch_mode: state.launch_mode || state.config?.launch_mode || parsed.launch_mode || 'direct',
    launcher_path: state.launcher_path || defaultLauncherPath(),
  })
  runtimeStatus.url = localUrl(config)
  return config
}

/**
 * 保存配置（同时保存到 TOML 和桌面状态）
 * @param config - 配置对象
 * @returns 规范化后的配置
 */
async function saveConfig(config) {
  const normalized = normalizeConfig(config)
  if (normalized.launch_mode === 'launcher') {
    await mkdir(path.dirname(normalized.config_path), { recursive: true })
    await writeFile(normalized.config_path, buildToml(normalized), 'utf8')
  }
  await writeDesktopState(normalized)
  runtimeStatus.url = localUrl(normalized)
  return normalized
}

// ============ URL 和参数构建 ============

/**
 * 构建本地服务 URL
 * @param config - 配置对象
 * @returns 完整的本地 URL
 */
function localUrl(config) {
  const host = config.host && config.host !== '0.0.0.0' ? config.host : '127.0.0.1'
  return `http://${host}:${config.port}`
}

/**
 * 检查值是否非空
 * @param value - 输入值
 * @returns 是否有值
 */
function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * 解析额外命令行参数
 * @param raw - 原始参数字符串
 * @returns 参数数组
 */
function splitExtraArgs(raw) {
  const text = String(raw || '').replace(/\r?\n/g, ' ').trim()
  if (!text) {
    return []
  }

  const args = []
  let current = ''
  let quote = ''

  for (const char of text) {
    if (quote) {
      if (char === quote) {
        quote = ''
      } else {
        current += char
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (quote) {
    throw new Error('自定义附加参数里有未闭合的引号')
  }
  if (current) {
    args.push(current)
  }
  return args
}

/**
 * 条件性添加命令行参数
 * @param args - 参数数组
 * @param flag - 参数标志
 * @param value - 参数值
 */
function pushArg(args, flag, value) {
  if (hasValue(value)) {
    args.push(flag, String(value))
  }
}

/**
 * 构建 llama-server 命令行参数
 * @param config - 配置对象
 * @returns 参数数组
 */
function buildServerArgs(config) {
  const args = []
  pushArg(args, '--model', config.model)
  pushArg(args, '--mmproj', config.mmproj)
  pushArg(args, '--host', config.host)
  pushArg(args, '--port', config.port)
  pushArg(args, '--ctx-size', config.ctx_size)
  pushArg(args, '--n-predict', config.n_predict)
  pushArg(args, '--n-gpu-layers', config.n_gpu_layers)
  pushArg(args, '--chat-template-kwargs', normalizeChatTemplateKwargsText(config.chat_template_kwargs))
  pushArg(args, '--temp', config.temp)
  pushArg(args, '--top-k', config.top_k)
  pushArg(args, '--top-p', config.top_p)
  pushArg(args, '--min-p', config.min_p)
  pushArg(args, '--presence-penalty', config.presence_penalty)
  pushArg(args, '--repeat-penalty', config.repeat_penalty)
  pushArg(args, '--frequency-penalty', config.frequency_penalty)
  pushArg(args, '--repeat-last-n', config.repeat_last_n)
  pushArg(args, '--tfs-z', config.tfs_z)
  pushArg(args, '--typical-p', config.typical_p)
  pushArg(args, '--dry-multiplier', config.dry_multiplier)
  pushArg(args, '--dry-base', config.dry_base)
  pushArg(args, '--dry-allowed-length', config.dry_allowed_length)
  pushArg(args, '--dry-penalty-last-n', config.dry_penalty_last_n)
  pushArg(args, '--threads', config.threads)
  pushArg(args, '--threads-batch', config.threads_batch)
  pushArg(args, '--batch-size', config.batch_size)
  pushArg(args, '--ubatch-size', config.ubatch_size)
  pushArg(args, '--device', config.device)
  pushArg(args, '--split-mode', config.split_mode)
  pushArg(args, '--tensor-split', config.tensor_split)
  pushArg(args, '--main-gpu', config.main_gpu)
  pushArg(args, '--n-cpu-moe', config.n_cpu_moe)
  pushArg(args, '--log-verbosity', config.log_verbosity)

  // 开关型参数
  if (config.cpu_moe) args.push('--cpu-moe')
  if (config.verbose) args.push('--verbose')
  args.push(config.webui ? '--webui' : '--no-webui')
  if (config.embeddings) args.push('--embeddings')
  args.push(config.continuous_batching ? '--cont-batching' : '--no-cont-batching')
  
  // 追加额外参数
  args.push(...splitExtraArgs(config.extra_args))

  return args
}

/**
 * 为命令行参数添加引号（如果包含空格）
 * @param value - 参数值
 * @returns 带引号的参数
 */
function quoteCommandPart(value) {
  const text = String(value || '')
  if (!text) {
    return '""'
  }
  return /[\s"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text
}

/**
 * 构建启动详情（命令、参数、工作目录等）
 * @param config - 配置对象
 * @returns 启动详情对象
 */
function buildLaunchDetails(config) {
  const directMode = config.launch_mode !== 'launcher'
  const command = directMode ? config.llama_server_path : config.launcher_path
  try {
    const args = directMode ? buildServerArgs(config) : []
    return {
      mode: directMode ? 'direct' : 'launcher',
      command,
      args,
      cwd: directMode ? path.dirname(config.llama_server_path) : path.dirname(config.config_path),
      preview: [command, ...args].map(quoteCommandPart).join(' '),
      error: '',
    }
  } catch (error) {
    return {
      mode: directMode ? 'direct' : 'launcher',
      command,
      args: [],
      cwd: directMode ? path.dirname(config.llama_server_path) : path.dirname(config.config_path),
      preview: quoteCommandPart(command),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 移除字符串两端的引号
 * @param text - 输入文本
 * @returns 移除引号后的文本
 */
function stripWrappingQuotes(text) {
  const value = String(text || '').trim()
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).trim()
    }
  }
  return value
}

/**
 * 规范化 Chat Template Kwargs 文本
 * @param raw - 原始文本
 * @returns 规范化后的 JSON 字符串
 */
function normalizeChatTemplateKwargsText(raw) {
  let text = stripWrappingQuotes(raw)
  if (!text) {
    return ''
  }
  text = text.replace(/^--chat-template-kwargs\s+/i, '').trim()
  text = stripWrappingQuotes(text)
  if (text.includes('\\"')) {
    text = text.replace(/\\"/g, '"')
  }
  return text
}

/**
 * 解析 Chat Template Kwargs
 * @param raw - 原始文本
 * @returns 解析后的对象或 null
 */
function parseChatTemplateKwargs(raw) {
  const text = String(raw || '').trim()
  if (!text) {
    return null
  }
  const normalized = normalizeChatTemplateKwargsText(text)
  let parsed
  try {
    parsed = JSON.parse(normalized)
  } catch (error) {
    throw new Error(`Chat Template Kwargs must be valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Chat Template Kwargs must be a JSON object, for example {"enable_thinking": false}')
  }
  return parsed
}

/**
 * 创建请求超时信号
 * @param config - 配置对象
 * @returns AbortSignal
 */
function requestTimeoutSignal(config) {
  const ms = Math.max(30000, toNumber(config.request_timeout_ms, 600000))
  return AbortSignal.timeout(ms)
}

/**
 * 提取消息文本内容（处理数组类型 content）
 * @param content - 消息内容
 * @returns 纯文本内容
 */
function messageTextContent(content) {
  if (Array.isArray(content)) {
    return content
      .filter(item => item && item.type === 'text')
      .map(item => String(item.text || '').trim())
      .filter(Boolean)
      .join('\n\n')
  }
  return String(content || '').trim()
}

/**
 * 验证配置完整性
 * @param config - 配置对象
 * @returns 验证结果对象
 */
function validation(config) {
  return {
    configExists: config.launch_mode !== 'launcher' || existsSync(config.config_path),
    launcherExists: config.launch_mode !== 'launcher' || existsSync(config.launcher_path),
    serverExists: existsSync(config.llama_server_path),
    modelExists: existsSync(config.model),
    mmprojExists: !config.mmproj || existsSync(config.mmproj),
  }
}

// ============ 文件类型检测 ============

/**
 * 获取文件的 MIME 类型
 * @param filePath - 文件路径
 * @returns MIME 类型字符串
 */
function mimeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsm': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.toml': 'text/plain',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.csv': 'text/csv',
    '.log': 'text/plain',
    '.py': 'text/x-python',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
  }[ext] || 'application/octet-stream'
}

/**
 * 判断是否为文本类文件
 * @param filePath - 文件路径
 * @returns 是否为文本文件
 */
function isTextLike(filePath) {
  return [
    '.txt', '.md', '.json', '.toml', '.yaml', '.yml', '.csv', '.log',
    '.py', '.js', '.ts', '.tsx', '.html', '.css', '.c', '.cpp', '.h', '.hpp',
  ].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为图片文件
 * @param filePath - 文件路径
 * @returns 是否为图片
 */
function isImageLike(filePath) {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为音频文件
 * @param filePath - 文件路径
 * @returns 是否为音频
 */
function isAudioLike(filePath) {
  return ['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为 PDF 文件
 * @param filePath - 文件路径
 * @returns 是否为 PDF
 */
function isPdfLike(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf'
}

/**
 * 判断是否为 Word 文档
 * @param filePath - 文件路径
 * @returns 是否为 Word
 */
function isWordLike(filePath) {
  return ['.docx', '.doc'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为 Excel 文件
 * @param filePath - 文件路径
 * @returns 是否为 Excel
 */
function isExcelLike(filePath) {
  return ['.xlsx', '.xlsm', '.xls', '.xlsb'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为文档类文件
 * @param filePath - 文件路径
 * @returns 是否为文档
 */
function isDocumentLike(filePath) {
  return isWordLike(filePath) || isExcelLike(filePath) || isTextLike(filePath)
}

/**
 * 构建附件对象（解析文件内容）
 * @param filePath - 文件路径
 * @returns 附件对象
 */
async function buildAttachment(filePath) {
  const fileStat = await stat(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const isWord = isWordLike(filePath)
  const isExcel = isExcelLike(filePath)
  const isPdf = isPdfLike(filePath)
  const isSimpleText = isTextLike(filePath)
  
  // 确定附件类型
  let kind = 'file'
  if (isImageLike(filePath)) kind = 'image'
  else if (isAudioLike(filePath)) kind = 'audio'
  else if (isWord || isExcel || isPdf || isSimpleText) kind = 'text'
  
  const attachment = {
    path: filePath,
    name: path.basename(filePath),
    size: fileStat.size,
    mime: mimeForFile(filePath),
    kind,
  }

  // 图片附件：转换为 Base64
  if (attachment.kind === 'image' && fileStat.size <= 10 * 1024 * 1024) {
    const raw = await readFile(filePath)
    attachment.dataUrl = `data:${attachment.mime};base64,${raw.toString('base64')}`
  }

  // 文本附件：提取文本内容
  if (attachment.kind === 'text') {
    if (isWord) {
      try {
        const WordExtractorModule = await import('word-extractor')
        const WordExtractor = WordExtractorModule.default || WordExtractorModule
        const extractor = new WordExtractor()
        const buffer = await readFile(filePath)
        const doc = await extractor.extract(buffer)
        const text = doc.getBody() || ''
        attachment.text = text
        if (text.length > 50000) {
          attachment.warning = `Word内容较长（约${Math.round(text.length / 500)}词），建议分段提问`
        }
      } catch (error) {
        console.error('Word parsing error:', error)
        attachment.error = '无法解析Word文件，文件可能已损坏或使用了不受支持的格式'
      }
    } else if (isExcel) {
      try {
        const XLSXModule = await import('xlsx')
        const XLSX = XLSXModule.default || XLSXModule
        const buffer = await readFile(filePath)
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const texts = []
        let totalRows = 0
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          if (jsonData.length > 0) {
            totalRows += jsonData.length
            texts.push(`--- 工作表：${sheetName}（${jsonData.length}行）---`)
            texts.push(
              jsonData.slice(0, 200).map(row =>
                Object.entries(row)
                  .filter(([, v]) => String(v).trim())
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')
              ).join('\n')
            )
            if (jsonData.length > 200) {
              texts.push(`... 剩余 ${jsonData.length - 200} 行已省略`)
            }
          }
        }
        attachment.text = texts.join('\n\n')
        attachment.sheetCount = workbook.SheetNames.length
        attachment.totalRows = totalRows
        if (attachment.text && attachment.text.length > 50000) {
          attachment.warning = `Excel内容较长（${totalRows}行，${workbook.SheetNames.length}个工作表），建议分段提问`
        }
      } catch (error) {
        console.error('Excel parsing error:', error)
        const message = error instanceof Error ? error.message : String(error)
        attachment.error = `无法解析Excel文件（${message}），支持 .xlsx/.xlsm/.xls/.xlsb 格式`
        addLog('desktop', `Excel解析失败：${message}`)
      }
    } else if (isPdf) {
      if (fileStat.size > 100 * 1024 * 1024) {
        attachment.error = '文件过大（最大支持100MB），请使用PDF阅读器打开并复制文本内容'
      } else {
        try {
          const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js')
          const pdfParseFn = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default || pdfParseModule
          const pdfBuffer = await readFile(filePath)
          const pdfData = await pdfParseFn(pdfBuffer)
          attachment.text = pdfData.text
          attachment.pageCount = pdfData.numpages
          if (attachment.text && attachment.text.length > 50000) {
            attachment.warning = `PDF内容较长（约${Math.round(attachment.text.length / 500)}词），建议分段提问`
          }
        } catch (error) {
          console.error('PDF parsing error:', error)
          attachment.error = '无法解析PDF文件，可能是加密或损坏的文件'
        }
      }
    } else if (fileStat.size <= 256 * 1024) {
      attachment.text = await readFile(filePath, 'utf8')
    }
  }

  return attachment
}

/**
 * 从流式响应中提取内容
 * @param data - 响应数据
 * @returns 内容字符串
 */
function contentFromStreamPayload(data) {
  const choice = data?.choices?.[0]
  return choice?.delta?.content || choice?.message?.content || data?.content || ''
}

/**
 * 获取应用状态（配置、状态、日志、验证等）
 * @returns 应用状态对象
 */
async function appState() {
  const config = await loadConfig()
  return {
    config,
    status: runtimeStatus,
    logs,
    validation: validation(config),
    launch: buildLaunchDetails(config),
  }
}

// ============ 窗口与托盘管理 ============

/**
 * 显示主窗口
 */
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.show()
  mainWindow.focus()
}

/**
 * 获取状态标签文本
 * @returns 状态文本
 */
function statusLabel() {
  return {
    stopped: '未启动',
    starting: '启动中',
    running: '运行中',
    stopping: '停止中',
    error: '需要处理',
  }[runtimeStatus.state] || runtimeStatus.state
}

/**
 * 更新系统托盘菜单
 */
function updateTrayMenu() {
  if (!tray) {
    return
  }

  tray.setToolTip(`illama Desktop - ${statusLabel()} - ${runtimeStatus.url}`)
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '打开 illama Desktop',
      click: showMainWindow,
    },
    {
      label: `${statusLabel()}  ${runtimeStatus.url}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '打开 OpenAI Base URL',
      click: () => shell.openExternal(`${runtimeStatus.url}/v1`),
    },
    {
      label: '停止服务',
      enabled: Boolean(serverChild && serverChild.exitCode === null),
      click: async () => {
        if (serverChild && serverChild.exitCode === null) {
          stoppingServer = true
          setStatus({ state: 'stopping', message: '正在停止服务' })
          await taskkill(serverChild.pid)
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出并停止服务',
      click: () => {
        appIsQuitting = true
        app.quit()
      },
    },
  ]))
}

/**
 * 创建系统托盘
 */
function createTray() {
  if (tray) {
    return
  }

  const image = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(image.isEmpty() ? nativeImage.createFromPath(iconPath) : image)
  tray.on('click', showMainWindow)
  tray.on('double-click', showMainWindow)
  updateTrayMenu()
}

/**
 * 创建主窗口
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: 'illama Desktop',
    backgroundColor: '#ffffff',
    icon: iconPath,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#1a1a1a',
      height: 36,
    },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  mainWindow.loadFile(rendererPath)
  
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 关闭窗口时最小化到托盘
  mainWindow.on('close', event => {
    if (appIsQuitting) {
      return
    }

    event.preventDefault()
    mainWindow.hide()
    mainWindow.setSkipTaskbar(true)
    if (!firstHideNoticeShown) {
      firstHideNoticeShown = true
      tray?.displayBalloon?.({
        title: 'illama Desktop 仍在运行',
        content: '窗口已隐藏到系统托盘，本地服务会继续监听。',
      })
    }
  })
  
  // 禁用默认菜单
  Menu.setApplicationMenu(null)
}

/**
 * 使用 taskkill 终止进程（Windows 专用）
 * @param pid - 进程 ID
 */
async function taskkill(pid) {
  await new Promise(resolve => {
    const child = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    child.once('exit', resolve)
    child.once('error', resolve)
  })
}

// ============ IPC 通信注册 ============

/**
 * 注册所有 IPC 处理程序
 */
function registerIpc() {
  /**
   * 获取应用状态
   */
  ipcMain.handle('llama:get-state', async () => appState())

  /**
   * 设置主题（深色/浅色）
   */
  ipcMain.handle('llama:set-theme', async (_event, isDark) => {
    if (mainWindow) {
      mainWindow.setTitleBarOverlay({
        color: isDark ? '#1a1a1a' : '#ffffff',
        symbolColor: isDark ? '#f0f0f0' : '#1a1a1a',
        height: 36,
      })
      mainWindow.setBackgroundColor(isDark ? '#1a1a1a' : '#ffffff')
    }
    return { success: true }
  })

  /**
   * 保存配置
   */
  ipcMain.handle('llama:save-config', async (_event, payload) => {
    const config = await saveConfig(payload.config)
    addLog('desktop', `配置已保存：${config.config_path}`)
    return {
      config,
      validation: validation(config),
      status: runtimeStatus,
      logs,
      launch: buildLaunchDetails(config),
    }
  })

  /**
   * 启动服务器
   */
  ipcMain.handle('llama:start-server', async (_event, payload) => {
    // 如果服务器已在运行，直接返回状态
    if (serverChild && serverChild.exitCode === null) {
      return appState()
    }

    const config = await saveConfig(payload.config)
    const directMode = config.launch_mode !== 'launcher'
    
    // 验证文件存在性
    if (!directMode && !existsSync(config.launcher_path)) {
      throw new Error(`找不到启动器：${config.launcher_path}`)
    }
    if (!existsSync(config.llama_server_path)) {
      throw new Error(`找不到 llama-server.exe：${config.llama_server_path}`)
    }
    if (!existsSync(config.model)) {
      throw new Error(`找不到模型文件：${config.model}`)
    }
    
    const launch = buildLaunchDetails(config)
    if (launch.error) {
      throw new Error(launch.error)
    }

    // 重置状态
    logs = []
    stoppingServer = false
    setStatus({
      state: 'starting',
      message: '正在启动服务',
      pid: null,
      url: localUrl(config),
      startedAt: new Date().toISOString(),
    })

    const serverDir = path.dirname(config.llama_server_path)
    const command = launch.command
    const args = launch.args
    const cwd = launch.cwd

    // 记录启动信息
    addLog('desktop', `启动方式：${directMode ? 'direct llama-server.exe' : 'launcher'}`)
    addLog('desktop', `llama-server：${config.llama_server_path}`)
    if (directMode) {
      addLog('desktop', `参数：${args.join(' ')}`)
      addLog('desktop', `完整命令：${launch.preview}`)
      addLog('desktop', `关键参数：ctx=${config.ctx_size}, gpu_layers=${config.n_gpu_layers}, batch=${config.batch_size || 'auto'}, ubatch=${config.ubatch_size || 'auto'}, threads=${config.threads || 'auto'}`)
    }
    addLog('desktop', `启动器：${config.launcher_path}`)
    addLog('desktop', `配置：${config.config_path}`)

    // 启动进程
    serverChild = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NO_COLOR: '1',
        Path: `${serverDir};${process.env.Path || process.env.PATH || ''}`,
      },
    })

    setStatus({ pid: serverChild.pid })
    
    // 监听进程输出
    serverChild.stdout?.on('data', chunk => addLog('stdout', chunk))
    serverChild.stderr?.on('data', chunk => addLog('stderr', chunk))
    
    // 监听进程错误
    serverChild.once('error', error => {
      addLog('desktop', `启动失败：${error.message}`)
      setStatus({ state: 'error', message: error.message, pid: null })
    })
    
    // 监听进程退出
    serverChild.once('exit', code => {
      const message = stoppingServer ? '服务已停止' : `服务进程已退出：${code ?? 'unknown'}`
      addLog('desktop', message)
      serverChild = null
      setStatus({
        state: stoppingServer ? 'stopped' : 'error',
        message,
        pid: null,
      })
      stoppingServer = false
    })

    return appState()
  })

  /**
   * 停止服务器
   */
  ipcMain.handle('llama:stop-server', async () => {
    if (serverChild && serverChild.exitCode === null) {
      stoppingServer = true
      setStatus({ state: 'stopping', message: '正在停止服务' })
      await taskkill(serverChild.pid)
    }
    return appState()
  })

  /**
   * 测试服务健康状态
   */
  ipcMain.handle('llama:test-health', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const url = localUrl(config)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) })
      return { ok: response.ok, status: response.status, url }
    } catch (error) {
      return { ok: false, status: 0, url, message: error instanceof Error ? error.message : String(error) }
    }
  })

  /**
   * 获取模型信息
   */
  ipcMain.handle('llama:get-model-info', async (_event, payload) => {
    const config = normalizeConfig(payload?.config || {})
    const serverUrl = localUrl(config)
    const modelPath = config.model || ''
    const fileName = path.basename(modelPath || 'local-model')
    let fileSize = 0
    if (modelPath && existsSync(modelPath)) {
      try {
        fileSize = (await stat(modelPath)).size
      } catch {
        fileSize = 0
      }
    }

    const [modelsPayload, propsPayload] = await Promise.all([
      fetchJson(`${serverUrl}/v1/models`),
      fetchJson(`${serverUrl}/props`),
    ])

    const apiModel = modelsPayload?.data?.[0] || {}
    const apiMeta = apiModel?.meta || {}
    const listedModel = modelsPayload?.models?.[0] || {}

    return {
      name: listedModel?.name || apiModel?.id || propsPayload?.model_alias || fileName,
      filePath: propsPayload?.model_path || modelPath,
      fileSize: Number(apiMeta?.size || fileSize || 0),
      family: listedModel?.details?.family || parseFamily(fileName),
      quantization: listedModel?.details?.quantization_level || parseQuantization(fileName),
      parameterScale: listedModel?.details?.parameter_size || parseParameterScale(fileName),
      nParams: Number(apiMeta?.n_params || 0),
      ctxSize: toNumber(propsPayload?.default_generation_settings?.n_ctx, toNumber(config.ctx_size, '')),
      trainingContext: toNumber(apiMeta?.n_ctx_train, ''),
      embeddingSize: toNumber(apiMeta?.n_embd, ''),
      vocabSize: toNumber(apiMeta?.n_vocab, ''),
      vocabType: toNumber(apiMeta?.vocab_type, ''),
      parallelSlots: toNumber(propsPayload?.total_slots, ''),
      nPredict: toNumber(config.n_predict, ''),
      gpuLayers: toNumber(config.n_gpu_layers, ''),
      temperature: toNumber(config.temp, ''),
      topP: toNumber(config.top_p, ''),
      topK: toNumber(config.top_k, ''),
      minP: toNumber(config.min_p, ''),
      presencePenalty: toNumber(config.presence_penalty, ''),
      repeatPenalty: toNumber(config.repeat_penalty, ''),
      serverUrl,
      build: propsPayload?.build_info || path.basename(config.llama_server_path || 'llama-server.exe'),
      chatTemplateText: String(propsPayload?.chat_template || config.chat_template_kwargs || '').trim(),
      propsSource: Boolean(propsPayload),
      modelSource: Boolean(modelsPayload),
      parameterLabel: humanParams(apiMeta?.n_params),
    }
  })

  /**
   * 非流式聊天补全
   */
  ipcMain.handle('llama:chat-completion', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const url = `${localUrl(config)}/v1/chat/completions`
    
    // 处理消息和附件
    const messages = Array.isArray(payload.messages)
      ? payload.messages
          .filter(message => message && (message.role === 'user' || message.role === 'assistant' || message.role === 'system'))
          .map(message => {
            const text = String(message.content || '')
            const attachments = Array.isArray(message.attachments) ? message.attachments : []
            const ctxSize = Number(config.ctx_size) || 32768
            const maxContentLen = Math.max(0, Math.round((ctxSize - 8192) * 3.5))
            
            // 处理文本附件
            const textBlocks = attachments
              .filter(item => item.kind === 'text')
              .map(item => {
                const itemText = item.text || ''
                if (!itemText) {
                  const reason = item.error ? `文件内容无法提取（${item.error}）` : '文件内容为空'
                  return `\n\n--- 附件：${item.name} ---\n${reason}`
                }
                const truncated = itemText.length > maxContentLen
                  ? itemText.slice(0, maxContentLen) + `\n\n[...文本过长已截断：原文约${Math.round(itemText.length / 500)}词，当前仅读取前${Math.round(maxContentLen / 500)}词（ctx_size=${ctxSize}）。如需分析剩余内容，可分段提问。]`
                  : itemText
                return `\n\n--- 附件：${item.name} ---\n${truncated}`
              })
            
            // 处理其他文件附件
            const fileBlocks = attachments
              .filter(item => item.kind !== 'text' && item.kind !== 'image' && item.kind !== 'pdf')
              .map(item => {
                const note = item.error ? `解析失败：${item.error}` : item.warning ? `提示：${item.warning}` : ''
                return `\n\n[附件：${item.name}，${item.mime || 'file'}${note ? `，${note}` : ''}]`
              })
            
            const imageAttachments = attachments.filter(item => item.kind === 'image' && item.dataUrl)

            // 图片消息使用多模态格式
            if (imageAttachments.length > 0) {
              return {
                role: message.role,
                content: [
                  {
                    type: 'text',
                    text: `${text}${textBlocks.join('')}${fileBlocks.join('')}`.trim() || '请分析这些图片。',
                  },
                  ...imageAttachments.map(item => ({
                    type: 'image_url',
                    image_url: { url: item.dataUrl },
                  })),
                ],
              }
            }

            return {
              role: message.role,
              content: `${text}${textBlocks.join('')}${fileBlocks.join('')}`,
            }
          })
          .filter(message => Array.isArray(message.content) || String(message.content || '').trim())
      : []

    if (messages.length === 0) {
      throw new Error('没有可发送的消息')
    }

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: path.basename(config.model || 'local-model'),
        messages,
        temperature: toNumber(config.temp, 0.8),
        top_p: toNumber(config.top_p, 0.95),
        max_tokens: config.n_predict === -1 ? undefined : toNumber(config.n_predict, undefined),
        chat_template_kwargs: parseChatTemplateKwargs(config.chat_template_kwargs) || undefined,
        stream: false,
      }),
      signal: requestTimeoutSignal(config),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`模型接口返回 ${response.status}${text ? `：${text.slice(0, 500)}` : ''}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || data?.content || ''
    return {
      ok: true,
      content: String(content || ''),
      raw: data,
    }
  })

  /**
   * 流式聊天补全
   */
  ipcMain.handle('llama:chat-stream', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const requestId = payload.requestId || `${Date.now()}`
    const url = `${localUrl(config)}/v1/chat/completions`
    const startedAt = Date.now()
    
    // 累积流式内容
    let accumulatedContent = ''
    
    // 处理消息和附件（与非流式相同）
    const messages = Array.isArray(payload.messages)
      ? payload.messages
          .filter(message => message && (message.role === 'user' || message.role === 'assistant' || message.role === 'system'))
          .map(message => {
            const text = String(message.content || '')
            const attachments = Array.isArray(message.attachments) ? message.attachments : []
            const ctxSize = Number(config.ctx_size) || 32768
            const maxContentLen = Math.max(0, Math.round((ctxSize - 8192) * 3.5))
            const textBlocks = attachments
              .filter(item => item.kind === 'text')
              .map(item => {
                const itemText = item.text || ''
                if (!itemText) {
                  const reason = item.error ? `文件内容无法提取（${item.error}）` : '文件内容为空'
                  return `\n\n--- 附件：${item.name} ---\n${reason}`
                }
                const truncated = itemText.length > maxContentLen
                  ? itemText.slice(0, maxContentLen) + `\n\n[...文本过长已截断：原文约${Math.round(itemText.length / 500)}词，当前仅读取前${Math.round(maxContentLen / 500)}词（ctx_size=${ctxSize}）。如需分析剩余内容，可分段提问。]`
                  : itemText
                return `\n\n--- 附件：${item.name} ---\n${truncated}`
              })
            const fileBlocks = attachments
              .filter(item => item.kind !== 'text' && item.kind !== 'image' && item.kind !== 'pdf')
              .map(item => {
                const note = item.error ? `解析失败：${item.error}` : item.warning ? `提示：${item.warning}` : ''
                return `\n\n[附件：${item.name}，${item.mime || 'file'}${note ? `，${note}` : ''}]`
              })
            
            const imageAttachments = attachments.filter(item => item.kind === 'image' && item.dataUrl)

            // 图片消息使用多模态格式
            if (imageAttachments.length > 0) {
              return {
                role: message.role,
                content: [
                  {
                    type: 'text',
                    text: `${text}${textBlocks.join('')}${fileBlocks.join('')}`.trim() || '请分析这些图片。',
                  },
                  ...imageAttachments.map(item => ({
                    type: 'image_url',
                    image_url: { url: item.dataUrl },
                  })),
                ],
              }
            }

            return {
              role: message.role,
              content: `${text}${textBlocks.join('')}${fileBlocks.join('')}`,
            }
          })
          .filter(message => Array.isArray(message.content) || String(message.content || '').trim())
      : []

    if (messages.length === 0) {
      throw new Error('没有可发送的消息')
    }

    // 发送流式请求
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: path.basename(config.model || 'local-model'),
        messages,
        temperature: toNumber(config.temp, 0.8),
        top_p: toNumber(config.top_p, 0.95),
        max_tokens: config.n_predict === -1 ? undefined : toNumber(config.n_predict, undefined),
        chat_template_kwargs: parseChatTemplateKwargs(config.chat_template_kwargs) || undefined,
        stream: true,
      }),
      signal: requestTimeoutSignal(config),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`模型接口返回 ${response.status}${text ? `：${text.slice(0, 500)}` : ''}`)
    }

    // 处理流式响应
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    let buffer = ''
    const decoder = new TextDecoder('utf-8')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // 解析 SSE 格式
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        
        const dataText = line.slice(6).trim()
        if (!dataText) continue
        if (dataText === '[DONE]') {
          sendEvent({ type: 'chat-stream-done', requestId, done: true, content: accumulatedContent })
          break
        }

        try {
          const data = JSON.parse(dataText)
          const content = contentFromStreamPayload(data)
          if (content) {
            accumulatedContent += content
            sendEvent({ type: 'chat-stream', requestId, delta: content })
          }
        } catch {
          // 忽略解析错误的行
        }
      }
    }

    sendEvent({ type: 'chat-stream-done', requestId, done: true, content: accumulatedContent })
    return { ok: true, done: true, content: accumulatedContent }
  })

  /**
   * 中断流式聊天
   */
  ipcMain.handle('llama:abort-chat', async () => {
    if (chatAbortController) {
      chatAbortController.abort()
      chatAbortController = null
    }
    return { ok: true }
  })

  /**
   * 选择文件（用于上传附件）
   */
  ipcMain.handle('llama:select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
        { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'docx', 'doc', 'xlsx', 'xls'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'toml', 'yaml', 'yml', 'csv'] },
      ],
    })

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true, paths: [] }
    }

    const attachments = await Promise.all(
      result.filePaths.map(filePath => buildAttachment(filePath))
    )

    return { canceled: false, paths: result.filePaths, attachments }
  })

  /**
   * 选择模型文件
   */
  ipcMain.handle('llama:select-model', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'GGUF Models', extensions: ['gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 选择配置文件
   */
  ipcMain.handle('llama:select-config', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'TOML Files', extensions: ['toml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 选择目录
   */
  ipcMain.handle('llama:select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 打开外部链接
   */
  ipcMain.handle('llama:open-url', async (_event, url) => {
    await shell.openExternal(url)
    return { ok: true }
  })

  /**
   * 退出应用
   */
  ipcMain.handle('llama:quit', async () => {
    appIsQuitting = true
    app.quit()
    return { ok: true }
  })
}

// ============ 应用启动与生命周期 ============

/**
 * 应用就绪后初始化
 */
async function onAppReady() {
  createTray()
  createMainWindow()
  registerIpc()
  addLog('desktop', 'illama Desktop 启动')
}

/**
 * 应用退出前清理
 */
async function onAppBeforeQuit() {
  appIsQuitting = true
  if (serverChild && serverChild.exitCode === null) {
    stoppingServer = true
    setStatus({ state: 'stopping', message: '正在停止服务' })
    await taskkill(serverChild.pid)
  }
}

// 注册应用生命周期事件
app.on('ready', onAppReady)
app.on('before-quit', onAppBeforeQuit)

// 防止多实例运行
if (!app.requestSingleInstanceLock()) {
  app.quit()
}