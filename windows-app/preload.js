// Preload Script - Bridge between Main and Renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  addInvoice: (invoice) => ipcRenderer.invoke('db:add-invoice', invoice),
  getInvoices: () => ipcRenderer.invoke('db:get-invoices'),
  deleteInvoice: (id) => ipcRenderer.invoke('db:delete-invoice', id),

  // Theme toggle (fire-and-forget, no return value needed)
  toggleTheme: () => ipcRenderer.send('theme:toggle'),
});