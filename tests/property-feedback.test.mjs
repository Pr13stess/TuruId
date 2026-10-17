import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { propertyShareText } from '../apps/user-app/src/domain/propertyFeedback.ts';
import { listPublicReviews } from '../apps/user-app/src/data/supabase/publicReviews.ts';

test('share includes actual name/address and only a valid map location, not a fabricated listing URL', () => {
  const p = { name: 'Kos A', address: 'Jalan A', latitude: 0, longitude: 0 };
  assert.match(propertyShareText(p), /Kos A — TuruId\nJalan A/);
  assert.match(propertyShareText(p), /mlat=0&mlon=0/);
  for (const latitude of [null, NaN, 91]) assert.doesNotMatch(propertyShareText({ ...p, latitude }), /https:/);
});

test('public reviews explicitly filter approval even for multi-role accounts, paginate and surface failure', async () => {
  let fail = false;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('property_id'), 'eq.property-1');
      assert.equal(url.searchParams.get('moderation_status'), 'eq.APPROVED');
      assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc');
      assert.equal(url.searchParams.get('offset'), '20');
      assert.equal(url.searchParams.get('limit'), '21');
      assert.equal(url.searchParams.get('select'), 'id,rating,review_text,created_at,owner_reply,owner_reply_at');
      return Response.json(fail ? { message: 'denied' } : [{ id: 'r1', rating: 4, review_text: 'Nyaman', created_at: '2026-10-17T00:00:00Z' }], { status: fail ? 403 : 200 });
    } },
  });
  assert.equal((await listPublicReviews(client, 'property-1', 1))[0].rating, 4);
  fail = true; await assert.rejects(listPublicReviews(client, 'property-1', 1), /gagal dimuat/);
  await assert.rejects(listPublicReviews(client, 'property-1', -1));
});
