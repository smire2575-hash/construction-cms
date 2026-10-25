# CMS — Construction Management System | HAGAAHA BILOWGA

**Nooc: v0.3 Development / Testing — ma aha Full 24-Module Production Release.**

CMS waa mashruuc ku dhisan React (HTML/JSX + CSS + JavaScript), Node.js Express REST API, iyo **Supabase PostgreSQL + Auth + Storage**. Xogta shirkadaha, teleefannada, email-lada, WhatsApp, website-yada iyo cinwaannada **waxaa looga tagay bannaan**; adiga ayaa buuxinaya markaad diyaar tahay. Magaca CMS iyo tagline-giisa keliya ayaa ah astaanta aad hore u bixisay. Ma jiro customer ama supplier aan la xaqiijin oo hore loo buuxiyey.

## Sida loo tijaabiyo muuqaalka CMS

1. Extract ZIP-ka. VS Code ku fur folder-ka `CMS_System_Project`.
2. **Muuqaal fudud oo aan Supabase u baahnayn:** fur `CMS_PREVIEW_HAL_FILE.html` Chrome/Edge. Ama Windows laba-jeer guji `1_FUR_DEMO_LOCALHOST.bat` oo gal **http://localhost:4173**.
3. **React interface:** VS Code Terminal -> `cd frontend` -> `npm install` -> `npm run dev` -> **http://localhost:5173**.
4. **Backend API:** VS Code Terminal kale -> `cd backend` -> `npm install` -> configure `.env` -> `npm run dev` -> **http://localhost:4000/api/v1/health**.
5. localhost links ma furmayaan ilaa server-ku kombiyuutarkaaga ka socdo; ma aha public hosted link.

## Meelaha laga gelinayo xogta rasmiga ah

- **Super Admin -> Settings:** magaca rasmiga ah, lambarka CMS, email, WhatsApp, website, cinwaan, cashuur ID, iyo invoice footer. Waxa hore loogu buuxiyey oo keliya magaca CMS iyo tagline.
- **Super Admin -> Companies -> New:** shirkadda CMS ka iibsata software account-ka; email-ka milkiilaha, lambarka, website, address, billing cycle iyo resource limits; haddii owner email aan weli la aqoon waxaa la abuuri karaa Pending company, invitation dib baa loo dirayaa.
- **Customer Dashboard -> Settings:** magaca, email, lambarka, WhatsApp, website, ciwaan, country, tax ID ee customer company-ga isticmaalaya CMS.
- **Customer Dashboard -> Contacts:** customers iyo suppliers-ka shirkaddaas, telefoon, email, WhatsApp iyo address. Dhammaan si gacanta ah u buuxi.

Demo: xogtu waa browser `localStorage` oo tijaabo ah. Live Supabase: xogta waxaa lagu keydinayaa PostgreSQL marka settings/API sax yihiin. **Ha gelin financial records dhab ah inta enterprise testing iyo permissions aysan dhammaystirmin.**

## SQL: sida Supabase loo rakibo

1. Supabase Dashboard -> Project cusub -> SQL Editor.
2. Execute scripts-ka **sida ay u kala horreeyaan**:
   - `database/01_schema_supabase.sql`
   - `database/02_atomic_transactions.sql`
   - `database/03_contact_settings_and_workflows.sql`
   - `database/04_activation_and_ownership.sql`
   - `database/05_subscription_renewal.sql`
   - `database/06_membership_lifecycle.sql`
3. Ku copy garee `backend/.env.example` ilaa `backend/.env`, geli `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
4. Ku copy garee `frontend/.env.example` ilaa `frontend/.env`, geli `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` iyo `VITE_API_URL=/api/v1`.
5. **Secret/service_role key backend keliya. Ha gelin frontend, hana zip-gareyn `.env`.**
6. Supabase Auth -> Users ka samee admin user dhab ah; `AKHRISO_MARKA_HORE_SO.md` wuxuu sharxayaa tallaabada platform admin profile.
7. `SUPABASE_AUTH_REDIRECT_URL` u dhig URL-ka frontend-kaaga, kuna dar URL-kaas Supabase Auth -> URL Configuration -> Redirect URLs. Localhost default-ku waa `http://localhost:5173`.
8. Admin-ku wuxuu ku abuuraa customer company iyo owner email; owner-ku wuxuu email invite-ka ka samaysanayaa password u gaar ah. Login-ka, password reset-ka iyo company invitation-ka waxaa xaqiijiya Supabase Auth, kadibna API-gu role-ka ayuu ka soo qaataa profile/membership-ka. **Ha samayn password guud, hana u dirin password qof kale.**
9. Platform Admin waxaa gacanta ku abuura qofka mashruuca maamula ee Supabase Auth; kadib `profiles.is_platform_admin` ayaa si gooni ah loo calaamadeeyaa sida ku cad `AKHRISO_MARKA_HORE_SO.md`. Ma jiro public admin sign-up.

## API sidee ayuu u shaqeeyaa?

React -> `frontend/src/lib/api.js` -> Node REST API (`backend/src/server.js`) -> Supabase Database. Header: `Authorization: Bearer <Supabase access token>`. Tenant API wuxuu sidoo kale aqbalaa `X-Company-Id` si uu u doorto company membership sax ah. Super Admin endpoints waxay hubiyaan platform admin. Dhammaan raadraacyada: `docs/API_HAGAHA_SO.md`.

## Koodhka noociisa / meesha uu ku yaal

| Nooc | Fayl | Shaqada |
|---|---|---|
| HTML | `frontend/index.html` | React-ka bogga lagu mount gareeyo |
| JavaScript + React JSX | `frontend/src/App.jsx` | Dashboard iyo forms |
| CSS | `frontend/src/styles.css` | Classic ERP design, navy/gold iyo responsive |
| JavaScript | `frontend/src/lib/api.js` | Browser -> API / Supabase token |
| JavaScript backend | `backend/src/server.js` | Node Express routes iyo authorization |
| SQL (PostgreSQL) | `database/*.sql` | Supabase tables, RLS, functions |
| HTML / CSS / JS demo | `CMS_PREVIEW_HAL_FILE.html` | Hal-fayl demo offline ah |

**Fiiro:** Qorshihii hore wuxuu ku jiray MySQL, laakiin dalabka dambe ee Supabase database wuxuu keenay in noocan live loo sameeyo **PostgreSQL**. Ma jiraan laba databases oo si qarsoodi ah u synchronise-gareysanaya. Taas waa technology implementation change, ma aha beddelka user/business requirements.

## Status-ka runta ah

- Demo interface: 24-module navigation, records iyo forms, CMS platform/company contact forms; preview smoke tests ayaa la maray.
- Backend foundation: authentication, profile updates, tenant scoped operations, contacts, product/stock/sales RPCs, platform company/invitation/trial/renewal endpoints.
- **Weli ma aha dhammaad:** full financial statements, granular employee branch permissions, end-to-end Supabase integration, full 24-module business workflows, tax/FX, scalable notifications iyo automated production deployment. Live endpoint-yada tenant ee xilligan waxay oggol yihiin **Primary Owner oo keliya** si aan role aan la tijaabin loo siin access.
- Khaladaad ama enhancements-ka mustaqbalka waxaa lagu dari karaa iyadoo la ilaalinayo xogta hore, migrations aan destructive ahaynna la isticmaalo.
