import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createPropertyEditSubmission } from '../src/domain/propertyEdit.ts';
import { editPropertyAndSubmit } from '../src/data/supabase/propertyEdit.ts';
import { MockStore } from '../src/data/mock/MockStore.ts';
import { MockPropertyRepository } from '../src/data/mock/Repositories.ts';

test('edit retry freezes payload and ID after lost response, deduplicates taps and resets after success', async () => {
  let fail = true, ids = 0, reads = 0; const calls = [];
  const original = { id: 'p1', name: 'First', photos: ['one'] };
  const edit = createPropertyEditSubmission(async (...args) => {
    calls.push(structuredClone(args));
    if (fail) throw new Error('lost response');
    return args[0].id;
  }, () => String(++ids));
  const prepare = async () => { reads++; return original; };
  const first = edit.submit(prepare, 'proof');
  assert.equal(first, edit.submit(prepare, 'other'));
  await assert.rejects(first);
  original.name = 'Changed'; original.photos.push('two');
  fail = false;
  await edit.submit(prepare, 'other');
  assert.deepEqual(calls[0], calls[1]); assert.equal(reads, 1); assert.equal(ids, 1);
  assert.equal(edit.pending, false);
  await edit.submit(prepare, 'other'); assert.equal(ids, 2); assert.equal(calls[2][0].name, 'Changed');
});

test('adapter uses only atomic RPC and rejects missing RPC or unexpected result without fallback', async () => {
  let status = 200, result = 'p1'; const calls = [];
  const client = createClient('https://fixture.invalid', 'public-test', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (url, init) => {
      calls.push(String(url));
      assert.deepEqual(JSON.parse(init.body), { input: { id: 'p1', photos: [] }, request_id: 'r1', evidence: null });
      return Response.json(result, { status });
    } },
  });
  assert.equal(await editPropertyAndSubmit(client, { id: 'p1', photos: [] }, 'r1'), 'p1');
  result = null; await assert.rejects(editPropertyAndSubmit(client, { id: 'p1', photos: [] }, 'r1'), /dikonfirmasi/);
  status = 404; result = { code: 'PGRST202', message: 'missing' };
  await assert.rejects(editPropertyAndSubmit(client, { id: 'p1', photos: [] }, 'r1'), /belum diaktifkan/);
  assert.equal(calls.length, 3); assert.ok(calls.every(url => url.endsWith('/rpc/owner_edit_property_and_submit')));
});

test('mock edit persists one submission across repository restart and rejects changed retry', async () => {
  let saved = null;
  const storage = { getItem: async () => saved, setItem: async (_, value) => { saved = value; } };
  let repo = new MockPropertyRepository(new MockStore(storage));
  const original = (await repo.list())[0]; const input = { ...original, name: 'Kos Edited' };
  await assert.rejects(repo.editAndSubmit(input, 'attempt'), /bukti/);
  assert.equal((await repo.list())[0].name, original.name);
  await repo.editAndSubmit(input, 'attempt', 'proof');
  repo = new MockPropertyRepository(new MockStore(storage));
  await repo.editAndSubmit(input, 'attempt', 'proof');
  assert.equal(JSON.parse(saved).propertySubmissions.length, 1);
  await assert.rejects(repo.editAndSubmit({ ...input, name: 'Different' }, 'attempt', 'proof'), /berubah/);
  await repo.editAndSubmit({ ...input, name: 'Next' }, 'next');
  assert.equal(JSON.parse(saved).propertySubmissions.length, 2);
});
