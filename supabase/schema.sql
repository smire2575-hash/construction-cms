-- CMS Supabase/PostgreSQL starter schema.
-- Run the complete script once in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  whatsapp text,
  website text,
  address text,
  city text,
  country text,
  tax_id text,
  base_currency text not null default 'USD',
  branches_limit integer not null default 1 check (branches_limit > 0),
  warehouses_limit integer not null default 1 check (warehouses_limit > 0),
  employee_seat_limit integer not null default 5 check (employee_seat_limit > 0),
  status text not null default 'trial' check (status in ('trial','active','suspended','expired')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('primary_owner','owner','manager','accountant','cashier','storekeeper','salesperson','employee')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique (company_id,user_id)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  sku text not null,
  category text not null default '',
  unit text not null default '',
  cost numeric(14,2) not null default 0 check (cost >= 0),
  price numeric(14,2) not null default 0 check (price >= 0),
  stock numeric(14,3) not null default 0 check (stock >= 0),
  low_stock numeric(14,3) not null default 0 check (low_stock >= 0),
  created_at timestamptz not null default now(),
  unique (company_id,sku)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  kind text not null default 'Customer',
  email text,
  phone text,
  whatsapp text,
  company_name text,
  address text,
  tax_id text,
  notes text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  reference text not null unique default ('INV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  product text not null,
  qty numeric(14,3) not null check (qty > 0),
  total numeric(14,2) not null check (total >= 0),
  cost_total numeric(14,2) not null check (cost_total >= 0),
  payment text not null,
  status text not null,
  date date not null default current_date,
  delivered_qty numeric(14,3) not null default 0 check (delivered_qty >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference text not null unique default ('PO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  supplier text not null,
  product text not null,
  qty numeric(14,3) not null check (qty >= 0),
  total numeric(14,2) not null check (total >= 0),
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  date date not null default current_date,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  owner text not null default '',
  due date not null default current_date,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role text not null,
  branch text not null default '',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_name text not null,
  name text not null,
  description text not null default '',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  display_name text not null default 'Construction Management System',
  email text,
  phone text,
  whatsapp text,
  website text,
  address text,
  city text,
  country text,
  tax_id text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.module_catalog (
  module_name text primary key,
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12,2) not null default 0 check (annual_price >= 0)
);

insert into public.module_catalog (module_name,monthly_price,annual_price) values
  ('Discuss',2,20),('Calendar',2,20),('Appointments',2,20),('To-do',2,20),
  ('Knowledge',2,20),('Contacts',2,20),('CRM',5,50),('Sales',6,60),
  ('Dashboards',3,30),('Point of Sale',6,60),('Accounting',8,80),('Documents',3,30),
  ('Project',5,50),('Planning',3,30),('Surveys',2,20),('Purchase',5,50),
  ('Inventory',7,70),('Barcode',3,30),('Sign',3,30),('Employees',3,30),
  ('Expenses',3,30),('WhatsApp',4,40),('Apps',0,0),('Settings',0,0)
on conflict (module_name) do update
set monthly_price = excluded.monthly_price,
    annual_price = excluded.annual_price;

create table if not exists public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_name text not null references public.module_catalog(module_name),
  status text not null default 'trial' check (status in ('trial','active','expired','cancelled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  trial_ends_at timestamptz,
  custom_monthly_price numeric(12,2) check (custom_monthly_price is null or custom_monthly_price >= 0),
  created_at timestamptz not null default now(),
  unique (company_id,module_name)
);

insert into public.company_modules (company_id,module_name,status,trial_ends_at)
select
  c.id,
  mc.module_name,
  case when c.status = 'active' then 'active' when c.status = 'trial' then 'trial' else 'expired' end,
  c.trial_ends_at
from public.companies c
cross join public.module_catalog mc
on conflict (company_id,module_name) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id,full_name)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_cms on auth.users;
create trigger on_auth_user_created_cms
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id,full_name)
select u.id,coalesce(u.raw_user_meta_data->>'full_name','')
from auth.users u
on conflict (id) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_platform_admin
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_memberships m
    join public.companies c on c.id = m.company_id
    where m.company_id = target_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        c.status = 'active'
        or (c.status = 'trial' and c.trial_ends_at > now())
      )
  );
