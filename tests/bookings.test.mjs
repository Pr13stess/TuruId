import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { parseBooking } from '../apps/user-app/src/domain/bookings.ts';
import { listBookings, getBookingDetail } from '../apps/user-app/src/data/supabase/bookingQueries.ts';
import { MockCheckoutRepository } from '../apps/user-app/src/data/mock/MockCheckoutRepository.ts';
import { mockRooms } from '../apps/user-app/src/data/mock/fixtures.ts';
import { summarizeCost } from '../apps/user-app/src/domain/pricing.ts';

const row = { id: 'booking-1', booking_code: 'TURU-1', pricing_plan_id: 'plan-1', status: 'CONFIRMED', created_at: '2026-10-17T10:00:00Z',
  property_name_snapshot: 'Nama kos saat booking', room_type_name_snapshot: 'Kamar A', pricing_plan_name_snapshot: 'Bulanan',
  rent_price_snapshot: 1500000, down_payment_snapshot: 500000, security_deposit_snapshot: 500000, pay_now_snapshot: 1000000, remaining_rent_snapshot: 1000000 };
function client(fetcher) {
  const c = createClient('https://bookings-test.invalid', 'public-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } });
  c.auth.getUser = async () => ({ data: { user: { id: 'signed-in-user' } }, error: null });
  return c;
}
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
test('booking snapshots and statuses are validated without using current catalog prices', () => {
  assert.equal(parseBooking(row).rent, 1500000);
  assert.equal(parseBooking(row).propertyName, 'Nama kos saat booking');
  for (const patch of [{ status: 'UNKNOWN' }, { pay_now_snapshot: -1 }, { rent_price_snapshot: null }, { created_at: 'invalid' }]) {
    assert.throws(() => parseBooking({ ...row, ...patch }));
  }
});
test('list explicitly scopes own bookings, orders and paginates, filters server statuses', async () => {
  const c = client(async (url, init) => {
    const u = new URL(String(url));
    assert.equal(init.method, 'GET');
    assert.equal(u.pathname, '/rest/v1/bookings');
    assert.equal(u.searchParams.get('user_id'), 'eq.signed-in-user');
    assert.equal(u.searchParams.get('status'), 'in.(CONFIRMED,ACTIVE)');
    assert.equal(u.searchParams.get('order'), 'created_at.desc,id.desc');
    assert.equal(u.searchParams.get('offset'), '20');
    assert.equal(u.searchParams.get('limit'), '21');
    return response(Array.from({ length: 21 }, (_, i) => ({ ...row, id: `booking-${i}` })));
  });
  const result = await listBookings(c, 'ACTIVE', 1);
  assert.equal(result.items.length, 20); assert.equal(result.hasMore, true);
  await assert.rejects(listBookings(c, 'ALL', -1));
});
test('list distinguishes empty results from network or access failure', async () => {
  assert.deepEqual(await listBookings(client(async () => response([])), 'ALL', 0), { items: [], hasMore: false });
  await assert.rejects(listBookings(client(async () => response({ message: 'denied' }, 403)), 'ALL', 0), /gagal dimuat/);
});
test('detail checks own booking before querying payment/refund history', async () => {
  const calls = [];
  const c = client(async url => {
    const u = new URL(String(url)); calls.push(u.pathname);
    if (u.pathname.endsWith('/bookings')) {
      assert.equal(u.searchParams.get('user_id'), 'eq.signed-in-user');
      assert.equal(u.searchParams.get('id'), 'eq.booking-1');
      return response(row);
    }
    assert.equal(u.searchParams.get('booking_id'), 'eq.booking-1');
    return response([{ id: 'payment', status: 'SUCCESS', gross_amount: 1000000, created_at: row.created_at,
      refunds: [{ id: 'refund', status: 'PENDING', amount: 1000000 }] }]);
  });
  const result = await getBookingDetail(c, 'booking-1');
  assert.equal(result.payments[0].refunds[0].status, 'PENDING');
  assert.equal(result.payments[0].amount, 1000000);
  assert.equal(calls.length, 2);
  let deniedCalls = 0;
  await assert.rejects(getBookingDetail(client(async () => { deniedCalls++; return response(null); }), 'someone-else'), /tidak ditemukan/);
  assert.equal(deniedCalls, 1);
});
test('mock bookings follow the same checkout creation, payment, cancellation and expiry state', async () => {
  let now = Date.parse('2026-10-17T10:00:00Z');
  const repo = new MockCheckoutRepository(() => now);
  const plan = mockRooms.filter(r => r.available >= 2).flatMap(r => r.plans).find(p => summarizeCost(p).payNow > 0);
  assert.ok(plan);
  assert.equal((await repo.listBookings('ALL', 0)).items.length, 0);
  const { bookingId } = await repo.start(plan.id);
  assert.equal((await repo.listBookings('WAITING', 0)).items[0].id, bookingId);
  await repo.simulatePayment(bookingId);
  assert.equal((await repo.listBookings('ACTIVE', 0)).items[0].status, 'CONFIRMED');
  assert.equal((await repo.getBookingDetail(bookingId)).payments[0].status, 'SUCCESS');
  await assert.rejects(repo.cancel(bookingId));
  const second = await repo.start(plan.id);
  await repo.cancel(second.bookingId);
  assert.equal((await repo.listBookings('CANCELLED', 0)).items.length, 1);
  const third = await repo.start(plan.id);
  now += 16 * 60 * 1000;
  assert.equal((await repo.getBookingDetail(third.bookingId)).booking.status, 'CANCELLED');
});
