import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { uploadPropertyVideo } from '../src/data/supabase/propertyVideo.ts';

test('video upload distinguishes SDK network, gateway HTTP and Function rejections', async () => {
  let mode = 'network';
  const client = createClient('https://fixture.invalid', 'test-public', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async () => {
      if (mode === 'network') throw new TypeError('Network request failed');
      if (mode === 'function') return Response.json({ error: 'Durasi video maksimal 60 detik.' }, { status: 422 });
      if (mode === 'html') return new Response('<html>gateway internal</html>', { status: 504 });
      return Response.json({ message: 'gateway message' }, { status: Number(mode) });
    } },
  });
  const upload = () => uploadPropertyVideo(client, { uri: 'test', uploadId: 'id', file: new File(['bytes'], 'test.mp4', { type: 'video/mp4' }) });
  await assert.rejects(upload(), /VIDEO_NETWORK/);
  for (mode of ['401', '404', '413', '546']) await assert.rejects(upload(), new RegExp(`HTTP ${mode}`));
  mode = 'function'; await assert.rejects(upload(), /Durasi video maksimal 60 detik.*HTTP 422/);
  mode = 'html'; await assert.rejects(upload(), /Waktu pemrosesan.*HTTP 504/);
});
