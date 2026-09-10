# NICHE BLOOM — Invoice & Installments

A bilingual (Thai + English) web app for tracking customer installment payments with PromptPay dynamic QR codes.

## Features

- **Dashboard** — Customer installments grouped by due day (1, 20, 25)
- **Bill page** — Itemized bill with PromptPay dynamic QR (locks the total)
- **Add new contract** — Form for installment / cash-advance
- **Closed contracts** — View fully-paid bills
- **Bilingual UI** — Thai + English throughout
- **LocalStorage persistence** — Data survives reloads
- **Print-ready** — Use the print button on bills for clean receipts

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3
- React Router DOM
- Zustand (with persist middleware)
- Lucide Icons
- qrcode (SVG generation)
- Playfair Display + Inter fonts

## Project Structure

```
src/
├── components/         # Reusable UI (Shell, QR, Button)
├── pages/              # Route pages
│   ├── Dashboard.tsx   # /
│   ├── Bill.tsx        # /bill
│   ├── Add.tsx         # /add
│   └── Closed.tsx      # /closed
└── lib/                # Types, store, utilities
```

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve built output
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import the repo at https://vercel.com/new
3. Vercel auto-detects Vite — no config needed
4. Click **Deploy**

### Manual

```bash
npm run build
# Upload the contents of dist/ to any static host
```

## Brand Assets

- `public/logo-minimal.jpg` — Minimal style brand logo
- `public/logo-clean3d.jpg` — 3D style brand logo

## License

Private — © NICHE BLOOM
