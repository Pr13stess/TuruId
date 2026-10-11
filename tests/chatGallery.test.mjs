import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageBatch, galleryImages, initialPhoto, swipeAction, clamp } from '../apps/user-app/src/domain/chatGallery.ts';

test('multi-photo: one stable ID per photo, partial retry skips successful photos', async () => {
  let next=0, fail=true;
  const batch=imageBatch(['a','b','c'],()=>`id-${++next}`);
  const calls=[], progress=[];
  const send=async (photo,id,index)=>{calls.push([photo,id,index]); if(photo==='b'&&fail)throw Error('offline');};
  await assert.rejects(batch.run(send,(sent,total)=>progress.push([sent,total])),/1 dari 3/);
  assert.deepEqual(calls,[['a','id-1',0],['b','id-2',1],['c','id-3',2]]);
  assert.deepEqual(progress.at(-1),[2,3]);
  fail=false;await batch.run(send,(sent,total)=>progress.push([sent,total]));
  assert.deepEqual(calls.at(-1),['b','id-2',1]);assert.equal(calls.length,4);
  assert.deepEqual(progress.at(-1),[3,3]);
  await batch.run(send);assert.equal(calls.length,4);
});

test('multi-photo: double press shares work and uploads are serialized', async () => {
  let next=0, inflight=0, peak=0;
  const batch=imageBatch([1,2,3],()=>String(++next));
  const work=async ()=>{inflight++;peak=Math.max(peak,inflight);await new Promise(r=>setTimeout(r,5));inflight--;};
  const first=batch.run(work);assert.equal(first,batch.run(work));await first;
  assert.equal(peak,1);assert.equal(next,3);
  assert.throws(()=>imageBatch([],()=>''));assert.throws(()=>imageBatch(Array(11).fill('x'),()=>''));
});

test('gallery: image-only snapshot deduplicates realtime items and starts at tapped image',()=>{
  const items=galleryImages([
    {id:'text',message_type:'TEXT'},
    {id:'a',message_type:'IMAGE',storage_path:'owner-media/sender/chat/a.jpg'},
    {id:'b',message_type:'IMAGE',storage_path:'chat-images/c/b.jpg'},
    {id:'c',message_type:'IMAGE',storage_path:'c/old.jpg'},
    {id:'d',message_type:'IMAGE',image_url:'file://demo.jpg'},
    {id:'a',message_type:'IMAGE',storage_path:'owner-media/sender/chat/a.jpg'},
    {id:'missing',message_type:'IMAGE'},
  ]);
  assert.deepEqual(items.map(i=>i.id),['a','b','c','d']);
  assert.equal(initialPhoto(items,'c'),2);assert.equal(initialPhoto(items,'unknown'),0);
  assert.equal(items[3].fallback,'file://demo.jpg');
});

test('viewer: horizontal swipe pages, down closes, zoomed pan never closes or pages',()=>{
  assert.equal(swipeAction(-100,10,1),'next');assert.equal(swipeAction(100,10,1),'previous');
  assert.equal(swipeAction(10,150,1),'close');assert.equal(swipeAction(10,-150,1),null);
  assert.equal(swipeAction(-100,10,2),null);assert.equal(swipeAction(10,150,2),null);
  assert.equal(swipeAction(10,10,1),null);assert.equal(swipeAction(150,150,1),null);
  assert.equal(clamp(6,1,4),4);assert.equal(clamp(0.5,1,4),1);
});
