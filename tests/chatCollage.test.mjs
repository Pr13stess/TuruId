import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatGroups } from '../apps/user-app/src/domain/chatCollage.ts';
import { chatGroups as ownerGroups } from '../apps/owner-app/src/domain/chatCollage.ts';
import { galleryImages, initialPhoto, swipeAction } from '../apps/user-app/src/domain/chatGallery.ts';

const photo = (id, seconds = 0, extra = {}) => ({ id, sender_id: 'a', created_at: new Date(Date.UTC(2026, 0, 1, 12, 0, seconds)).toISOString(), message_type: 'IMAGE', storage_path: `owner-media/a/chat/${id}.jpg`, ...extra });
for (const [app, group] of [['user', chatGroups], ['owner', ownerGroups]]) {
  test(`${app}: consecutive photos form a collage, preserve originals and tapped index for swiping`, () => {
    const messages = [photo('1'), photo('2', 10), photo('3', 30)];
    const result = group(messages);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], messages);
    assert.equal(messages.length, 3);
    const items = galleryImages(result[0]);
    assert.equal(initialPhoto(items, '2'), 1);
    assert.equal(swipeAction(-90, 0, 1), 'next');
    assert.equal(swipeAction(90, 0, 1), 'previous');
    assert.equal(swipeAction(-90, 0, 2), null);
  });
  test(`${app}: sender, text, missing media and anchored time window separate collages`, () => {
    assert.equal(group([photo('1'), photo('2', 1, {sender_id:'b'})]).length, 2);
    assert.equal(group([photo('1'), photo('text', 1, {message_type:'TEXT'}), photo('2', 2)]).length, 3);
    assert.equal(group([photo('1'), photo('2', 100), photo('3', 121)]).length, 2);
    assert.equal(group([photo('1'), photo('2', 1, {storage_path:null})]).length, 2);
    assert.equal(group([photo('1', 10), photo('2', 0)]).length, 2);
    assert.equal(group([photo('1'), photo('1')])[0].length, 1);
    assert.deepEqual(group([]), []);
    assert.deepEqual(group(Array.from({length:11}, (_, i) => photo(String(i), i))).map(g => g.length), [10, 1]);
  });
}
