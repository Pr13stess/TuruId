import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { MockAuthRepository } from '../apps/user-app/src/data/mock/MockAuthRepository.ts';
import { MockFavoriteRepository } from '../apps/user-app/src/data/mock/MockFavoriteRepository.ts';
import { SupabaseFavoriteRepository } from '../apps/user-app/src/data/supabase/SupabaseFavoriteRepository.ts';
import { mockProperties } from '../apps/user-app/src/data/mock/fixtures.ts';

test('favorites mock: retry is idempotent and account switching stays private', async () => {
  const auth = new MockAuthRepository(), repo = new MockFavoriteRepository(auth), id = mockProperties[0].id;
  await assert.rejects(repo.list(0));
  await auth.signUp('one@example.test', 'secret1');
  await repo.set(id, true); await repo.set(id, true);
  assert.equal((await repo.list(0)).length, 1);
  await auth.signUp('two@example.test', 'secret2');
  assert.equal(await repo.has(id), false);
  await repo.set(id, false);
  await auth.signIn('one@example.test', 'secret1');
  assert.equal(await repo.has(id), true);
  await repo.set(id, false); await repo.set(id, false);
  assert.deepEqual(await repo.list(0), []);
});

test('favorites SDK: explicit owner filters, immutable retry, unavailable listing and failed write', async () => {
  let saved = false, fail = false;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      const url = new URL(String(input)), method = options.method ?? 'GET';
      if (url.pathname.endsWith('/property_catalog')) return Response.json([]);
      if (method === 'POST') {
        assert.deepEqual(JSON.parse(options.body), { user_id: 'u1', property_id: 'p1' });
        assert.match(new Headers(options.headers).get('Prefer'), /resolution=ignore-duplicates/);
        if (fail) return Response.json({ message: 'Denied' }, { status: 403 });
        saved = true; return new Response(null, { status: 201 });
      }
      assert.equal(url.searchParams.get('user_id'), 'eq.u1');
      if (method === 'DELETE') {
        assert.equal(url.searchParams.get('property_id'), 'eq.p1'); saved = false;
        return new Response(null, { status: 204 });
      }
      if (url.searchParams.has('limit')) {
        assert.equal(url.searchParams.get('limit'), '21');
        assert.equal(url.searchParams.get('offset'), '20');
        assert.equal(url.searchParams.get('order'), 'created_at.desc,property_id.desc');
        return Response.json([{ property_id: 'p1', created_at: '2026-10-17T00:00:00Z' }]);
      }
      return Response.json(saved ? [{ property_id: 'p1' }] : []);
    } },
  });
  client.auth.getUser = async () => ({ data: { user: { id: 'u1' } }, error: null });
  const repo = new SupabaseFavoriteRepository(client);
  await repo.set('p1', true); await repo.set('p1', true);
  assert.equal(await repo.has('p1'), true);
  assert.equal((await repo.list(1))[0].available, false);
  await repo.set('p1', false);
  assert.equal(await repo.has('p1'), false);
  fail = true;
  await assert.rejects(repo.set('p1', true), /gagal/);
  assert.equal(await repo.has('p1'), false);
});

test('favorites SQL: private reads/writes, public-only insertion, duplicate retry and removal after archive', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    for (const file of (await readdir('supabase/migrations')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    const as = async n => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id(n)}',false);`);
    await as(3);
    await db.exec(`insert into public.favorites(user_id,property_id) values('${id(3)}','${id(100)}') on conflict do nothing;`);
    await db.exec(`insert into public.favorites(user_id,property_id) values('${id(3)}','${id(100)}') on conflict do nothing;`);
    assert.equal((await db.query('select * from public.favorites')).rows.length, 1);
    await assert.rejects(db.exec(`insert into public.favorites(user_id,property_id) values('${id(4)}','${id(101)}');`));
    await as(4);
    assert.equal((await db.query('select * from public.favorites')).rows.length, 0);
    assert.equal((await db.query(`delete from public.favorites where user_id='${id(3)}' returning *`)).rows.length, 0);
    await db.exec(`reset role; update public.properties set publication_status='DRAFT' where id='${id(100)}';`);
    await as(4);
    await assert.rejects(db.exec(`insert into public.favorites(user_id,property_id) values('${id(4)}','${id(100)}');`));
    await as(3);
    assert.equal((await db.query(`delete from public.favorites where property_id='${id(100)}' returning *`)).rows.length, 1);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.exec(`insert into public.favorites(user_id,property_id) values('${id(3)}','${id(101)}');`));
  } finally { await db.close(); }
});
