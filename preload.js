// Preload Script - Bridge between Main and Renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  addInvoice: (invoice) => ipcRenderer.send('db:add-invoice', invoice),
  getInvoices: () => ipcRenderer.invoke('db:get-invoices'),
  deleteInvoice: (id) => ipcRenderer.send('db:delete-invoice', id),

  // Theme toggle
  toggleTheme: () => ipcRenderer.send('theme:toggle'),
});