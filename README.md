# illama-cpp-desktop

> React 重构版本 v1.0.2026.05

无需命令行，就能管理本地 AI 服务。它既是控制台，也是聊天室，更是连接 OpenClaw、Claude Code 等外部工具的桥梁。

---

## ✨ 功能特性

### 🚀 核心功能
- **OpenAI 兼容接口**: 标准 `/v1/chat/completions` 接口，可接入各类客户端（如 OpenClaw、Claude Code 等）
- **内置聊天页面**: 支持流式回复、历史对话搜索和管理
- **系统托盘后台运行**: 窗口最小化后服务继续运行
- **完整 llama.cpp 集成**: 支持 llama-server 服务管理和配置

### 🎨 用户体验
- **ChatGPT 风格界面**: 纯净白色主题配墨绿点缀
- **代码高亮与预览**: 支持多种编程语言的代码块展示
- **思考过程显示**: 可选显示模型推理过程
- **响应式设计**: 适配不同屏幕尺寸
- **发送按钮状态联动**: 输入内容/附件时变绿，生成时变红中止

### ⚙️ 高级配置
- **完整参数配置**: ctx_size、GPU 层数、采样参数等
- **实时终端日志**: 查看 llama.cpp 服务输出
- **模型信息查看**: 查看当前模型细节和运行参数
- **配置文件管理**: 支持 TOML 配置文件的导入导出

### 📁 文件支持
- **文本文件**: 支持 Word（.doc/.docx）、Excel（.xlsx/.xls/.xlsb）、PDF、纯文本等多种格式解析
- **图片文件**: 支持视觉模型输入

---

## 📋 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 (64位) |
| Node.js | >= 18.0.0 |
| 内存 | 建议 >= 16GB (视模型大小而定) |
| GPU | 可选，支持 CUDA |

---

## 🚀 快速开始

### 前置准备

**下载 llama.cpp**

由于 llama.cpp 体积较大，本仓库不包含编译产物。请自行下载：

