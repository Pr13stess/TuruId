import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { reviewReplyText, createReplySubmission } from '../src/domain/reviewReply.ts';
import { replyToReview } from '../src/data/supabase/reviewReply.ts';
import { MockStore } from '../src/data/mock/MockStore.ts';
import { MockPropertyRepository } from '../src/data/mock/Repositories.ts';

test('reply draft validates Unicode and preserves original body after uncertain failure and double tap', async () => {
  assert.equal(reviewReplyText(' terima kasih '), 'terima kasih');
  for (const text of [' ', 'a'.repeat(2001)]) assert.throws(() => reviewReplyText(text));
  assert.equal([...reviewReplyText('😀'.repeat(2000))].length, 2000);
  const bodies = []; let fail = true;
  const send = createReplySubmission(async text => { bodies.push(text); if (fail) throw new Error('lost response'); });
  const first = send('Terima kasih'); assert.equal(send('Changed'), first);
  await assert.rejects(first); fail = false;
  await send('Changed'); assert.deepEqual(bodies, ['Terima kasih', 'Terima kasih']);
});

test('reply adapter uses narrow RPC and never reports missing or malformed response as success', async () => {
  let response = 'r1', status = 200;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, options) => {
      assert.match(String(input), /rpc\/owner_reply_review$/);
      assert.deepEqual(JSON.parse(options.body), { p_review_id: 'r1', p_text: 'Terima kasih' });
      return Response.json(response, { status });
    } },
  });
  await replyToReview(client, 'r1', ' Terima kasih ');
  response = 'other'; await assert.rejects(replyToReview(client, 'r1', 'Terima kasih'), /dikonfirmasi/);
  status = 404; response = { code: 'PGRST202', message: 'missing' };
  await assert.rejects(replyToReview(client, 'r1', 'Terima kasih'), /belum diaktifkan/);
});

test('demo reply persists one response and retry retains timestamp', async () => {
  let saved;
  const store = new MockStore({ getItem: async () => saved, setItem: async (_key, value) => { saved = value; } });
  const repo = new MockPropertyRepository(store);
  const review = (await repo.dashboard()).reviews[0];
  await repo.replyReview(review.id, 'Terima kasih');
  const first = (await repo.reviews(review.property_id))[0];
  await repo.replyReview(review.id, 'Terima kasih');
  assert.deepEqual((await repo.reviews(review.property_id))[0], first);
  await assert.rejects(repo.replyReview(review.id, 'Berbeda'), /sudah dibalas/);
  await assert.rejects(repo.replyReview('missing', 'Terima kasih'), /tidak tersedia/);
});
