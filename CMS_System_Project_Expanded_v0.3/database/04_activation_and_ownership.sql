-- CMS v0.2 : atomic trial activation and approved primary owner transfer.
-- Run AFTER 03_contact_settings_and_workflows.sql
-- API must verify is_platform_admin before invoking SECURITY DEFINER RPCs.
create or replace function public.cms_activate_company_trial(
 p_company uuid,p_actor uuid,p_days integer,p_modules text[]
) returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_company record;v_owner_status text;v_limits record;v_branch uuid;v_end timestamptz;
 v_warehouse uuid;v_modules int;
begin
 if p_days<1 or p_days>365 then raise exception 'Invalid trial duration';end if;
 select * into v_company from public.companies where id=p_company for update;
 if not found then raise exception 'Company does not exist';end if;
 if v_company.status<>'Pending' then raise exception 'Only pending company can begin its first trial';end if;
 if v_company.primary_owner_id is null then raise exception 'Primary Owner invitation is required';end if;
 select status into v_owner_status from public.company_memberships
  where company_id=p_company and user_id=v_company.primary_owner_id and role='Primary Owner';
 if v_owner_status is distinct from 'Active' then raise exception 'Owner must accept invitation before trial activation';end if;
 select * into v_limits from public.company_limits where company_id=p_company for update;
 if v_limits.max_branches<1 or v_limits.max_warehouses<1 then raise exception 'At least one branch/warehouse is required for initial operations';end if;
 select count(*) into v_modules from public.module_catalog where code=any(p_modules);
 if v_modules<>coalesce(array_length(p_modules,1),0) then raise exception 'Unknown or duplicate module';end if;
 insert into public.branches(company_id,code,name) values(p_company,'MAIN','Main Branch') returning id into v_branch;
 insert into public.warehouses(company_id,branch_id,code,name) values(p_company,v_branch,'MAIN','Main Warehouse') returning id into v_warehouse;
 insert into public.company_modules(company_id,module_code,enabled)
 select p_company,code,true from public.module_catalog where code=any(p_modules)
 on conflict(company_id,module_code) do update set enabled=true;
 v_end:=now()+(p_days||' days')::interval;
 insert into public.subscriptions(company_id,billing_cycle,status,starts_at,ends_at)
 values(p_company,'Monthly','Trial',now(),v_end);
 update public.companies set status='Active' where id=p_company;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(p_company,p_actor,'trial_activated','company',p_company,jsonb_build_object('trial_days',p_days,'modules',p_modules));
 return v_end;
end $$;

create or replace function public.cms_finish_owner_transfer(p_transfer uuid,p_platform_admin uuid,p_old_owner_role text default 'Archived')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_transfer record;v_current record;v_target record;v_company record;
 v_seats int;v_used int;
begin
 if p_old_owner_role not in ('Archived','Additional Owner') then raise exception 'Invalid old owner role';end if;
 select * into v_transfer from public.ownership_transfers where id=p_transfer for update;
 if not found or v_transfer.status<>'Accepted' then raise exception 'Transfer not accepted';end if;
 select * into v_company from public.companies where id=v_transfer.company_id for update;
 if v_company.primary_owner_id<>v_transfer.from_user_id then raise exception 'Primary Owner changed or transfer stale';end if;
 select * into v_target from public.company_memberships where company_id=v_transfer.company_id and user_id=v_transfer.to_user_id for update;
 if not found or v_target.status<>'Active' then raise exception 'New Owner is not an active company member';end if;
 select * into v_current from public.company_memberships where company_id=v_transfer.company_id and user_id=v_transfer.from_user_id for update;
 if not found or v_current.role<>'Primary Owner' then raise exception 'Current owner membership missing';end if;
 select max_employee_seats into v_seats from public.company_limits where company_id=v_transfer.company_id for update;
 select count(*) into v_used from public.company_memberships where company_id=v_transfer.company_id and status='Active' and role<>'Primary Owner';
 -- Before: new target uses one seat. After: old owner can replace target's seat (no change to count).
 if p_old_owner_role='Additional Owner' and v_used>v_seats then raise exception 'Seat limit exhausted';end if;
 update public.company_memberships set role=case when p_old_owner_role='Archived' then 'Employee' else 'Additional Owner' end,
  status=case when p_old_owner_role='Archived' then 'Archived' else 'Active' end where id=v_current.id;
 update public.company_memberships set role='Primary Owner' where id=v_target.id;
 update public.companies set primary_owner_id=v_transfer.to_user_id where id=v_transfer.company_id;
 update public.ownership_transfers set status='Completed',reviewed_by=p_platform_admin,reviewed_at=now() where id=p_transfer;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(v_transfer.company_id,p_platform_admin,'ownership_transferred','ownership_transfer',p_transfer,
 jsonb_build_object('from',v_transfer.from_user_id,'to',v_transfer.to_user_id,'old_owner_role',p_old_owner_role));
 return v_transfer.to_user_id;
end $$;
revoke all on function public.cms_activate_company_trial(uuid,uuid,integer,text[]) from public,anon,authenticated;
revoke all on function public.cms_finish_owner_transfer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.cms_activate_company_trial(uuid,uuid,integer,text[]) to service_role;
grant execute on function public.cms_finish_owner_transfer(uuid,uuid,text) to service_role;
