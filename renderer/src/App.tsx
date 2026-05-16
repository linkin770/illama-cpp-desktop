import { useEffect, useCallback, useRef } from 'react';
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
function App() {
 const { state, setToast, patchFromBackend, saveCurrentSession, openSession, startFreshSession, updateConfig, updateChatInput, addAttachments, removeAttachment, clearAttachments, addChatMessage, updateChatMessage, setChatMessages, setChatBusy, setStreamRequestId, setView, setActive, setSettingsOpen, setSidebarCollapsed, setHistorySearch, setHistoryMenuId, setDarkMode, setModelInfo, setModelInfoOpen, setBusy, } = useAppState();
 const streamRequestIdRef = useRef(state.streamRequestId)
 const chatMessagesRef = useRef(state.chatMessages)
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
 const stop = useCallback(async () => {
 setBusy(true);
 try {
 const result = await window.llamaDesktop.stopServer();
 patchFromBackend({
 config: result.config,
 validation: result.validation,
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
 const health = useCallback(async () => {
 try {
 const result = await window.llamaDesktop.testHealth({ config: state.config });
 setToast(result.ok ? `端口正常：${result.url}` : `端口未响应：${result.message || result.url}`);
 }
 catch (error) {
 setToast((error as Error).message || String(error));
 }
 }, [state.config, setToast]);
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
 const sendChat = useCallback(async () => {
 const content = state.chatInput.trim();
 if ((!content && state.attachments.length === 0) || state.chatBusy)
 return;
 const hasImage = state.attachments.some(item => item.kind === 'image');
 if (hasImage && !state.config?.mmproj) {
 setToast('请先在设置中配置 mmproj 投影文件，否则图片无法被模型理解。');
 return;
 }
 setChatBusy(true);
 const attachments = state.attachments;
 const userMessage: ChatMessage = {
   role: 'user',
   content,
   attachments,
   createdAt: Date.now(),
 };
 const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
 addChatMessage(userMessage);
 addChatMessage(assistantMessage);
 setStreamRequestId(requestId);
 updateChatInput('');
 clearAttachments();
 setView('chat');
 saveCurrentSession();
 try {
   await window.llamaDesktop.streamChat({
     requestId,
     config: state.config,
     messages: allMessages.slice(0, -1),
   });
 }
 catch (error) {
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
 }, [state.chatInput, state.attachments, state.chatBusy, state.config, state.chatMessages, setChatBusy, addChatMessage, setStreamRequestId, updateChatInput, clearAttachments, setView, saveCurrentSession, updateChatMessage, setChatMessages, setToast]);
 const abortChat = useCallback(async () => {
 if (!state.chatBusy)
 return;
 try {
 await window.llamaDesktop.abortChat();
 }
 catch {
 // Ignore abort errors
 }
 setChatBusy(false);
 setStreamRequestId('');
 }, [state.chatBusy, setChatBusy, setStreamRequestId]);
 const retryMessage = useCallback(async (index: number) => {
 if (state.chatBusy)
 return;
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
 const truncatedMessages = state.chatMessages.slice(0, index);
 const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
 const allMessages = [...truncatedMessages, assistantMessage];
 setChatMessages(truncatedMessages);
 addChatMessage(assistantMessage);
 setStreamRequestId(requestId);
 setChatBusy(true);
 try {
   const startedAt = performance.now();
   const result = await window.llamaDesktop.streamChat({
     requestId,
     config: state.config,
     messages: allMessages.slice(0, -1),
   });
   const latencyMs = Math.round(performance.now() - startedAt);
   const usage = result.raw?.usage;
   const completionTokens = usage?.completion_tokens || '';
   const totalTokens = usage?.total_tokens || '';
   const displayTokens = totalTokens || completionTokens || '';
   const speedTokens = completionTokens || totalTokens || '';
   const speed = speedTokens && latencyMs
     ? `${(Number(speedTokens) / (latencyMs / 1000)).toFixed(2)} t/s`
     : '';
   const lastIndex = allMessages.length;
   const estimatedTokens = estimateTokens(result.content || '');
   updateChatMessage(lastIndex - 1, {
     content: result.content || allMessages[lastIndex - 1]?.content || `基于"${userMessage.content}"重试后，模型返回了空内容。`,
     tokens: displayTokens || estimatedTokens,
     estimatedTokens,
     latencyMs,
     speed: speed || (displayTokens ? `${(Number(displayTokens) / (latencyMs / 1000)).toFixed(2)} t/s` : ''),
     streaming: false,
   });
 saveCurrentSession();
 }
 catch (error) {
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
 const copyMessage = useCallback((index: number) => {
 const message = state.chatMessages[index];
 if (message) {
 navigator.clipboard.writeText(message.content || '');
 setToast('已复制');
 }
 }, [state.chatMessages, setToast]);
 const editMessage = useCallback((index: number) => {
 const message = state.chatMessages[index];
 if (message && message.role === 'user') {
 updateChatInput(message.content || '');
 }
 }, [state.chatMessages, updateChatInput]);
 const deleteMessage = useCallback((index: number) => {
 setChatMessages(state.chatMessages.filter((_, i) => i !== index));
 saveCurrentSession();
 }, [state.chatMessages, setChatMessages, saveCurrentSession]);
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
 if (fieldName === 'llama_bin_dir') {
 updateConfig('llama_server_path' as any, `${selected.replace(/[\\/]+$/, '')}\\llama-server.exe`);
 }
 }
 }, [updateConfig]);
 const deleteSession = useCallback((sessionId: string) => {
 setChatMessages([]);
 const updatedSessions = state.sessions.filter(s => s.id !== sessionId);
 localStorage.setItem('llama.cpp.desktop.sessions', JSON.stringify(updatedSessions));
 }, [state.sessions, setChatMessages]);
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

 useEffect(() => {
 streamRequestIdRef.current = state.streamRequestId
 chatMessagesRef.current = state.chatMessages
 })

 useEffect(() => {
 const handleEvent = (payload: any) => {
 if (payload.type === 'status') {
 patchFromBackend({ status: payload.status });
 }
 else if (payload.type === 'logs') {
 patchFromBackend({ logs: payload.logs });
 }
 else if (payload.type === 'chat-stream') {
 const currentRequestId = streamRequestIdRef.current
 if (payload.requestId !== currentRequestId)
 return;
 const messages = chatMessagesRef.current
 const lastIndex = messages.length - 1;
 if (lastIndex < 0) return;
 if (payload.delta) {
 updateChatMessage(lastIndex, prev => ({
 content: `${prev.content || ''}${payload.delta}`,
 }));
 }
 if (payload.done) {
 updateChatMessage(lastIndex, prev => {
 const doneContent = payload.content || prev.content || '模型返回了空内容。'
 const doneTokens = Number(prev.tokens) || estimateTokens(doneContent)
 const doneStartedAt = prev.startedAt || prev.createdAt || Date.now()
 const doneLatencyMs = Date.now() - doneStartedAt
 let doneSpeed = ''
 if (doneTokens > 0 && doneLatencyMs > 0) {
 doneSpeed = `${(doneTokens / (doneLatencyMs / 1000)).toFixed(2)} t/s`
 } else if (doneTokens > 0) {
 doneSpeed = '> 1000 t/s'
 }
 return {
 content: doneContent,
 tokens: doneTokens,
 estimatedTokens: doneTokens,
 latencyMs: doneLatencyMs,
 speed: doneSpeed,
 streaming: false,
 }
 });
 setStreamRequestId('');
 saveCurrentSession();
 }
 }
 };
 const cleanup = window.llamaDesktop?.onEvent?.(handleEvent);
 return cleanup;
 }, [patchFromBackend, updateChatMessage, setStreamRequestId, saveCurrentSession]);
 return (<>
 <div className="drag-region">
 <button type="button" className="sidebar-toggle" data-action="toggle-sidebar" title={state.sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'} onClick={() => setSidebarCollapsed(!state.sidebarCollapsed)}>
 {state.sidebarCollapsed ? '›' : '‹'}
 </button>
 </div>
 <div className={`app-shell ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
 <Sidebar sessions={state.sessions} currentSessionId={state.currentSessionId} historySearch={state.historySearch} historyMenuId={state.historyMenuId} sidebarCollapsed={state.sidebarCollapsed} view={state.view} chatMessages={state.chatMessages} status={state.status} darkMode={state.darkMode} settingsOpen={state.settingsOpen} onNewChat={startFreshSession} onFocusChat={() => setView('chat')} onShowTerminal={() => setView('terminal')} onSearchChange={setHistorySearch} onOpenSession={openSession} onToggleHistoryMenu={(id) => setHistoryMenuId(state.historyMenuId === id ? '' : id)} onEditSession={() => { }} onExportSession={() => { }} onDeleteSession={deleteSession} onToggleTheme={() => setDarkMode(!state.darkMode)} onToggleSettings={() => setSettingsOpen(!state.settingsOpen)} onToggleSidebar={() => setSidebarCollapsed(!state.sidebarCollapsed)}/>
 
 <main className="main-area">
{state.view === 'terminal' ? (<TerminalPanel logs={state.logs} onReturnChat={() => setView('chat')}/>) : (<ChatScreen chatMessages={state.chatMessages} chatInput={state.chatInput} attachments={state.attachments} chatBusy={state.chatBusy} config={state.config} onInputChange={updateChatInput} onSend={sendChat} onAbort={abortChat} onPickAttachment={pickAttachment} onRemoveAttachment={removeAttachment} onOpenModelInfo={openModelInfo} onCopyMessage={copyMessage} onEditMessage={editMessage} onRetryMessage={retryMessage} onDeleteMessage={deleteMessage}/>)}
<ServiceBar status={state.status} busy={state.busy} dirty={state.dirty} onSave={save} onHealth={health} onStart={start} onStop={stop}/>
</main>
 
 <SettingsPanel settingsOpen={state.settingsOpen} active={state.active} config={state.config} validation={state.validation} status={state.status} logs={state.logs} dirty={state.dirty} launch={state.launch} onClose={() => setSettingsOpen(false)} onSelectSection={setActive} onUpdateConfig={updateConfig} onPickFile={pickFile} onCopyLaunchCommand={() => { const preview = (state.launch as Record<string, string>).preview; if (preview) { navigator.clipboard.writeText(preview); setToast('命令已复制'); } }}/>
 
 <ModelInfoModal modelInfoOpen={state.modelInfoOpen} modelInfo={state.modelInfo} onClose={() => setModelInfoOpen(false)}/>
 
 <Toast message={state.toast}/>
 {state.view === 'chat' && <ChatNav chatMessages={state.chatMessages} />}
 </div>
 </>);
}
export default App;
