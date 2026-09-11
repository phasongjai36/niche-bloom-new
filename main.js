// Electron Main Process - Invoice Maker App
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let db; // Initialized in initDatabase() when app is ready

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'local-data.db');
  db = new Database(dbPath);
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
  console.log(`[db] initialized at ${dbPath}`);
}

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

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit on Windows/Linux when all windows close; macOS keeps app alive
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      try { db.close(); } catch (_) { /* ignore close errors */ }
    }
    app.quit();
  }
});

const ALLOWED_STATUSES = new Set(['unpaid', 'paid', 'overdue', 'cancelled']);

ipcMain.handle('db:add-invoice', async (_, invoice) => {
  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Invoice must be an object');
  }
  const invoiceNumber = String(invoice.invoice_number || '').trim();
  const customerName = String(invoice.customer_name || '').trim();
  // Reject coercion bypass: require a real number (reject null/true/'1' etc.)
  if (typeof invoice.amount !== 'number' || !Number.isFinite(invoice.amount) || invoice.amount < 0) {
    throw new Error('amount must be a finite, non-negative number');
  }
  const amount = invoice.amount;
  const status = String(invoice.status || 'unpaid');

  if (!invoiceNumber) throw new Error('invoice_number is required');
  if (!customerName) throw new Error('customer_name is required');
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`status must be one of: ${[...ALLOWED_STATUSES].join(', ')}`);
  }

  const stmt = db.prepare(
    'INSERT INTO invoices (invoice_number, customer_name, amount, status) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(invoiceNumber, customerName, amount, status);
  return result.lastInsertRowid;
});

ipcMain.handle('db:get-invoices', async () => {
  return db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
});

ipcMain.handle('db:delete-invoice', async (_, id) => {
  // Reject coercion bypass: require a real positive integer (reject true/'1' etc.)
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error('id must be a positive integer');
  }
  const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
  return { deleted: result.changes };
});

// Theme toggle handler (renderer sends 'theme:toggle' via preload bridge)
ipcMain.on('theme:toggle', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
});
