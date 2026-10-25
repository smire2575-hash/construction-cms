-- CMS beta RPCs used ONLY via server-side Supabase secret/service role.
-- Security: never grant these functions to anon/authenticated.
create or replace function public.cms_create_product(
 p_company uuid,p_created_by uuid,p_sku text,p_name text,p_category text,
 p_unit text,p_cost numeric,p_price numeric,p_initial_stock numeric,p_low_stock numeric
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_product uuid;v_warehouse uuid;v_branch uuid;v_journal uuid;v_total numeric(16,2);
begin
 if p_initial_stock<0 or p_cost<0 or p_price<0 then raise exception 'Invalid negative cost, price or stock';end if;
 select w.id,w.branch_id into v_warehouse,v_branch from public.warehouses w
 where w.company_id=p_company and w.status='Active' order by w.id limit 1;
 if v_warehouse is null then raise exception 'No warehouse: create a branch and warehouse first';end if;
 insert into public.products(company_id,sku,name,category,unit,cost,price,low,created_by)
 values(p_company,p_sku,p_name,p_category,p_unit,p_cost,p_price,p_low_stock,p_created_by) returning id into v_product;
 insert into public.stock_balances(company_id,warehouse_id,product_id,quantity_on_hand)
 values(p_company,v_warehouse,v_product,p_initial_stock);
 if p_initial_stock>0 then
   insert into public.stock_movements(company_id,warehouse_id,product_id,quantity_delta,unit_cost,source_type,source_id)
   values(p_company,v_warehouse,v_product,p_initial_stock,p_cost,'OPENING',v_product);
   v_total:=round(p_initial_stock*p_cost,2);
   if v_total>0 then
     insert into public.journal_entries(company_id,branch_id,source_type,source_id,memo)
     values(p_company,v_branch,'OPENING_STOCK',v_product,'Opening inventory balance') returning id into v_journal;
     insert into public.journal_lines(company_id,journal_id,account_code,debit,credit) values
     (p_company,v_journal,'1200',v_total,0),(p_company,v_journal,'3000',0,v_total);
   end if;
 end if;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id)
 values(p_company,p_created_by,'create','product',v_product);
 return v_product;
end $$;

create or replace function public.cms_post_sale(
 p_company uuid,p_actor uuid,p_product uuid,p_qty numeric,p_payment_type text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_product record;v_stock record;v_branch_code text;v_branch uuid;
 v_sale uuid;v_journal uuid;v_seq bigint;v_total numeric(16,2);v_cost numeric(16,2);v_reference text;v_status text;
begin
 if p_qty<=0 then raise exception 'Quantity must be positive';end if;
 if p_payment_type not in ('Cash','Credit','Installment') then raise exception 'Unknown payment type';end if;
 select * into v_product from public.products where id=p_product and company_id=p_company for update;
 if not found then raise exception 'Product not found in this company';end if;
 select b.*,w.branch_id into v_stock from public.stock_balances b join public.warehouses w on w.id=b.warehouse_id and w.company_id=b.company_id
 where b.company_id=p_company and b.product_id=p_product and w.status='Active'
   and b.quantity_on_hand-b.quantity_reserved>=p_qty order by b.warehouse_id limit 1 for update of b;
 if not found then raise exception 'Insufficient physical stock. Do not invoice undelivered quantity; use pending order workflow.';end if;
 v_branch:=v_stock.branch_id;
 select code into v_branch_code from public.branches where id=v_branch and company_id=p_company;
 insert into public.document_sequences(company_id,branch_id,document_type,next_number)
 values(p_company,v_branch,'INV',1)
 on conflict(company_id,branch_id,document_type) do update set next_number=public.document_sequences.next_number+1
 returning next_number into v_seq;
 v_reference:=v_branch_code||'-INV-'||lpad(v_seq::text,6,'0');
 v_total:=round(v_product.price*p_qty,2);v_cost:=round(v_product.cost*p_qty,2);
 v_status:=case p_payment_type when 'Cash' then 'Paid' when 'Credit' then 'Due' else 'Partial' end;
 insert into public.sales(company_id,branch_id,product_id,reference,product,qty,total,cost_total,payment,status,created_by)
 values(p_company,v_branch,p_product,v_reference,v_product.name,p_qty,v_total,v_cost,p_payment_type,v_status,p_actor) returning id into v_sale;
 update public.stock_balances set quantity_on_hand=quantity_on_hand-p_qty where warehouse_id=v_stock.warehouse_id and product_id=p_product;
 insert into public.stock_movements(company_id,warehouse_id,product_id,quantity_delta,unit_cost,source_type,source_id)
 values(p_company,v_stock.warehouse_id,p_product,-p_qty,v_product.cost,'SALE',v_sale);
 insert into public.journal_entries(company_id,branch_id,source_type,source_id,memo)
 values(p_company,v_branch,'SALE',v_sale,'Sale '||v_reference) returning id into v_journal;
 -- 1000 Cash, 1100 AR, 1200 Inventory, 4000 Revenue, 5000 COGS
 if v_total>0 then
   insert into public.journal_lines(company_id,journal_id,account_code,debit,credit) values
   (p_company,v_journal,case when p_payment_type='Cash' then '1000' else '1100' end,v_total,0),
   (p_company,v_journal,'4000',0,v_total);
   if p_payment_type='Cash' then insert into public.payments(company_id,sale_id,amount,method) values(p_company,v_sale,v_total,'Cash');end if;
 end if;
 if v_cost>0 then
   insert into public.journal_lines(company_id,journal_id,account_code,debit,credit) values
   (p_company,v_journal,'5000',v_cost,0),(p_company,v_journal,'1200',0,v_cost);
 end if;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(p_company,p_actor,'post_sale','sale',v_sale,jsonb_build_object('reference',v_reference,'quantity',p_qty));
 return v_sale;
end $$;

revoke all on function public.cms_create_product(uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.cms_post_sale(uuid,uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.cms_create_product(uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric) to service_role;
grant execute on function public.cms_post_sale(uuid,uuid,uuid,numeric,text) to service_role;
