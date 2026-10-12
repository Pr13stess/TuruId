-- Run only against the approved DEV project. No decisions or user data writes.
begin read only;
select p.proname, p.prosecdef as security_definer, p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('admin_verification_queue','admin_review_verification');

do $$
declare actor uuid;
begin
  select r.user_id into actor from public.user_roles r join public.profiles p on p.id=r.user_id
  where r.role='ADMIN' and p.status='ACTIVE' order by r.user_id limit 1;
  if actor is null then raise exception 'No active DEV admin for read-only smoke test'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
select 'OWNER' as target, public.admin_verification_queue('OWNER')->>'total' as pending_count;
select 'PROPERTY' as target, public.admin_verification_queue('PROPERTY')->>'total' as pending_count;
reset role;

do $$
declare actor uuid;
begin
  select p.id into actor from public.profiles p where p.status='ACTIVE'
    and not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='ADMIN')
    order by p.id limit 1;
  if actor is null then raise exception 'No non-admin fixture available'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$
begin
  begin
    perform public.admin_verification_queue('OWNER');
    raise exception 'SECURITY FAILURE: non-admin queue allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_review_verification(gen_random_uuid(),'APPROVED','',now());
    raise exception 'SECURITY FAILURE: non-admin review allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'PASS: non-admin queue and review rejected' as guard_result;
rollback;
