import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import * as user from '../apps/user-app/src/domain/chatReceipt.ts';
import * as owner from '../apps/owner-app/src/domain/chatReceipt.ts';

for (const [name, receipt] of [['User', user], ['Owner', owner]]) {
  test(`${name}: read status requires every collage message to precede the peer receipt`, () => {
    const group = [{ created_at: '2026-10-12T10:00:00Z' }, { created_at: '2026-10-12T10:02:00Z' }];
    assert.equal(receipt.groupWasRead(group, null), false);
    assert.equal(receipt.groupWasRead(group, 'invalid'), false);
    assert.equal(receipt.groupWasRead(group, '2026-10-12T10:01:00Z'), false);
    assert.equal(receipt.groupWasRead(group, '2026-10-12T10:02:00Z'), false);
    assert.equal(receipt.groupWasRead(group, '2026-10-12T10:03:00Z'), true);
    assert.equal(receipt.groupWasRead([], '2026-10-12T10:03:00Z'), false);
  });

  test(`${name}: receipt uses existing server-clock RPC and participant-scoped query; errors never mean read`, async () => {
    const calls = [];
    let markFails = false;
    let readFails = false;
    let peers = [{ user_id: 'peer', last_read_at: '2026-10-12T10:03:00Z' }];
    const client = createClient('https://receipt-test.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (url, init) => {
        const request = new URL(String(url));
        calls.push(request);
        if (request.pathname.endsWith('/rpc/communication_messages')) {
          assert.deepEqual(JSON.parse(init.body), { cid: 'conversation' });
          return new Response(JSON.stringify(markFails ? { message: 'not a participant' } : []), { status: markFails ? 403 : 200 });
        }
        assert.equal(request.pathname, '/rest/v1/conversation_participants');
        assert.equal(request.searchParams.get('conversation_id'), 'eq.conversation');
        assert.equal(request.searchParams.get('user_id'), 'neq.sender');
        assert.equal(request.searchParams.get('select'), 'user_id,last_read_at');
        return new Response(JSON.stringify(readFails ? { message: 'offline' } : peers), { status: readFails ? 503 : 200 });
      } },
    });
    assert.equal(await receipt.syncChatReceipt(client, 'conversation', 'sender'), '2026-10-12T10:03:00Z');
    peers = [{ user_id: 'peer', last_read_at: null }];
    assert.equal(await receipt.syncChatReceipt(client, 'conversation', 'sender'), null);
    peers = [];
    assert.equal(await receipt.syncChatReceipt(client, 'conversation', 'sender'), null);
    markFails = true;
    const before = calls.length;
    await assert.rejects(receipt.syncChatReceipt(client, 'conversation', 'sender'), /not a participant/);
    assert.equal(calls.length, before + 1);
    markFails = false; readFails = true;
    await assert.rejects(receipt.syncChatReceipt(client, 'conversation', 'sender'), /offline/);
  });
}
