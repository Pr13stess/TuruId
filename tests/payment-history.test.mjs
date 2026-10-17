import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { listPaymentHistory } from '../apps/user-app/src/data/supabase/paymentHistoryQuery.ts';
import { parsePaymentHistory } from '../apps/user-app/src/domain/paymentHistory.ts';
import { MockCheckoutRepository } from '../apps/user-app/src/data/mock/MockCheckoutRepository.ts';
import { mockRooms } from '../apps/user-app/src/data/mock/fixtures.ts';
import { summarizeCost } from '../apps/user-app/src/domain/pricing.ts';
const row = { id: 'pay-1', booking_id: 'booking-1', status: 'SUCCESS', gross_amount: '150000', created_at: '2026-10-17T00:00:00Z',
  bookings: { booking_code: 'TURU-1', property_name_snapshot: 'Kos Lama', user_id: 'user-one' } };

test('payment history validates amounts, dates and booking relation; retains price/name snapshots', () => {
  assert.equal(parsePaymentHistory(row).amount, 150000);
  assert.equal(parsePaymentHistory(row).propertyName, 'Kos Lama');
  for (const amount of [null, '', -1, Infinity, true, 'abc', 1.5]) assert.throws(() => parsePaymentHistory({ ...row, gross_amount: amount }));
  assert.throws(() => parsePaymentHistory({ ...row, bookings: null }));
  assert.throws(() => parsePaymentHistory({ ...row, created_at: 'invalid' }));
});

test('payment history SDK: inner ownership filter, stable paging, empty/error/session distinction', async () => {
  let mode = 'data', calls = 0;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      calls++;
      const url = new URL(String(input));
      assert.match(url.searchParams.get('select'), /bookings!inner\(/);
      assert.equal(url.searchParams.get('bookings.user_id'), 'eq.user-one');
      assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc');
      assert.equal(url.searchParams.get('offset'), '20');
      assert.equal(url.searchParams.get('limit'), '21');
      if (mode === 'error') return Response.json({ message: 'Denied' }, { status: 403 });
      return Response.json(mode === 'empty' ? [] : Array.from({ length: 21 }, (_, i) => ({ ...row, id: `pay-${i}` })));
    } },
  });
  client.auth.getUser = async () => ({ data: { user: { id: 'user-one' } }, error: null });
  const result = await listPaymentHistory(client, 1);
  assert.equal(result.items.length, 20); assert.equal(result.hasMore, true);
  mode = 'empty'; assert.deepEqual(await listPaymentHistory(client, 1), { items: [], hasMore: false });
  mode = 'error'; await assert.rejects(listPaymentHistory(client, 1), /gagal dimuat/);
  await assert.rejects(listPaymentHistory(client, -1));
  client.auth.getUser = async () => ({ data: { user: null }, error: null });
  await assert.rejects(listPaymentHistory(client, 1), /masuk/);
  assert.equal(calls, 3);
});

test('payment history mock reflects checkout success and expiry without changing transaction amount', async () => {
  let now = Date.parse('2026-10-17T00:00:00Z');
  const repo = new MockCheckoutRepository(() => now);
  const room = mockRooms.find(r => r.available >= 2 && r.plans.some(p => summarizeCost(p).payNow > 0));
  const plan = room.plans.find(p => summarizeCost(p).payNow > 0);
  assert.deepEqual(await repo.listPayments(0), { items: [], hasMore: false });
  const first = await repo.start(plan.id);
  const pending = (await repo.listPayments(0)).items[0];
  assert.equal(pending.status, 'PENDING');
  await repo.simulatePayment(first.bookingId);
  const paid = (await repo.listPayments(0)).items[0];
  assert.equal(paid.status, 'SUCCESS'); assert.equal(paid.amount, pending.amount);
  now += 1000;
  const second = await repo.start(plan.id);
  now += 16 * 60 * 1000;
  const expired = (await repo.listPayments(0)).items[0];
  assert.equal(expired.bookingId, second.bookingId); assert.equal(expired.status, 'EXPIRED');
});
