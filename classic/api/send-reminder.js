// /api/send-reminder.js — Send LINE reminder to customer
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  if (!channelToken) {
    return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });
  }

  const { line_uid, customer_name, item, amount } = req.body || {};

  if (!line_uid) {
    return res.status(400).json({ error: 'line_uid is required' });
  }

  const message = {
    type: 'flex',
    altText: `แจ้งเตือนการชำระ - NICHE BLOOM`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🌿 NICHE BLOOM',
            weight: 'bold',
            color: '#c9a96a',
            size: 'sm',
          },
          {
            type: 'text',
            text: 'แจ้งเตือนการชำระ',
            weight: 'bold',
            size: 'lg',
            margin: 'sm',
          },
        ],
        backgroundColor: '#faf7f2',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `สวัสดีค่ะ คุณ ${customer_name || ''}`,
            size: 'md',
          },
          {
            type: 'text',
            text: `รายการ: ${item || '-'}`,
            size: 'sm',
            color: '#8a7d70',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `ยอดที่ต้องชำระ: ฿${Number(amount || 0).toLocaleString('th-TH')}`,
            size: 'lg',
            weight: 'bold',
            color: '#a8893f',
            margin: 'sm',
          },
          {
            type: 'text',
            text: 'กรุณาชำระภายในกำหนดเวลาค่ะ 🌸',
            size: 'sm',
            color: '#8a7d70',
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ส่งสลิปมาตรงนี้เพื่อยืนยันการชำระได้เลยค่ะ',
            size: 'xs',
            color: '#b0a596',
            align: 'center',
          },
        ],
        paddingAll: '16px',
      },
      styles: {
        footer: {
          backgroundColor: '#faf7f2',
        },
      },
    },
  };

  try {
    const resp = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: line_uid,
        messages: [message],
      }),
    });

    if (resp.ok) {
      return res.status(200).json({ success: true });
    } else {
      const err = await resp.text();
      return res.status(500).json({ error: 'LINE API error', detail: err });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
