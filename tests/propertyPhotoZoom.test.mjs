import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyPhotoZoom } from '../apps/user-app/src/domain/propertyPhotoZoom.ts';
const touch = (pageX, pageY = 0) => ({ pageX, pageY });

test('normal-size drags never translate the photo independently of the horizontal pager', () => {
  const frames = [];
  const zoom = propertyPhotoZoom(400, (...frame) => frames.push(frame));
  zoom.begin([touch(100, 100)]);
  zoom.move([touch(280, 700)]);
  zoom.end();
  assert.deepEqual(frames, [[1, 0], [1, 0]]);
});

test('pinch preserves zoom, clamps horizontal pan, and ignores vertical motion', () => {
  let frame;
  const zoom = propertyPhotoZoom(400, (...value) => { frame = value; });
  zoom.begin([touch(0), touch(100)]);
  zoom.move([touch(0), touch(200)]);
  assert.deepEqual(frame, [2, 0]);
  zoom.move([touch(100, 100)]); // rebase after lifting second finger
  zoom.move([touch(100, 700)]);
  assert.deepEqual(frame, [2, 0]);
  zoom.move([touch(900, 700)]);
  assert.deepEqual(frame, [2, 200]);
  zoom.end();
  assert.deepEqual(frame, [2, 200]);
});

test('pinching back to original size restores centered photo', () => {
  let frame;
  const zoom = propertyPhotoZoom(400, (...value) => { frame = value; });
  zoom.begin([touch(0), touch(100)]); zoom.move([touch(0), touch(300)]); zoom.end();
  zoom.begin([touch(0), touch(300)]); zoom.move([touch(0), touch(50)]); zoom.end();
  assert.deepEqual(frame, [1, 0]);
});
