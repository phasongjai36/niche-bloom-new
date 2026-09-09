// Electron Main Process - Invoice Maker App
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const Database = require('better-sqlite3');

// Initialize SQLite Database
const db = new Database('local-data.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Handle window creation
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: __dirname + '/preload.js',
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

// Initialize app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle database operations from renderer
ipcMain.handle('db:add-invoice', async (_, invoice) => {
  const stmt = db.prepare('INSERT INTO invoices (invoice_number, customer_name, amount, status) VALUES (?, ?, ?, ?)');
  const result = stmt.run(invoice.invoice_number, invoice.customer_name, invoice.amount, invoice.status || 'unpaid');
  return result.lastID;
});

ipcMain.handle('db:get-invoices', async () => {
  const rows = db.prepare('SELECT * FROM invoices').all();
  return rows;
});

ipcMain.handle('db:delete-invoice', async (_, id) => {
  const stmt = db.prepare('DELETE FROM invoices WHERE id = ?');
  stmt.run(id);
});

// Theme toggle
app.on('browser-window-created', (_, webPreferences) => {
  webPreferences.darkReader = true;
});