# CMS API — Tilmaamaha Isku-xirka (Somali)

## API Base URL

- Local backend: `http://localhost:4000/api/v1`
- React app Vite proxy: `/api/v1`
- Health test (no login): `GET /api/v1/health`

## Header-yada loo baahan yahay

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
X-Company-Id: <UUID_COMPANY_ID>  # company routes; optional for one-company user
Content-Type: application/json
```

`SUPABASE_ACCESS_TOKEN` waxaa laga helaa Supabase Auth login; **ha isticmaalin Secret key sidii user access token**. Token-ka waxaa lagu xaqiijiyaa backend-ka. Frontend `src/lib/api.js` ayaa si automatic ah u lifaaqaya.

## Endpoints hadda koodh ku leh

| Method | URL | Shaqada | Xaddidaadda |
|---|---|---|---|
| GET | `/health` | Hubi Node API | Public |
| GET | `/session` | Aqoonsi, company, entitlement | Supabase login |
| POST | `/accept-invitation` | Activate invited membership | Invited login |
| GET | `/modules` | Module catalog | Logged-in |
| GET | `/products` | Products iyo available stock | Inventory module |
| POST | `/products` | Product + opening stock RPC | Inventory Create |
| GET/POST | `/contacts` | Customers iyo suppliers | Contacts |
| GET/POST | `/tasks` | To-do records | To-do |
| GET/POST | `/expenses` | Pending expenses | Expenses |
| GET/POST | `/purchases` | Pending purchase drafts | Purchase |
| GET | `/employees` | Company memberships view | Employees |
| GET/POST | `/company/invitations` | List invitations or invite a company member by email | Primary Owner; Employees module |
| PATCH | `/company/members/:id/role` | Change a member role; Primary Owner cannot be changed here | Primary Owner only |
| POST | `/company/members/:id/state` | Activate, suspend, or archive a member | Primary Owner only; invited users must accept first |
| GET | `/sales` | Posted sales | Sales |
| POST | `/sales` | Atomic POS sale: stock + GL | Sales Create |
| GET/POST | `/module-records/:module` | Simple module placeholder records | Module-specific |
| POST | `/files` | Upload to private Supabase Storage | Documents Create |
| GET | `/files/:id/signed-url` | Temporary private file link | Documents View |
| GET | `/platform/companies` | List tenants | Super Admin |
| POST | `/platform/companies` | Invite owner + provision company | Super Admin |
| GET | `/platform/modules` | Platform modules | Super Admin |

## Example: React JS requests

```javascript
// File: frontend/src/lib/api.js
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch('/api/v1/products', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'X-Company-Id': companyId
  }
});
const payload = await res.json();
```

## Example: API POST iib

```json
{
  "product_id": "PRODUCT_UUID_FROM_SUPABASE",
  "quantity": 2,
  "payment_type": "Cash"
}
```

`POST /sales`: Haddii stock ku filan yahay, SQL RPC (`cms_post_sale`) wuxuu hal transaction ku sameeyaa sale, stock movement, cash/receivable, revenue iyo COGS. Haddii stock ku filan yahay **la'aan**, request-ka waa la diidayaa (pending-delivery approval live workflow wuxuu u baahan yahay shaqo dambe).

## Halkee API Key laga helaa?

**Supabase Dashboard → Project Settings / API Keys** (magaca menu-ga wuu isbedeli karaa):

- `SUPABASE_URL`: Project URL
- `SUPABASE_PUBLISHABLE_KEY`: Frontend + backend public/project key
- `SUPABASE_SECRET_KEY`: **BACKEND ONLY**, admin privileges

### APIs dibadeed ee la qorsheeyey laakiin AAN wali la xirin

- **WhatsApp Business Platform API** (Meta provider) — phone ID, access token, approved templates; requires provider account.
- **Online payment provider API** — depends on selected Somali/other provider; no credentials/payment gateway selected yet.
- **Exchange rate API** — optional once online; localhost supports manual entries when FX module implemented.
- **Email provider SMTP / API** — for user invitations and notifications; default Supabase email limits may apply.

Provider accounts, API keys iyo verification-ka waa in la helaa ka hor integration-ka. Lama hardcode-gareyn doono secret keys.
