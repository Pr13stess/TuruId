import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInventory } from '../src/domain/models.ts';

const inventory = {
  total: 10, occupied: 2, cleaning: 1, maintenance: 1,
  inactive: 1, hold: 1, reserved: 2, version: 3,
  room_type_id: '00000000-0000-4000-8000-000000000200',
  created_at: '2026-10-18T00:00:00Z', updated_at: '2026-10-18T01:00:00Z',
};

test('unchanged inventory from owner_read accepts IDs and timestamps without mutating data', () => {
  const before = structuredClone(inventory);
  assert.doesNotThrow(() => validateInventory(inventory, 2));
  assert.deepEqual(inventory, before);
});

test('metadata does not bypass invalid, missing, fractional or overallocated numeric fields', () => {
  for (const key of ['total', 'occupied', 'cleaning', 'maintenance', 'inactive', 'hold', 'reserved', 'version']) {
    for (const value of [undefined, null, '1', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      assert.throws(() => validateInventory({ ...inventory, [key]: value }), undefined, `${key}: ${value}`);
  }
  assert.throws(() => validateInventory({ ...inventory, total: 7 }));
  assert.throws(() => validateInventory(inventory, 3), /checkout booking/);
  assert.doesNotThrow(() => validateInventory({ ...inventory, total: 8 }));
});
