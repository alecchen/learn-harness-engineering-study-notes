const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('harness', {
  openDialog: () => ipcRenderer.invoke('docs:open'),
  openPaths: (paths) => ipcRenderer.invoke('docs:openPaths', paths),
  addText: (payload) => ipcRenderer.invoke('docs:addText', payload),
  removeDoc: (id) => ipcRenderer.invoke('docs:remove', id),
  listDocs: () => ipcRenderer.invoke('docs:list'),
  getDoc: (id) => ipcRenderer.invoke('docs:get', id),
  getStatus: () => ipcRenderer.invoke('qa:status'),
  ask: (payload) => ipcRenderer.invoke('qa:ask', payload),
  stop: (answerId) => ipcRenderer.invoke('qa:stop', answerId),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onDelta: (cb) => ipcRenderer.on('qa:delta', (_e, d) => cb(d)),
  onMenuOpen: (cb) => ipcRenderer.on('menu:open', () => cb()),
});
