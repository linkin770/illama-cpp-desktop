﻿// 主应用组件 - 整合所有功能模块
import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { XProvider } from '@ant-design/x';
import zhCN from '@ant-design/x/locale/zh_CN';
import { theme as antdTheme, Modal, Input } from 'antd';
import { useAppState } from './hooks/useAppState';
import { ChatScreen } from './components/ChatScreen';
import { Sidebar } from './components/Sidebar';
import { ServiceBar } from './components/ServiceBar';
import { TerminalPanel } from './components/TerminalPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ModelInfoModal } from './components/ModelInfoModal';
import { Toast } from './components/Toast';
import { ChatNav } from './components/ChatNav';
import type { ChatMessage } from './types';
import { friendlyErrorMessage, estimateTokens } from './utils';
import { themeConfig } from './theme';

function App() {
  const {
    state,
    setToast,
    patchFromBackend,
    saveCurrentSession,
    openSession,
    startFreshSession,
    renameSession,
    deleteSession,
    updateConfig,
    updateChatInput,
    addAttachments,
    removeAttachment,
    clearAttachments,
    addChatMessage,
    updateChatMessage,
    setChatMessages,
    setChatBusy,
    setStreamRequestId,
    setView,
    setActive,
    setSettingsOpen,
    setSidebarCollapsed,
    setHistorySearch,
    setHistoryMenuId,
    setModelInfo,
    setModelInfoOpen,
    setBusy,
  } = useAppState();

  const [renameState, setRenameState] = useState<{ open: boolean; sessionId: string; title: string; value: string } | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  const currentTheme = useMemo(() => ({
    ...themeConfig,
    algorithm: antdTheme.defaultAlgorithm,
  }), []);

  // 使用 useRef 保存最新的流式请求 ID 和消息列表，避免闭包陷阱
  const streamRequestIdRef = useRef(state.streamRequestId);
  const chatMessagesRef = useRef(state.chatMessages);

  // 保存配置
  const save = useCallback(async () => {
    setBusy(true);
    try {
      const result = await window.llamaDesktop.saveConfig({ config: state.config });
      patchFromBackend({
        config: result.config,
        validation: result.validation,
        status: result.status,
        logs: result.logs,
        launch: result.launch,
      });
      setToast('配置已保存');
    }
    catch (error) {
      setToast((error as Error).message || String(error));
    }
    finally {
      setBusy(false);
    }
  }, [state.config, setBusy, patchFromBackend, setToast]);

  // 启动 llama-server 服务
  const start = useCallback(async () => {
    setBusy(true);
    try {
      const result = await window.llamaDesktop.startServer({ config: state.config });
      patchFromBackend({
        config: result.config,
        validation: result.validation,
        status: result.status,
        logs: result.logs,
        launch: result.launch,
      });
      setActive('chat');
      setToast('服务正在启动。关闭窗口后会继续在托盘运行。');
    }
    catch (error) {
      setToast((error as Error).message || String(error));
    }
    finally {
      setBusy(false);
    }
  }, [state.config, setBusy, patchFromBackend, setActive, setToast]);

  // 停止 llama-server 服务
  const stop = useCallback(async () => {
    setBusy(true);
    try {
      const result = await window.llamaDesktop.stopServer();
      patchFromBackend({
        config: result.config, validation: result.validation,
        status: result.status,
        logs: result.logs,
        launch: result.launch,
      });
      setToast('服务已停止');
    }
    catch (error) {
      setToast((error as Error).message || String(error));
    }
    finally {
      setBusy(false);
    }
  }, [setBusy, patchFromBackend, setToast]);

  // 测试服务健康状态
  const health = useCallback(async () => {
    try {
      const result = await window.llamaDesktop.testHealth({ config: state.config });
      setToast(result.ok ? `端口正常：${result.url}` : `端口未响应：${result.message || result.url}`);
    }
    catch (error) {
      setToast((error as Error).message || String(error));
    }
  }, [state.config, setToast]);

  // 打开模型信息面板
  const openModelInfo = useCallback(async () => {
    setModelInfoOpen(true);
    setModelInfo({ loading: true });
    try {
      const info = await window.llamaDesktop.getModelInfo({ config: state.config });
      setModelInfo(info);
    }
    catch (error) {
      setModelInfo({ error: (error as Error).message || String(error) });
    }
  }, [state.config, setModelInfoOpen, setModelInfo]);

  const pickSkill = useCallback((skill: Skill) => { setSelectedSkill(skill) }, [])


  // 选择附件（图片、PDF、文件等）
  const pickAttachment = useCallback(async (kind: string) => {
    try {
      const picked = await window.llamaDesktop.pickAttachments({ kind });
      if (picked?.length) {
        addAttachments(picked);
        const hasImage = picked.some(item => item.kind === 'image');
        const hasLargeImage = picked.some(item => item.kind === 'image' && !item.dataUrl);
        if (hasLargeImage) {
          setToast('图片已添加，但文件较大，只会作为附件记录路径。');
        }
        else if (hasImage && !state.config?.mmproj) {
          setToast('图片已添加；未配置 mmproj 时，普通文本模型可能看不懂图片。');
        }
        else {
          const labels: Record<string, string> = {
            image: '图片',
            audio: '音频',
            text: '文本',
            pdf: 'PDF',
            system: '系统',
            mcp: 'MCP',
            file: '文件',
          };
          setToast(`${labels[kind] || '文件'}已添加`);
        }
      }
    }
    catch (error) {
      setToast((error as Error).message || String(error));
    }
  }, [addAttachments, state.config?.mmproj, setToast]);

  // 发送聊天消息
  const sendChat = useCallback(async (inputContent: string) => {
    const content = inputContent.trim();
    // 如果没有内容和附件，或者正在忙碌，则直接返回
    if ((!content && state.attachments.length === 0) || state.chatBusy)
      return;
    // 检查是否有图片附件且没有配置 mmproj
    const hasImage = state.attachments.some(item => item.kind === 'image');
    if (hasImage && !state.config?.mmproj) {
      setToast('请先在设置中配置 mmproj 投影文件，否则图片无法被模型理解。');
      return;
    }
    setChatBusy(true);
    const attachments = state.attachments;
    // 创建用户消息
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      attachments,
      createdAt: Date.now(),
    };
    // 生成请求 ID
    const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    // 创建助手消息（占位符）
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      startedAt: Date.now(),
      model: state.config?.model?.split(/[\\/]/).pop() || 'local-model',
      tokens: 0,
      estimatedTokens: 0,
      latencyMs: 0,
      speed: '',
      streaming: true,
    };
    const allMessages = [...state.chatMessages, userMessage, assistantMessage];
    // 添加消息到列表
    addChatMessage(userMessage);
    addChatMessage(assistantMessage);
    setStreamRequestId(requestId);
    updateChatInput('');
    clearAttachments();
    setView('chat');
    try {
      // 调用流式聊天 API
      const result = await window.llamaDesktop.streamChat({
        requestId,
        config: state.config,
        messages: allMessages.slice(0, -1),
      });
      // 安全网：如果事件处理器未及时处理 done 事件，用 IPC 返回值兜底
      const latestMsgs = chatMessagesRef.current;
      const lastIdx = latestMsgs.length - 1;
      if (lastIdx >= 0 && latestMsgs[lastIdx].role === 'assistant' && latestMsgs[lastIdx].streaming) {
        updateChatMessage(lastIdx, prev => ({
          content: result.content || prev.content || ' ',
          streaming: false,
          tokens: result.content ? estimateTokens(result.content) : prev.tokens,
          estimatedTokens: result.content ? estimateTokens(result.content) : prev.estimatedTokens,
          latencyMs: prev.startedAt ? Date.now() - prev.startedAt : prev.latencyMs,
          speed: '',
        }));
      }
    }
    catch (error) {
      // 如果出错，移除空的助手消息并添加系统错误消息
      const lastIndex = state.chatMessages.length;
      if (!state.chatMessages[lastIndex - 1]?.content) {
        setChatMessages(state.chatMessages.slice(0, -1));
      }
      addChatMessage({
        role: 'system',
        content: friendlyErrorMessage(error as string | Error),
        createdAt: Date.now(),
        localOnly: true,
      });
      saveCurrentSession();
    }
    finally {
      setChatBusy(false);
      setStreamRequestId('');
    }
  }, [state.attachments, state.chatBusy, state.config, state.chatMessages, setChatBusy, addChatMessage, setStreamRequestId, updateChatInput, clearAttachments, setView, saveCurrentSession, updateChatMessage, setChatMessages, setToast]);

  // 中止当前聊天
  const abortChat = useCallback(async () => {
    if (!state.chatBusy)
      return;
    try {
      await window.llamaDesktop.abortChat();
    }
    catch {
      // 忽略中止错误
    }
    setChatBusy(false);
    setStreamRequestId('');
  }, [state.chatBusy, setChatBusy, setStreamRequestId]);

  // 重试特定消息（保存当前变体后生成新回复）
  const retryMessage = useCallback(async (index: number) => {
    if (state.chatBusy)
      return;
    // 找到前一条用户消息
    const previousUserIndex = state.chatMessages
      .slice(0, index)
      .map((message, itemIndex) => ({ message, itemIndex }))
      .reverse()
      .find(item => item.message.role === 'user')?.itemIndex;
    if (previousUserIndex === undefined) {
      setToast('没有找到可以重试的用户消息');
      return;
    }
    const userMessage = state.chatMessages[previousUserIndex];
    const currentAssistantMessage = state.chatMessages[index];
    
    // 保存当前回复作为变体（如果有内容）
    const truncatedMessages = state.chatMessages.slice(0, index);
    let existingVariants = currentAssistantMessage?.variants || [];
    
    if (currentAssistantMessage && currentAssistantMessage.content) {
      // 如果已有变体，把当前显示的内容添加到变体列表
      if (existingVariants.length > 0) {
        existingVariants = [...existingVariants, {
          content: currentAssistantMessage.content,
          tokens: currentAssistantMessage.tokens,
          latencyMs: currentAssistantMessage.latencyMs,
          speed: currentAssistantMessage.speed,
          createdAt: currentAssistantMessage.createdAt,
        }];
      } else {
        // 如果是第一次重试，把原始回复保存为第一个变体
        existingVariants = [{
          content: currentAssistantMessage.content,
          tokens: currentAssistantMessage.tokens,
          latencyMs: currentAssistantMessage.latencyMs,
          speed: currentAssistantMessage.speed,
          createdAt: currentAssistantMessage.createdAt,
        }];
      }
    }
    
    const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    // 创建新的助手消息
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      startedAt: Date.now(),
      model: state.config?.model?.split(/[\\/]/).pop() || 'local-model',
      tokens: 0,
      estimatedTokens: 0,
      latencyMs: 0,
      speed: '',
      streaming: true,
      variants: existingVariants,
      currentVariantIndex: existingVariants.length,
    };
    const allMessages = [...truncatedMessages, assistantMessage];
    setChatMessages(truncatedMessages);
    addChatMessage(assistantMessage);
    setStreamRequestId(requestId);
    setChatBusy(true);
    try {
      // 流式事件处理器会自动更新消息内容和元数据，这里只等待流完成
      const result = await window.llamaDesktop.streamChat({
        requestId,
        config: state.config,
        messages: allMessages.slice(0, -1),
      });
      const latestMessages = chatMessagesRef.current;
      const targetIdx = latestMessages.length - 1;
      // 安全网：如果事件处理器未及时处理 done 事件
      if (targetIdx >= 0 && latestMessages[targetIdx]?.role === 'assistant' && latestMessages[targetIdx]?.streaming) {
        updateChatMessage(targetIdx, prev => ({
          content: result.content || prev.content || ' ',
          streaming: false,
          tokens: result.content ? estimateTokens(result.content) : prev.tokens,
          estimatedTokens: result.content ? estimateTokens(result.content) : prev.estimatedTokens,
          latencyMs: prev.startedAt ? Date.now() - prev.startedAt : prev.latencyMs,
          speed: '',
        }));
      }
      // 确保变体信息在事件处理器更新后被保留
      if (targetIdx >= 0 && latestMessages[targetIdx].role === 'assistant') {
        updateChatMessage(targetIdx, {
          variants: existingVariants,
          currentVariantIndex: existingVariants.length,
        });
      }
      saveCurrentSession();
    }
    catch (error) {
      // 处理错误
      const lastIndex = state.chatMessages.length;
      if (!state.chatMessages[lastIndex - 1]?.content) {
        setChatMessages(state.chatMessages.slice(0, -1));
      }
      addChatMessage({
        role: 'system',
        content: friendlyErrorMessage(error as string | Error).replace(/^发送失败/, '重试失败'),
        createdAt: Date.now(),
        localOnly: true,
      });
      saveCurrentSession();
    }
    finally {
      setChatBusy(false);
      setStreamRequestId('');
    }
  }, [state.chatBusy, state.chatMessages, state.config, setChatMessages, addChatMessage, setStreamRequestId, setChatBusy, updateChatMessage, saveCurrentSession, setToast]);

  // 切换到上一个变体
  const prevVariant = useCallback((index: number) => {
    const message = state.chatMessages[index];
    if (!message || message.role !== 'assistant' || !message.variants || message.variants.length === 0) {
      return;
    }
    const currentIndex = message.currentVariantIndex ?? message.variants.length;
    if (currentIndex <= 0) return;
    
    const newIndex = currentIndex - 1;
    const variant = message.variants[newIndex];
    
    updateChatMessage(index, {
      content: variant?.content || message.content,
      tokens: variant?.tokens || message.tokens,
      latencyMs: variant?.latencyMs || message.latencyMs,
      speed: variant?.speed || message.speed,
      currentVariantIndex: newIndex,
    });
  }, [state.chatMessages, updateChatMessage]);

  // 切换到下一个变体
  const nextVariant = useCallback((index: number) => {
    const message = state.chatMessages[index];
    if (!message || message.role !== 'assistant' || !message.variants || message.variants.length === 0) {
      return;
    }
    const currentIndex = message.currentVariantIndex ?? message.variants.length;
    const totalVariants = message.variants.length;
    if (currentIndex >= totalVariants) return;
    
    const newIndex = currentIndex + 1;
    const variant = message.variants[newIndex];
    
    updateChatMessage(index, {
      content: variant?.content || message.content,
      tokens: variant?.tokens || message.tokens,
      latencyMs: variant?.latencyMs || message.latencyMs,
      speed: variant?.speed || message.speed,
      currentVariantIndex: newIndex,
    });
  }, [state.chatMessages, updateChatMessage]);

  // 复制消息内容到剪贴板
  const copyMessage = useCallback((index: number) => {
    const message = state.chatMessages[index];
    if (message) {
      navigator.clipboard.writeText(message.content || '');
      setToast('已复制');
    }
  }, [state.chatMessages, setToast]);

  // 编辑消息（仅用户消息）
  const editMessage = useCallback((index: number) => {
    const message = state.chatMessages[index];
    if (message && message.role === 'user') {
      updateChatInput(message.content || '');
    }
  }, [state.chatMessages, updateChatInput]);

  // 删除消息
  const deleteMessage = useCallback((index: number) => {
    setChatMessages(state.chatMessages.filter((_, i) => i !== index));
    saveCurrentSession();
  }, [state.chatMessages, setChatMessages, saveCurrentSession]);

  // 选择文件（用于配置页面）
  const pickFile = useCallback(async (fieldName: string, kind: string) => {
    const filters: Array<{ name: string; extensions: string[] }> = (kind === 'exe' ? [
      { name: 'Executable', extensions: ['exe', 'cmd', 'bat'] },
      { name: 'All Files', extensions: ['*'] },
    ] : kind === 'gguf' ? [
      { name: 'GGUF', extensions: ['gguf'] },
      { name: 'All Files', extensions: ['*'] },
    ] : kind === 'toml' ? [
      { name: 'TOML', extensions: ['toml'] },
      { name: 'All Files', extensions: ['*'] },
    ] : [{ name: 'All Files', extensions: ['*'] }]);
    const selected = await window.llamaDesktop.pickFile(kind === 'dir' ? { properties: ['openDirectory'] } : { filters });
    if (selected) {
      updateConfig(fieldName as any, selected);
      // 如果选择的是 llama 二进制目录，自动设置 llama-server 路径
      if (fieldName === 'llama_bin_dir') {
        updateConfig('llama_server_path' as any, `${selected.replace(/[\\/]+$/, '')}\\llama-server.exe`);
      }
    }
  }, [updateConfig]);

  // 重命名会话（使用 antd Modal 代替 window.prompt）
  const editSession = useCallback((sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    const title = session.title || '新聊天'
    setRenameState({ open: true, sessionId, title, value: title })
  }, [state.sessions])

  const handleRenameOk = useCallback(() => {
    if (!renameState) return
    const trimmed = renameState.value.trim()
    if (trimmed && trimmed !== renameState.title) {
      renameSession(renameState.sessionId, trimmed)
    }
    setRenameState(null)
  }, [renameState, renameSession])

  // 导出会话为 TXT（用户：xxx \n AI：xxx 格式）
  const exportSession = useCallback((sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    const lines: string[] = []
    for (const msg of session.messages) {
      if (msg.role === 'user') {
        lines.push(`用户：${msg.content}`)
      } else if (msg.role === 'assistant') {
        lines.push(`AI：${msg.content}`)
      }
    }
    const content = lines.join('\n\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title || '聊天记录'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.sessions])

  // 删除会话（使用 antd Modal.confirm 代替 window.confirm）
  const removeSession = useCallback((sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    Modal.confirm({
      title: '确认删除',
      centered: true,
      content: `确定要删除会话「${session.title || '新聊天'}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => { deleteSession(sessionId) },
    })
  }, [state.sessions, deleteSession])

  // 初始化应用，从后端获取状态
  useEffect(() => {
    const init = async () => {
      try {
        try {
          const result = await window.llamaDesktop.getState();
          patchFromBackend({
            config: result.config,
            validation: result.validation,
            status: result.status,
            logs: result.logs,
            launch: result.launch,
          });
        }
        catch (backendError) {
          console.warn('Failed to get state from backend:', backendError);
        }
      }
      catch (error) {
        console.error('Init failed:', error);
      }
    };
    init();
  }, []);

  // 同步最新的流式请求 ID 和消息列表到 ref
  useEffect(() => {
    streamRequestIdRef.current = state.streamRequestId;
    chatMessagesRef.current = state.chatMessages;
  });

  // 监听来自主进程的事件（状态更新、日志、流式消息）
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSaveTime = 0;
    const SAVE_INTERVAL = 2000; // 每2秒保存一次
    
    const handleEvent = (payload: any) => {
      if (payload.type === 'status') {
        patchFromBackend({ status: payload.status });
      }
      else if (payload.type === 'logs') {
        patchFromBackend({ logs: payload.logs });
      }
      else if (payload.type === 'chat-stream') {
        const currentRequestId = streamRequestIdRef.current;
        if (payload.requestId !== currentRequestId)
          return;
        const messages = chatMessagesRef.current;
        const lastIndex = messages.length - 1;
        if (lastIndex < 0) return;
        // 处理流式增量内容 - 即时更新
        if (payload.delta) {
          updateChatMessage(lastIndex, prev => ({
            content: (prev.content || '') + payload.delta,
          }));
          // 定期保存（防抖）
          const now = Date.now();
          if (now - lastSaveTime > SAVE_INTERVAL) {
            lastSaveTime = now;
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
              saveCurrentSession();
            }, 300);
          }
        }
        // 处理流式完成
        if (payload.done) {

          if (saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = null;
          }
          updateChatMessage(lastIndex, prev => {
            const doneContent = payload.content || prev.content || '模型返回了空内容。';
            const doneTokens = Number(prev.tokens) || estimateTokens(doneContent);
            const doneStartedAt = prev.startedAt || prev.createdAt || Date.now();
            const doneLatencyMs = Date.now() - doneStartedAt;
            let doneSpeed = '';
            if (doneTokens > 0 && doneLatencyMs > 0) {
              doneSpeed = `${(doneTokens / (doneLatencyMs / 1000)).toFixed(2)} t/s`;
            } else if (doneTokens > 0) {
              doneSpeed = '> 1000 t/s';
            }
            return {
              content: doneContent,
              tokens: doneTokens,
              estimatedTokens: doneTokens,
              latencyMs: doneLatencyMs,
              speed: doneSpeed,
              streaming: false,
            };
          });
          setStreamRequestId('');
          saveCurrentSession();
        }
      }
    };
    const cleanup = window.llamaDesktop?.onEvent?.(handleEvent);
    return () => {
      cleanup?.();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [patchFromBackend, updateChatMessage, setStreamRequestId, saveCurrentSession]);

  // 渲染应用界面
  return (
    <XProvider
      locale={zhCN}
      theme={currentTheme}
    >
    <div className="drag-region">
      <button type="button" className="sidebar-toggle" data-action="toggle-sidebar" title={state.sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'} onClick={() => setSidebarCollapsed(!state.sidebarCollapsed)}>
        {state.sidebarCollapsed ? '›' : '‹'}
      </button>
    </div>
    <div className={`app-shell ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar sessions={state.sessions} currentSessionId={state.currentSessionId} historySearch={state.historySearch} historyMenuId={state.historyMenuId} sidebarCollapsed={state.sidebarCollapsed} view={state.view} chatMessages={state.chatMessages} status={state.status} settingsOpen={state.settingsOpen} onNewChat={startFreshSession} onFocusChat={() => setView('chat')} onShowTerminal={() => setView('terminal')} onSearchChange={setHistorySearch} onOpenSession={openSession} onToggleHistoryMenu={(id) => setHistoryMenuId(state.historyMenuId === id ? '' : id)} onEditSession={editSession} onExportSession={exportSession} onDeleteSession={removeSession} onToggleSettings={() => setSettingsOpen(!state.settingsOpen)} onToggleSidebar={() => setSidebarCollapsed(!state.sidebarCollapsed)}/>

      <main className="main-area">
        {state.view === 'terminal' ? (<TerminalPanel logs={state.logs} onReturnChat={() => setView('chat')}/>) : (<ChatScreen chatMessages={state.chatMessages} chatInput={state.chatInput} attachments={state.attachments} chatBusy={state.chatBusy} config={state.config} onInputChange={updateChatInput} onSend={sendChat} onAbort={abortChat} onPickAttachment={pickAttachment} onPickSkill={pickSkill} onRemoveAttachment={removeAttachment} onOpenModelInfo={openModelInfo} onCopyMessage={copyMessage} onEditMessage={editMessage} onRetryMessage={retryMessage} onDeleteMessage={deleteMessage} onPrevVariant={prevVariant} onNextVariant={nextVariant}/>)}
        <ServiceBar status={state.status} busy={state.busy} dirty={state.dirty} onSave={save} onHealth={health} onStart={start} onStop={stop}/>
      </main>

      <SettingsPanel settingsOpen={state.settingsOpen} active={state.active} config={state.config} validation={state.validation} status={state.status} logs={state.logs} dirty={state.dirty} launch={state.launch} onClose={() => setSettingsOpen(false)} onSelectSection={setActive} onUpdateConfig={updateConfig} onPickFile={pickFile} onCopyLaunchCommand={() => { const preview = (state.launch as Record<string, string>).preview; if (preview) { navigator.clipboard.writeText(preview); setToast('命令已复制'); } }}/>

      <ModelInfoModal modelInfoOpen={state.modelInfoOpen} modelInfo={state.modelInfo} onClose={() => setModelInfoOpen(false)}/>

      <Toast message={state.toast}/>
      {renameState?.open && (
        <Modal
          open={renameState.open}
          title="重命名会话"
          centered
          okText="确定"
          cancelText="取消"
          onOk={handleRenameOk}
          onCancel={() => setRenameState(null)}
          destroyOnClose
        >
          <Input
            value={renameState.value}
            onChange={(e) => setRenameState(prev => prev ? { ...prev, value: e.target.value } : prev)}
            onPressEnter={handleRenameOk}
            autoFocus
          />
        </Modal>
      )}
      {state.view === 'chat' && <ChatNav chatMessages={state.chatMessages} />}
    </div>
    </XProvider>
  );
}

export default App;
