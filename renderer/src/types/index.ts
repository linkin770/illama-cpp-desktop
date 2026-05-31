// LlamaDesktop API 类型定义 - 渲染进程与主进程通信的接口
export interface LlamaDesktopAPI {
  // 保存配置
  saveConfig(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  // 启动 llama-server 服务
  startServer(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown>; url?: string }>
  // 停止 llama-server 服务
  stopServer(): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  // 测试服务健康状态
  testHealth(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; url?: string; message?: string }>
  // 获取模型信息
  getModelInfo(opts: { config: Record<string, unknown> | null }): Promise<Record<string, unknown>>
  // 选择附件文件
  pickAttachments(opts: { kind: string }): Promise<Attachment[]>
  // 扫描 models 文件夹中的模型
  scanModels(): Promise<{ models: Array<{ name: string; path: string; mmprojPath: string | null; hasVision: boolean }>; error: string | null }>
  // 选择单个文件
  pickFile(opts?: { properties?: string[]; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null>
  // 流式对话请求
  streamChat(opts: { requestId: string; config: Record<string, unknown> | null; messages: Array<{ role: string; content: string }> }): Promise<{ content: string; raw?: { usage?: { completion_tokens: number; total_tokens: number } } }>
  // 中止当前对话
  abortChat(): Promise<void>
  // 获取应用状态
  getState(): Promise<{ config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  // 技能管理
  listSkills(): Promise<Skill[]>
  createSkill(payload: { name: string; content: string }): Promise<{ ok: boolean; name: string }>
  generateSkillContent(payload: { name: string; description?: string; whenToUse?: string; argumentHint?: string }): Promise<{ ok: boolean; content: string }>
  readSkill(payload: { name: string }): Promise<Skill & { raw: string }>
  deleteSkill(payload: { name: string }): Promise<{ ok: boolean }>
  // 知识库管理
  listDocuments(): Promise<{ documents: KnowledgeDocument[] }>
  uploadDocument(filePath: string): Promise<{ ok: boolean; document?: KnowledgeDocument; error?: string }>
  deleteDocument(docId: string): Promise<{ ok: boolean; error?: string }>
  searchKnowledge(query: string, opts?: { topK?: number }): Promise<{ results: KnowledgeSearchResult[]; error?: string }>
  // 监听来自主进程的事件
  onEvent(handler: (payload: unknown) => void): () => void
  // 设置主题
  setTheme(isDark: boolean): Promise<void>
  // 非流式对话补全
  chatCompletion(payload: { config: Record<string, unknown> | null; messages: Array<{ role: string; content: string }> }): Promise<unknown>
  // 在文件管理器中显示路径
  revealPath(filePath: string): Promise<void>
  // 保存文件
  saveFile(payload: Record<string, unknown>): Promise<unknown>
  // 窗口控制
  closeWindow(): void
  minimizeWindow(): void
  maximizeWindow(): void
  isWindowMaximized(): Promise<boolean>
}

// 全局类型声明 - 将 llamaDesktop API 挂载到 window 对象
declare global {
  interface Window {
    llamaDesktop: LlamaDesktopAPI
  }
}

// 配置类型 - 存储 llama-server 和应用的所有设置
export interface Config {
  [key: string]: unknown
  launch_mode?: string // 启动模式：direct 或 launcher
  config_path?: string // 配置文件路径
  launcher_path?: string // 启动器路径
  llama_server_path?: string // llama-server.exe 路径
  llama_bin_dir?: string // llama 二进制目录
  model?: string // 模型文件路径
  mmproj?: string // 多模态投影文件路径
  chat_template_kwargs?: string // 对话模板参数（JSON）
  host?: string // 服务器监听地址
  port?: number // 服务器端口
  ctx_size?: number // 上下文窗口大小
  n_predict?: number // 最大生成 token 数
  n_gpu_layers?: number // GPU 层数量
  request_timeout_ms?: number // 请求超时时间（毫秒）
  log_verbosity?: number // 日志详细程度
  verbose?: boolean // 是否显示详细日志
  webui?: boolean // 是否启用 WebUI
  embeddings?: boolean // 是否启用嵌入模型
  continuous_batching?: boolean // 是否启用连续批处理
  temp?: number // 温度参数
  top_k?: number // Top-K 采样
  top_p?: number // Top-P (nucleus) 采样
  min_p?: number // Min-P 采样
  presence_penalty?: number // 存在惩罚
  repeat_penalty?: number // 重复惩罚
  frequency_penalty?: number // 频率惩罚
  repeat_last_n?: number // 重复惩罚的上下文窗口
  tfs_z?: number // Tail-Free Sampling 参数
  typical_p?: number // Typical Sampling 参数
  dry_multiplier?: number // DRY 采样乘数
  dry_base?: number // DRY 采样基数
  dry_allowed_length?: number // DRY 允许的长度
  dry_penalty_last_n?: number // DRY 惩罚的上下文窗口
  threads?: number // CPU 线程数
  threads_batch?: number // 批处理线程数
  batch_size?: number // 批处理大小
  ubatch_size?: number // 微批处理大小
  split_mode?: string // 张量拆分模式
  tensor_split?: string // 张量拆分配置
  device?: string // 设备（如 cuda, metal）
  main_gpu?: number // 主 GPU 索引
  n_cpu_moe?: number // CPU MoE 专家数
  cpu_moe?: boolean // 是否启用 CPU MoE
  show_raw_output?: boolean // 是否显示原始输出
  show_thinking?: boolean // 是否显示思考过程
  expand_thinking?: boolean // 是否展开思考过程
  extra_args?: string // 额外命令行参数
}

// 服务状态类型
export interface Status {
  state: 'stopped' | 'starting' | 'running' | 'stopping' | 'error' // 服务状态
  message: string // 状态消息
  url: string // 服务 URL
}

// 验证状态类型 - 检查文件是否存在
export interface Validation {
  configExists?: boolean // 配置文件是否存在
  launcherExists?: boolean // 启动器是否存在
  serverExists?: boolean // 服务器文件是否存在
  modelExists?: boolean // 模型文件是否存在
}

// 日志条目类型
export interface LogEntry {
  at: string // 时间戳
  source: string // 日志来源（stdout, stderr, desktop）
  line: string // 日志内容
}

// Skill 类型
export interface Skill {
  dirName: string
  filePath: string
  raw?: string
  name: string
  description: string
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  body: string
}

// 附件类型
export interface Attachment {
  kind: 'image' | 'audio' | 'text' | 'pdf' | 'system' | 'mcp' | 'file' // 附件类型
  name: string // 文件名称
  path?: string // 文件路径
  size?: number // 文件大小
  dataUrl?: string // Base64 编码的图片数据
  warning?: string // 警告信息
  error?: string // 错误信息
}

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' // 角色
  content: string // 内容
  attachments?: Attachment[] // 附件
  createdAt: number // 创建时间戳
  startedAt?: number // 开始生成时间戳
  model?: string // 模型名称
  tokens?: string | number // 使用的 token 数
  estimatedTokens?: number // 预估 token 数
  latencyMs?: number // 延迟（毫秒）
  speed?: string // 生成速度
  streaming?: boolean // 是否正在流式生成
  localOnly?: boolean // 是否仅本地消息
  variants?: ChatMessageVariant[] // 回复变体列表
  currentVariantIndex?: number // 当前选中的变体索引
}

// 消息变体类型
export interface ChatMessageVariant {
  content: string // 变体内容
  tokens?: string | number // token 数
  latencyMs?: number // 延迟
  speed?: string // 生成速度
  createdAt: number // 创建时间戳
}

// 会话类型 - 存储一组聊天记录
export interface Session {
  id: string // 会话 ID
  title: string // 会话标题
  messages: ChatMessage[] // 消息列表
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
  systemPrompt?: string // 会话级系统提示词（可选）
}

// 知识库文档类型
export interface KnowledgeDocument {
  id: string // 文档 ID
  name: string // 文件名
  path: string // 文件路径
  size: number // 文件大小（字节）
  uploadedAt: number // 上传时间戳
  status: 'pending' | 'processing' | 'ready' | 'error' // 文档状态
  chunkCount?: number // 分块数量
  errorMessage?: string // 错误信息（如果状态为 error）
}

// 知识库文本块类型
export interface KnowledgeChunk {
  id: string // 文本块 ID
  documentId: string // 所属文档 ID
  documentName: string // 文档名称
  content: string // 文本内容
  index: number // 在文档中的索引
}

// 知识库搜索结果
export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk // 匹配的文本块
  score: number // 相似度分数
}

// 应用状态类型 - 管理整个应用的状态
export interface AppState {
  active: string // 当前激活的面板
  config: Config | null // 配置
  validation: Validation // 验证状态
  launch: Record<string, unknown> // 启动详情
  status: Status // 服务状态
  logs: LogEntry[] // 日志列表
  view: 'chat' | 'terminal' | 'knowledge' // 当前视图（聊天、终端或知识库）
  sidebarPanel: string // 侧边栏面板
  sidebarCollapsed: boolean // 侧边栏是否折叠
  sessions: Session[] // 会话列表
  currentSessionId: string // 当前会话 ID
  openTabs: string[] // 当前打开的标签页 ID 列表
  historySearch: string // 历史搜索词
  historyMenuId: string // 历史菜单 ID
  historyDialog: null | Record<string, unknown> // 历史对话框
  chatMessages: ChatMessage[] // 当前聊天消息
  chatInput: string // 输入框内容
  attachments: Attachment[] // 选中的附件
  attachmentMenuOpen: boolean // 附件菜单是否打开
  attachmentMenuPosition: null | { left: number; top: number } // 附件菜单位置
  streamRequestId: string // 流式请求 ID
  preview: null | Record<string, unknown> // 预览内容
  modelInfo: null | { loading?: boolean; error?: string } | Record<string, unknown> // 模型信息
  modelInfoOpen: boolean // 模型信息对话框是否打开
  chatBusy: boolean // 聊天是否忙碌
  dirty: boolean // 是否有未保存的更改
  busy: boolean // 是否忙碌
  settingsOpen: boolean // 设置面板是否打开
  toast: string // Toast 提示消息
  stickToBottom: boolean // 是否自动滚动到底部
  // 知识库状态
  knowledgeDocuments: KnowledgeDocument[] // 知识库文档列表
  knowledgeEnabled: boolean // 是否启用知识库
  knowledgeLoading: boolean // 知识库是否加载中
}

// 设置面板分区 ID 类型
export type SettingsSectionId = 'overview' | 'display' | 'skills' | 'sampling' | 'mcp' | 'developer' | 'logs'