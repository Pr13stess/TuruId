-- Only expose the display photo of an approved, publicly listed owner.
-- Profile rows remain protected by their existing RLS policies.
create function private.public_owner_avatar_path(pid uuid)
returns text language sql stable security definer set search_path = '' as $$
 select u.avatar_path
 from public.properties p join public.profiles u on u.id = p.owner_id
 where p.id = pid and (select auth.uid()) is not null
   and private.is_public_property(pid)
   and split_part(u.avatar_path, '/', 1) = p.owner_id::text;
$$;
revoke all on function private.public_owner_avatar_path(uuid) from public;
grant execute on function private.public_owner_avatar_path(uuid) to anon, authenticated;

create or replace view public.property_catalog with (security_invoker=true) as
select p.id,p.name,p.description,p.address,p.city,p.latitude,p.longitude,p.gender_type,p.rules,
 private.public_owner_label(p.id) as owner_name,
 coalesce((select jsonb_agg(m.storage_path order by m.sort_order,m.id) from public.property_media m where m.property_id=p.id),'[]'::jsonb) as images,
 coalesce((select jsonb_agg(f.name order by f.name) from public.property_facilities pf
 join public.facilities f on f.id=pf.facility_id where pf.property_id=p.id and f.is_active),'[]'::jsonb) as facilities,
 coalesce((select avg(r.rating)::numeric(3,2) from public.reviews r where r.property_id=p.id and r.moderation_status='APPROVED'),0) as rating,
 (select count(*)::integer from public.reviews r where r.property_id=p.id and r.moderation_status='APPROVED') as review_count,
 coalesce((select sum(r.available)::integer from public.room_catalog r where r.property_id=p.id),0) as available,
 private.public_owner_avatar_path(p.id) as owner_avatar_path
from public.properties p where private.is_public_property(p.id);

notify pgrst, 'reload schema';
