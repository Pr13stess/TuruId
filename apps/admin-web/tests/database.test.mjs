import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../../', import.meta.url);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('Admin verification SQL against root schema and existing owner migrations', async (t) => {
  const db = new PGlite();
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async (who) => {
    await db.exec('reset role; set role authenticated;');
    await rows("select set_config('request.jwt.claim.sub',$1,false)", [who]);
  };
  const superuser = () => db.exec('reset role;');
  const queue = async (kind = 'OWNER') => (await rows('select public.admin_verification_queue($1) value', [kind]))[0].value;
  const review = async (submission, decision = 'APPROVED', reason = '') => (await rows(
    'select public.admin_review_verification($1,$2,$3,$4) value',
    [submission.id, decision, reason, submission.target_updated_at],
  ))[0].value;
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid);
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated;`);
    for (const dir of ['supabase/migrations/', 'apps/owner-app/supabase/migrations/']) {
      for (const file of (await readdir(new URL(dir, root))).filter((f) => f.endsWith('.sql')).sort()) {
        await db.exec(await readFile(new URL(dir + file, root), 'utf8'));
      }
    }
    await db.exec(await readFile(new URL('supabase/seed.sql', root), 'utf8'));
    await rows("insert into public.user_roles(user_id,role) values($1,'ADMIN')", [id(4)]);
    const owner = (await rows('select id from public.owner_profiles where user_id=$1', [id(2)]))[0].id;
    const evidence = `owner-media/${id(2)}/verification/${id(900)}.jpg`;
    await rows("insert into public.owner_uploads(path,owner_id,purpose) values($1,$2,'verification')", [evidence, id(2)]);
    await rows("insert into storage.objects(bucket_id,name) values('owner-media',$1)", [evidence.slice(12)]);
    const submission = async (target, targetId, n) => {
      await superuser();
      await rows(`insert into public.verification_submissions(id,target_type,owner_profile_id,property_id,submitted_by,evidence_path)
        values($1,$2,$3,$4,$5,$6)`, [id(n), target, target === 'OWNER' ? targetId : null, target === 'PROPERTY' ? targetId : null, id(2), evidence]);
    };
    await submission('OWNER', owner, 901);
    await t.test('non-admin, anonymous and suspended admin cannot use RPCs', async () => {
      await as(id(3));
      await assert.rejects(queue(), { code: '42501' });
      await assert.rejects(review({ id: id(901), target_updated_at: null }), { code: '42501' });
      await db.exec('reset role; set role anon;');
      await assert.rejects(queue(), { code: '42501' });
      await superuser();
      await rows("update public.profiles set status='SUSPENDED' where id=$1", [id(4)]);
      await as(id(4));
      await assert.rejects(queue(), { code: '42501' });
      await superuser();
      await rows("update public.profiles set status='ACTIVE' where id=$1", [id(4)]);
    });
    await t.test('evidence is private: admin and owner may read; third account cannot', async () => {
      for (const [who, expected] of [[id(5), 1], [id(2), 1], [id(3), 0]]) {
        await as(who);
        assert.equal((await rows("select * from storage.objects where bucket_id='owner-media'")).length, expected);
      }
    });
    await t.test('approve owner is separate from property; retry does not duplicate audit or notice', async () => {
      await as(id(5));
      const item = (await queue()).items.find((v) => v.id === id(901));
      assert.equal(item.is_latest, true);
      const before = await rows('select id,verification_status,publication_status from public.properties order by id');
      assert.equal(await review(item), item.id);
      assert.equal(await review(item), item.id);
      await as(id(4));
      await assert.rejects(review(item, 'REJECTED', 'Dokumen kurang jelas'), { code: '40001' });
      assert.deepEqual(await rows('select id,verification_status,publication_status from public.properties order by id'), before);
      await superuser();
      assert.equal((await rows('select verification_status,verified_at from public.owner_profiles where id=$1', [owner]))[0].verification_status, 'APPROVED');
      assert.equal((await rows("select count(*)::int n from public.audit_logs where metadata->>'submission_id'=$1", [item.id]))[0].n, 1);
      assert.equal((await rows('select count(*)::int n from public.notifications where event_key=$1', [`verification:${item.id}:APPROVED`]))[0].n, 1);
    });
    await superuser();
    await rows(`insert into public.properties(id,owner_id,name,address,city,gender_type,verification_status,publication_status)
      values($1,$2,'Kos test admin','Alamat test','Kota test','MIXED','PENDING','INACTIVE')`, [id(9902), id(2)]);
    await submission('PROPERTY', id(9902), 903);
    await t.test('invalid reason/stale version rejected; property approval preserves publication and owner', async () => {
      await as(id(5));
      const item = (await queue('PROPERTY')).items.find((v) => v.id === id(903));
      await assert.rejects(review(item, 'REJECTED', 'no'), { code: '22023' });
      await assert.rejects(review({ ...item, target_updated_at: '2000-01-01T00:00:00Z' }), { code: '40001' });
      await review(item);
      const property = (await rows('select verification_status,publication_status from public.properties where id=$1', [id(9902)]))[0];
      assert.deepEqual(property, { verification_status: 'APPROVED', publication_status: 'INACTIVE' });
      assert.equal((await rows('select verification_status from public.owner_profiles where id=$1', [owner]))[0].verification_status, 'APPROVED');
    });
    await superuser();
    await rows("update public.owner_profiles set verification_status='PENDING' where id=$1", [owner]);
    await submission('OWNER', owner, 906);
    await t.test('rejection stores trimmed reason, clears owner verified_at and supports retry', async () => {
      await as(id(5));
      const item = (await queue()).items.find((v) => v.id === id(906));
      await review(item, 'REJECTED', '  Dokumen belum jelas  ');
      await review(item, 'REJECTED', 'Dokumen belum jelas');
      assert.deepEqual((await rows('select verification_status,verified_at from public.owner_profiles where id=$1', [owner]))[0], { verification_status: 'REJECTED', verified_at: null });
      assert.equal((await rows('select review_reason from public.verification_submissions where id=$1', [item.id]))[0].review_reason, 'Dokumen belum jelas');
    });
    await superuser();
    await rows("update public.owner_profiles set verification_status='PENDING' where id=$1", [owner]);
    await submission('OWNER', owner, 904);
    await submission('OWNER', owner, 905);
    await t.test('superseded submission rejected; audit failure rolls back all changes', async () => {
      await as(id(5));
      const items = (await queue()).items;
      const older = items.find((v) => v.id === id(904));
      const latest = items.find((v) => v.id === id(905));
      assert.equal(older.is_latest, false);
      await assert.rejects(review(older), { code: '40001' });
      await superuser();
      // Test-only constraint in the in-memory database; never applied to DEV.
      await db.exec(`alter table public.audit_logs add constraint test_audit_failure check(action <> 'ADMIN_VERIFICATION_REJECTED' or metadata->>'submission_id' <> '${latest.id}');`);
      await as(id(5));
      await assert.rejects(review(latest, 'REJECTED', 'Dokumen tidak terbaca'), { code: '23514' });
      assert.equal((await queue()).items.find((v) => v.id === latest.id).current_status, 'PENDING');
      assert.equal((await rows('select status from public.verification_submissions where id=$1', [latest.id]))[0].status, 'PENDING');
      await superuser();
      assert.equal((await rows('select count(*)::int n from public.notifications where event_key=$1', [`verification:${latest.id}:REJECTED`]))[0].n, 0);
      await as(id(5));
      await review(latest);
    });
  } finally {
    await db.close();
  }
});
