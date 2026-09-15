# NICHE BLOOM — Receipt & Payment Management System

> Curated Botanicals & Floristry | Pakkret, Thailand

## ภาพรวมระบบ

ระบบจัดการใบเสร็จและการผ่อนชำระสำหรับ NICHE BLOOM ประกอบด้วย:

- **แดชบอร์ด** — ดูสัญญาทั้งหมด, กรองตามสถานะ, ค้นหาลูกค้า
- **สร้างใบเสร็จ** — เลือกลูกค้า → รวมรายการ → สร้าง QR PromptPay → พิมพ์หน้าเดียว
- **ระบบทวงถาม** — คำนวณค่าปรับล่าช้า, ค่าทวงถาม, ส่งแจ้งเตือน LINE
- **ประวัติ** — ดูประวัติการชำระและสถานะสลิป
- **ตั้งค่า** — PromptPay, SCB, ค่าปรับ, ข้อมูลแบรนด์

## การติดตั้ง

### 1. Deploy บน Vercel

1. อัปโหลดโฟลเดอร์นี้ไปยัง GitHub หรือ Vercel
2. เชื่อมต่อกับ Vercel
3. ตั้งค่า Environment Variables (ดู `.env.example`):
   - `LINE_CHANNEL_SECRET` — Channel Secret จาก LINE Developers
   - `LINE_CHANNEL_ACCESS_TOKEN` — Channel Access Token จาก LINE Developers
   - `SUPABASE_SERVICE_ROLE_KEY` — Service Role Key จาก Supabase Dashboard

### 2. ตั้งค่า LINE Webhook

1. ไปที่ [LINE Developers](https://developers.line.biz/)
2. Messaging API > Webhook URL: `https://your-app.vercel.app/api/line-webhook`
3. เปิด Use webhook = Enabled

### 3. ฐานข้อมูล Supabase

ตารางที่ใช้:
- `customers` — ข้อมูลลูกค้า (customer_number, customer_name, line_uid)
- `contracts` — สัญญาผ่อนชำระ (item, installment, current_period, total_periods)
- `payment_logs` — บันทึกการชำระและใบเสร็จ
- `app_settings` — การตั้งค่าระบบ (PromptPay, ค่าปรับ, ฯลฯ)

## การใช้งาน

### สร้างใบเสร็จ
1. ไปแท็บ "สร้างใบเสร็จ"
2. เลือกลูกค้า
3. เลือกรายการที่ต้องชำระ
4. กด "สร้างใบเสร็จ + QR"
5. QR PromptPay จะแสดงยอดจริงที่ต้องจ่าย
6. กด "พิมพ์ใบเสร็จ" หรือ "บันทึกลงระบบ"

### ระบบทวงถาม
1. ไปแท็บ "ทวงถาม"
2. ตั้งค่าค่าปรับล่าช้าและค่าทวงถาม
3. กด "คำนวณปรับทั้งหมด"
4. ปรับแต่งค่าปรับรายสัญญาได้
5. กด "ส่งแจ้งเตือน LINE" เพื่อส่งข้อความทวงถาม

### ตรวจสอบสลิป (LINE)
1. ลูกค้าส่งรูปสลิปใน LINE OA
2. ระบบดาวน์โหลดรูปและบันทึกลง payment_logs
3. สถานะจะเป็น `needs_review` รอแอดมินยืนยัน
4. แอดมินตรวจสอบและอัปเดตสถานะได้ในแท็บ "ประวัติ"

## PromptPay QR

ระบบสร้าง QR Code ตามมาตรฐาน EMVCo:
- **PromptPay ID:** 0826822551
- **SCB Account:** 0932479587
- QR แสดงยอดจริงที่ต้องชำระ (Dynamic QR)
- สแกนได้ด้วยแอปธนาคารทุกธนาคาร

## โทนสีและดีไซน์

- **พื้นหลัง:** ขาวครีม (#faf7f2)
- **สีทอง:** #c9a96a
- **ฟอนต์:** Cormorant Garamond (หัวเรื่อง) + Prompt (เนื้อหา)
- **ลายดอกไม้:** มินิมอลสไตล์เกาหลี

## ข้อมูลลูกค้า

| รหัส | ชื่อ | LINE UID |
|------|------|----------|
| CNNB001 | คุณแดดดี้ (MT__) | U6963b03... |
| CNNB002 | คุณเบียร์ (MyDeer) | U2ebf81b... |
| CNNB003 | คุณอุ้ม (OUm) | Ue0c3c53... |
| CNNB004 | คุณไข่ (ไข่นุ้ยสุดหล่อ) | U7e31b86... |
| CNNB005 | คุณวุ้นเส้น (NATTHANICHA) | U0a52938... |
| CNNB006 | คุณนัด (P'RaNutt) | Uacc7c91... |

## หมายเหตุ

- การตรวจสอบสลิปอัตโนมัติต้องตั้งค่า `SLIPOK_API_KEY` หรือ `GOOGLE_GENERATIVE_AI_API_KEY`
- หากไม่ได้ตั้งค่า OCR สลิปจะถูกบันทึกเป็น `needs_review` ให้แอดมินตรวจสอบ manual
- LINE credentials ต้องเก็บใน Vercel Environment Variables เท่านั้น
