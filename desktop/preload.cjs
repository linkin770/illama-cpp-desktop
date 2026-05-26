const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('llamaDesktop', {
  getState: () => ipcRenderer.invoke('llama:get-state'),
  setTheme: isDark => ipcRenderer.invoke('llama:set-theme', isDark),
  saveConfig: payload => ipcRenderer.invoke('llama:save-config', payload),
  startServer: payload => ipcRenderer.invoke('llama:start-server', payload),
  stopServer: () => ipcRenderer.invoke('llama:stop-server'),
  testHealth: payload => ipcRenderer.invoke('llama:test-health', payload),
  chatCompletion: payload => ipcRenderer.invoke('llama:chat-completion', payload),
  streamChat: payload => ipcRenderer.invoke('llama:chat-stream', payload),
  abortChat: () => ipcRenderer.invoke('llama:chat-abort'),
  getModelInfo: payload => ipcRenderer.invoke('llama:get-model-info', payload),
  pickFile: options => ipcRenderer.invoke('llama:pick-file', options),
  pickAttachments: payload => ipcRenderer.invoke('llama:pick-attachments', payload),
  saveFile: payload => ipcRenderer.invoke('llama:save-file', payload),
  listSkills: () => ipcRenderer.invoke("llama:skill-list"),
  createSkill: payload => ipcRenderer.invoke("llama:skill-create", payload),
  generateSkillContent: payload => ipcRenderer.invoke("llama:skill-generate", payload),
  readSkill: payload => ipcRenderer.invoke("llama:skill-read", payload),
  deleteSkill: payload => ipcRenderer.invoke("llama:skill-delete", payload),
  closeWindow: () => ipcRenderer.send('llama:window-close'),
  minimizeWindow: () => ipcRenderer.send('llama:window-minimize'),
  maximizeWindow: () => ipcRenderer.send('llama:window-maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('llama:window-is-maximized'),
  onEvent: callback => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('llama:event', handler)
    return () => ipcRenderer.removeListener('llama:event', handler)
  },
})
