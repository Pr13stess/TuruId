import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyGallery } from '../apps/user-app/src/domain/propertyGallery.ts';
import { initialPhoto } from '../apps/user-app/src/domain/chatGallery.ts';

test('property gallery puts video first and preserves photo order and tapped fullscreen index', () => {
  const photos = ['first.jpg', 'second.jpg'];
  const items = propertyGallery(photos, 'property-videos/owner/video.mp4');
  assert.deepEqual(items.map(item => item.kind), ['video', 'photo', 'photo']);
  assert.deepEqual(items.slice(1).map(item => item.path), photos);
  for (let i = 0; i < items.length; i++) assert.equal(initialPhoto(items, items[i].id), i);
  assert.deepEqual(photos, ['first.jpg', 'second.jpg']);
});

test('property gallery handles photo-only, video-only and empty properties', () => {
  assert.deepEqual(propertyGallery(['a', 'a']).map(item => item.id), ['photo-0', 'photo-1']);
  assert.equal(propertyGallery([], 'video')[0].kind, 'video');
  assert.deepEqual(propertyGallery([]), []);
  assert.equal(propertyGallery(['a'], '')[0].kind, 'photo');
});
