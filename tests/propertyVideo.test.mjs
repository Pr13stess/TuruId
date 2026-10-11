import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectMp4, MAX_VIDEO_BYTES, digest, storeVideo, isMissingVideo } from '../supabase/functions/property-video-upload/core.ts';

const concat = (...items) => Buffer.concat(items);
const box = (kind, payload) => { const head=Buffer.alloc(8);head.writeUInt32BE(payload.length+8);head.write(kind,4);return concat(head,payload); };
const duration = (kind, seconds, v=0) => {
  const bytes=Buffer.alloc(v===1?32:20); bytes[0]=v;
  bytes.writeUInt32BE(1000,v===1?20:12);
  if(v===1) bytes.writeBigUInt64BE(BigInt(seconds*1000),24); else bytes.writeUInt32BE(seconds*1000,16);
  return box(kind,bytes);
};
// Container fixtures only: no claim of a playable decoded stream.
const mp4 = (seconds=60, trackSeconds=seconds, version=0) => {
  const handler=Buffer.alloc(12);handler.write('vide',8);
  return concat(box('ftyp',concat(Buffer.from('isom'),Buffer.alloc(4),Buffer.from('mp42'))),
    box('moov',concat(duration('mvhd',seconds,version),box('trak',box('mdia',concat(duration('mdhd',trackSeconds,version),box('hdlr',handler)))))),
    box('mdat',Buffer.from([1,2,3,4])));
};
test('video server: reads duration from MP4 v0/v1 and enforces duration/size/MIME', () => {
  assert.equal(inspectMp4(mp4(), 'video/mp4').duration,60);
  assert.equal(inspectMp4(mp4(10,10,1), 'video/mp4').duration,10);
  assert.throws(()=>inspectMp4(mp4(61),'video/mp4'), /60 detik/);
  assert.throws(()=>inspectMp4(mp4(10,61),'video/mp4'), /60 detik/);
  assert.throws(()=>inspectMp4(new Uint8Array(MAX_VIDEO_BYTES+1),'video/mp4'), /50 MB/);
  assert.throws(()=>inspectMp4(mp4(),'application/pdf'));
  assert.throws(()=>inspectMp4(Buffer.from('%PDF-1.7'+'x'.repeat(80)),'video/mp4'));
  assert.throws(()=>inspectMp4(mp4().subarray(0,mp4().length-1),'video/mp4'));
  const corrupt=mp4(); corrupt.writeUInt32BE(0xffffffff,0);
  assert.throws(()=>inspectMp4(corrupt,'video/mp4'));
});
test('video server: immutable retry recovers metadata-only and lost upload response', async () => {
  const bytes=mp4(), meta={path:'property-videos/owner/id.mp4',owner_id:'owner',sha256:await digest(bytes),byte_size:bytes.length,duration_seconds:60};
  let row=null,object=null, writes=0, fail=true;
  const store={ metadata:async()=>row, reserve:async m=>{row=m;}, download:async()=>object,
    upload:async(_path,b)=>{writes++;if(fail)throw Error('offline');object=b;throw Error('response lost');} };
  await assert.rejects(storeVideo(store,meta,bytes),/offline/);
  assert.equal(row,meta);assert.equal(object,null);
  fail=false;await storeVideo(store,meta,bytes);await storeVideo(store,meta,bytes);
  assert.equal(writes,2);
  await assert.rejects(storeVideo(store,{...meta,sha256:'other'},bytes),/video lain/);
  object=Buffer.from('wrong object');
  await assert.rejects(storeVideo(store,meta,bytes),/Objek video berbeda/);
  assert.equal(writes,2);
});
test('video server: failed storage reads never allow overwrite', () => {
  assert.equal(isMissingVideo({statusCode:'404'}),true);
  assert.equal(isMissingVideo({statusCode:'400',code:'NoSuchKey'}),true);
  assert.equal(isMissingVideo({statusCode:'403'}),false);
  assert.equal(isMissingVideo({statusCode:'500'}),false);
});
