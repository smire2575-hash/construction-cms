-- CMS v0.2 invitation lifecycle, concurrency-safe reserved employee seats.
-- Supabase Auth invitation is sent by the Node API, this SQL records tenant membership.
create or replace function public.cms_accept_company_invitation(p_user uuid,p_company uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_inv record;v_member uuid;
begin
 select * into v_inv from public.company_invitations where company_id=p_company and invited_user_id=p_user
  and status='Pending' and expires_at>now() order by created_at desc limit 1 for update;
 if not found then raise exception 'Invitation expired, revoked, or not found';end if;
 update public.company_memberships set status='Active'
  where company_id=p_company and user_id=p_user and status='Invited' returning id into v_member;
 if v_member is null then raise exception 'Invited company membership not found';end if;
 update public.company_invitations set status='Accepted' where id=v_inv.id;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id)
 values(p_company,p_user,'invitation_accepted','company_membership',v_member);
 return v_member;
end $$;

create or replace function public.cms_reserve_employee_invite(
 p_company uuid,p_actor uuid,p_invited_user uuid,p_email text,p_role text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_limit record;v_count int;v_member uuid;v_inv uuid;
begin
 if p_role not in ('Additional Owner','Company Manager','Branch Manager','Accountant','Cashier','Salesperson','Storekeeper','Purchasing Officer','Project Manager','Employee') then
  raise exception 'Role cannot be invited as a new employee';end if;
 select * into v_limit from public.company_limits where company_id=p_company for update;
 if not found then raise exception 'Company limits missing';end if;
 select count(*) into v_count from public.company_memberships
 where company_id=p_company and role<>'Primary Owner' and status in ('Invited','Active');
 if v_count>=v_limit.max_employee_seats then raise exception 'Employee seat limit reached';end if;
 if exists (select 1 from public.company_memberships where company_id=p_company and user_id=p_invited_user) then
  raise exception 'User already belongs to this company';end if;
 insert into public.company_memberships(company_id,user_id,role,status)
 values(p_company,p_invited_user,p_role,'Invited') returning id into v_member;
 insert into public.company_invitations(company_id,invited_email,invited_user_id,role,invited_by)
 values(p_company,p_email,p_invited_user,p_role,p_actor) returning id into v_inv;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(p_company,p_actor,'employee_invited','company_membership',v_member,jsonb_build_object('role',p_role));
 return v_inv;
end $$;

create or replace function public.cms_change_member_state(p_company uuid,p_actor uuid,p_member uuid,p_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_limit record;v_row record;v_count int;
begin
 if p_status not in ('Active','Suspended','Archived') then raise exception 'Invalid state';end if;
 select * into v_limit from public.company_limits where company_id=p_company for update;
 select * into v_row from public.company_memberships where company_id=p_company and id=p_member for update;
 if not found then raise exception 'Membership not found';end if;
 if v_row.role='Primary Owner' then raise exception 'Primary Owner cannot be suspended or archived without transfer';end if;
 if p_status='Active' then
  if v_row.status='Invited' then raise exception 'Invited user must accept own secure invitation';end if;
  select count(*) into v_count from public.company_memberships
   where company_id=p_company and status in ('Active','Invited') and role<>'Primary Owner' and id<>p_member;
  if v_count>=v_limit.max_employee_seats then raise exception 'Employee seat limit reached';end if;
 end if;
 update public.company_memberships set status=p_status where id=p_member;
 insert into public.audit_events(company_id,actor,action,entity_type,entity_id,metadata)
 values(p_company,p_actor,'membership_state_changed','company_membership',p_member,jsonb_build_object('status',p_status));
 return p_member;
end $$;
revoke all on function public.cms_accept_company_invitation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.cms_reserve_employee_invite(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.cms_change_member_state(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.cms_accept_company_invitation(uuid,uuid) to service_role;
grant execute on function public.cms_reserve_employee_invite(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.cms_change_member_state(uuid,uuid,uuid,text) to service_role;
