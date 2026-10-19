begin;

create table public.property_video_uploads (
  path text primary key,
  owner_id uuid not null references public.profiles(id),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size between 1 and 52428800),
  duration_seconds double precision not null check (duration_seconds > 0 and duration_seconds <= 60),
  created_at timestamptz not null default now(),
  check (path ~ ('^property-videos/' || owner_id::text || '/[0-9a-f-]{36}\.mp4$'))
);
alter table public.property_video_uploads enable row level security;
create policy property_video_uploads_owner_select on public.property_video_uploads
  for select to authenticated using (
    owner_id = auth.uid() and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE'
    )
  );
grant select on public.property_video_uploads to authenticated;
grant all on public.property_video_uploads to service_role;

create table public.property_videos (
  property_id uuid primary key references public.properties(id),
  storage_path text not null unique references public.property_video_uploads(path),
  updated_at timestamptz not null default now()
);
alter table public.property_videos enable row level security;
create policy property_videos_select on public.property_videos
  for select to anon, authenticated using (private.can_read_property(property_id));
grant select on public.property_videos to anon, authenticated;
grant all on public.property_videos to service_role;

create function private.property_video_read(path_value text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.property_video_uploads u
    where u.path = path_value and (
      (u.owner_id = auth.uid() and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE'
      )) or exists (
        select 1 from public.property_videos v
        where v.storage_path = u.path and private.can_read_property(v.property_id)
      )
    )
  );
$$;
revoke all on function private.property_video_read(text) from public;
grant execute on function private.property_video_read(text) to anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('property-videos', 'property-videos', false, 52428800, array['video/mp4']);
create policy property_videos_object_select on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'property-videos' and private.property_video_read('property-videos/' || name)
  );
-- No client INSERT/UPDATE/DELETE policies. Only the new validated Function writes.

create function public.owner_save_property_gallery(input jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.owner_actor();
  pid uuid;
  video_path text := nullif(input->>'video_path', '');
begin
  if jsonb_typeof(input->'photos') is distinct from 'array' then
    raise exception 'Daftar foto tidak valid.';
  end if;
  if jsonb_array_length(input->'photos') > 10 then
    raise exception 'Galeri kos maksimal 10 foto.';
  end if;
  if video_path is not null and not exists (
    select 1 from public.property_video_uploads u
    join storage.objects o on o.bucket_id = 'property-videos'
      and 'property-videos/' || o.name = u.path
    where u.path = video_path and u.owner_id = actor
  ) then
    raise exception 'Video belum selesai diunggah atau bukan milik Anda.';
  end if;
  -- Existing ownership checks, row lock, validation and verification behavior retained.
  pid := public.owner_save_property(input - 'video_path');
  if input ? 'video_path' then
    if video_path is null then
      delete from public.property_videos where property_id = pid;
    else
      insert into public.property_videos(property_id, storage_path) values(pid, video_path)
      on conflict(property_id) do update set storage_path = excluded.storage_path, updated_at = now();
    end if;
  end if;
  return pid;
end;
$$;
revoke all on function public.owner_save_property_gallery(jsonb) from public, anon;
grant execute on function public.owner_save_property_gallery(jsonb) to authenticated;

commit;
