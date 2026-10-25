# CMS — Construction Management System
Author: Siciid Mire Ahmed maxmuud

A React construction-management ERP frontend with 24 module views, dashboard, forms, searchable tables, CSV export, and company/Super Admin demo modes. Supabase provides authentication, PostgreSQL storage, row-level tenant access, and private file storage. Without Supabase settings the app stays in browser-only demo mode.

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/).

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the complete [`supabase/schema.sql`](./supabase/schema.sql) script. It creates the tables, helper functions, row-level security policies, starter module prices, and private storage bucket. Re-running it updates policies and preserves existing records.
3. In Supabase **Authentication → URL Configuration**, add `http://localhost:5174` and `http://127.0.0.1:5174` as redirect URLs.
4. Copy `.env.example` to `.env.local` and set the project URL and **publishable** key from Supabase project API settings. Both values are required. Never place a `service_role` key in frontend environment variables.
5. Restart `npm run dev`. Create an account from the CMS login page, confirm the email if confirmation is enabled, sign in, and create the first company.

The first company owner receives trial access to the 24 catalog modules for 14 days. New records are stored in Supabase; sales call a PostgreSQL function that checks stock and records the stock deduction and sale in a single transaction. Row-level security scopes data by active company membership and module access. Module prices and platform settings are starter values intended to be configured for your business.

To enable the Super Admin demo tools for a trusted account, set its `profiles.is_platform_admin` value to `true` from the Supabase SQL Editor. Never expose service-role credentials in the app.

## Local demo mode

When both Supabase variables are absent, demo data stays in this browser's `localStorage`; it is not shared across users or devices. Local storage is not an access-control boundary. Remove the local site's stored data using your browser's site-data controls.

## Current scope

- Supabase Auth email/password registration and login.
- Company creation, company profile, module entitlements, platform settings, and platform company list.
- Supabase persistence for products, contacts, sales, purchases, expenses, tasks, employees, branches, and generic module records.
- Private storage bucket and membership policies are provisioned by the SQL script; the UI's document-upload workflow is not yet connected.
- The remaining ERP workflows (billing, invitations, accounting ledger, full permissions UI, and payment processing) still need implementation before production use.
