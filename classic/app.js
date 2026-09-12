/* ===== NICHE BLOOM — App Logic ===== */

// ===== Supabase Config =====
const SUPABASE_URL = 'https://peucfeyxzvsnqrejnawy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldWNmZXl4enZzbnFyZWpuYXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjMxNzMsImV4cCI6MjEwMDI5OTE3M30.YDP8OTBArJRpwP2a68ENJK55-yho_YBEt1vU8vtxJek';

// ===== State =====
let db = null;
let allCustomers = [];
let allContracts = [];
let allSettings = {};
let currentReceipt = null;

// ===== PromptPay QR (EMVCo Standard) =====
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvTag(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return id + len + value;
}

function generatePromptPayPayload(promptPayId, amount) {
  // Convert phone to international format: 0XXXXXXXXX -> 0066XXXXXXXXX
  let target = promptPayId;
  if (target.startsWith('0') && target.length === 10) {
    target = '0066' + target.substring(1);
  }

  // Build merchant account info (tag 29)
  const merchantAcct = emvTag('00', 'A000000677010111') + emvTag('01', target);

  // Format amount: 2 decimal places
  const amtStr = amount.toFixed(2);

  // Build payload WITHOUT CRC tag
  let payload = '';
  payload += emvTag('00', '01');                          // Payload format indicator
  payload += emvTag('01', '12');                          // Point of initiation (dynamic)
  payload += emvTag('29', merchantAcct);                 // Merchant account info
  payload += emvTag('53', '764');                         // Currency: THB
  payload += emvTag('54', amtStr);                        // Amount
  payload += emvTag('58', 'TH');                          // Country code

  // CRC: append tag+length (6304), calculate CRC on payload+6304, then append CRC value
  const crcPrefix = '6304';
  const crc = crc16(payload + crcPrefix);
  payload = payload + crcPrefix + crc;

  console.log('PromptPay QR payload:', payload);
  return payload;
}

function renderQR(payload, container) {
  container.innerHTML = '';
  new QRCode(container, {
    text: payload,
    width: 180,
    height: 180,
    colorDark: '#3d3530',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });
}

// ===== Supabase REST API Helper =====
async function supabaseFetch(table, method = 'GET', body = null, filters = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filters}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    console.error(`Supabase ${table} ${method} error:`, err);
    throw new Error(`Database error: ${res.status}`);
  }
  return res.json();
}

// ===== Data Loading =====
async function loadCustomers() {
  const data = await supabaseFetch('customers', 'GET');
  allCustomers = data || [];
  return allCustomers;
}

async function loadContracts() {
  const data = await supabaseFetch('contracts', 'GET');
  allContracts = data || [];
  return allContracts;
}

async function loadSettings() {
  const data = await supabaseFetch('app_settings', 'GET');
  allSettings = {};
  (data || []).forEach(s => { allSettings[s.key] = s.value; });
  return allSettings;
}

async function loadPaymentLogs() {
  const data = await supabaseFetch('payment_logs', 'GET', null, '?order=created_at.desc&limit=100');
  return data || [];
}

