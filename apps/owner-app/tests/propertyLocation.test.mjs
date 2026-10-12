import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPoint, initialMapState, receiveMapEvent, canConfirmLocation } from '../src/domain/propertyLocation.ts';
import { propertyMapHtml } from '../src/presentation/components/propertyMapHtml.ts';

test('property location: zero coordinates valid, incomplete/out-of-range/untrusted messages rejected', () => {
  assert.deepEqual(mapPoint({latitude:0,longitude:0}),{latitude:0,longitude:0});
  for(const value of [null, {latitude:'0',longitude:0}, {latitude:NaN,longitude:0}, {latitude:91,longitude:0}, {latitude:0,longitude:181}, {latitude:0}])
    assert.equal(mapPoint(value),null);
  const start=initialMapState(null);
  for(const raw of ['bad JSON','null','{"type":"point","latitude":999,"longitude":0}','{"type":"other"}'])
    assert.equal(receiveMapEvent(start,raw),start);
});
test('property location: fallback is never saved until selection; moving and failed maps cannot confirm', () => {
  let state=initialMapState(null);
  state=receiveMapEvent(state,'{"type":"ready"}');
  assert.equal(canConfirmLocation(state),false);
  state=receiveMapEvent(state,'{"type":"point","latitude":-6.2,"longitude":106.8}');
  assert.equal(canConfirmLocation(state),true);
  state=receiveMapEvent(state,'{"type":"moving"}');
  assert.equal(canConfirmLocation(state),false);
  state=receiveMapEvent(state,'{"type":"point","latitude":-6.3,"longitude":106.9}');
  state=receiveMapEvent(state,'{"type":"error"}');
  assert.equal(canConfirmLocation(state),false);
  const saved={latitude:-6.2,longitude:106.8};
  const draft=receiveMapEvent(initialMapState(saved),'{"type":"point","latitude":0,"longitude":0}');
  assert.deepEqual(saved,{latitude:-6.2,longitude:106.8}); // Cancel never mutates the initial property.
  assert.deepEqual(draft.point,{latitude:0,longitude:0});
});
test('property location: HTML starts at existing location, escapes untrusted coordinates and contains attribution', () => {
  const html=propertyMapHtml({latitude:-6.2,longitude:106.8});
  assert.ok(html.includes('setView([-6.2,106.8],17)'));
  assert.ok(html.includes('https://www.openstreetmap.org/copyright'));
  assert.ok(html.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
  assert.ok(!propertyMapHtml({latitude:'</script><script>bad()',longitude:0}).includes('bad()'));
  assert.ok(propertyMapHtml(null).includes('setView([-2.5,118],5)'));
});
