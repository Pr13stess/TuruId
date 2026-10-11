import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGallerySelection, propertyUploadQueue, MAX_PROPERTY_VIDEO_BYTES } from '../src/domain/propertyGallery.ts';

const photo = { uri: 'file://photo', type: 'image' };
const video = { uri: 'file://video', type: 'video', mimeType: 'video/mp4', duration: 60_000, fileSize: MAX_PROPERTY_VIDEO_BYTES };
test('property gallery: mixed selection accepts 10 photos + 1 MP4 and counts existing media', () => {
  validateGallerySelection([...Array(10).fill(photo), video], 0, false);
  validateGallerySelection([photo, video], 9, false);
  assert.throws(() => validateGallerySelection([photo], 10, false), /10 foto/);
  assert.throws(() => validateGallerySelection([video, video], 0, false), /1 video/);
  assert.throws(() => validateGallerySelection([video], 0, true), /1 video/);
});
test('property gallery: wrong MIME, over-duration and oversized videos are rejected', () => {
  for (const patch of [{mimeType:'video/quicktime'}, {duration:60_001}, {fileSize:MAX_PROPERTY_VIDEO_BYTES+1}, {duration:NaN}])
    assert.throws(() => validateGallerySelection([{...video,...patch}],0,false));
  validateGallerySelection([{...video, mimeType:null, fileName:'tour.MP4'}],0,false);
  assert.throws(() => validateGallerySelection([{...video,mimeType:null,fileName:'tour.mov'}],0,false));
});
test('property gallery: partial retry preserves successes and double tap shares upload', async () => {
  const queue = propertyUploadQueue(['photo1','photo2','video']);
  const calls = []; let fail = true;
  const send = async item => { calls.push(item); if(item==='photo2' && fail) throw Error('rate limit'); };
  const first = queue.run(send);
  assert.equal(first, queue.run(send));
  await assert.rejects(first, /rate limit/);
  assert.equal(queue.remaining(),2);
  fail=false; await queue.run(send);
  assert.deepEqual(calls,['photo1','photo2','photo2','video']);
  assert.equal(queue.remaining(),0);
});
