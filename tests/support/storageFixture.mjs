// Supabase-owned objects that are not created by application migrations.
export async function storageFixture(db) {
  await db.exec(`
    do $$begin
      if not exists(select 1 from pg_roles where rolname='service_role') then
        create role service_role bypassrls;
      end if;
    end$$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid);
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
    $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select on storage.objects to anon,authenticated;
  `);
}
