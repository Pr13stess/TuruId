import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationReadiness } from '../src/domain/publicationReadiness.ts';

test('publication readiness distinguishes owner approval, property approval, publication and searchable plans', () => {
  const property = { verification_status: 'APPROVED', publication_status: 'ACTIVE' };
  const rooms = [{ is_active: true, inventory: { total: 1, occupied: 1 } }];
  assert.deepEqual(publicationReadiness(property, 'APPROVED', rooms, true), []);
  assert.deepEqual(publicationReadiness(property, 'PENDING', rooms, true), ['Verifikasi owner belum disetujui.']);
  assert.deepEqual(publicationReadiness({ ...property, verification_status: 'PENDING' }, 'APPROVED', rooms, true), ['Verifikasi kos belum disetujui.']);
  assert.deepEqual(publicationReadiness({ ...property, publication_status: 'DRAFT' }, 'APPROVED', rooms, true), ['Status tayang kos belum aktif.']);
  assert.deepEqual(publicationReadiness(property, 'APPROVED', [], false), ['Belum ada tipe kamar aktif.']);
  assert.deepEqual(publicationReadiness(property, 'APPROVED', rooms, false), ['Belum ada paket sewa aktif pada tipe kamar aktif.']);
});
