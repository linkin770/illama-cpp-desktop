# illama-cpp-desktop

> React 重构版本 v1.0.2026.05.23

[![520](https://img.shields.io/badge/💖-袁袁袁大王-ff69b4?style=flat-square\&labelColor=ffb6c1)](https://github.com/linkin770/illama-cpp-desktop)

无需命令行，就能管理本地 AI 服务。它既是控制台，也是聊天室，更是连接 OpenClaw、Claude Code 等外部工具的桥梁。

***

## ✨ 功能特性

### 🚀 核心功能

- **OpenAI 兼容接口**：标准 `/v1/chat/completions` 流式接口，可接入各类客户端
- **内置聊天界面**：支持流式回复、Markdown 实时渲染、代码高亮、历史对话搜索和管理
- **系统托盘后台运行**：窗口最小化后服务继续在后台运行，托盘图标显示服务状态
- **完整 llama.cpp 集成**：支持 llama-server 启动、停止、健康检测和运行日志查看

### 🎨 用户体验

- **浅色主题**：白色主背景 + 墨绿点缀，简洁干净
- **代码高亮**：使用 Ant Design X CodeHighlighter，支持多种编程语言语法高亮和复制
- **上下文使用率显示**：消息下方环形进度条，按使用率变色（绿 <50%、黄 50-75%、红 >75%）
- **响应式布局**：适配不同屏幕尺寸

### 🛠️ 技能系统 (Skills)

- **Claude Code SKILL.md 兼容**：支持标准 YAML frontmatter + Markdown body 格式
- **LLM 自动生成**：填写技能名称、描述后由本地模型自动生成完整 SKILL.md
- **技能管理面板**：设置中新建、修改、删除技能
- **技能选择菜单**：输入框旁一键选择，底部弹出锚定菜单
- **会话级隔离**：技能绑定当前对话，切换会话后自动隐藏，切回后恢复
- **持久化注入**：选中后每轮对话都将 SKILL.md 作为 system 消息注入到 API 请求最前面
- **${ARGUMENTS} 占位符**：自动替换为用户输入内容
- **紫色技能标签**：选中后输入框上方显示可移除的技能标签

### 📁 文件支持

- **文本文件**：支持 Word（.doc/.docx）、Excel（.xlsx/.xls/.xlsb）、PDF、纯文本等多种格式解析
- **图片文件**：支持视觉模型输入

### ⚙️ 配置与参数

- **完整模型配置**：ctx_size、GPU 层数、温度、top_p、top_k 等采样参数
- **mmproj 视觉投影**：支持多模态模型配置，含清除按钮
- **实时终端日志**：查看 llama.cpp 服务运行日志
- **模型信息查看**：查看当前模型参数和运行状态
- **配置文件管理**：支持 TOML 配置文件的导入与导出

***

## 📋 系统要求

| 项目      | 要求                          |
| ------- | --------------------------- |
| 操作系统    | Windows 10/11 (64 位)         |
| Node.js | >= 18.0.0                   |
| 内存      | 建议 >= 16GB（视模型大小而定）          |
| GPU     | 可选，支持 CUDA / Vulkan 加速      |

***

## 🚀 快速开始

### 前置准备

**下载 llama.cpp**

由于 llama.cpp 体积较大，本仓库不包含编译产物。请自行下载：

1. 访问 [llama.cpp 官方发布页面](https://github.com/ggml-org/llama.cpp/releases)
2. 下载 Windows 版本的发布包（如 `llama.cpp-win-cuda.zip`）
3. 解压后将所有文件复制到项目的 `llama/` 文件夹中

确保 `llama/` 文件夹包含以下关键文件：

- `llama-server.exe` — 主服务程序
- `llama.dll` — 核心推理库
- `ggml*.dll` — ggml 推理库
- `cublas*.dll` / `cudart*.dll` — CUDA 支持库（GPU 版本）

### 方式一：直接使用

1. 下载预编译的发布包
2. 解压后运行 `Llama.cpp Desktop.exe`
3. 在设置中选择 GGUF 模型文件
4. 点击「启动服务」
5. 使用内置聊天，或将 `http://127.0.0.1:8080/v1` 接入 OpenAI 兼容客户端

### 方式二：源码运行

```powershell
# 克隆项目
git clone https://github.com/linkin770/illama-cpp-desktop.git
cd illama-cpp-desktop

# 安装依赖
npm install

# 启动开发模式
npm start
```

***

## 📖 使用说明

### 配置模型

1. 点击侧边栏「设置」
2. 在「模型与模板」选项卡中选择 GGUF 模型文件
3. （可选）配置 mmproj 投影文件（用于视觉模型）
4. 调整上下文长度、GPU 层数、采样参数等
5. 点击「保存配置」

### 启动服务

1. 确保已配置模型路径和 llama.cpp 目录
2. 点击底部「启动服务」
3. 等待加载（约几秒到几十秒，取决于模型大小）
4. 状态变为「运行中」后即可开始聊天

### 使用技能

1. 在设置中添加技能，填写名称和描述
2. 点击「生成 SKILL.md」由模型自动生成提示词
3. 回到聊天界面，点击输入框旁的 🔧 按钮选择技能
4. 技能标签出现在输入框上方，每次发送都将注入到模型上下文
5. 切换对话技能自动隐藏，切回后恢复

### 接入外部客户端

将以下 URL 配置到支持 OpenAI API 的客户端中：

- **Base URL**: `http://127.0.0.1:8080/v1`
- **API Key**: 任意字符串（本地服务无需验证）

***

## 🔧 开发指南

### 项目结构

```
├── assets/                  # 图标和资源文件
│   ├── llama-cpp.png        # 应用图标
│   ├── llama-cpp.ico        # Windows 图标
│   └── llama-cpp-tray.png   # 托盘图标
├── desktop/                 # Electron 主进程
│   ├── main.mjs             # 主进程逻辑（IPC、服务管理、配置、技能 CRUD）
│   └── preload.cjs          # 预加载脚本（安全的渲染进程桥接）
├── renderer/                # React 渲染进程
│   ├── src/
│   │   ├── App.tsx          # 主应用组件（状态管理、事件监听、IPC 调用）
│   │   ├── main.tsx         # 入口
│   │   ├── components/      # UI 组件
│   │   │   ├── ChatScreen.tsx     # 聊天主界面（空状态 / 消息列表）
│   │   │   ├── ChatInput.tsx      # 输入框（附件菜单、技能菜单、模型标签）
│   │   │   ├── ChatMessage.tsx    # 消息渲染（Markdown、代码高亮、元数据）
│   │   │   ├── Sidebar.tsx        # 侧边栏（对话历史、时间分组）
│   │   │   ├── SettingsPanel.tsx  # 设置面板（模型、采样、技能管理）
│   │   │   ├── ServiceBar.tsx     # 底部服务栏（启动/停止/保存）
│   │   │   ├── TerminalPanel.tsx  # 终端日志面板
│   │   │   ├── ModelInfoModal.tsx # 模型信息弹窗
│   │   │   └── ChatNav.tsx        # 消息导航
│   │   ├── hooks/
│   │   │   └── useAppState.ts     # 应用状态 Hook（会话、配置、聊天）
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript 类型定义
│   │   ├── utils/
│   │   │   └── index.ts           # 工具函数（token 预估、时间格式化等）
│   │   └── theme.ts               # Ant Design 主题配置
│   ├── styles/              # CSS 样式（按模块拆分）
│   │   ├── variables.css    # CSS 变量
│   │   ├── base.css         # 基础样式
│   │   ├── layout.css       # 布局
│   │   ├── sidebar.css      # 侧边栏
│   │   ├── chat.css         # 聊天区域
│   │   ├── composer.css     # 输入框
│   │   ├── settings.css     # 设置面板
│   │   ├── extra.css        # 覆盖和扩展样式
│   │   └── ...
│   └── index.html           # HTML 入口
├── llama/                   # llama.cpp 编译产物（需自行下载）
├── skills/                  # 技能 SKILL.md 文件存储目录
├── scripts/
│   └── build-renderer.js    # esbuild 构建脚本
├── package.json
├── tsconfig.json
└── README.md
```

### 核心技术栈

| 组件               | 版本      | 说明              |
| ---------------- | ------- | --------------- |
| Electron         | 41.1.1  | 跨平台桌面应用框架       |
| React            | ^19.2.6 | UI 框架           |
| TypeScript       | ^6.0.3  | 类型安全            |
| Ant Design X     | ^2.7.0  | 对话 UI 组件库       |
| esbuild          | ^0.28.0 | 渲染进程构建工具        |
| electron-builder | 26.8.1  | 打包工具            |
| pdf-parse        | ^1.1.1  | PDF 文本提取        |
| word-extractor   | ^1.0.4  | Word 文档解析       |
| xlsx             | ^0.18.5 | Excel 表格解析      |

### 开发命令

```powershell
# 启动开发模式（构建 + 启动 Electron）
npm start

# 仅构建渲染进程
npm run build

# 打包便携版
npm run dist

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

***

## ⚙️ 配置说明

### 主要配置参数

| 参数                 | 说明          | 默认值     |
| ------------------ | ----------- | ------- |
| `host`           | 服务绑定地址      | 0.0.0.0 |
| `port`           | 服务端口        | 8080    |
| `ctx_size`       | 上下文窗口大小     | 32768   |
| `n_predict`      | 最大输出 tokens | -1（无限制） |
| `n_gpu_layers`   | GPU 加速层数    | 99      |
| `temp`           | 温度参数        | 0.8     |
| `top_p`          | Top-P 采样    | 0.95    |
| `top_k`          | Top-K 采样    | 20      |
| `mmproj`         | 视觉投影文件路径    | —       |

### 启动模式

- **Direct 模式**：直接启动 llama-server.exe（推荐）
- **Launcher 模式**：通过启动器启动（兼容旧版配置）

### 技能文件格式

```markdown
---
name: 技能名称
description: 简要描述
whenToUse: 触发条件说明
argumentHint: 参数提示
---

系统提示词正文...

${ARGUMENTS}
```

***

## 📝 更新日志


- **卡顿问题修复**：移除流式 API 调用前的过早保存，消除输入框和界面卡顿
- **待处理内容刷新**：流式完成时确保所有增量内容完整刷新到 UI

### v1.0.2026.05.23 (2026-05-23)

#### 🛠️ 新功能 — 技能系统

- **技能管理面板**：设置中新增「技能」标签页，支持新建、修改、删除自定义技能
- **LLM 自动生成 SKILL.md**：填写技能名称、描述和使用场景后，一键调用本地模型生成完整 SKILL.md
- **技能选择菜单**：聊天输入框旁新增技能按钮，点击弹出底部锚定菜单，选择技能后自动注入系统提示词
- **技能标签展示**：选中技能后输入框上方显示紫色技能标签，可一键移除或更换
- **System 消息自动注入**：每次发送消息时将技能 SKILL.md 作为系统提示词注入 API 请求最前面，模型每次回复都遵照技能指令
- **会话级技能隔离**：技能绑定到当前对话，切换会话后技能自动隐藏，切回后自动恢复（按会话 ID 存储映射）
- **对话历史时间分组**：侧边栏对话按创建时间分为「今天 / 昨天 / 上周 / 更早」四组，支持折叠展开
- **技能持久生效**：选中技能后持续存在于当前对话，每次发送都注入 system 消息，直至手动移除或更换
- **Claude Code SKILL.md 格式兼容**：技能文件遵循标准 YAML frontmatter + Markdown body 格式
- **${ARGUMENTS} 占位符**：SKILL.md 中的参数占位符自动替换为用户输入内容
- **技能仓库**：所有技能存储在项目根目录 skills/ 文件夹中，每个技能一个子目录

#### 🔧 优化

- 附件上传菜单和技能菜单改为底部锚定定位，内容向上生长
- 技能菜单和附件菜单宽度统一为 236px，定位一致
- 技能菜单每次打开自动刷新技能列表
- 技能按钮支持 toggle：再次点击关闭菜单
- 设置面板 z-index 提升，确保覆盖所有层级

#### 🐛 修复

- 修复 DevTools 快捷键在 Windows titleBarStyle: hidden 下失效的问题
- 修复技能修改弹窗布局，支持分字段编辑
- 修复 SKILL.md 解析器对无结尾 --- 文件的兼容性
- 修复有消息历史时技能菜单无响应的问题
- 修复 sendChat 闭包中 selectedSkill 过期导致注入失效
- 修复 chat-stream-done 事件被忽略导致 token 计算不准确
- 改进 estimateTokens 公式，区分中文（/1.5）和英文（/4）字符的 token 预估
- 修复有消息历史时第二个 ChatInput 实例缺少 skill props

### v1.0.2026.05.22 (2026-05-22)


#### ✨ 新功能

- **附件菜单整理**：移除冗余的 PDF/其他文件入口，统一合并至文本文件上传，对话窗口过滤器不再需要切换类型即可选择全部支持格式
- **附件卡片展示**：发送消息后，用户消息上方显示文件附件卡片（图片 / 文件图标 + 文件名），样式与上传栏一致
- **设置面板优化**：模型文件和 mmproj 字段新增清除按钮，无路径时灰色禁用，有路径时红色可点击；文件地址栏自动截断

#### 🎨 界面优化

- **附件菜单图标更新**：用 @ant-design/icons 替换 emoji，图片用 FileImageOutlined，文本用 FileTextOutlined，风格统一
- **附件菜单位置修正**：菜单改为固定在 + 按钮上方弹出，新增从下到上的滑入动画

#### 🐛 Bug 修复

- **流式输出防抖优化**：50ms 防抖合并 UI 更新，消除卡顿
- **生成时间计数修复**：完成后使用精确保存值，避免跳动
- **mmproj 无法清除**：视觉投影文件现在可通过清除按钮一键清空，适配无 mmproj 的纯文本模型

### v1.0.2026.05.20 (2026-05-20)

#### ✨ 新功能

- **实时 Markdown 渲染**：流式输出时也能实时渲染 Markdown 内容
- **代码高亮与复制**：代码块显示语言类型、语法高亮，一键复制代码
- **集成 CodeHighlighter**：使用 Ant Design X 的 CodeHighlighter 组件
- **上下文使用率显示**：聊天消息下方显示环形进度条，实时展示上下文窗口使用情况
- **上下文使用率提示**：悬停显示详细信息（已使用 tokens、窗口大小、使用率）
- **智能颜色指示**：使用率 <50% 显示绿色，50-75% 黄色，>75% 红色

#### 🐛 Bug 修复

- **对话保存修复**：修复流式输出时消息未正确保存的问题
- **导航定位修复**：打开历史对话时自动滚动到底部
- **定期保存机制**：流式输出过程中每 2 秒自动保存一次，防止数据丢失

#### 💖 亲爱的袁袁袁大王

### v1.0.2026.05.19 (2026-05-19)

#### 🎨 界面优化

- 纯净白色背景（#ffffff）配墨绿点缀（#10a37f）
- 移除深色模式，简化主题系统
- 消息元数据气泡透明化处理
- 标题栏透明化，与主背景融合
- 服务栏样式优化，修复亮色模式下背景异常问题
- 设置面板样式统一，使用 CSS 变量管理颜色

#### ✨ 新功能

- 使用 XProvider、Bubble、Sender、Conversations 组件

### v1.0.2026.05.16 (2026-05-16)

#### 🚀 重大重构

- **React 全面重构**，使用 React 19 + TypeScript 重写前端代码
- **组件化架构**，采用组件化设计，代码结构清晰
- **状态管理**，使用自定义 Hook 管理应用状态
- **类型安全**，全面引入 TypeScript，提升开发体验

#### 🎨 界面优化

- 导航栏聚焦当前对话，自动滚动到活动会话
- 设置面板标签页合并优化（采样与惩罚合并，移除重复的进出标签）
- 图标位置居中对齐

#### 🐛 Bug 修复

- 修复消息发送时序问题，确保第一次发送即可被模型读取
- 修复各类 TypeScript 类型错误

***

## 📄 许可证

MIT License

***

## 🤝 致谢

本项目基于以下优秀的开源项目：

- [llama.cpp](https://github.com/ggml-org/llama.cpp) — 高效的本地 LLM 推理引擎
- [illama-cpp-desktop](https://github.com/Qiao-920/llama-cpp-desktop) — llama.cpp Windows 桌面端控制面板
- [Ant Design X](https://x.ant.design/) — React 组件库

感谢原作者的出色工作！

***

**Enjoy AI on your desktop! 🦙**
