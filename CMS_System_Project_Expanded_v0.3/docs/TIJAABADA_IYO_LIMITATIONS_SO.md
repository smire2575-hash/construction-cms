# CMS v0.1 — Tijaabo & Xaddidaad

## Waxa aan xaqiijinay
- Node.js syntax: `backend/src/server.js` — PASS (`node --check`).
- Node.js syntax: `preview/app.js` iyo `preview/server.mjs` — PASS.
- Preview Node HTTP server `GET http://localhost:4173/` — HTTP 200 intii lagu jiray baaritaanka.
- Demo JavaScript runtime (Node VM mock DOM): Dashboard, 24 menu items, Inventory screen, Super Admin dashboard — PASS.
- Single-file HTML contains inline CSS/JS + embedded CMS mark and can be opened independently.

## Waxa aan weli si buuxda halkan ugu tijaabin karin
- `npm install`/Vite React build: package registry network access was unavailable in the build environment.
- Automated Chromium screenshot navigation: restricted by browser administrator in the build environment.
- A live Supabase Auth/PostgreSQL/Storage connection: ma haysanno Supabase URL iyo keys-ka user-ka, lamana samayn test project la xiriiriyey.
- Real production accounting, concurrent purchase receiving, full invoicing and 24 individual module workflows: future phases.

## Waa maxay heerka project-ku?

Tani waa **working local UI demo + source-code foundation + initial secured API + PostgreSQL schema**, ma aha application production-ready ah oo dhammaan 24 modules dhammaystiran yihiin. Qorshihii hore (business rules) waa la ilaaliyey; incomplete features si cad ayaa loogu calaamadeeyey.
