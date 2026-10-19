import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('video SQL: owner-only upload metadata, atomic attachment, private reads and retry', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async n => {
    await db.exec('reset role; set role authenticated;');
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]);
  };
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated;`);
    for (const folder of ['base', 'migrations'])
      for (const file of (await readdir(`supabase/${folder}`)).filter(f => f.endsWith('.sql')).sort())
        await db.exec(await readFile(`supabase/${folder}/${file}`, 'utf8'));
    await db.exec(await readFile('../../supabase/migrations/20261018233349_owner_edit_property_and_submit.sql', 'utf8'));
    await db.exec(await readFile('../../supabase/migrations/20261019043019_property_video.sql', 'utf8'));
    for (const n of [1, 2]) {
      await db.exec('reset role');
      await q('insert into auth.users(id,email) values($1,$2)', [id(n), `edit${n}@example.test`]);
      await as(n); await q('select public.owner_bootstrap()');
    }
    await as(1);
    const input = { id: '', name: 'Before', address: 'Jalan Contoh 1', city: 'Jakarta', province: 'DKI', latitude: null, longitude: null,
      gender_type: 'MIXED', description: '', rules: '', publication_status: 'ACTIVE', photos: [], facilities: [] };
    input.id = (await q('select public.owner_save_property($1) id', [input]))[0].id;
    const path = `property-videos/${id(1)}/${id(20)}.mp4`;
    await db.exec('reset role');
    await q("insert into public.owner_uploads(path,owner_id,purpose) values('proof',$1,'verification')", [id(1)]);
    await q("insert into public.property_video_uploads(path,owner_id,sha256,byte_size,duration_seconds) values($1,$2,$3,17825792,10)", [path,id(1),'a'.repeat(64)]);
    await as(1);
    const edit = (body, attempt=30) => q('select public.owner_edit_property_and_submit($1,$2,$3)', [body,id(attempt),'proof']);
    await assert.rejects(edit({...input, name:'With video', video_path:path}), /belum selesai/);
    assert.equal((await q('select count(*)::int n from public.verification_submissions'))[0].n,0);
    await db.exec('reset role');
    await q("insert into storage.objects(bucket_id,name) values('property-videos',$1)", [path.slice('property-videos/'.length)]);
    await as(1);
    const payload = {...input,name:'With video',video_path:path};
    await edit(payload); await edit(payload);
    assert.equal((await q('select count(*)::int n from public.verification_submissions'))[0].n,1);
    assert.equal((await q('select storage_path from public.property_videos'))[0].storage_path,path);
    assert.equal((await q("select count(*)::int n from storage.objects where bucket_id='property-videos'"))[0].n,1);
    await assert.rejects(q('insert into public.property_videos(property_id,storage_path) values($1,$2)',[input.id,path]), /permission denied/);
    await as(2);
    assert.equal((await q('select count(*)::int n from public.property_videos'))[0].n,0);
    assert.equal((await q('select count(*)::int n from public.property_video_uploads'))[0].n,0);
    assert.equal((await q("select count(*)::int n from storage.objects where bucket_id='property-videos'"))[0].n,0);
    await assert.rejects(edit(payload,31));
    await db.exec('reset role; set role anon');
    assert.equal((await q('select count(*)::int n from public.property_videos'))[0].n,0);
    await as(1);
    await edit({...input,video_path:''},32);
    assert.equal((await q('select count(*)::int n from public.property_videos'))[0].n,0);
    assert.equal((await q("select count(*)::int n from storage.objects where bucket_id='property-videos'"))[0].n,1);
  } finally { await db.close(); }
});
