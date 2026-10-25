# CMS Project Handoff

## Sababta faylkan

Faylkan iyo archive-ka uu ku jiro waxaa loogu talagalay in project-ka CMS loogu raro workspace ama PC kale. Source code-ka oo dhan wuxuu ku jiraa folder-ka `CMS_System_Project`; archive-ka waa hal file oo la soo dejisan karo.

**Amniga:** email/password hore loogu qoray chat kuma jiraan faylkan ama archive-ka. `.env` dhab ah, Supabase secret/service-role keys, browser sessions, `node_modules`, iyo `dist` lama darin. Marka aad meel kale u guurto, secrets-ka ku qor `.env` gudaha kombiyuutarkaaga oo keliya; ha ku darin GitHub ama chat.

## Project-ka

CMS waa React + Vite frontend, Node.js/Express API, iyo Supabase PostgreSQL/Auth/Storage. Waxa jira offline preview, demo mode, 24-module navigation, schema SQL iyo API starter. Project-ku wali ma aha ERP production oo 24-ka module dhammaantood buuxa yihiin.

## Waxa code-ka lagu soo kordhiyey

- Supabase email/password sign-in, sign-out, password reset, iyo password cusub oo invite/reset link lagu dejiyo.
- Platform Admin iyo customer company waxaa kala saara `/api/v1/session`, profile-ka iyo company membership-ka server-ka xaqiijiyo. Ma jiro public Platform Admin signup.
- User-ku password-kiisa ayuu isagu samaystaa; system-ku ma abuuro password guud mana ku kaydiyo code-ka.
- Supabase invitation links waxay ku noqdaan frontend-ka iyadoo la adeegsanayo `SUPABASE_AUTH_REDIRECT_URL`.
- Supabase token refresh ma nadiifiyo company/admin context haddii isla user-ku weli ku jiro.
- Employees screen: company members, role, status, invite history, iyo email invitation.
- Primary Owner wuxuu casuumi karaa company users, wuxuu cusboonaysiin karaa role/status; Primary Owner lama beddeli karo halkan. Invited user wuxuu noqdaa Active marka uu aqbalo invitation-ka.
- API guide-ka waxaa lagu daray endpoints-ka invitations, role changes iyo membership status.

## Xaaladda tijaabooyinka

La xaqiijiyey:

- `npm run build` gudaha `frontend` wuu gudbay. Waxaa jira digniin bundle weyn oo ku saabsan JavaScript chunk-ka.
- `node --check backend/src/server.js` wuu gudbay.
- `node tests/test-release.cjs` iyo `node tests/smoke-preview.cjs` way gudbeen.
- React Employees screen iyo invite modal browser-ka ayaa la furay oo la hubiyey; email dhab ah lama dirin.

Weli lama xaqiijin:

- Live Supabase sign-in, password reset, ama email invitation.
- Database migrations-ka oo dhan oo lagu ordo Supabase.
- Production readiness ee dhammaan 24-ka module.

Test Supabase project reference-kii la bixiyey wuxuu ahaa `faijmlyzklowoofqzrsq`. Markii la eegay dashboard-ku wuxuu ku jiray `Checking...`, Database iyo SQL Editor controls-na way disabled ahaayeen ama editor-ku ma load-garayn. Sidaas darteed DB waxba laguma qorin, test user-na lama samayn. Production project-kii hore wuxuu lahaa schema qayb ahaan jira oo aan la jaanqaadin code-ka; migration buuxa si indho la'aan ah ha uga ordin.

## Sida local loogu bilaabo

1. Ku rakib Node.js 20 ama ka cusub.
2. Fur terminal-ka gudaha folder-ka `CMS_System_Project`.
3. Offline preview, oo aan Supabase u baahnayn:

   ```powershell
   node preview/server.mjs
   ```

   Kadib browser-ka ka fur `http://localhost:4173/`.

4. React app:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Vite default-ku waa `http://127.0.0.1:5173/`. Haddii port-ku mashquul yahay:

   ```powershell
   npm run dev -- --port 5174
   ```

5. Backend-ku wuxuu u baahan yahay `backend/.env` sax ah:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

   Health endpoint: `http://localhost:4000/api/v1/health`.

