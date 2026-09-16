# AGENTS.md — Niche Bloom Dashboard (niche_bloom_app)

Learnings that are not recoverable from the code itself.

## Environment & Paths
- The repo root IS the project: `D:/AI_COWORK/grok/niche_bloom_app/` (Git Bash
  `/d/AI_COWORK/grok/niche_bloom_app`). Freebuff's default working dir is
  elsewhere (e.g. `C:\Users\Natth\My Documents` or a `.freebuff` staging
  dir) — pass absolute paths or `cd` into the repo first.
- Repo layout on `main`: `windows-app/` (Electron/React rewrite) + `classic/`
  (this classic HTML/JS dashboard, merged via PR #4, squash 1919be1) + this
  AGENTS.md + WORKFLOW.txt at root. The rewrite branch is
  `electron-rewrite`. Keep both lineages; never overwrite one with the other.
- Node.js v24 IS available (an older session noted it missing — outdated).
  Python 3.14 also installed. Before starting `python -m http.server 4173`,
  check port 4173 for an existing listener (other threads may hold it).
- `gh` CLI is NOT installed on this machine (verified 2026-09-16; older
  sessions had it authenticated as phasongjai36) — use git over https or
  install gh first. Repo Actions run only
  on releases; PRs show Vercel checks that can read
  "fail — Canceled from the Vercel Dashboard" at 0s — external cancellations,
  not build failures; they don't block merge.
- Git on this machine hits "dubious ownership" for this repo; the exception
  `git config --global --add safe.directory D:/AI_COWORK/grok/niche_bloom_app`
  has been applied.

## Sandbox & Tool Quirks
- Sandbox cannot reach Supabase (DNS blocked). Test by overriding `supabaseFetch` in-page with mock tables, then calling the real render functions. Gotchas: `getCustomerName` reads `customer_name`; customers with zero contracts are dropped from the dashboard list.
- The preview browser caches styles.css/app.js aggressively. Check the LOADED sheet via `document.styleSheets`, not disk; bust with `?v=N` on the link href or reload.
- html2canvas at scale:2 takes >10s here: kick off via setTimeout and poll; never run inside one `preview_evaluate` (10s cap; a busy main thread stalls the whole preview tool).
- Canvas `getImageData` times out even on small canvases — verify exported PNGs via computed styles / data-URL properties instead of pixel scans.
- MSYS mangles `git show rev:path` (colon becomes a drive path). Prefix `MSYS_NO_PATHCONV=1`.

## Design Decisions (do not undo casually)
- `<html data-theme>` is set pre-paint by a head script from `localStorage['nb-theme']`; default dark. Toggle logic: `initThemeToggle()` in app.js.
- Receipt paper stays LIGHT in dark mode via light-variable re-scoping inside `[data-theme="dark"] .receipt-paper` — it's a printed document; PNG export intentionally captures the light paper.
- Receipt logo must be the PRE-TINTED `assets/logo-gold.png` (gold ramp ~#a8893f→#d8be85). html2canvas ignores CSS `filter`; a runtime canvas swap failed in practice — the tinted file is the only reliable way exports keep the gold mark.
- Staggered card entrance animations must use `animation-fill-mode: backwards`, never `both`: `both` keeps the finished animation attached and permanently blocks hover transforms (observed).
- Every DB-sourced string rendered via innerHTML goes through `esc()` / `escJs()` (for inline onclick args) in app.js — a stored-XSS hole via customer names/contract items was found and fixed; do not add unescaped interpolations.

## Known Cleanup Candidates
- Tailwind CDN is loaded but ~unused (`relative z-10`, `font-display` only);
  removing it kills a console warning and speeds first paint.
- `(1)`-suffixed duplicate files keep appearing (bulk snapshot artifacts);
  `api/*(1).js` were deleted — delete future ones after `cmp` verifies
  they're identical.
- The Freebuff staging copy at `D:/AI_COWORK/.freebuff/niche_bloom_app/`
  mirrors this repo (AGENTS.md/WORKFLOW.txt now canonical HERE). If it still
  exists, re-sync docs FROM this repo before trusting it.
