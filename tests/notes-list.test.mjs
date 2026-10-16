import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { MockAuthRepository } from '../apps/user-app/src/data/mock/MockAuthRepository.ts';
import { MockNoteRepository } from '../apps/user-app/src/data/mock/MockNoteRepository.ts';
import { SupabaseNoteRepository } from '../apps/user-app/src/data/supabase/SupabaseNoteRepository.ts';

test('notes list: mock accounts remain private across list, edit and delete; pagination retains overflow', async () => {
  const auth = new MockAuthRepository(), notes = new MockNoteRepository(auth);
  await assert.rejects(notes.list(0));
  await auth.signUp('one@example.test', 'secret1');
  for (let i = 0; i < 22; i++) await notes.save(`p${i}`, `Kos ${i}`, `Note ${i}`, null);
  assert.equal((await notes.list(0)).length, 21);
  assert.equal((await notes.list(1)).length, 2);
  await assert.rejects(notes.list(-1));
  await auth.signUp('two@example.test', 'secret2');
  assert.deepEqual(await notes.list(0), []);
  assert.equal(await notes.getByProperty('p0', 'Kos 0'), null);
  await notes.save('p0', 'Kos 0', 'Private two', null);
  await notes.deleteByProperty('p0');
  await auth.signIn('one@example.test', 'secret1');
  assert.equal((await notes.getByProperty('p0', 'Kos 0')).content, 'Note 0');
});

test('notes list: SDK scopes user, stable pages, preserves inaccessible-property note and surfaces errors', async () => {
  let failure = false, calls = 0;
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('user_id'), 'eq.user-one');
      assert.equal(url.searchParams.get('order'), 'updated_at.desc,id.desc');
      assert.equal(url.searchParams.get('offset'), '20');
      assert.equal(url.searchParams.get('limit'), '21');
      return new Response(JSON.stringify(failure ? { message: 'Denied' } : [
        { id: 'n1', property_id: 'p1', content: 'My note', version: 1, updated_at: '2026-10-17T00:00:00Z', properties: null },
      ]), { status: failure ? 403 : 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  client.auth.getUser = async () => ({ data: { user: { id: 'user-one' } }, error: null });
  const notes = new SupabaseNoteRepository(client);
  const rows = await notes.list(1);
  assert.equal(rows[0].property_name, 'Kos tidak tersedia');
  assert.equal(rows[0].content, 'My note');
  failure = true;
  await assert.rejects(notes.list(1), /Catatan gagal dimuat/);
  assert.equal(calls, 2);
});
