# CMS — CONSTRUCTION MANAGEMENT SYSTEM
## Sida loo furo, loo tijaabiyo, loona fahmo code-ka (Af-Soomaali)

**Magaca:** Construction Management System (CMS)  
**Logo & Midabbo:** Navy Blue, Gold, Gray, White  
**Design:** Classic ERP, sidebar madow, content cad, comfortable spacing  
**Nooca:** Development Foundation / Demo v0.1, MA AHA full 24-module production ERP.

## 1. Saddex waddo oo CMS loo furi karo

**A. Si degdeg ah — adigoon wax rakibin:**
1. Fur `CMS_PREVIEW_HAL_FILE.html` oo ku jira root-ka project-ka.
2. Double-click; wuxuu ka furmayaa Chrome/Edge.
3. Tijaabi Dashboard, Inventory, Sales, POS, Super Admin iyo 24-module sidebar.
4. Tani waa DEMO. Lacag rasmi ah, user dhab ah iyo Supabase database kuma xirna.

**B. Demo localhost — Node.js, npm looma baahna:**
1. Ku rakib Node.js 20+ haddii aanu jirin.
2. Laba jeer guji `1_FUR_DEMO_LOCALHOST.bat` (Windows).
3. Fur browser-ka: **http://localhost:4173**
4. Haddii file-ka .bat aanu shaqayn, VS Code Terminal ku qor `node preview/server.mjs` adiga oo jooga project root.
5. Terminal-ka ha xirin inta aad tijaabinayso.

**C. React web application (Vite):**
1. Fur root folder-ka adigoo VS Code isticmaalaya.
2. Terminal: `cd frontend`
3. `npm install` (internet ayaa loo baahan yahay markii ugu horreysa).
4. `npm run dev`
5. Fur **http://localhost:5173**
6. Haddii `frontend/.env` la waayo, React app-ku wuxuu bilaabayaa DEMO mode.

> Localhost waa cinwaan kombiyuutarkaaga u gaar ah. Link-kan ma noqonayo website internet-ka ka furan ilaa aad adigu server-ka bilowdo. Ma jirto public deployment hadda.

## 2. Koodhka halkee ayuu yaallaa?

| Fayl / Folder | Waa maxay? | Sidee loo furaa? |
|---|---|---|
| `frontend/index.html` | **HTML**: bogga uu React ku soo baxo | VS Code / browser |
| `frontend/src/App.jsx` | **JavaScript + React JSX**: dashboard, modules, forms, iibka | VS Code, React Vite |
| `frontend/src/styles.css` | **CSS**: colors, layout, mobile, tables | VS Code |
| `frontend/src/lib/catalog.js` | **JavaScript**: 24-ka modules iyo labels | VS Code |
| `frontend/src/lib/demo.js` | **JavaScript**: sample records + localStorage | VS Code |
| `frontend/src/lib/api.js` | **JavaScript**: connection frontend -> Node API, Supabase login | VS Code |
| `backend/src/server.js` | **Node.js JavaScript**: API, permissions, Supabase connection, routes | VS Code / Node |
| `database/01_schema_supabase.sql` | **SQL PostgreSQL**: tables, relationships, RLS | Supabase SQL Editor |
| `database/02_atomic_transactions.sql` | **SQL PostgreSQL**: stock + sales + double-entry atomic transactions | Supabase SQL Editor |
| `frontend/.env.example` | React environment variables | Nuqul ka dhig `.env` |
| `backend/.env.example` | Private backend connection settings | Nuqul ka dhig `.env` |
| `preview/index.html` | HTML local UI demo | Chrome / Edge |
| `preview/styles.css` | CSS preview | VS Code |
| `preview/app.js` | JavaScript demo browser | VS Code |
| `preview/server.mjs` | Localhost HTTP server (no npm) | Node |

## 3. Supabase database-ka sida loogu xiro

**MUHIIM:** Waxaad codsatay database Supabase ah. Supabase wuxuu isticmaalaa **PostgreSQL**, ma aha MySQL. Sidaas darteed code-kan LIVE wuxuu isticmaalaa Supabase PostgreSQL + Auth + Storage. Business rules-kii aan qorsheynay lama beddelin; kaliya database technology-ga ayaa la waafajiyey codsigaaga cusub. Haddii aad weli doonayso MySQL **isla mar**, waxaa u baahan nahay architecture iyo synchronization gooni ah.

1. Booqo https://supabase.com/dashboard oo samee Supabase project cusub.
2. Dashboard-ka → **SQL Editor**.
3. Fur `database/01_schema_supabase.sql`, copy/paste oo **Run**.
4. Fur `database/02_atomic_transactions.sql`, copy/paste oo **Run**.
5. **Project Settings / Connect:** hel **Project URL**.
6. **API Keys:** hel **Publishable key** iyo **Secret key**. (Projects qaarkood waxay muujiyaan anon / service_role key versions.)
7. `backend/.env.example` u copy garee `backend/.env`, buuxi:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

8. **Waligaa Secret key ha gelin `frontend/`**, ha u dirin WhatsApp, hana ku darin GitHub. Backend-kaliya ayuu geli karaa. Keys-ka tusaalaha ah waa placeholders.
9. `frontend/.env.example` u copy garee `frontend/.env`:

```env
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_URL=/api/v1
```

10. Terminal 1: `cd backend`, kadib `npm install`, `npm run dev`.
11. Backend health check: **http://localhost:4000/api/v1/health**.
12. Terminal 2: `cd frontend`, kadib `npm install`, `npm run dev`.
13. Fur **http://localhost:5173**; hadda CMS wuxuu geli doonaa **LIVE login mode**.
14. Backend iyo frontend labada terminal ha furnaadaan inta aad isticmaashay.
15. Authentication invites/email confirmation waxay u baahan karaan SMTP configuration, email redirect URLs iyo provider email limits.

