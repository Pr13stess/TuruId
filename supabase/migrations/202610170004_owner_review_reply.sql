alter table public.reviews
  add column owner_reply text,
  add column owner_reply_at timestamptz,
  add constraint review_owner_reply_valid check (
    (owner_reply is null and owner_reply_at is null)
    or (owner_reply is not null and owner_reply_at is not null
        and length(btrim(owner_reply)) between 1 and 2000)
  );

create function public.owner_reply_review(p_review_id uuid, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  item public.reviews;
  body text := btrim(p_text);
begin
  if actor is null or not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = actor and p.status = 'ACTIVE' and ur.role = 'OWNER'
  ) then
    raise exception 'Akun owner aktif diperlukan.';
  end if;
  if body is null or length(body) not between 1 and 2000 then
    raise exception 'Balasan harus berisi 1–2000 karakter.';
  end if;
  select * into item from public.reviews where id = p_review_id for update;
  if item.id is null then
    raise exception 'Ulasan tidak tersedia.';
  end if;
  perform 1 from public.properties
    where id = item.property_id and owner_id = actor and deleted_at is null
    for share;
  if not found or item.moderation_status <> 'APPROVED' then
    raise exception 'Ulasan tidak tersedia untuk dibalas.';
  end if;
  if item.owner_reply is not null then
    if item.owner_reply = body then return item.id; end if;
    raise exception 'Ulasan ini sudah dibalas. Muat ulang untuk melihat balasan.';
  end if;
  update public.reviews
    set owner_reply = body, owner_reply_at = now()
    where id = item.id;
  return item.id;
end;
$$;
revoke all on function public.owner_reply_review(uuid,text) from public,anon;
grant execute on function public.owner_reply_review(uuid,text) to authenticated;