Waxaa kale oo jira Windows launch files: `1_FUR_DEMO_LOCALHOST.bat`, `2_FUR_REACT_LOCALHOST.bat`, iyo `3_FUR_BACKEND_API.bat`.

## Supabase setup marka project-ku diyaar noqdo

1. Isticmaal Supabase **test/development project**, hana ku bilaabin Production.
2. Hubi in project-ku Active/Healthy yahay oo Database, SQL Editor, Auth iyo Storage la furi karo.
3. SQL Editor-ka ku mari migration files-kan si ay u kala horreeyaan:
   - `database/01_schema_supabase.sql`
   - `database/02_atomic_transactions.sql`
   - `database/03_contact_settings_and_workflows.sql`
   - `database/04_activation_and_ownership.sql`
   - `database/05_subscription_renewal.sql`
   - `database/06_membership_lifecycle.sql`
4. Haddii project-ku leeyahay tables hore, marka hore isbarbar dhig schema-ga; `CREATE TABLE IF NOT EXISTS` ma hagaajiyo columns maqan. Backup samee ka hor wax ka beddel production database.
5. Dashboard-ka Supabase Auth URL Configuration ku dar URL-ka frontend-ka, tusaale ahaan `http://127.0.0.1:5173` ama port-ka aad isticmaalayso.
6. `frontend/.env.example` ka samee `frontend/.env`, geli:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   VITE_API_URL=/api/v1
   ```

7. `backend/.env.example` ka samee `backend/.env`, geli:

   ```env
   PORT=4000
   FRONTEND_URL=http://127.0.0.1:5173
   SUPABASE_AUTH_REDIRECT_URL=http://127.0.0.1:5173
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   NODE_ENV=development
   ```

8. `SUPABASE_SECRET_KEY` backend-ka oo keliya geli. Waligaa frontend, ZIP, GitHub ama chat ha gelin.
9. Dib u bilow backend iyo frontend-ka. Login screen-ku wuxuu muuqdaa marka frontend `.env` leeyahay URL iyo publishable key.
10. Supabase Auth ka samee user-ka Platform Admin, kadib profile-kaas si gaar ah ugu calaamadee `is_platform_admin=true` sida habraaca ku jira `AKHRISO_MARKA_HORE_SO.md`. Customer company-ga ku samee Super Admin-ka CMS, geli owner email dhab ah, kadib user-ku wuxuu ka samaysanayaa password-kiisa invite email-ka.

## Roles iyo user lifecycle

- Company invite: `POST /api/v1/company/invitations`
- Invite list: `GET /api/v1/company/invitations`
- Company members: `GET /api/v1/employees`
- Role update: `PATCH /api/v1/company/members/:id/role`
- Member state: `POST /api/v1/company/members/:id/state`
- Invite activation: `POST /api/v1/accept-invitation`

Platform Admin iyo customer company roles waa kala gaar. Ma siinayo account-ka user-ka role ama password isaga oo aan Supabase/Auth invitation flow marin.

## Faylasha muhiimka ah

- `frontend/src/App.jsx`: CMS UI, auth, company employee workflows.
- `frontend/src/lib/api.js`: Supabase session token iyo API client.
- `backend/src/server.js`: auth verification, tenant scoping, invitations, roles/status.
- `database/*.sql`: schema, transaction RPCs, activation iyo membership lifecycle.
- `docs/API_HAGAHA_SO.md`: API reference.
- `docs/TIJAABADA_IYO_LIMITATIONS_SO.md`: xaqiijinta iyo xaddidaadaha.
- `README_BILOW_HALKAN.md`: tilmaamaha project-ka ee Somali.

## Shaqooyinka hadhay

- Supabase test project-ka in la furo marka dashboard-ka iyo SQL Editor-ku Active noqdaan.
- Schema-ga test DB-ga oo la isbarbar dhigo migrations-ka, kadibna migration-ka si badbaado leh loo mariyo.
- Live test: admin login, owner invitation, password setup, member role/status, logout iyo password reset.
- 24 modules, accounting workflows, subscription/payment verification, branch permissions iyo email delivery wali waxay u baahan yihiin horumarin/test dheeraad ah.
- Bundle-ka frontend-ku wuxuu ka weyn yahay 500 kB; waa performance optimization mustaqbalka.
