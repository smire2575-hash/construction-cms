-- CMS v0.1 schema — SUPABASE SQL EDITOR / PostgreSQL 15+
-- NOTE: This is PostgreSQL, NOT MySQL. Run in a dedicated test Supabase project.
-- All exposed tenant tables use RLS with NO direct browser policies.
-- Only the authenticated Node.js API uses a server-side Supabase secret key.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 email text not null,
 full_name text not null default '',
 is_platform_admin boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(),
 code text unique,
 name text not null,
 status text not null default 'Pending' check (status in ('Pending','Active','Suspended','Closed')),
 base_currency varchar(3) not null default 'USD',
 primary_owner_id uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.company_memberships (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 role text not null check(role in ('Primary Owner','Additional Owner','Company Manager','Branch Manager','Accountant','Cashier','Salesperson','Storekeeper','Purchasing Officer','Project Manager','Employee')),
 status text not null default 'Invited' check(status in ('Invited','Active','Suspended','Archived')),
 permissions jsonb not null default '{}'::jsonb,
 foreign key (user_id) references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(company_id,user_id), unique(id,company_id)
);
create index if not exists membership_lookup on public.company_memberships(user_id,status);
create table if not exists public.module_catalog (
 code text primary key, name_so text not null, category text not null,
 monthly_sample numeric(12,2) not null default 0, sort_order integer not null unique
);
create table if not exists public.company_modules (
 company_id uuid not null references public.companies(id),
 module_code text not null references public.module_catalog(code),
 enabled boolean not null default true, agreed_monthly numeric(12,2) not null default 0,
 primary key(company_id,module_code)
);
create table if not exists public.company_limits (
 company_id uuid primary key references public.companies(id),
 max_branches int not null default 1 check(max_branches>=0),
 max_warehouses int not null default 1 check(max_warehouses>=0),
 max_employee_seats int not null default 5 check(max_employee_seats>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 billing_cycle text not null check(billing_cycle in ('Monthly','Yearly')),
 status text not null check(status in ('Trial','Active','Expired','Cancelled')),
 starts_at timestamptz not null,ends_at timestamptz not null,
 currency char(3) not null default 'USD',created_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create index if not exists subscription_active_lookup on public.subscriptions(company_id,ends_at desc);
create table if not exists public.subscription_items (
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.subscriptions(id),
 module_code text not null references public.module_catalog(code),agreed_price numeric(12,2) not null check(agreed_price>=0),
 unique(subscription_id,module_code)
);
create table if not exists public.platform_invoices (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 reference text unique not null,total numeric(14,2) not null default 0,
 currency char(3) not null default 'USD',status text not null default 'Draft',created_at timestamptz not null default now()
);
create table if not exists public.platform_payments (
 id uuid primary key default gen_random_uuid(),invoice_id uuid references public.platform_invoices(id),
 company_id uuid not null references public.companies(id),amount numeric(14,2) not null check(amount>0),
 method text not null,verified_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.branches (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 code text not null,name text not null,status text not null default 'Active',
 created_at timestamptz not null default now(),unique(company_id,code),unique(id,company_id)
);
create table if not exists public.warehouses (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 branch_id uuid not null,name text not null,code text not null,status text not null default 'Active',
 unique(company_id,code),unique(id,company_id),
 foreign key(branch_id,company_id) references public.branches(id,company_id)
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 sku text not null,name text not null,category text not null default 'General',unit text not null default 'Piece',
 cost numeric(16,4) not null default 0 check(cost>=0),price numeric(16,4) not null default 0 check(price>=0),
 low numeric(18,3) not null default 0,created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),unique(company_id,sku),unique(id,company_id)
);
create table if not exists public.stock_balances (
 company_id uuid not null references public.companies(id),warehouse_id uuid not null,
 product_id uuid not null,quantity_on_hand numeric(18,3) not null default 0 check(quantity_on_hand>=0),
 quantity_reserved numeric(18,3) not null default 0 check(quantity_reserved>=0 and quantity_reserved<=quantity_on_hand),
 primary key(warehouse_id,product_id),
 foreign key(warehouse_id,company_id) references public.warehouses(id,company_id),
 foreign key(product_id,company_id) references public.products(id,company_id)
);
create table if not exists public.stock_movements (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 warehouse_id uuid not null,product_id uuid not null,quantity_delta numeric(18,3) not null,
 unit_cost numeric(16,4) not null,source_type text not null,source_id uuid,
 created_at timestamptz not null default now(),
 foreign key(warehouse_id,company_id) references public.warehouses(id,company_id),
 foreign key(product_id,company_id) references public.products(id,company_id)
);
create index if not exists stock_history on public.stock_movements(company_id,product_id,created_at desc);
create table if not exists public.contacts (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 name text not null,kind text not null check(kind in ('Customer','Supplier')),
 phone text not null default '',balance numeric(16,2) not null default 0,
 created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(id,company_id)
);
create table if not exists public.sales (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 branch_id uuid not null,product_id uuid not null,reference text not null,
 product text not null,qty numeric(18,3) not null check(qty>0),
 total numeric(16,2) not null,cost_total numeric(16,2) not null,
 payment text not null check(payment in ('Cash','Credit','Installment')),
 status text not null check(status in ('Paid','Due','Partial','Pending','Refunded')),
 created_by uuid references auth.users(id),date date not null default current_date,
 created_at timestamptz not null default now(),unique(company_id,reference),
 foreign key(branch_id,company_id) references public.branches(id,company_id),
 foreign key(product_id,company_id) references public.products(id,company_id)
);
create table if not exists public.journal_entries (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 branch_id uuid not null,source_type text not null,source_id uuid not null,
 memo text not null default '',posted_at timestamptz not null default now(),
 unique(company_id,source_type,source_id),unique(id,company_id),
 foreign key(branch_id,company_id) references public.branches(id,company_id)
);
create table if not exists public.journal_lines (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 journal_id uuid not null,account_code text not null,debit numeric(16,2) not null default 0 check(debit>=0),
 credit numeric(16,2) not null default 0 check(credit>=0),
 check((debit>0 and credit=0) or (credit>0 and debit=0)),
 foreign key(journal_id,company_id) references public.journal_entries(id,company_id)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 sale_id uuid not null,amount numeric(16,2) not null check(amount>0),
 method text not null,created_at timestamptz not null default now(),
 foreign key(sale_id,company_id) references public.sales(id,company_id)
);
create table if not exists public.document_sequences (
 company_id uuid not null references public.companies(id),branch_id uuid not null,
 document_type text not null,next_number bigint not null default 0,
 primary key(company_id,branch_id,document_type),
 foreign key(branch_id,company_id) references public.branches(id,company_id)
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 name text not null,category text not null,amount numeric(16,2) not null check(amount>0),
 date date not null,status text not null default 'Pending',
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.purchases (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 supplier text not null,product text not null,qty numeric(18,3) not null check(qty>0),
 total numeric(16,2) not null check(total>=0),status text not null default 'Pending',
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 title text not null,owner text not null default '',due date not null,status text not null default 'Pending',
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.module_records (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 module_code text not null references public.module_catalog(code),name text not null,
 description text not null default '',status text not null default 'Active',
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 name text not null,storage_path text not null unique,mime_type text not null,size_bytes bigint not null,
 uploaded_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id),
 actor uuid references auth.users(id),action text not null,entity_type text not null,
 entity_id uuid,metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
create index if not exists audit_lookup on public.audit_events(company_id,created_at desc);

-- Security boundary: all public tables RLS-enabled, no browser policies.
-- This starter uses the Node backend and service-role, not direct table access.
do $$ declare tab record; begin
 for tab in select tablename from pg_tables where schemaname='public' and tablename in (
 'profiles','companies','company_memberships','module_catalog','company_modules','company_limits',
 'subscriptions','subscription_items','platform_invoices','platform_payments','branches','warehouses','products',
 'stock_balances','stock_movements','contacts','sales','journal_entries','journal_lines','payments',
 'document_sequences','expenses','purchases','tasks','module_records','documents','audit_events') loop
  execute format('alter table public.%I enable row level security',tab.tablename);
 end loop;
end $$;

-- Supabase storage private bucket (Node API handles access checks).
insert into storage.buckets(id,name,public,file_size_limit)
values('cms-private','cms-private',false,8388608) on conflict(id) do nothing;

-- Simple module catalog. Prices are examples, not approved customer contracts.
insert into public.module_catalog(code,name_so,category,monthly_sample,sort_order) values
('Discuss','Wadahadal','Workspace',2,1),('Calendar','Jadwal','Workspace',2,2),
('Appointments','Ballamo','Workspace',2,3),('To-do','Hawlaha','Workspace',2,4),
('Knowledge','Aqoon','Workspace',2,5),('Contacts','Xiriirada','Workspace',2,6),
('CRM','Fursadaha iibka','Sales',5,7),('Sales','Iibka','Sales',6,8),
('Dashboards','Warbixin Guud','Sales',3,9),('Point of Sale','POS','Sales',6,10),
('Accounting','Xisaabaadka','Sales',8,11),('Documents','Dukumentiyo','Sales',3,12),
('Project','Mashaariic','Operations',5,13),('Planning','Qorsheynta','Operations',3,14),
('Surveys','Su’aalo-ururin','Operations',2,15),('Purchase','Wax-iibsiga','Operations',5,16),
('Inventory','Bakhaarka','Operations',7,17),('Barcode','Baar-koodhka','Operations',3,18),
('Sign','Saxiix','Admin',3,19),('Employees','Shaqaalaha','Admin',3,20),
('Expenses','Kharashaadka','Admin',3,21),('WhatsApp','WhatsApp','Admin',4,22),
('Apps','Modules','Admin',0,23),('Settings','Dejinta','Admin',0,24)
on conflict(code) do update set name_so=excluded.name_so,category=excluded.category,monthly_sample=excluded.monthly_sample;