1. 访问 [llama.cpp 官方发布页面](https://github.com/ggml-org/llama.cpp/releases)
2. 下载 Windows 版本的发布包（如 `llama.cpp-win-cuda.zip`）
3. 解压后将所有文件复制到项目的 `llama/` 文件夹中

确保 `llama/` 文件夹包含以下关键文件：
- `llama-server.exe` - 主服务程序
- `llama.dll` - 核心推理库
- `ggml*.dll` - ggml 推理库
- `cublas*.dll` / `cudart*.dll` - CUDA 支持库（GPU版本）

### 方式一：直接使用（推荐）

1. 下载预编译的发布包
2. 解压后运行 `Llama.cpp Desktop.exe`
3. 在设置中选择 GGUF 模型文件
4. 点击"启动服务"按钮
5. 使用内置聊天，或把 `http://127.0.0.1:8080/v1` 接入 OpenAI 兼容客户端

### 方式二：源码运行

```powershell
# 克隆项目
git clone https://github.com/linkin770/illama-cpp-desktop.git
cd illama-cpp-desktop

# 下载 llama.cpp 并解压到 llama/ 文件夹
# 参考上方"前置准备"步骤

# 安装依赖
npm install

# 启动开发模式
npm start
```

---

## 📖 使用说明

### 配置模型

1. 点击侧边栏的"设置"按钮
2. 在"模型"选项卡中选择 GGUF 模型文件
3. （可选）配置 mmproj 投影文件（用于多模态模型）
4. 调整上下文长度、GPU 层数等参数
5. 点击"保存配置"

### 启动服务

1. 确保已配置好模型路径
2. 点击底部"启动服务"按钮
3. 等待服务启动（约几秒到几十秒，取决于模型大小）
4. 服务状态变为"运行中"后即可使用

### 接入外部客户端

将以下 URL 配置到支持 OpenAI API 的客户端中：
- **Base URL**: `http://127.0.0.1:8080/v1`
- **API Key**: 任意字符串（本地服务无需验证）

---

## 🔧 开发指南

### 项目结构

```text
├── assets/           # 图标和资源文件
│   ├── llama-cpp.png        # 应用图标
│   ├── llama-cpp.ico        # Windows 图标
│   └── llama-cpp-tray.png   # 托盘图标
├── desktop/          # Electron 主进程
│   ├── main.mjs      # 主进程逻辑（IPC、进程管理、配置处理）
│   └── preload.cjs   # 预加载脚本（安全的渲染进程桥接）
├── renderer/         # React 渲染进程（前端界面）
│   ├── src/          # React 源代码
│   │   ├── App.tsx          # 主应用组件
│   │   ├── main.tsx         # 入口文件
│   │   ├── components/      # UI 组件
│   │   │   ├── ChatScreen.tsx      # 聊天界面
│   │   │   ├── ChatMessage.tsx     # 消息组件
│   │   │   ├── Sidebar.tsx         # 侧边栏
│   │   │   ├── SettingsPanel.tsx   # 设置面板
│   │   │   ├── ServiceBar.tsx      # 服务状态栏
│   │   │   └── TerminalPanel.tsx   # 终端面板
│   │   ├── hooks/           # 自定义 Hooks
│   │   │   └── useAppState.ts      # 应用状态管理
│   │   ├── types/           # TypeScript 类型定义
│   │   │   └── index.ts            # 核心类型接口
│   │   └── utils/           # 工具函数
│   │       └── index.ts            # 通用工具函数
│   ├── styles/       # CSS 样式文件
│   │   ├── base.css           # 基础样式
│   │   ├── variables.css      # CSS 变量
│   │   ├── layout.css         # 布局样式
│   │   ├── sidebar.css        # 侧边栏样式
│   │   ├── chat.css           # 聊天界面样式
│   │   ├── composer.css       # 输入框样式
│   │   ├── service.css        # 服务栏样式
│   │   ├── settings.css       # 设置页面样式
│   │   ├── nav.css            # 导航栏样式
│   │   └── extra.css          # 额外样式
│   └── index.html    # HTML 入口
├── llama/            # llama.cpp 编译产物（需自行下载）
├── scripts/          # 辅助脚本
│   └── build-renderer.js      # 渲染进程构建脚本
├── LICENSE           # 许可证
├── package.json      # 项目配置
├── package-lock.json # 依赖锁定
├── tsconfig.json     # TypeScript 配置
└── README.md         # 项目说明
```

### 核心技术栈

| 组件 | 版本 | 类型 | 说明 |
|------|------|------|------|
| Electron | 41.1.1 | devDependencies | 跨平台桌面应用框架 |
| React | ^19.2.6 | dependencies | UI 框架 |
| TypeScript | ^6.0.3 | devDependencies | 类型安全 |
| esbuild | ^0.28.0 | devDependencies | 构建工具 |
| electron-builder | 26.8.1 | devDependencies | 打包工具 |

### 版本命名规范

版本号格式：`1.0.YYYY.MM.DD`

- **主版本号 (1)**: 重大架构变更
- **次版本号 (0)**: 功能更新
- **日期后缀 (YYYY.MM.DD)**: 发布日期

### 开发命令

```powershell
# 启动开发模式
npm start

# 仅构建渲染进程
npm run build

# 打包便携版
npm run dist

# 类型检查
npx tsc --noEmit
```

---

## ⚙️ 配置说明

### 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `host` | 服务绑定地址 | 0.0.0.0 |
| `port` | 服务端口 | 8080 |
| `ctx_size` | 上下文窗口大小 | 32768 |
| `n_predict` | 最大输出 tokens | -1（无限制） |
| `n_gpu_layers` | GPU 加速层数 | 99 |
| `temp` | 温度参数 | 0.8 |
| `top_p` | Top-P 采样 | 0.95 |
| `top_k` | Top-K 采样 | 20 |

### 启动模式

- **Direct 模式**: 直接启动 llama-server.exe（推荐）
- **Launcher 模式**: 通过启动器启动（兼容旧版配置）

---

## ❓ 常见问题

### Q: 服务启动失败？

A: 请检查：
1. 模型文件路径是否正确
2. llama-server.exe 是否存在于指定目录
3. 日志窗口中的错误信息

### Q: 内存不足？

A: 尝试：
1. 减小 `ctx_size` 参数
2. 使用更小的模型（如 7B 模型）
3. 增加 `n_gpu_layers` 让更多层运行在 GPU 上

### Q: 如何接入其他客户端？

A: 将客户端的 API 地址设置为 `http://127.0.0.1:8080/v1`，API Key 可填任意值。

---

## 📝 更新日志

### v1.0.2026.05 (2026-05-19)

#### 🚀 重大重构
- **React 全面重构**，使用 React 19 + TypeScript 重写前端代码
- **组件化架构**，采用组件化设计，代码结构清晰
- **状态管理**，使用自定义 Hook 管理应用状态
- **类型安全**，全面引入 TypeScript，提升开发体验

#### 🎨 界面优化
- **ChatGPT 风格主题**: 纯净白色背景配墨绿点缀
- 移除深色模式，简化主题系统
- 消息元数据气泡透明化处理
- 标题栏透明化，与主背景融合
- 导航栏聚焦当前对话，自动滚动到活动会话
- 设置面板样式优化，统一使用 CSS 变量

#### ✨ 新功能
- **Ant Design X 集成**: 使用 XProvider、Bubble、Sender、Conversations 组件
- **文件附件支持**: 支持 Word、Excel、PDF、图片等格式解析

#### 🐛 Bug 修复
- 修复消息发送时序问题，确保第一次发送即可被模型读取
- 修复各类 TypeScript 类型错误
- 修复亮色模式下服务栏背景黑色问题

---

## 📄 许可证

MIT License

---

## 🤝 致谢

本项目基于以下优秀的开源项目：

- [llama.cpp](https://github.com/ggml-org/llama.cpp) — 高效的本地 LLM 推理引擎
- [illama-cpp-desktop](https://github.com/Qiao-920/llama-cpp-desktop) — llama.cpp Windows 桌面端控制面板

感谢原作者的出色工作！

---

**Enjoy AI on your desktop! 🦙**