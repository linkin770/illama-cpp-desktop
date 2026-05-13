export const sections = [
  ['chat', '对话', '桌面端直接使用模型'],
  ['paths', '路径', '启动器、配置文件和服务端'],
  ['model', '模型', 'GGUF 与多模态投影'],
  ['runtime', '上下文', '服务地址和上下文窗口'],
  ['sampling', '采样', '温度、Top-P 和惩罚'],
  ['system', 'GPU/批处理', '显卡、线程和批量参数'],
  ['logs', '日志', '启动输出和健康检查'],
]

export const promptSeeds = ['你现在是什么模型', '分析一下内容', '写一个 API 请求示例', '生成 OpenAI 兼容配置']

export const settingsTabs = [
  ['overview', '&#9881;', '概述', '服务入口与基础运行信息'],
  ['display', '&#128421;', '展示', '模型标签、模板与显示项'],
  ['sampling', '&#9661;', '采样', '温度、Top-K 与 Top-P'],
  ['penalty', '&#9651;', '惩罚', '重复、存在与最小采样'],
  ['io', '&#128452;', '进出口', '模型、服务端与路径'],
  ['mcp', '&#128206;', 'MCP', '预留给扩展和工具接入'],
  ['developer', '&lt;/&gt;', '开发者', '线程、GPU 与批处理'],
  ['logs', '&#128196;', '日志', '当前 llama.cpp 服务输出'],
]

export function getAppEl() {
  return document.getElementById('app')
}