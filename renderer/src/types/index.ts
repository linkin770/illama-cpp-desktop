export interface LlamaDesktopAPI {
  saveConfig(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  startServer(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown>; url?: string }>
  stopServer(): Promise<{ ok: boolean; config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  testHealth(opts: { config: Record<string, unknown> | null }): Promise<{ ok: boolean; url?: string; message?: string }>
  getModelInfo(opts: { config: Record<string, unknown> | null }): Promise<Record<string, unknown>>
  pickAttachments(opts: { kind: string }): Promise<Attachment[]>
  pickFile(opts?: { properties?: string[]; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null>
  streamChat(opts: { requestId: string; config: Record<string, unknown> | null; messages: Array<{ role: string; content: string }> }): Promise<{ content: string; raw?: { usage?: { completion_tokens: number; total_tokens: number } } }>
  abortChat(): Promise<void>
  getState(): Promise<{ config?: Config; validation?: Validation; status?: Status; logs?: LogEntry[]; launch?: Record<string, unknown> }>
  onEvent(handler: (payload: unknown) => void): () => void
}

declare global {
  interface Window {
    llamaDesktop: LlamaDesktopAPI
  }
}

export interface Config {
  [key: string]: unknown
  launch_mode?: string
  config_path?: string
  launcher_path?: string
  llama_server_path?: string
  llama_bin_dir?: string
  model?: string
  mmproj?: string
  chat_template_kwargs?: string
  host?: string
  port?: number
  ctx_size?: number
  n_predict?: number
  n_gpu_layers?: number
  request_timeout_ms?: number
  log_verbosity?: number
  verbose?: boolean
  webui?: boolean
  embeddings?: boolean
  continuous_batching?: boolean
  temp?: number
  top_k?: number
  top_p?: number
  min_p?: number
  presence_penalty?: number
  repeat_penalty?: number
  frequency_penalty?: number
  repeat_last_n?: number
  tfs_z?: number
  typical_p?: number
  dry_multiplier?: number
  dry_base?: number
  dry_allowed_length?: number
  dry_penalty_last_n?: number
  threads?: number
  threads_batch?: number
  batch_size?: number
  ubatch_size?: number
  split_mode?: string
  tensor_split?: string
  device?: string
  main_gpu?: number
  n_cpu_moe?: number
  cpu_moe?: boolean
  show_raw_output?: boolean
  show_thinking?: boolean
  expand_thinking?: boolean
  extra_args?: string
}

export interface Status {
  state: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  message: string
  url: string
}

export interface Validation {
  configExists?: boolean
  launcherExists?: boolean
  serverExists?: boolean
  modelExists?: boolean
}

export interface LogEntry {
  at: string
  source: string
  line: string
}

export interface Attachment {
  kind: 'image' | 'audio' | 'text' | 'pdf' | 'system' | 'mcp' | 'file'
  name: string
  path?: string
  size?: number
  dataUrl?: string
  warning?: string
  error?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: Attachment[]
  createdAt: number
  startedAt?: number
  model?: string
  tokens?: string | number
  estimatedTokens?: number
  latencyMs?: number
  speed?: string
  streaming?: boolean
  localOnly?: boolean
}

export interface Session {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

export interface AppState {
  active: string
  config: Config | null
  validation: Validation
  launch: Record<string, unknown>
  status: Status
  logs: LogEntry[]
  view: 'chat' | 'terminal'
  sidebarPanel: string
  sidebarCollapsed: boolean
  sessions: Session[]
  currentSessionId: string
  historySearch: string
  historyMenuId: string
  historyDialog: null | Record<string, unknown>
  chatMessages: ChatMessage[]
  chatInput: string
  attachments: Attachment[]
  attachmentMenuOpen: boolean
  attachmentMenuPosition: null | { left: number; top: number }
  streamRequestId: string
  preview: null | Record<string, unknown>
  modelInfo: null | { loading?: boolean; error?: string } | Record<string, unknown>
  modelInfoOpen: boolean
  chatBusy: boolean
  dirty: boolean
  busy: boolean
  settingsOpen: boolean
  toast: string
  darkMode: boolean
  stickToBottom: boolean
  isDraggingScrollbar: boolean
}

export type SettingsSectionId = 'overview' | 'display' | 'sampling' | 'mcp' | 'developer' | 'logs'