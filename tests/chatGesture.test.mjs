import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoGesture as user } from '../apps/user-app/src/domain/chatGesture.ts';
import { photoGesture as owner } from '../apps/owner-app/src/domain/chatGesture.ts';

const touch = (x, y = 100) => ({ pageX: x, pageY: y });
for (const [app, create] of [['user', user], ['owner', owner]]) {
  test(`${app}: actual touch sequence swipes left/right/down and cancellation never navigates`, () => {
    const actions = [], frames = [];
    const g = create(400, 600, f => frames.push(f), a => actions.push(a));
    for (const [x, y] of [[100, 100], [300, 100], [200, 300]]) {
      g.begin([touch(200)]); g.move([touch(x, y)]); g.move([]); g.end();
    }
    assert.deepEqual(actions, ['next', 'previous', 'close']);
    g.begin([touch(200)]); g.move([touch(100)]); g.end(true);
    assert.equal(actions.length, 3);
    assert.deepEqual(frames.at(-1), { scale: 1, x: 0, y: 0 });
  });
  test(`${app}: second finger starts pinch, lifting finger rebases pan without navigation`, () => {
    const actions = [], frames = [];
    const g = create(400, 600, f => frames.push(f), a => actions.push(a));
    g.begin([touch(100)]);
    g.move([touch(100), touch(200)]);
    g.move([touch(50), touch(250)]);
    assert.equal(frames.at(-1).scale, 2);
    g.move([touch(250)]);
    g.move([touch(280)]);
    assert.equal(frames.at(-1).x, 30);
    g.end();
    assert.deepEqual(actions, []);
    g.begin([touch(100), touch(300)]);
    g.move([touch(150), touch(250)]);
    g.end();
    assert.deepEqual(frames.at(-1), { scale: 1, x: 0, y: 0 });
    assert.deepEqual(actions, []);
    g.begin([touch(300)]); g.move([touch(100)]); g.end();
    assert.deepEqual(actions, ['next']);
  });
}