$$;

create or replace function public.is_company_member_any_status(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = target_company_id
      and m.user_id = (select auth.uid())
      and m.status in ('active','invited','suspended')
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_memberships m
    join public.companies c on c.id = m.company_id
    where m.company_id = target_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(allowed_roles)
      and (
        c.status = 'active'
        or (c.status = 'trial' and c.trial_ends_at > now())
      )
  );
$$;

create or replace function public.create_company_for_current_user(company_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'Login is required to create a company.';
  end if;
  if nullif(trim(company_name),'') is null then
    raise exception 'Company name is required.';
  end if;
  if exists (
    select 1 from public.company_memberships m
    where m.user_id = current_user_id
  ) then
    raise exception 'This account already has a company membership.';
  end if;

  insert into public.companies (name) values (trim(company_name))
  returning id into new_company_id;

  insert into public.company_memberships (company_id,user_id,role,status)
  values (new_company_id,current_user_id,'primary_owner','active');

  insert into public.branches (company_id,name)
  values (new_company_id,'Main Branch');

  insert into public.company_modules (company_id,module_name,status,trial_ends_at)
  select new_company_id,module_name,'trial',now() + interval '14 days'
  from public.module_catalog;

  return new_company_id;
end;
$$;

create or replace function public.create_platform_company(
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_address text default null,
  p_trial_days integer default 14,
  p_employee_seat_limit integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_company_id uuid;
  trial_length integer := greatest(1,least(coalesce(p_trial_days,14),365));
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access is required.';
  end if;
  if nullif(trim(p_name),'') is null then
    raise exception 'Company name is required.';
  end if;
  if p_employee_seat_limit is null or p_employee_seat_limit < 1 then
    raise exception 'Employee seat limit must be at least one.';
  end if;

  insert into public.companies (
    name,email,phone,whatsapp,address,employee_seat_limit,status,trial_ends_at
  ) values (
    trim(p_name),nullif(trim(p_email),''),nullif(trim(p_phone),''),
    nullif(trim(p_whatsapp),''),nullif(trim(p_address),''),
    p_employee_seat_limit,'trial',now() + make_interval(days => trial_length)
  )
  returning id into new_company_id;

  insert into public.branches (company_id,name)
  values (new_company_id,'Main Branch');

  insert into public.company_modules (company_id,module_name,status,trial_ends_at)
  select new_company_id,module_name,'trial',now() + make_interval(days => trial_length)
  from public.module_catalog;

  return new_company_id;
end;
$$;

create or replace function public.has_company_module(target_company_id uuid, requested_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_modules cm
    where cm.company_id = target_company_id
      and cm.module_name = requested_module
      and (
        cm.status = 'active'
        or (cm.status = 'trial' and cm.trial_ends_at > now())
      )
  );
$$;

create or replace function public.record_sale(
  p_company_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_payment_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_row public.products%rowtype;
  sale_row public.sales%rowtype;
  payment_status text;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have access to this company.';
  end if;
  if not public.has_company_module(p_company_id,'Sales')
     or not public.has_company_module(p_company_id,'Inventory') then
    raise exception 'Sales and Inventory modules must both be enabled.';
  end if;
  if not public.has_company_role(p_company_id,array['primary_owner','owner','manager','cashier','salesperson']) then
    raise exception 'Your role cannot record sales.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;
  if p_payment_type not in ('Cash','Credit','Installment') then
    raise exception 'Unsupported payment type.';
  end if;

  select * into product_row
  from public.products
  where id = p_product_id
    and company_id = p_company_id
    and stock >= p_quantity
  for update;

  if not found then
    raise exception 'Product not found or stock is insufficient.';
  end if;

  update public.products
  set stock = stock - p_quantity
  where id = product_row.id;

  payment_status := case
    when p_payment_type = 'Cash' then 'Paid'
    when p_payment_type = 'Installment' then 'Partial'
    else 'Due'
  end;

  insert into public.sales (
    company_id,product_id,product,qty,total,cost_total,payment,status,delivered_qty
  ) values (
    p_company_id,product_row.id,product_row.name,p_quantity,
    round(product_row.price * p_quantity,2),
    round(product_row.cost * p_quantity,2),
    p_payment_type,payment_status,p_quantity
  )
  returning * into sale_row;

  insert into public.audit_logs (company_id,user_id,action)
  values (p_company_id,auth.uid(),'Sale recorded: ' || sale_row.reference);

  return to_jsonb(sale_row);
end;
$$;

create or replace function public.is_company_storage_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  company_folder text := split_part(object_name,'/',1);
begin
  if company_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_company_member(company_folder::uuid);
end;
$$;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_member_any_status(uuid) to authenticated;
grant execute on function public.has_company_role(uuid,text[]) to authenticated;
grant execute on function public.create_company_for_current_user(text) to authenticated;
grant execute on function public.create_platform_company(text,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.has_company_module(uuid,text) to authenticated;
grant execute on function public.record_sale(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.is_company_storage_object(text) to authenticated;
revoke all on function public.create_company_for_current_user(text) from public, anon;
revoke all on function public.create_platform_company(text,text,text,text,text,integer,integer) from public, anon;
revoke all on function public.has_company_module(uuid,text) from public, anon;
revoke all on function public.record_sale(uuid,uuid,numeric,text) from public, anon;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.branches enable row level security;
alter table public.products enable row level security;
alter table public.contacts enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.employees enable row level security;
alter table public.module_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.module_catalog enable row level security;
alter table public.company_modules enable row level security;

drop policy if exists "Authenticated users read module catalog" on public.module_catalog;
create policy "Authenticated users read module catalog"
on public.module_catalog for select to authenticated
using (true);
revoke all on public.module_catalog from anon, authenticated;
grant select on public.module_catalog to authenticated;

drop policy if exists "Members read company module access" on public.company_modules;
create policy "Members read company module access"
on public.company_modules for select to authenticated
using (public.is_company_member_any_status(company_id) or public.is_platform_admin());
revoke all on public.company_modules from anon, authenticated;
grant select on public.company_modules to authenticated;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_platform_admin());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "Members read their memberships" on public.company_memberships;
create policy "Members read their memberships"
on public.company_memberships for select to authenticated
using (user_id = (select auth.uid()) or public.has_company_role(company_id,array['primary_owner','owner','manager']) or public.is_platform_admin());
revoke all on public.company_memberships from anon, authenticated;
grant select on public.company_memberships to authenticated;

drop policy if exists "Members read their companies" on public.companies;
create policy "Members read their companies"
on public.companies for select to authenticated
using (public.is_company_member_any_status(id) or public.is_platform_admin());

drop policy if exists "Company admins update company details" on public.companies;
create policy "Company admins update company details"
on public.companies for update to authenticated
using (public.has_company_role(id,array['primary_owner','owner','manager']))
with check (public.has_company_role(id,array['primary_owner','owner','manager']));

drop policy if exists "Platform admins create companies" on public.companies;
create policy "Platform admins create companies"
on public.companies for insert to authenticated
with check (public.is_platform_admin());

revoke all on public.companies from anon, authenticated;
grant select on public.companies to authenticated;
grant update (name,email,phone,whatsapp,website,address,city,country,tax_id,base_currency) on public.companies to authenticated;
grant insert (name,email,phone,whatsapp,address,employee_seat_limit,status,trial_ends_at) on public.companies to authenticated;

do $$
declare
  table_name text;
  module_name text;
begin
  for table_name,module_name in
    select * from (values
      ('branches','Settings'),
      ('products','Inventory'),
      ('contacts','Contacts'),
      ('purchases','Purchase'),
      ('expenses','Expenses'),
      ('tasks','To-do'),
      ('employees','Employees')
    ) as modules(table_name,module_name)
  loop
    execute format('drop policy if exists %I on public.%I',table_name || ' active tenant access',table_name);
    execute format('drop policy if exists %I on public.%I',table_name || ' tenant read',table_name);
    execute format('drop policy if exists %I on public.%I',table_name || ' manager insert',table_name);
    execute format('drop policy if exists %I on public.%I',table_name || ' manager update',table_name);
    execute format('drop policy if exists %I on public.%I',table_name || ' manager delete',table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_company_member(company_id) and public.has_company_module(company_id,%L))',
      table_name || ' tenant read',table_name,module_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_company_role(company_id,array[''primary_owner'',''owner'',''manager'']) and public.has_company_module(company_id,%L))',
      table_name || ' manager insert',table_name,module_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_company_role(company_id,array[''primary_owner'',''owner'',''manager'']) and public.has_company_module(company_id,%L)) with check (public.has_company_role(company_id,array[''primary_owner'',''owner'',''manager'']) and public.has_company_module(company_id,%L))',
      table_name || ' manager update',table_name,module_name,module_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_company_role(company_id,array[''primary_owner'',''owner'',''manager'']) and public.has_company_module(company_id,%L))',
      table_name || ' manager delete',table_name,module_name
    );
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  end loop;

  drop policy if exists "module_records active tenant access" on public.module_records;
  drop policy if exists "module_records tenant read" on public.module_records;
  drop policy if exists "module_records manager insert" on public.module_records;
  drop policy if exists "module_records manager update" on public.module_records;
  drop policy if exists "module_records manager delete" on public.module_records;
  create policy "module_records tenant read"
  on public.module_records for select to authenticated
  using (public.is_company_member(company_id) and public.has_company_module(company_id,module_name));
  create policy "module_records manager insert"
  on public.module_records for insert to authenticated
  with check (
    public.has_company_role(company_id,array['primary_owner','owner','manager'])
    and public.has_company_module(company_id,module_name)
  );
  create policy "module_records manager update"
  on public.module_records for update to authenticated
  using (
    public.has_company_role(company_id,array['primary_owner','owner','manager'])
    and public.has_company_module(company_id,module_name)
  )
  with check (
    public.has_company_role(company_id,array['primary_owner','owner','manager'])
    and public.has_company_module(company_id,module_name)
  );
  create policy "module_records manager delete"
  on public.module_records for delete to authenticated
  using (
    public.has_company_role(company_id,array['primary_owner','owner','manager'])
    and public.has_company_module(company_id,module_name)
  );
  grant select,insert,update,delete on public.module_records to authenticated;