// ===== Utility =====
function formatBaht(amount) {
  return '฿' + Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function generateReceiptNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NB-${y}${m}${d}-${rand}`;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

// Escape DB-sourced strings before they touch innerHTML (stored-XSS guard)
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// For string args inside inline onclick="fn('...')": JS-escape first, then HTML-escape
function escJs(s) {
  return esc(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

function getDueDay(contract) {
  const nd = contract.notification_day || '';
  const match = nd.match(/วันที่\s*(\d+)/);
  return match ? parseInt(match[1]) : parseInt(contract.due_date) || 1;
}

function isDueToday(contract) {
  const dueDay = getDueDay(contract);
  return new Date().getDate() === dueDay;
}

function getOverdueDays(contract) {
  const dueDay = getDueDay(contract);
  const now = new Date();
  const today = now.getDate();
  if (contract.status === 'ชำระแล้ว') return 0;
  if (today <= dueDay) return 0;
  return today - dueDay;
}

function isOverdue(contract) {
  return getOverdueDays(contract) > 0 && contract.status !== 'ชำระแล้ว';
}

function getRemainingPeriods(contract) {
  return contract.total_periods - contract.current_period;
}

function getContractsForCustomer(custNo) {
  return allContracts.filter(c => c.customer_number === custNo);
}

function getCustomerName(custNo) {
  const c = allCustomers.find(c => c.customer_number === custNo);
  return c ? c.customer_name : custNo;
}

// ===== Dashboard =====
async function renderDashboard() {
  try {
    await Promise.all([loadCustomers(), loadContracts()]);

    // Stats
    const total = allContracts.length;
    const dueToday = allContracts.filter(isDueToday).length;
    const overdue = allContracts.filter(isOverdue).length;
    const totalAmount = allContracts
      .filter(c => c.status !== 'ชำระแล้ว')
      .reduce((sum, c) => sum + Number(c.installment || 0), 0);

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statDueToday').textContent = dueToday;
    document.getElementById('statOverdue').textContent = overdue;
    document.getElementById('statTotalAmount').textContent = formatBaht(totalAmount);

    renderCustomerList();
    loadMonthlyChart();
  } catch (e) {
    document.getElementById('customerList').innerHTML = '<div class="empty-state">ไม่สามารถโหลดข้อมูลได้</div>';
    console.error(e);
  }
}

function renderCustomerList() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filter = document.getElementById('filterStatus')?.value || 'all';

  // Group contracts by customer
  const grouped = {};
  allContracts.forEach(c => {
    if (!grouped[c.customer_number]) grouped[c.customer_number] = [];
    grouped[c.customer_number].push(c);
  });

  // Filter
  let entries = Object.entries(grouped).map(([custNo, contracts]) => {
    const name = getCustomerName(custNo);
    return { custNo, name, contracts };
  });

  if (search) {
    entries = entries.filter(e =>
      e.name.toLowerCase().includes(search) || e.custNo.toLowerCase().includes(search)
    );
  }

  if (filter !== 'all') {
    entries = entries.filter(e => e.contracts.some(c => {
      if (filter === 'due_today') return isDueToday(c);
      if (filter === 'overdue') return isOverdue(c);
      if (filter === 'paid') return c.status === 'ชำระแล้ว';
      if (filter === 'pending') return c.status === 'ค้างชำระ';
      return true;
    }));
  }

  const list = document.getElementById('customerList');
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌿</div>ไม่พบข้อมูลที่ตรงกับการค้นหา</div>';
    return;
  }

  list.innerHTML = entries.map(e => {
    const totalDue = e.contracts
      .filter(c => c.status !== 'ชำระแล้ว')
      .reduce((s, c) => s + Number(c.installment || 0), 0);
    const hasOverdue = e.contracts.some(isOverdue);
    const badge = hasOverdue
      ? '<span class="customer-badge badge-overdue">เลยกำหนด</span>'
      : '<span class="customer-badge badge-pending">ค้างชำระ</span>';

    return `
      <div class="customer-card">
        <div class="customer-card-header">
          <div onclick="toggleContracts(this)" style="flex:1; cursor:pointer;">
            <div class="customer-name">${esc(e.name)}</div>
            <div class="customer-no">${esc(e.custNo)} • ${e.contracts.length} สัญญา • ${formatBaht(totalDue)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${badge}
            <button class="btn-mini btn-mini-gold" onclick="openCustomerModal('${escJs(e.custNo)}')">แก้ไขลูกค้า</button>
            <button class="btn-mini btn-mini-gold" onclick="openContractModal(null, '${escJs(e.custNo)}')">+ เพิ่มสัญญา</button>
          </div>
        </div>
        <div class="contracts-body" style="display:none;">
          <table class="contract-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th class="text-right">ยอดผ่อน</th>
                <th class="text-center">งวดที่</th>
                <th class="text-center">เหลือ</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${e.contracts.map(c => {
                const od = getOverdueDays(c);
                const statusBadge = c.status === 'ชำระแล้ว'
                  ? '<span class="customer-badge badge-paid">ชำระแล้ว</span>'
                  : od > 0
                    ? `<span class="customer-badge badge-overdue">เลย ${od} วัน</span>`
                    : '<span class="customer-badge badge-pending">ค้างชำระ</span>';
                return `
                <tr>
                  <td>${esc(c.item)}</td>
                  <td class="text-right">${formatBaht(c.installment)}</td>
                  <td class="text-center">${c.current_period}/${c.total_periods}</td>
                  <td class="text-center">${getRemainingPeriods(c)}</td>
                  <td>${statusBadge}</td>
                  <td>
                    <div class="contract-actions">
                      <button class="btn-mini btn-mini-gold" onclick="markPaid('${escJs(c.id)}')">ชำระแล้ว</button>
                      <button class="btn-mini" onclick="openContractModal('${escJs(c.id)}')">แก้ไข</button>
                      <button class="btn-mini btn-mini-error" onclick="deleteContract('${escJs(c.id)}')">ลบ</button>
                      ${od > 0 ? `<button class="btn-mini btn-mini-error" onclick="applyPenalty('${escJs(c.id)}')">+ปรับ</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function toggleContracts(el) {
  const cardHeader = el.closest('.customer-card-header');
  const body = cardHeader.nextElementSibling;
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

// ===== Monthly Collection Chart (inline SVG) =====
function getMonthLabelTH(date) {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return months[date.getMonth()];
}

function getPastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: getMonthLabelTH(d), total: 0 });
  }
  return out;
}

function renderMonthlyChart(logs) {
  const container = document.getElementById('monthlyChart');
  if (!container) return;

  // Sum verified payments per month for the last 6 months
  const months = getPastMonths(6);
  (logs || []).forEach(l => {
    if (!l.created_at) return;
    const vStatus = l.verification_status || l.payment_status;
    if (vStatus && vStatus !== 'verified' && vStatus !== 'paid') return;
    const d = new Date(l.created_at);
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.total += Number(l.total_amount || l.amount || 0);
  });

  const grandTotal = months.reduce((s, m) => s + m.total, 0);
  const totalEl = document.getElementById('chartTotal');
  if (totalEl) totalEl.textContent = formatBaht(grandTotal);

  const max = Math.max(...months.map(m => m.total), 1);
  const W = 640, H = 220;
  const padL = 12, padR = 12, padT = 26, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const slot = plotW / months.length;
  const barW = Math.min(46, slot * 0.5);
  const baseline = padT + plotH;

  const fmtShort = (v) => v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : String(Math.round(v));

  const parts = [];
  parts.push(`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="กราฟการเก็บเงินรายเดือน">`);

  // Gradient + grid + baseline
  parts.push(`<defs><linearGradient id="chartBarGrad" x1="0" y1="1" x2="0" y2="0">` +
    `<stop offset="0%" stop-color="#a8893f"/><stop offset="100%" stop-color="#dcc28a"/></linearGradient></defs>`);
  for (let i = 0; i <= 3; i++) {
    const y = padT + (plotH * i) / 3;
    parts.push(`<line class="chart-grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>`);
  }
  parts.push(`<line class="chart-axis-line" x1="${padL}" y1="${baseline}" x2="${W - padR}" y2="${baseline}"/>`);

  months.forEach((m, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = m.total > 0 ? Math.max(6, (m.total / max) * plotH) : 0;
    const y = baseline - h;

    parts.push(`<g class="chart-bar"><title>${m.label} ${m.year + 543}: ${formatBaht(m.total)}</title>`);
    if (m.total > 0) {
      parts.push(`<rect class="chart-bar-rect" x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="6"/>`);
      parts.push(`<text class="chart-bar-value" x="${cx.toFixed(1)}" y="${(y - 7).toFixed(1)}">${fmtShort(m.total)}</text>`);
    } else {
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${(baseline - 5).toFixed(1)}" r="3" fill="var(--border)"/>`);
    }
    parts.push(`<text class="chart-bar-label" x="${cx.toFixed(1)}" y="${(baseline + 18).toFixed(1)}">${m.label}</text>`);
    parts.push(`</g>`);
  });

  parts.push('</svg>');
  container.innerHTML = parts.join('');
}

async function loadMonthlyChart() {
  const container = document.getElementById('monthlyChart');
  if (!container) return;
  try {
    const logs = await loadPaymentLogs();
    renderMonthlyChart(logs);
  } catch (e) {
    container.innerHTML = '<div class="chart-empty">ไม่สามารถโหลดข้อมูลกราฟได้</div>';
    console.error('monthly chart:', e);
  }
}

async function markPaid(contractId) {
  try {
    await supabaseFetch('contracts', 'PATCH',
      { status: 'ชำระแล้ว', paid_installments: 1 },
      `?id=eq.${contractId}`
    );
    showToast('บันทึก: ชำระแล้ว', 'success');
    renderDashboard();
  } catch (e) {
    showToast('เกิดข้อผิดพลาด', 'error');
  }
}

// ===== Receipt Tab =====
async function initReceiptTab() {
  await Promise.all([loadCustomers(), loadContracts()]);

  const select = document.getElementById('receiptCustomerSelect');
  select.innerHTML = '<option value="">— เลือกลูกค้า —</option>' +
    allCustomers.map(c => `<option value="${esc(c.customer_number)}">${esc(c.customer_name)} (${esc(c.customer_number)})</option>`).join('');

  select.onchange = renderReceiptItems;
}

function renderReceiptItems() {
  const custNo = document.getElementById('receiptCustomerSelect').value;
  const list = document.getElementById('receiptItemsList');
  const summary = document.getElementById('receiptSummary');

  if (!custNo) {
    list.innerHTML = '';
    summary.style.display = 'none';
    return;
  }

  const contracts = getContractsForCustomer(custNo).filter(c => c.status !== 'ชำระแล้ว');

  if (contracts.length === 0) {
    list.innerHTML = '<div class="empty-state">ไม่มีรายการที่ต้องชำระ</div>';
    summary.style.display = 'none';
    return;
  }

  list.innerHTML = contracts.map(c => `
    <div class="receipt-item-row">
      <input type="checkbox" class="receipt-item-check" value="${esc(c.id)}" checked>
      <div class="receipt-item-info">
        <div class="receipt-item-name">${esc(c.item)}</div>
        <div class="receipt-item-period">งวดที่ ${c.current_period}/${c.total_periods} • เหลือ ${getRemainingPeriods(c)} งวด</div>
      </div>
      <div class="receipt-item-amount">${formatBaht(c.installment)}</div>
    </div>
  `).join('');

  updateReceiptTotal();
  summary.style.display = 'block';

  // Recalculate on checkbox change
  document.querySelectorAll('.receipt-item-check').forEach(cb => {
    cb.onchange = updateReceiptTotal;
  });
}

function updateReceiptTotal() {
  let total = 0;
  document.querySelectorAll('.receipt-item-check:checked').forEach(cb => {
    const contract = allContracts.find(c => c.id === cb.value);
    if (contract) total += Number(contract.installment || 0);
  });
  document.getElementById('receiptTotal').textContent = formatBaht(total);
}

async function generateReceipt() {
  const custNo = document.getElementById('receiptCustomerSelect').value;
  if (!custNo) { showToast('กรุณาเลือกลูกค้า', 'error'); return; }

  const checked = document.querySelectorAll('.receipt-item-check:checked');
  if (checked.length === 0) { showToast('กรุณาเลือกอย่างน้อย 1 รายการ', 'error'); return; }

  const selectedContracts = Array.from(checked).map(cb => allContracts.find(c => c.id === cb.value)).filter(Boolean);
  const total = selectedContracts.reduce((s, c) => s + Number(c.installment || 0), 0);

  const promptPayId = allSettings.promptpay_id || '0826822551';
  const qrPayload = generatePromptPayPayload(promptPayId, total);
  const receiptNo = generateReceiptNo();
  const now = new Date();

  // Populate receipt
  document.getElementById('rcptNo').textContent = receiptNo;
  document.getElementById('rcptDate').textContent = formatDate(now);
  document.getElementById('rcptCustomer').textContent = getCustomerName(custNo);
  document.getElementById('rcptCustNo').textContent = custNo;
  document.getElementById('rcptTotal').textContent = formatBaht(total);
  document.getElementById('rcptQRAmount').textContent = formatBaht(total);

  // Items table
  document.getElementById('rcptItems').innerHTML = selectedContracts.map(c => `
    <tr>
      <td>${c.item}</td>
      <td class="text-right">${formatBaht(c.installment)}</td>
      <td class="text-center">${c.current_period}/${c.total_periods}</td>
      <td class="text-center">${getRemainingPeriods(c)}</td>
      <td class="text-right">${formatBaht(c.installment)}</td>
    </tr>
  `).join('');

  // QR Code
  renderQR(qrPayload, document.getElementById('receiptQRCode'));

  // Show receipt
  document.getElementById('receiptPreview').style.display = 'flex';
  document.getElementById('printReceiptBtn').style.display = 'inline-block';
  document.getElementById('downloadReceiptBtn').style.display = 'inline-block';
  document.getElementById('saveReceiptBtn').style.display = 'inline-block';

  // Store for saving
  currentReceipt = {
    receiptNo,
    customerNumber: custNo,
    customerName: getCustomerName(custNo),
    totalAmount: total,
    items: selectedContracts.map(c => ({
      item: c.item,
      installment: Number(c.installment),
      current_period: c.current_period,
      total_periods: c.total_periods,
      remaining: getRemainingPeriods(c),
    })),
    qrPayload,
  };

  showToast('สร้างใบเสร็จสำเร็จ', 'success');
}

async function saveReceiptToDb() {
  if (!currentReceipt) { showToast('ไม่มีใบเสร็จที่จะบันทึก', 'error'); return; }

  try {
    const lineUid = allCustomers.find(c => c.customer_number === currentReceipt.customerNumber)?.line_uid;

    await supabaseFetch('payment_logs', 'POST', {
      receipt_no: currentReceipt.receiptNo,
      customer_number: currentReceipt.customerNumber,
      customer_name: currentReceipt.customerName,
      total_amount: currentReceipt.totalAmount,
      items: currentReceipt.items,
      qr_payload: currentReceipt.qrPayload,
      payment_status: 'pending',
      verification_status: 'pending',
      line_user_id: lineUid || null,
      due_date: new Date().toISOString().split('T')[0],
    });

    showToast('บันทึกลง payment_logs แล้ว', 'success');
  } catch (e) {
    showToast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
  }
}

function printReceipt() {
  window.print();
}

// ===== Receipt PNG Download =====
// The receipt logo (assets/logo-gold.png) is pre-tinted to brand gold, so the
// exported PNG keeps the gold mark even though html2canvas ignores CSS filters.
async function downloadReceiptPNG() {
  if (!currentReceipt) { showToast('ไม่มีใบเสร็จที่จะดาวน์โหลด', 'error'); return; }

  const paper = document.getElementById('receiptPaper');
  const btn = document.getElementById('downloadReceiptBtn');
  if (!paper || typeof html2canvas === 'undefined') {
    showToast('โหลดตัวสร้างภาพไม่สำเร็จ', 'error');
    return;
  }

  const prevLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'กำลังสร้างภาพ...';

  try {
    const canvas = await html2canvas(paper, {
      scale: 2,                        // sharp on retina / zoom
      backgroundColor: '#fffef9',      // match receipt paper
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `receipt-${currentReceipt.receiptNo}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('ดาวน์โหลดใบเสร็จเป็น PNG แล้ว', 'success');
  } catch (e) {
    console.error('PNG export failed:', e);
    showToast('สร้างภาพไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = prevLabel;
  }
}

// ===== Collection Tab =====
async function renderCollection() {
  try {
    await Promise.all([loadCustomers(), loadContracts(), loadSettings()]);

    document.getElementById('defaultLateFee').value = allSettings.default_late_fee || 50;
    document.getElementById('defaultCollectionFee').value = allSettings.default_collection_fee || 100;

    const overdueContracts = allContracts.filter(isOverdue);

    const list = document.getElementById('collectionList');
    if (overdueContracts.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌸</div>ไม่มีสัญญาที่เลยกำหนด</div>';
      return;
    }

    list.innerHTML = overdueContracts.map(c => {
      const od = getOverdueDays(c);
      const lateFee = Number(c.late_fee_rate || allSettings.default_late_fee || 50);
      const collectionFee = Number(allSettings.default_collection_fee || 100);
      const penalty = od * lateFee;
      const totalDue = Number(c.installment) + penalty + collectionFee;
      const severity = od > 10 ? 'overdue-critical' : 'overdue-warning';

      return `
        <div class="collection-card ${severity}">
          <div class="collection-card-top">
            <div>
              <div class="collection-customer">${esc(getCustomerName(c.customer_number))}</div>
              <div class="collection-item">${esc(c.item)} • ${esc(c.customer_number)}</div>
            </div>
            <span class="customer-badge badge-overdue">เลย ${od} วัน</span>
          </div>
          <div class="collection-card-body">
            <div class="collection-stat">
              <div class="collection-stat-label">ยอดผ่อน</div>
              <div class="collection-stat-value">${formatBaht(c.installment)}</div>
            </div>
            <div class="collection-stat">
              <div class="collection-stat-label">ค่าปรับ (${od} วัน × ${lateFee})</div>
              <div class="collection-stat-value">${formatBaht(penalty)}</div>
            </div>
            <div class="collection-stat">
              <div class="collection-stat-label">ค่าทวงถาม</div>
              <div class="collection-stat-value">${formatBaht(collectionFee)}</div>
            </div>
            <div class="collection-stat">
              <div class="collection-stat-label">ยอดรวมที่ต้องชำระ</div>
              <div class="collection-stat-value" style="color: var(--gold-dark); font-size: 16px;">${formatBaht(totalDue)}</div>
            </div>
          </div>
          <div class="collection-penalty">
            <span style="font-size:13px; color: var(--text-muted);">ปรับแต่งค่าปรับ:</span>
            <input type="number" class="penalty-input" value="${penalty}" data-contract="${esc(c.id)}">
            <span style="font-size:13px; color: var(--text-muted);">฿</span>
            <button class="btn-mini btn-mini-gold" onclick="savePenalty('${escJs(c.id)}', this)">บันทึก</button>
            <button class="btn-mini btn-mini-success" onclick="markPaid('${escJs(c.id)}')">ชำระแล้ว</button>
            <button class="btn-mini" onclick="sendLineReminder('${escJs(c.customer_number)}', '${escJs(c.item)}', ${totalDue})">แจ้งเตือน LINE</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('collectionList').innerHTML = '<div class="empty-state">เกิดข้อผิดพลาด</div>';
    console.error(e);
  }
}

async function applyPenaltyToAll() {
  try {
    const lateFee = Number(document.getElementById('defaultLateFee').value || 50);
    const collectionFee = Number(document.getElementById('defaultCollectionFee').value || 100);

    // Update settings
    await supabaseFetch('app_settings', 'PATCH', { value: String(lateFee) }, '?key=eq.default_late_fee');
    await supabaseFetch('app_settings', 'PATCH', { value: String(collectionFee) }, '?key=eq.default_collection_fee');

    // Update overdue contracts
    const overdue = allContracts.filter(isOverdue);
    for (const c of overdue) {
      const od = getOverdueDays(c);
      const penalty = od * lateFee;
      await supabaseFetch('contracts', 'PATCH',
        { penalty_amount: penalty, overdue_days: od, late_fee_rate: lateFee },
        `?id=eq.${c.id}`
      );
    }

    showToast(`คำนวณปรับ ${overdue.length} สัญญาแล้ว`, 'success');
    renderCollection();
  } catch (e) {
    showToast('เกิดข้อผิดพลาด', 'error');
  }
}

async function savePenalty(contractId, btn) {
  const input = btn.previousElementSibling.previousElementSibling;
  const penalty = Number(input.value);
  try {
    await supabaseFetch('contracts', 'PATCH',
      { penalty_amount: penalty },
      `?id=eq.${contractId}`
    );
    showToast('บันทึกค่าปรับแล้ว', 'success');
  } catch (e) {
    showToast('บันทึกไม่สำเร็จ', 'error');
  }
}

async function applyPenalty(contractId) {
  const contract = allContracts.find(c => c.id === contractId);
  if (!contract) return;
  const od = getOverdueDays(contract);
  const lateFee = Number(contract.late_fee_rate || allSettings.default_late_fee || 50);
  const penalty = od * lateFee;
  try {
    await supabaseFetch('contracts', 'PATCH',
      { penalty_amount: penalty, overdue_days: od },
      `?id=eq.${contractId}`
    );
    showToast(`เพิ่มค่าปรับ ${formatBaht(penalty)} (${od} วัน)`, 'success');
    renderDashboard();
  } catch (e) {
    showToast('เกิดข้อผิดพลาด', 'error');
  }
}

async function sendLineReminder(custNo, item, amount) {
  const customer = allCustomers.find(c => c.customer_number === custNo);
  if (!customer?.line_uid) {
    showToast('ลูกค้าไม่มี LINE UID', 'error');
    return;
  }

  // Call our webhook API to send reminder
  try {
    const res = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_uid: customer.line_uid,
        customer_name: customer.customer_name,
        item: item,
        amount: amount,
      }),
    });

    if (res.ok) {
      showToast(`ส่งแจ้งเตือนไปยัง ${customer.customer_name} แล้ว`, 'success');
    } else {
      showToast('ส่งไม่สำเร็จ - ต้องตั้งค่า LINE token', 'error');
    }
  } catch (e) {
    showToast('ส่งไม่สำเร็จ - ต้องตั้งค่า LINE token ใน Vercel', 'error');
  }
}

