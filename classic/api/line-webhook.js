// /api/line-webhook.js — LINE OA Webhook Handler
// Receives messages from LINE, detects slip images, verifies and records payments

const crypto = require('crypto');

const SUPABASE_URL = 'https://peucfeyxzvsnqrejnawy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function verifySignature(body, signature, channelSecret) {
  if (!channelSecret) return false;
  const hmac = crypto.createHmac('sha256', channelSecret);
  hmac.update(body);
  const computed = hmac.digest('base64');
  return computed === signature;
}

async function getLineProfile(userId, token) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (e) {
    return { displayName: 'ลูกค้า' };
  }
}

async function replyMessage(replyToken, messages, token) {
  if (!token) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function pushMessage(to, messages, token) {
  if (!token) return;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });
}

async function downloadLineImage(messageId, token) {
  if (!token) return null;
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (e) {
    return null;
  }
}

async function findCustomerByUid(supabaseKey, uid) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?line_uid=eq.${uid}&limit=1`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

async function getPendingContracts(supabaseKey, customerNumber) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contracts?customer_number=eq.${customerNumber}&status=neq.ชำระแล้ว`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );
  return await res.json();
}

async function logSlipToPaymentLogs(supabaseKey, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/payment_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
}

async function updateContractStatus(supabaseKey, contractId, status) {
  await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status }),
  });
}

module.exports = async (req, res) => {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'NICHE BLOOM LINE Webhook' });
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const supabaseKey = SUPABASE_SERVICE_KEY;

  // Verify signature (if secret is set)
  if (channelSecret) {
    const signature = req.headers['x-line-signature'] || '';
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!verifySignature(body, signature, channelSecret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const events = req.body?.events || [];

  for (const event of events) {
    if (event.type === 'follow') {
      // New follower — welcome message
      const userId = event.source?.userId;
      const profile = await getLineProfile(userId, channelToken);
      await replyMessage(event.replyToken, [{
        type: 'text',
        text: `สวัสดีค่ะ คุณ ${profile.displayName || ''}\nยินดีต้อนรับสู่ NICHE BLOOM 🌸\nหากมีรายการผ่อนชำระ สามารถส่งสลิปมาตรงนี้ได้เลยค่ะ`,
      }], channelToken);
      continue;
    }

    if (event.type === 'message') {
      const userId = event.source?.userId;
      const msg = event.message;

      // Text message
      if (msg.type === 'text') {
        const text = msg.text.toLowerCase();
        if (text.includes('บิล') || text.includes('ยอด') || text.includes('ผ่อน')) {
          // Find customer
          if (supabaseKey) {
            const customer = await findCustomerByUid(supabaseKey, userId);
            if (customer) {
              const contracts = await getPendingContracts(supabaseKey, customer.customer_number);
              const total = contracts.reduce((s, c) => s + Number(c.installment || 0), 0);
              const itemsList = contracts.map(c => `• ${c.item}: ${formatBaht(c.installment)} (งวด ${c.current_period}/${c.total_periods})`).join('\n');
              await replyMessage(event.replyToken, [{
                type: 'text',
                text: `คุณ ${customer.customer_name}\nรายการที่ต้องชำระ:\n${itemsList || 'ไม่มี'}\nยอดรวม: ฿${total.toLocaleString('th-TH')}\n\nส่งสลิปมาตรงนี้เพื่อยืนยันการชำระได้เลยค่ะ 🌸`,
              }], channelToken);
            } else {
              await replyMessage(event.replyToken, [{
                type: 'text',
                text: 'ยังไม่พบข้อมูลลูกค้าของคุณในระบบ กรุณาติดต่อแอดมินค่ะ 🌸',
              }], channelToken);
            }
          }
        } else {
          await replyMessage(event.replyToken, [{
            type: 'text',
            text: 'ได้รับข้อความแล้วค่ะ 🌸\nพิมพ์ "บิล" เพื่อดูยอดที่ต้องชำระ\nหรือส่งสลิปโอนเงินมาเพื่อยืนยันการชำระได้เลยค่ะ',
          }], channelToken);
        }
        continue;
      }

      // Image message = slip
      if (msg.type === 'image') {
        await replyMessage(event.replyToken, [{
          type: 'text',
          text: 'ได้รับสลิปแล้วค่ะ กำลังตรวจสอบ... 🌸',
        }], channelToken);

        // Download image
        const imageBase64 = await downloadLineImage(msg.id, channelToken);

        // Find customer
        let customer = null;
        let pendingContracts = [];
        let expectedAmount = 0;

        if (supabaseKey) {
          customer = await findCustomerByUid(supabaseKey, userId);
          if (customer) {
            pendingContracts = await getPendingContracts(supabaseKey, customer.customer_number);
            expectedAmount = pendingContracts.reduce((s, c) => s + Number(c.installment || 0), 0);
          }
        }

        // Log slip (verification_status = needs_review if no OCR configured)
        const logData = {
          line_user_id: userId,
          customer_number: customer?.customer_number || null,
          customer_name: customer?.customer_name || null,
          slip_image_url: imageBase64 ? `data:image/jpeg;base64,${imageBase64.substring(0, 100)}...` : null,
          amount: expectedAmount || null,
          total_amount: expectedAmount || 0,
          verification_status: 'needs_review',
          payment_status: 'pending',
          sender: customer?.customer_name || null,
          verified_by: 'system_pending',
        };

        if (supabaseKey) {
          await logSlipToPaymentLogs(supabaseKey, logData);
        }

        // Notify customer
        if (customer && expectedAmount > 0) {
          await pushMessage(userId, [{
            type: 'text',
            text: `ตรวจสอบสลิปของคุณ ${customer.customer_name}\nยอดที่ต้องชำระ: ฿${expectedAmount.toLocaleString('th-TH')}\nสถานะ: รอแอดมินยืนยัน\n\nขอบคุณที่ชำระผ่าน NICHE BLOOM 🌸`,
          }], channelToken);
        } else {
          await pushMessage(userId, [{
            type: 'text',
            text: 'ได้รับสลิปแล้วค่ะ แอดมินจะตรวจสอบและยืนยันให้เร็วที่สุด 🌸',
          }], channelToken);
        }

        // If SlipOK or Gemini API is configured, do real verification here
        // For now, mark as needs_review for admin to verify manually
        continue;
      }
    }
  }

  return res.status(200).json({ status: 'ok' });
};

function formatBaht(amount) {
  return '฿' + Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
