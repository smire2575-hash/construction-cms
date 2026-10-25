-- CMS v0.2 atomic SaaS renewal; run after migrations 01..04.
-- Only Node.js after platform admin verification may call with a Supabase service key.
create table if not exists public.subscription_invoice_links (
 invoice_id uuid primary key references public.platform_invoices(id) on delete restrict,
 subscription_id uuid not null unique references public.subscriptions(id) on delete restrict,
 company_id uuid not null references public.companies(id)
);
alter table public.subscription_invoice_links enable row level security;
revoke all on public.subscription_invoice_links from anon,authenticated;

create or replace function public.cms_renew_subscription(
 p_company uuid,p_admin uuid,p_invoice uuid,p_cycle text,
 p_start timestamptz,p_end timestamptz,p_modules text[],p_prices numeric[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company record;v_invoice record;v_paid numeric(14,2);v_sub uuid;
 v_count int;v_i int;v_code text;
begin
 if p_cycle not in ('Monthly','Yearly') or p_end<=p_start then raise exception 'Invalid billing cycle or dates';end if;
 if coalesce(array_length(p_modules,1),0)=0 or coalesce(array_length(p_modules,1),0)<>coalesce(array_length(p_prices,1),0) then
  raise exception 'Module/price arrays must be non-empty and equal length';end if;
 select * into v_company from public.companies where id=p_company for update;
 if not found or v_company.status='Closed' then raise exception 'Company not eligible for renewal';end if;
 select * into v_invoice from public.platform_invoices where id=p_invoice and company_id=p_company for update;
 if not found or v_invoice.status='Paid' then raise exception 'Invoice missing or already applied';end if;
 if exists(select 1 from public.subscription_invoice_links where invoice_id=p_invoice) then raise exception 'Invoice already used for subscription';end if;
 select coalesce(sum(amount),0) into v_paid from public.platform_payments
  where company_id=p_company and invoice_id=p_invoice and status='Verified';
 if v_paid<v_invoice.total then raise exception 'Full verified payment required';end if;
 select count(distinct code) into v_count from public.module_catalog where code=any(p_modules);
 if v_count<>array_length(p_modules,1) then raise exception 'Duplicate/unknown module';end if;
 if exists(select 1 from unnest(p_prices) price where price<0) then raise exception 'Negative subscription price';end if;
 insert into public.subscriptions(company_id,billing_cycle,status,starts_at,ends_at,currency)
 values(p_company,p_cycle,'Active',p_start,p_end,v_invoice.currency) returning id into v_sub;
 for v_i in 1..array_length(p_modules,1) loop
  insert into public.subscription_items(subscription_id,module_code,agreed_price)
  values(v_sub,p_modules[v_i],p_prices[v_i]);
 end loop;
 update public.company_modules set enabled=false where company_id=p_company;
 for v_i in 1..array_length(p_modules,1) loop
  insert into public.company_modules(company_id,module_code,enabled,agreed_monthly)
  values(p_company,p_modules[v_i],true,p_prices[v_i])
  on conflict(company_id,module_code) do update set enabled=true,agreed_monthly=excluded.agreed_monthly;
 end loop;
 update public.platform_invoices set status='Paid' where id=p_invoice;
 insert into public.subscription_invoice_links(invoice_id,subscription_id,company_id) values(p_invoice,v_sub,p_company);
 update public.companies set status='Active' where id=p_company;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(p_company,p_admin,'subscription_renewed','subscription',v_sub,jsonb_build_object('invoice_id',p_invoice,'cycle',p_cycle,'modules',p_modules));
 return v_sub;
end $$;
revoke all on function public.cms_renew_subscription(uuid,uuid,uuid,text,timestamptz,timestamptz,text[],numeric[]) from public,anon,authenticated;
grant execute on function public.cms_renew_subscription(uuid,uuid,uuid,text,timestamptz,timestamptz,text[],numeric[]) to service_role;