end;
$$;

drop policy if exists "Members read sales" on public.sales;
create policy "Members read sales"
on public.sales for select to authenticated
using (public.is_company_member(company_id) and public.has_company_module(company_id,'Sales'));
grant select on public.sales to authenticated;
revoke insert,update,delete on public.sales from anon,authenticated;

drop policy if exists "Members read audit logs" on public.audit_logs;
create policy "Members read audit logs"
on public.audit_logs for select to authenticated
using (public.is_company_member(company_id) and public.has_company_module(company_id,'Accounting'));
grant select on public.audit_logs to authenticated;

drop policy if exists "Platform admins manage platform settings" on public.platform_settings;
create policy "Platform admins manage platform settings"
on public.platform_settings for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
grant select,insert,update on public.platform_settings to authenticated;

insert into storage.buckets (id,name,public)
values ('cms-private','cms-private',false)
on conflict (id) do update set public = false;

drop policy if exists "Company members read private files" on storage.objects;
create policy "Company members read private files"
on storage.objects for select to authenticated
using (bucket_id = 'cms-private' and public.is_company_storage_object(name));

drop policy if exists "Company members upload private files" on storage.objects;
create policy "Company members upload private files"
on storage.objects for insert to authenticated
with check (bucket_id = 'cms-private' and public.is_company_storage_object(name));

drop policy if exists "Company members update private files" on storage.objects;
create policy "Company members update private files"
on storage.objects for update to authenticated
using (bucket_id = 'cms-private' and public.is_company_storage_object(name))
with check (bucket_id = 'cms-private' and public.is_company_storage_object(name));

drop policy if exists "Company members delete private files" on storage.objects;
create policy "Company members delete private files"
on storage.objects for delete to authenticated
using (bucket_id = 'cms-private' and public.is_company_storage_object(name));