## 4. Sida Super Admin-ka ugu horreeya loo abuuro

**Hab test:** Supabase Dashboard → Authentication → Users → **Add user**. Geli email iyo password adag. Markaas Supabase SQL Editor ku fuli SQL-kan, adigoo EMAILKAAGA beddelaya:

```sql
insert into public.profiles(id,email,full_name,is_platform_admin)
select id,email,'CMS Platform Admin',true
from auth.users where email='YOUR_EMAIL@example.com'
on conflict (id) do update
set is_platform_admin=true;
```

*Ha siin platform_admin qof aan la xaqiijin.* Markaas login ku samee React app-ka. `Super Admin` wuxuu yeelan doonaa access platform; tenant financial data uma furmayo by default.

## 5. Sidee Super Admin u abuuraa company live ah?

Node backend wuxuu leeyahay `POST /api/v1/platform/companies`. Wuxuu sameeyaa company, seats, branch, warehouse, subscription trial iyo Supabase Auth owner invitation. Frontend-ka Super Admin → Companies → New wuxuu isticmaalaa endpoint-ka marka Live mode shaqeeyo.

Email invitation-ka owner-ka waa inuu aqbalaa Supabase Auth. Waxaa jira route `POST /api/v1/accept-invitation` oo xubinimada u wareejinaya Active. Backend waa inuu socda. **Invite failure ama qaybaha hore ee onboarding waa in la tijaabiyaa; weli ma aha production-hardened.**

## 6. API muxuu yahay? Sideen CMS ugu xiraa?

API (Application Programming Interface) waa marinka React uu xog uga codsado Node.js, kaas oo hubiya login, company, subscription, module iyo permissions ka hor inta uusan Supabase PostgreSQL wax ka akhrin ama ku qorin.

```text
Browser (React / HTML + CSS + JS)
    |
    | Authorization: Bearer SUPABASE_ACCESS_TOKEN
    v
Node.js Express: http://localhost:4000/api/v1/
    |     (auth + tenant + modules + roles)
    v
Supabase PostgreSQL (business data)
Supabase Auth (login)
Supabase Storage (files)
```

- Frontend `frontend/src/lib/api.js` ayaa u dira API requests.
- Backend `backend/src/server.js` ayaa xaqiijiya Supabase user token, raadiya company membership iyo subscription, kadibna sameeya DB query.
- `frontend/vite.config.js` wuxuu `/api` u diraa `http://127.0.0.1:4000`, si localhost CORS iyo URLs ay u fududaadaan.
- Supabase dashboard database link laguma geliyo frontend SQL credentials. Waxaad gelinaysaa Supabase Project URL & Publishable key frontend, Secret key-na backend oo keliya.

Faahfaahinta routes-ka ka akhri `docs/API_HAGAHA_SO.md`.

## 7. Maxaa maanta shaqeynaya, maxaase weli dhiman?

**Demo/Preview shaqeynaya (browser localStorage):** Classic ERP design, 24-module navigation, Super Admin/Company switcher, dashboard stats, products, contacts, sales/stock subtraction, pending delivery case, tasks, expenses, purchases, employees, generic module records, forms iyo search.

**Live foundation-ka bilowga ah:** Tenant business endpoints waa PRIMARY OWNER ONLY v0.1 (employee roles/branch permissions weli live laguma fasixin amni dartii). Supabase login, user/company membership checks, platform companies invite API, tenant-scoped product/contacts/expenses/tasks/purchases queries, sale RPC oo stock iyo journal hal transaction ku sameeya, private Storage upload, PDF/images/files 8 MB max, health endpoint.

**Aan wali dhammaan:** 24-ka modules specialized workflows, full purchase receiving + AVCO adjustments, multi-warehouse fulfillment, installment schedule/payments, full subscription billing automation, complete financial statements, tax/FX engine, role/branch matrix, ownership transfer Super Admin approval workflow, payment gateway/WhatsApp official APIs, complete enterprise testing iyo cloud deployment.

**Ha isticmaalin real customer financial data ilaa full validations iyo financial audits la dhammeeyo.** Demo ma sameeyo accounting sharciyeysan.

## 8. Waxyaabaha laga taxaddaro

- `VITE_` variables waxay ka muuqdaan browser bundle: **secret key haku darin**.
- SQL scripts PostgreSQL ayaa loogu talagalay; **ha ku gelin XAMPP phpMyAdmin/MySQL**.
- Supabase si uusan user aan loo oggoleyn u arag xog, tables-ka waxaa saaran RLS, direct client reads waa la diiday. Backend service key-na waxaa lagu xadidayaa role+tenant checks.
- `demo.js` iyo `preview/app.js` waxay isticmaalaan localStorage: qof browser-ka nadiifiya wuxuu waayi karaa demo data; ha ku kaydin secrets ama xog dhab ah.
- Supabase hosted Auth/Storage internet ayaa looga baahan yahay.
- `localhost` kuma xirmayo mobile/PC kale ilaa host iyo network/deployment la diyaariyo.

## 9. Hawsha xigta

Weli waa **development foundation**, ma aha dhammaadka mashruuca Full 24-Module. Waxaan bilaabnay coding sida aad codsatay, waxaanan u kala dhiseynaa phases si aan u hubinno accounting, stock iyo access security, annagoo aan ka tagayn 24-module roadmap-kii.