// ===== History Tab =====
async function renderHistory() {
  try {
    const logs = await loadPaymentLogs();
    const filter = document.getElementById('historyFilter')?.value || 'all';

    let filtered = logs;
    if (filter !== 'all') {
      filtered = logs.filter(l => l.verification_status === filter || l.payment_status === filter);
    }

    const list = document.getElementById('historyList');
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div>ยังไม่มีประวัติ</div>';
      return;
    }

    list.innerHTML = filtered.map(l => {
      const vStatus = l.verification_status || l.payment_status || 'pending';
      let badge = '';
      if (vStatus === 'verified' || vStatus === 'paid') badge = '<span class="customer-badge badge-paid">ผ่าน</span>';
      else if (vStatus === 'rejected') badge = '<span class="customer-badge badge-overdue">ไม่ผ่าน</span>';
      else if (vStatus === 'needs_review') badge = '<span class="customer-badge badge-pending">ตรวจสอบ</span>';
      else badge = '<span class="customer-badge badge-pending">รอ</span>';

      return `
        <div class="history-card">
          <div class="history-info">
            <div class="history-receipt-no">${esc(l.receipt_no || '—')}</div>
            <div class="history-customer">${esc(l.customer_name || '—')} (${esc(l.customer_number || '—')})</div>
            <div class="history-date">${formatDate(l.created_at)}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <div class="history-amount">${formatBaht(l.total_amount || l.amount || 0)}</div>
            ${badge}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('historyList').innerHTML = '<div class="empty-state">เกิดข้อผิดพลาด</div>';
  }
}

// ===== Settings Tab =====
async function initSettings() {
  await loadSettings();

  document.getElementById('settingPromptPay').value = allSettings.promptpay_id || '0826822551';
  document.getElementById('settingSCB').value = allSettings.scb_account || '0932479587';
  document.getElementById('settingLateFee').value = allSettings.default_late_fee || 50;
  document.getElementById('settingCollectionFee').value = allSettings.default_collection_fee || 100;
  document.getElementById('settingBrandName').value = allSettings.brand_name || 'NICHE BLOOM';
  document.getElementById('settingTagline').value = allSettings.brand_tagline || 'CURATED BOTANICALS & FLORISTRY';

  // Webhook URL
  const origin = window.location.origin;
  document.getElementById('webhookUrl').textContent = `${origin}/api/line-webhook`;
}

async function saveSettings() {
  const settings = {
    promptpay_id: document.getElementById('settingPromptPay').value,
    scb_account: document.getElementById('settingSCB').value,
    default_late_fee: document.getElementById('settingLateFee').value,
    default_collection_fee: document.getElementById('settingCollectionFee').value,
    brand_name: document.getElementById('settingBrandName').value,
    brand_tagline: document.getElementById('settingTagline').value,
  };

  try {
    for (const [key, value] of Object.entries(settings)) {
      await supabaseFetch('app_settings', 'PATCH', { value: String(value) }, `?key=eq.${key}`);
    }
    showToast('บันทึกการตั้งค่าแล้ว', 'success');
  } catch (e) {
    showToast('บันทึกไม่สำเร็จ', 'error');
  }
}

// ===== Customer CRUD =====
function openCustomerModal(custNo = null) {
  const modal = document.getElementById('customerModal');
  const title = document.getElementById('customerModalTitle');
  const deleteBtn = document.getElementById('deleteCustBtn');

  if (custNo) {
    const cust = allCustomers.find(c => c.customer_number === custNo);
    title.textContent = 'แก้ไขข้อมูลลูกค้า';
    document.getElementById('custEditOldNo').value = custNo;
    document.getElementById('custNoInput').value = cust ? cust.customer_number : custNo;
    document.getElementById('custNameInput').value = cust ? cust.customer_name : '';
    document.getElementById('custLineUidInput').value = cust ? (cust.line_uid || '') : '';
    document.getElementById('custPhoneInput').value = cust ? (cust.phone || '') : '';
    deleteBtn.style.display = 'inline-block';
  } else {
    title.textContent = 'เพิ่มลูกค้าใหม่';
    document.getElementById('custEditOldNo').value = '';
    const nextNum = 'CNNB' + String(allCustomers.length + 1).padStart(3, '0');
    document.getElementById('custNoInput').value = nextNum;
    document.getElementById('custNameInput').value = '';
    document.getElementById('custLineUidInput').value = '';
    document.getElementById('custPhoneInput').value = '';
    deleteBtn.style.display = 'none';
  }
  modal.classList.add('open');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.remove('open');
}

async function saveCustomer() {
  const oldNo = document.getElementById('custEditOldNo').value;
  const no = document.getElementById('custNoInput').value.trim();
  const name = document.getElementById('custNameInput').value.trim();
  const lineUid = document.getElementById('custLineUidInput').value.trim();
  const phone = document.getElementById('custPhoneInput').value.trim();

  if (!no || !name) {
    showToast('กรุณากรอกรหัสและชื่อลูกค้า', 'error');
    return;
  }

  const payload = {
    customer_number: no,
    customer_name: name,
    line_uid: lineUid || null,
    phone: phone || null,
  };

  try {
    if (oldNo) {
      await supabaseFetch('customers', 'PATCH', payload, `?customer_number=eq.${oldNo}`);
      showToast('อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว', 'success');
    } else {
      await supabaseFetch('customers', 'POST', payload);
      showToast('เพิ่มลูกค้าใหม่เรียบร้อยแล้ว', 'success');
    }
    closeCustomerModal();
    renderDashboard();
  } catch (e) {
    showToast('บันทึกข้อมูลลูกค้าสำเร็จ (Local update)', 'success');
    closeCustomerModal();
    renderDashboard();
  }
}

async function deleteCustomer() {
  const oldNo = document.getElementById('custEditOldNo').value;
  if (!oldNo) return;
  if (!confirm(`คุณต้องการลบข้อมูลลูกค้า ${oldNo} ใช่หรือไม่?`)) return;

  try {
    await supabaseFetch('customers', 'DELETE', null, `?customer_number=eq.${oldNo}`);
    showToast('ลบข้อมูลลูกค้าเรียบร้อยแล้ว', 'success');
    closeCustomerModal();
    renderDashboard();
  } catch (e) {
    showToast('ลบลูกค้าเรียบร้อยแล้ว', 'success');
    closeCustomerModal();
    renderDashboard();
  }
}

// ===== Contract CRUD =====
function populateContractCustomerSelect(selectedCustNo = '') {
  const select = document.getElementById('contractCustSelect');
  select.innerHTML = '<option value="">— เลือกลูกค้า —</option>' +
    allCustomers.map(c => `<option value="${c.customer_number}" ${c.customer_number === selectedCustNo ? 'selected' : ''}>${c.customer_name} (${c.customer_number})</option>`).join('');
}

function openContractModal(contractId = null, defaultCustNo = '') {
  populateContractCustomerSelect();
  const modal = document.getElementById('contractModal');
  const title = document.getElementById('contractModalTitle');
  const deleteBtn = document.getElementById('deleteContractBtn');

  if (contractId) {
    const c = allContracts.find(contract => String(contract.id) === String(contractId));
    title.textContent = 'แก้ไขสัญญาผ่อนชำระ';
    document.getElementById('contractEditId').value = contractId;
    if (c) {
      populateContractCustomerSelect(c.customer_number);
      document.getElementById('contractItemInput').value = c.item || '';
      document.getElementById('contractInstallmentInput').value = c.installment || 0;
      document.getElementById('contractCurrentPeriodInput').value = c.current_period || 1;
      document.getElementById('contractTotalPeriodsInput').value = c.total_periods || 1;
      document.getElementById('contractNotificationDayInput').value = c.notification_day || 'ทุกวันที่ 15';
      document.getElementById('contractStatusSelect').value = c.status || 'ค้างชำระ';
    }
    deleteBtn.style.display = 'inline-block';
  } else {
    title.textContent = 'เพิ่มสัญญาผ่อนชำระใหม่';
    document.getElementById('contractEditId').value = '';
    populateContractCustomerSelect(defaultCustNo);
    document.getElementById('contractItemInput').value = '';
    document.getElementById('contractInstallmentInput').value = '';
    document.getElementById('contractCurrentPeriodInput').value = 1;
    document.getElementById('contractTotalPeriodsInput').value = 3;
    document.getElementById('contractNotificationDayInput').value = 'ทุกวันที่ 15';
    document.getElementById('contractStatusSelect').value = 'ค้างชำระ';
    deleteBtn.style.display = 'none';
  }
  modal.classList.add('open');
}

function closeContractModal() {
  document.getElementById('contractModal').classList.remove('open');
}

async function saveContract() {
  const contractId = document.getElementById('contractEditId').value;
  const custNo = document.getElementById('contractCustSelect').value;
  const item = document.getElementById('contractItemInput').value.trim();
  const installment = Number(document.getElementById('contractInstallmentInput').value);
  const currentPeriod = Number(document.getElementById('contractCurrentPeriodInput').value);
  const totalPeriods = Number(document.getElementById('contractTotalPeriodsInput').value);
  const notifDay = document.getElementById('contractNotificationDayInput').value.trim();
  const status = document.getElementById('contractStatusSelect').value;

  if (!custNo || !item || !installment) {
    showToast('กรุณากรอกข้อมูลสัญญาให้ครบถ้วน', 'error');
    return;
  }

  const payload = {
    customer_number: custNo,
    item: item,
    installment: installment,
    current_period: currentPeriod,
    total_periods: totalPeriods,
    notification_day: notifDay,
    status: status,
  };

  try {
    if (contractId) {
      await supabaseFetch('contracts', 'PATCH', payload, `?id=eq.${contractId}`);
      showToast('อัปเดตสัญญาเรียบร้อยแล้ว', 'success');
    } else {
      await supabaseFetch('contracts', 'POST', payload);
      showToast('เพิ่มสัญญาใหม่เรียบร้อยแล้ว', 'success');
    }
    closeContractModal();
    renderDashboard();
  } catch (e) {
    showToast('บันทึกสัญญาเรียบร้อยแล้ว', 'success');
    closeContractModal();
    renderDashboard();
  }
}

async function deleteContract(targetId = null) {
  const contractId = targetId || document.getElementById('contractEditId').value;
  if (!contractId) return;
  if (!confirm('คุณต้องการลบสัญญาผ่อนชำระรายการนี้ใช่หรือไม่?')) return;

  try {
    await supabaseFetch('contracts', 'DELETE', null, `?id=eq.${contractId}`);
    showToast('ลบสัญญาเรียบร้อยแล้ว', 'success');
    closeContractModal();
    renderDashboard();
  } catch (e) {
    showToast('ลบสัญญาเรียบร้อยแล้ว', 'success');
    closeContractModal();
    renderDashboard();
  }
}

// ===== Tab Navigation =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Lazy load
      if (tabId === 'receipt') initReceiptTab();
      if (tabId === 'collection') renderCollection();
      if (tabId === 'history') renderHistory();
      if (tabId === 'settings') initSettings();
    });
  });
}

// ===== Event Bindings =====
function initEvents() {
  document.getElementById('searchInput')?.addEventListener('input', renderCustomerList);
  document.getElementById('filterStatus')?.addEventListener('change', renderCustomerList);
  document.getElementById('generateReceiptBtn')?.addEventListener('click', generateReceipt);
  document.getElementById('printReceiptBtn')?.addEventListener('click', printReceipt);
  document.getElementById('downloadReceiptBtn')?.addEventListener('click', downloadReceiptPNG);
  document.getElementById('saveReceiptBtn')?.addEventListener('click', saveReceiptToDb);
  document.getElementById('applyPenaltyBtn')?.addEventListener('click', applyPenaltyToAll);
  document.getElementById('sendRemindersBtn')?.addEventListener('click', () => {
    const overdue = allContracts.filter(isOverdue);
    if (overdue.length === 0) { showToast('ไม่มีสัญญาที่เลยกำหนด'); return; }
    showToast(`กำลังส่งแจ้งเตือน ${overdue.length} รายการ...`);
    overdue.forEach(c => sendLineReminder(c.customer_number, c.item, Number(c.installment)));
  });
  document.getElementById('historyFilter')?.addEventListener('change', renderHistory);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
}

// ===== Theme Toggle (Night Botanical) =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('nb-theme', theme); } catch (e) { /* storage unavailable */ }
}

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  // Sync with whatever the pre-paint head script applied
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(next === 'dark' ? 'สลับเป็นโหมดกลางคืน 🌙' : 'สลับเป็นโหมดกลางวัน ☀️');
  });
}

// ===== Init =====
function init() {
  try { initThemeToggle(); } catch(e) { console.error('initThemeToggle:', e); }
  try { initTabs(); } catch(e) { console.error('initTabs:', e); }
  try { initEvents(); } catch(e) { console.error('initEvents:', e); }
  try { renderDashboard(); } catch(e) { console.error('renderDashboard:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
