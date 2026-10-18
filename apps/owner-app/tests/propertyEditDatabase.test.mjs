import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('atomic property edit: rollback, proof reuse, retry, ownership, video guard and manual approval', async () => {
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
    for (const n of [1, 2]) {
      await db.exec('reset role');
      await q('insert into auth.users(id,email) values($1,$2)', [id(n), `edit${n}@example.test`]);
      await as(n); await q('select public.owner_bootstrap()');
    }
    await as(1);
    const input = { id: '', name: 'Before', address: 'Jalan Contoh 1', city: 'Jakarta', province: 'DKI', latitude: null, longitude: null,
      gender_type: 'MIXED', description: '', rules: '', publication_status: 'ACTIVE', photos: [], facilities: [] };
    input.id = (await q('select public.owner_save_property($1) id', [input]))[0].id;
    const changed = { ...input, name: 'After' };
    const edit = (body = changed, attempt = 10, proof = null) => q('select public.owner_edit_property_and_submit($1,$2,$3) id', [body, id(attempt), proof]);
    const snapshot = async () => {
      await db.exec('reset role');
      return (await q(`select name,verification_status,
        (select count(*)::int from public.verification_submissions where property_id=$1) submissions,
        (select count(*)::int from private.property_edit_attempts) attempts
        from public.properties where id=$1`, [input.id]))[0];
    };
    await assert.rejects(edit(), /bukti/);
    assert.deepEqual(await snapshot(), { name: 'Before', verification_status: 'DRAFT', submissions: 0, attempts: 0 });
    await q("insert into public.owner_uploads(path,owner_id,purpose) values('proof',$1,'verification')", [id(1)]);
    await as(1);
    // Failure after owner_save_property must roll back its writes too.
    await db.exec('reset role');
    await db.exec(`create function public.fail_submission() returns trigger language plpgsql as $$begin raise exception 'test submission failure';end$$;
      create trigger fail_submission before insert on public.verification_submissions for each row execute function public.fail_submission();`);
    await as(1); await assert.rejects(edit(changed, 10, 'proof'), /test submission failure/);
    assert.deepEqual(await snapshot(), { name: 'Before', verification_status: 'DRAFT', submissions: 0, attempts: 0 });
    // Local in-memory fixture only; never runs against DEV.
    await db.exec('alter table public.verification_submissions disable trigger fail_submission');
    await as(1);
    await edit(changed, 10, 'proof'); await edit(changed, 10, 'proof');
    await assert.rejects(edit({ ...changed, name: 'Different' }, 10, 'proof'), /berubah/);
    assert.deepEqual(await snapshot(), { name: 'After', verification_status: 'PENDING', submissions: 1, attempts: 1 });
    await as(2); await assert.rejects(edit(changed, 11, 'proof'));
    await as(1); await assert.rejects(edit({ ...changed, video_path: 'video' }, 12), /video belum aktif/);
    await edit({ ...changed, name: 'Reuse proof' }, 13);
    assert.deepEqual(await snapshot(), { name: 'Reuse proof', verification_status: 'PENDING', submissions: 2, attempts: 2 });
    await as(1); await assert.rejects(q('select * from private.property_edit_attempts'), /permission denied/);
    await db.exec('reset role; set role anon'); await assert.rejects(edit(), /permission denied/);
  } finally { await db.close(); }
});
