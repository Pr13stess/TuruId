import { storageFixture } from "./support/storageFixture.mjs";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { reviewText } from '../apps/user-app/src/domain/repositories/ReviewRepository.ts';
import { SupabaseReviewRepository } from '../apps/user-app/src/data/supabase/SupabaseReviewRepository.ts';
import { MockReviewRepository } from '../apps/user-app/src/data/mock/MockReviewRepository.ts';

test('review validation and mock retry retain one pending review', async () => {
  for (const rating of [0, 6, 1.5, NaN]) assert.throws(() => reviewText(rating, 'Nyaman sekali'));
  assert.throws(() => reviewText(4, '    '));
  assert.throws(() => reviewText(4, 'a'.repeat(2001)));
  assert.equal(reviewText(4, ' Nyaman sekali '), 'Nyaman sekali');
  let status = 'ACTIVE';
  const repo = new MockReviewRepository({ getSession: async () => ({ user: { id: 'user-1' } }) },
    { getBookingDetail: async () => ({ booking: { status } }) });
  await assert.rejects(repo.submit('b1', 4, 'Nyaman sekali'));
  status = 'COMPLETED';
  const id = await repo.submit('b1', 4, 'Nyaman sekali');
  assert.equal(await repo.submit('b1', 4, 'Nyaman sekali'), id);
  assert.equal((await repo.get('b1')).moderation_status, 'PENDING');
  await assert.rejects(repo.submit('b1', 5, 'Isi berubah'));
});

test('review SDK scopes own review and sends only booking/rating/text, preserving retries', async () => {
  let missing = false;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/rpc/user_submit_review')) {
        assert.deepEqual(JSON.parse(options.body), { p_booking_id: 'b1', p_rating: 4, p_text: 'Nyaman sekali' });
        return missing ? Response.json({ code: 'PGRST202', message: 'missing' }, { status: 404 }) : Response.json('review-1');
      }
      assert.equal(url.searchParams.get('booking_id'), 'eq.b1');
      assert.equal(url.searchParams.get('user_id'), 'eq.user-1');
      return Response.json([{ id: 'review-1', rating: 4, review_text: 'Nyaman sekali', moderation_status: 'PENDING' }]);
    } },
  });
  client.auth.getUser = async () => ({ data: { user: { id: 'user-1' } }, error: null });
  const repo = new SupabaseReviewRepository(client);
  assert.equal(await repo.submit('b1', 4, ' Nyaman sekali '), 'review-1');
  assert.equal(await repo.submit('b1', 4, 'Nyaman sekali'), 'review-1');
  assert.equal((await repo.get('b1')).moderation_status, 'PENDING');
  missing = true; await assert.rejects(repo.submit('b1', 4, 'Nyaman sekali'), /belum diaktifkan/);
});

test('review SQL validates eligibility, moderation and idempotent retry with real constraints', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async n => {
    await db.exec('reset role;set role authenticated;');
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]);
  };
  const submit = async (booking = 9100, rating = 4, text = 'Nyaman sekali') =>
    (await q('select public.user_submit_review($1,$2,$3) id', [id(booking), rating, text]))[0].id;
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    await storageFixture(db);
    for (const file of (await readdir('supabase/migrations')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    for (const [number, status] of [[9100, 'COMPLETED'], [9101, 'ACTIVE']]) await q(`insert into public.bookings
      (id,booking_code,user_id,room_type_id,pricing_plan_id,status) values($1,$2,$3,$4,$5,$6)`,
      [id(number), `REVIEW-${number}`, id(3), id(200), id(1001), status]);
    await as(4); await assert.rejects(submit(), /milik sendiri/);
    await as(3); await assert.rejects(submit(9101), /milik sendiri/);
    for (const rating of [null, 0, 6]) await assert.rejects(submit(9100, rating));
    for (const text of [null, ' ', 'abc', 'x'.repeat(2001)]) await assert.rejects(submit(9100, 4, text));
    const result = await submit();
    assert.equal(await submit(), result);
    await assert.rejects(submit(9100, 5), /sudah memiliki/);
    const rows = await q('select * from public.reviews where booking_id=$1', [id(9100)]);
    assert.equal(rows.length, 1); assert.equal(rows[0].moderation_status, 'PENDING');
    assert.equal(rows[0].property_id, id(100)); assert.equal(rows[0].user_id, id(3));
    await assert.rejects(q("update public.reviews set moderation_status='APPROVED' where id=$1", [result]), /permission denied/);
    await as(4); assert.equal((await q('select * from public.reviews where id=$1', [result])).length, 0);
    await db.exec('reset role;set role anon;'); await assert.rejects(submit(), /permission denied/);
    await db.exec('reset role'); await q("update public.profiles set status='SUSPENDED' where id=$1", [id(3)]);
    await as(3); await assert.rejects(submit(), /Sesi tidak aktif/);
  } finally { await db.close(); }
});
