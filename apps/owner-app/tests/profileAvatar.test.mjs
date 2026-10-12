import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { avatarBytes, uploadProfileAvatar } from '../src/data/supabase/profileAvatar.ts';

const input = { base64: Buffer.from([255, 216, 255, 224, 0, 0]).toString('base64'), mime: 'image/jpeg' };
test('avatar validates JPEG header and size before upload', () => {
  assert.equal(avatarBytes(input.base64, input.mime).byteLength, 6);
  assert.throws(() => avatarBytes(input.base64, 'application/pdf'));
  assert.throws(() => avatarBytes('JVBERg==', 'image/jpeg'));
  assert.throws(() => avatarBytes('A'.repeat(7_000_000), 'image/jpeg'), /5 MB/);
});
test('avatar uploads immutable new object, changes own avatar only, never deletes old media', async () => {
  const calls = [];
  let saveFails = false;
  const client = createClient('https://avatar-test.invalid', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, init) => {
      const target = new URL(String(url));
      calls.push({ target, init });
      if (target.pathname.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner-id' }));
      if (target.pathname.includes('/storage/')) {
        assert.equal(init.method, 'POST');
        assert.equal(target.pathname, '/storage/v1/object/avatars/owner-id/new-id.jpg');
        assert.equal(new Headers(init.headers).get('x-upsert'), 'false');
        return new Response(JSON.stringify({ Key: 'owner-id/new-id.jpg' }));
      }
      assert.equal(target.pathname, '/rest/v1/profiles');
      assert.equal(target.searchParams.get('id'), 'eq.owner-id');
      assert.deepEqual(JSON.parse(init.body), { avatar_path: 'owner-id/new-id.jpg' });
      return new Response(JSON.stringify(saveFails ? [] : [{ id: 'owner-id' }]));
    } },
  });
  // Inject only an auth fixture; storage/profile requests still use the real SDK encoding.
  client.auth.getUser = async () => ({ data: { user: { id: 'owner-id' } }, error: null });
  await uploadProfileAvatar(client, input, 'new-id');
  saveFails = true;
  await assert.rejects(uploadProfileAvatar(client, input, 'new-id'), /profil belum tersimpan/);
  assert.equal(calls.some(c => c.init.method === 'DELETE'), false);
});
