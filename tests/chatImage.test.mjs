import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageLocation, imageRenewal, signChatImage } from '../apps/user-app/src/domain/chatImage.ts';

test('chat image: three legacy locations, no public URL or traversal fallback', async () => {
  for (const [path, bucket, object] of [
    ['owner-media/sender/chat/id.jpg', 'owner-media', 'sender/chat/id.jpg'],
    ['chat-images/conversation/photo.png', 'chat-images', 'conversation/photo.png'],
    ['conversation/photo.jpg', 'chat-images', 'conversation/photo.jpg'],
  ]) {
    assert.deepEqual(imageLocation(path), { bucket, object });
    const client = { storage: { from(b) { assert.equal(b, bucket); return {
      async createSignedUrl(p, ttl) { assert.equal(p, object); assert.equal(ttl, 1800); return { data: { signedUrl: 'signed' } }; },
    }; } } };
    const lease = await signChatImage(client, path);
    assert.equal(lease.url, 'signed');
    assert.ok(lease.expiresAt > Date.now() + 1790_000);
  }
  for (const path of ['', '../x', 'owner-media/../x', 'https://public/x', 'a/%2e%2e', 'a//b', 'x/y/z'])
    assert.throws(() => imageLocation(path));
  await assert.rejects(signChatImage({ storage: { from: () => ({ createSignedUrl: async () => ({ error: new Error('denied') }) }) } }, 'c/i'));
});

function clock() {
  let now = 0, next = 0;
  const tasks = new Map();
  return {
    now: () => now,
    later(fn, ms) { const id = ++next; tasks.set(id, { fn, at: now + ms }); return id; },
    cancel: id => tasks.delete(id),
    async advance(ms) { now += ms; const due = [...tasks].filter(([, t]) => t.at <= now); for (const [id, t] of due) { tasks.delete(id); t.fn(); } await new Promise(r => setImmediate(r)); },
    jump(ms) { now += ms; },
    get count() { return tasks.size; },
  };
}

test('chat image: refresh before expiry without reopening chat; cancel on unmount', async () => {
  const time = clock(), states = []; let calls = 0;
  const c = imageRenewal(async () => ({ url: `signed-${++calls}`, expiresAt: time.now() + 1800_000 }), (...s) => states.push(s), time);
  await c.refresh();
  await time.advance(1740_000);
  assert.equal(calls, 2);
  assert.deepEqual(states.at(-1), ['signed-2', false]);
  c.stop(); await time.advance(1800_000);
  assert.equal(calls, 2); assert.equal(time.count, 0);
});

test('chat image: offline signing retries; resume after background expiry', async () => {
  const time = clock(), states = []; let offline = true, calls = 0;
  const c = imageRenewal(async () => { calls++; if (offline) throw Error('offline'); return { url: 'ok', expiresAt: time.now() + 1800_000 }; }, (...s) => states.push(s), time);
  await c.refresh(); assert.deepEqual(states.at(-1), ['', true]);
  offline = false; await time.advance(30_000);
  assert.deepEqual(states.at(-1), ['ok', false]);
  time.jump(1900_000); c.resume(); await new Promise(r => setImmediate(r));
  assert.equal(calls, 3); c.stop();
});

test('chat image: repeated image failures throttled; ignore stale in-flight result', async () => {
  const time = clock(), states = []; let calls = 0;
  const c = imageRenewal(async () => ({ url: `url-${++calls}`, expiresAt: time.now() + 1800_000 }), (...s) => states.push(s), time);
  await c.refresh(); c.failed(); c.failed(); c.failed();
  assert.equal(calls, 1); assert.equal(time.count, 1);
  await time.advance(30_000); assert.equal(calls, 2); c.stop();
  let finish;
  const stale = imageRenewal(() => new Promise(r => { finish = r; }), () => assert.fail('stale publication'), time);
  const pending = stale.refresh(); stale.stop(); finish({ url: 'stale', expiresAt: 99999 }); await pending;
  assert.equal(time.count, 0);
});
