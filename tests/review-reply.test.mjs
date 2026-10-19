import { storageFixture } from "./support/storageFixture.mjs";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { listPublicReviews } from '../apps/user-app/src/data/supabase/publicReviews.ts';

test('public reply reader supports old schema only for missing reply columns; failures remain visible', async () => {
  let mode = 'new'; const requests = [];
  const row = { id: 'r1', rating: 5, review_text: 'Nyaman', created_at: '2026-10-17T00:00:00Z' };
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async input => {
      const fields = new URL(String(input)).searchParams.get('select'); requests.push(fields);
      if (mode === 'denied') return Response.json({ code: '42501', message: 'denied owner_reply' }, { status: 403 });
      if (mode === 'unrelated') return Response.json({ code: '42703', message: 'column other missing' }, { status: 400 });
      if (mode === 'old' && fields.includes('owner_reply'))
        return Response.json({ code: '42703', message: 'column reviews.owner_reply does not exist' }, { status: 400 });
      return Response.json([mode === 'old' ? row : { ...row, owner_reply: 'Terima kasih', owner_reply_at: mode === 'invalid' ? 'invalid' : row.created_at }]);
    } },
  });
  assert.equal((await listPublicReviews(client, 'p1', 0))[0].owner_reply, 'Terima kasih');
  mode = 'old'; requests.length = 0;
  assert.equal((await listPublicReviews(client, 'p1', 0))[0].owner_reply, undefined);
  assert.equal(requests.length, 2); assert.equal(requests[1], 'id,rating,review_text,created_at');
  for (mode of ['denied', 'unrelated', 'invalid']) {
    requests.length = 0; await assert.rejects(listPublicReviews(client, 'p1', 0)); assert.equal(requests.length, 1);
  }
});

test('reply SQL enforces ownership, approval, immutable retry and parent visibility', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async (n, role = 'authenticated') => {
    await db.exec(`reset role;set role ${role};`);
    await q("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : '']);
  };
  const reply = text => q('select public.owner_reply_review($1,$2) id', [id(9200), text]);
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    await storageFixture(db);
    for (const file of (await readdir('supabase/migrations')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    await q(`insert into public.bookings(id,booking_code,user_id,room_type_id,pricing_plan_id,status)
      values($1,'REPLY-TEST',$2,$3,$4,'COMPLETED')`, [id(9200),id(3),id(200),id(1001)]);
    await q(`insert into public.reviews(id,booking_id,user_id,property_id,rating,review_text)
      values($1,$1,$2,$3,5,'Nyaman')`, [id(9200),id(3),id(100)]);
    await as(1); await assert.rejects(reply('Terima kasih'), /tidak tersedia/);
    await db.exec('reset role'); await q("update public.reviews set moderation_status='APPROVED' where id=$1", [id(9200)]);
    await as(2); await assert.rejects(reply('Terima kasih'), /tidak tersedia/);
    await as(3); await assert.rejects(reply('Terima kasih'), /owner aktif/);
    await as(0, 'anon'); await assert.rejects(reply('Terima kasih'), /permission denied/);
    await as(1);
    for (const text of [null, ' ', 'x'.repeat(2001)]) await assert.rejects(reply(text), /1–2000/);
    await assert.rejects(q('update public.reviews set owner_reply=$1 where id=$2', ['Bypass',id(9200)]), /permission denied/);
    assert.equal((await reply(' Terima kasih '))[0].id, id(9200));
    const first = (await q('select * from public.reviews where id=$1', [id(9200)]))[0];
    await reply('Terima kasih');
    assert.deepEqual((await q('select * from public.reviews where id=$1', [id(9200)]))[0], first);
    await assert.rejects(reply('Berbeda'), /sudah dibalas/);
    await as(4); assert.equal((await q('select owner_reply from public.reviews where id=$1', [id(9200)]))[0].owner_reply, 'Terima kasih');
    await db.exec('reset role'); await q("update public.reviews set moderation_status='HIDDEN' where id=$1", [id(9200)]);
    await as(4); assert.equal((await q('select * from public.reviews where id=$1', [id(9200)])).length, 0);
    await as(1); await assert.rejects(reply('Terima kasih'), /tidak tersedia/);
    await db.exec('reset role'); await q("update public.profiles set status='SUSPENDED' where id=$1", [id(1)]);
    await as(1); await assert.rejects(reply('Terima kasih'), /owner aktif/);
  } finally { await db.close(); }
});
