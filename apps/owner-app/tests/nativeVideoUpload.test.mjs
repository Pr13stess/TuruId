import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { nativeVideoBody, routeVideoFetch } from '../src/data/supabase/nativeVideoUpload.ts';

const video = { uri: 'file:///cache/video.mp4', uploadId: 'stable-upload-id' };
const localFile = (size = 17 * 1024 * 1024, exists = true) => {
  const file = new File(['fixture'], 'video.mp4', { type: 'video/mp4' });
  Object.defineProperties(file, { exists: { value: exists }, size: { value: size } });
  return file;
};

test('native video preflight accepts 17 MB, retains retry ID and rejects unavailable/empty/oversized files', () => {
  let opened;
  const form = nativeVideoBody(video, uri => { opened = uri; return localFile(); });
  assert.equal(opened, video.uri);
  assert.equal(form.get('upload_id'), video.uploadId);
  assert.equal(form.get('file').type, 'video/mp4');
  assert.equal(nativeVideoBody(video, () => localFile()).get('upload_id'), video.uploadId);
  for (const file of [localFile(0), localFile(1, false), localFile(NaN)])
    assert.throws(() => nativeVideoBody(video, () => file), /VIDEO_FILE/);
  assert.throws(() => nativeVideoBody(video, () => { throw Error('permission'); }), /VIDEO_FILE/);
  assert.throws(() => nativeVideoBody(video, () => localFile(50 * 1024 * 1024 + 1)), /VIDEO_SIZE/);
});

test('only exact video POST uses native fetch; other origins, auth, REST and photo upload keep existing transport', async () => {
  const seen = [];
  const base = async (input, init) => { seen.push(['base', input, init]); return Response.json({}); };
  const native = async (input, init) => { seen.push(['native', input, init]); return Response.json({}); };
  const routed = routeVideoFetch(base, native, 'https://dev.invalid/');
  const init = { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: nativeVideoBody(video, () => localFile()), signal: new AbortController().signal };
  await routed('https://dev.invalid/functions/v1/property-video-upload', init);
  assert.equal(seen[0][0], 'native'); assert.equal(seen[0][2], init);
  for (const path of ['/auth/v1/token', '/rest/v1/properties', '/functions/v1/owner-upload', '/functions/v1/chat-image-upload', '/functions/v1/property-video-upload-other'])
    await routed(`https://dev.invalid${path}`, init);
  await routed('https://other.invalid/functions/v1/property-video-upload', init);
  await routed('https://dev.invalid/functions/v1/property-video-upload', { method: 'GET' });
  assert.ok(seen.slice(1).every(x => x[0] === 'base'));
});

test('SDK uses native video transport while retaining auth headers and multipart boundary generation', async () => {
  let invoked = 0;
  const client = createClient('https://dev.invalid', 'fixture-public', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: routeVideoFetch(async () => { throw Error('wrong transport'); }, async (_url, init) => {
      invoked++;
      const headers = new Headers(init.headers);
      assert.equal(headers.get('apikey'), 'fixture-public');
      assert.ok(headers.get('authorization'));
      assert.equal(headers.has('content-type'), false);
      assert.equal(init.body.get('upload_id'), video.uploadId);
      return Response.json({ path: 'ok' });
    }, 'https://dev.invalid') },
  });
  const result = await client.functions.invoke('property-video-upload', { body: nativeVideoBody(video, () => localFile()) });
  assert.equal(result.error, null); assert.equal(invoked, 1);
});
