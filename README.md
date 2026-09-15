# 🌿 NICHE BLOOM — Invoice & Installment System

> Curated Botanicals & Floristry | Pakkret, Thailand
> Repo เดียว รวมทั้ง 2 เวอร์ชันของโปรแกรม: **Windows app** และ **Classic dashboard**

## โครงสร้างของ repo นี้

```
niche-bloom-new/
├── windows-app/     ← โปรแกรม Windows (Electron) — "NICHE BLOOM Invoice Maker"
│   ├── main.js         Electron main process + SQLite (better-sqlite3)
│   ├── preload.js      IPC bridge
│   ├── index.html      UI ของแอป
│   └── pack.ps1        สคริปต์แพ็ก zip โปรเจกต์
├── classic/         ← แดชบอร์ดเว็บ HTML/JS (ข้อมูลบน Supabase)
│   ├── index.html / app.js / styles.css / assets/
│   ├── api/            LINE webhook + ส่งแจ้งเตือน (Vercel functions)
│   ├── import-data.py  นำเข้าข้อมูลลูกค้า/สัญญาเข้า Supabase
│   └── README.md       คู่มือใช้งานแดชบอร์ดฉบับเต็ม
├── WORKFLOW.txt     ← สรุปขั้นตอนการทำงานของโปรเจกต์
└── README.md        ← ไฟล์นี้
```

## 🚀 เริ่มใช้งาน

### เวอร์ชัน Windows app (Electron)
```powershell
cd windows-app
npm install
npm start                      # รันทดลอง
npx electron-builder --win nsis   # สร้างตัวติดตั้ง .exe → dist\
```
- ฐานข้อมูลใบเสร็จเก็บที่ `C:\Users\<ชื่อ>\AppData\Roaming\niche-desktop\local-data.db`
- **สำรองไฟล์นี้เสมอ** ก่อนลง Windows ใหม่

### เวอร์ชัน Classic dashboard (เว็บ)
```powershell
cd classic
python -m http.server 4173
# เปิดเบราว์เซอร์ http://localhost:4173
```
- ข้อมูลอยู่บน Supabase cloud (ตาราง `customers`, `contracts`, `payment_logs`, `app_settings`)
- ⚠️ โปรเจกต์ Supabase เดิม (`peucfeyxzvsnqrejnawy`) ถูกลบไปแล้ว — แดชบอร์ดจะขึ้น
  "ไม่สามารถโหลดข้อมูลได้" จนกว่าจะสร้าง project ใหม่ + แก้ URL/key ใน `classic/app.js`
  แล้วรัน `python classic/import-data.py --apply` เพื่อ import ข้อมูลลูกค้า/สัญญากลับ
  (รายละเอียดครบใน `classic/README.md`)

## 🆘 กู้คืนหลังลง Windows ใหม่ (สั้น ๆ)

1. ติดตั้ง **Node.js LTS** (nodejs.org) และ **Git** (git-scm.com)
2. `git clone https://github.com/phasongjai36/niche-bloom-new.git`
3. Windows app → ทำตามหัวข้อ "เวอร์ชัน Windows app" ด้านบน
4. ถ้ามีไฟล์สำรอง `local-data.db` → คัดลอกกลับไปที่
   `C:\Users\<ชื่อ>\AppData\Roaming\niche-desktop\local-data.db`
5. Dashboard → ทำตามหัวข้อ "เวอร์ชัน Classic dashboard"

> 📘 คู่มือกู้คืนฉบับเต็ม (เช็กลิสต์หลังลง Windows ใหม่ + แก้ปัญหาที่เจอบ่อย)
> อยู่ในโฟลเดอร์สำรองในเครื่อง: `D:\New folderbackup\NICHE BLOOM Invoice Maker\README.md`

## 🔐 ข้อควรระวัง

- repo นี้เป็น **private ส่วนตัว** — ห้ามแชร์สาธารณะ เพราะมีข้อมูลลูกค้า (ชื่อ/LINE UID) และคีย์ Supabase anon ฝังในโค้ด
- ห้าม commit ไฟล์ `local-data.db` (มีข้อมูลใบเสร็จจริง) — `.gitignore` กันไว้แล้ว

---
*จัดโครงสร้างใหม่เมื่อ 16 ก.ย. 2026 — รวมทุกเวอร์ชันไว้บน main ของ repo เดียว*
