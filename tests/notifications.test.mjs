import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseNotificationRepository } from '../apps/user-app/src/data/supabase/SupabaseNotificationRepository.ts';

test('notifications: own recipient filter, stable paging, server read RPC and honest failure', async () => {
  let fail = false, calls = 0;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      calls++;
      const url = new URL(String(input));
      if (fail) return Response.json({ message: 'Denied' }, { status: 403 });
      if (url.pathname.endsWith('/rpc/owner_profile')) {
        assert.deepEqual(JSON.parse(options.body), { action: 'read', input: { id: 'notice-1' } });
        return new Response(null, { status: 204 });
      }
      assert.equal(url.searchParams.get('recipient_id'), 'eq.user-one');
      assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc');
      assert.equal(url.searchParams.get('offset'), '20');
      assert.equal(url.searchParams.get('limit'), '21');
      return Response.json([{ id: 'notice-1', title: 'Booking', body: 'Updated', read_at: null,
        created_at: '2026-10-17T00:00:00Z', target_type: 'BOOKING', target_id: 'booking-1' }]);
    } },
  });
  client.auth.getUser = async () => ({ data: { user: { id: 'user-one' } }, error: null });
  const repo = new SupabaseNotificationRepository(client);
  assert.equal((await repo.list(1))[0].read_at, null);
  await repo.markRead('notice-1');
  fail = true;
  await assert.rejects(repo.list(1), /gagal dimuat/);
  await assert.rejects(repo.markRead('notice-1'), /belum ditandai/);
  assert.equal(calls, 4);
  client.auth.getUser = async () => ({ data: { user: null }, error: null });
  await assert.rejects(repo.list(1), /masuk/);
  assert.equal(calls, 4);
});
