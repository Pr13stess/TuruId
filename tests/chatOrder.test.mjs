import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderChats as user } from '../apps/user-app/src/domain/chatOrder.ts';
import { orderChats as owner } from '../apps/owner-app/src/domain/chatOrder.ts';

for (const [name, sort] of [['User', user], ['Owner', owner]]) {
  test(`${name}: unread first, newest within each group, without mutating input`, () => {
    const chats = [
      { id: 'read-new', unread: 0, updated_at: '2026-10-12T15:00:00Z' },
      { id: 'unread-old', unread: 9, updated_at: '2026-10-12T10:00:00Z' },
      { id: 'read-old', unread: 0, updated_at: '2026-10-12T09:00:00Z' },
      { id: 'unread-new', unread: 1, updated_at: '2026-10-12T12:00:00Z' },
    ];
    const before = structuredClone(chats);
    assert.deepEqual(sort(chats).map(c => c.id), ['unread-new', 'unread-old', 'read-new', 'read-old']);
    assert.deepEqual(chats, before);
    const afterRead = chats.map(c => c.id === 'unread-new' ? { ...c, unread: 0 } : c);
    assert.deepEqual(sort(afterRead).map(c => c.id), ['unread-old', 'read-new', 'unread-new', 'read-old']);
  });
  test(`${name}: stable ties and missing timestamps do not float above recent chats`, () => {
    assert.deepEqual(sort([
      { id: 'z', updated_at: 'invalid' }, { id: 'a' },
      { id: 'new', updated_at: '2026-10-12T12:00:00Z' },
    ]).map(c => c.id), ['new', 'a', 'z']);
  });
}
