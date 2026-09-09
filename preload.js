// Preload Script - Bridge between Main and Renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI, {
  // Database operations
  addInvoice: (invoice) => window.electronAPI.send('db:add-invoice', invoice),
  getInvoices: () => window.electronAPI.invoke('db:get-invoices'),
  deleteInvoice: (id) => window.electronAPI.send('db:delete-invoice', id),

  // Theme toggle
  toggleTheme: () => window.electronAPI.send('theme:toggle'),
});