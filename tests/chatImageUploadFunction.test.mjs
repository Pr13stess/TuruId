import { test } from 'node:test';
import assert from 'node:assert/strict';
import Jimp from 'jimp-compact';
import { MAX_BYTES, MAX_BODY_BYTES, parseInput, readBody, validateImage, storeImage } from '../supabase/functions/chat-image-upload/core.ts';
import { jpegCodec } from '../supabase/functions/chat-image-upload/codec.ts';
import { requireParticipant } from '../supabase/functions/chat-image-upload/access.ts';
import { uploadStore } from '../supabase/functions/chat-image-upload/store.ts';

const sender = '00000000-0000-4000-8000-000000000001';
const cid = '00000000-0000-4000-8000-000000000002';
const mid = '00000000-0000-4000-8000-000000000003';
const input = (bytes, mime = 'image/jpeg') => ({ conversation_id: cid, client_message_id: mid, base64: Buffer.from(bytes).toString('base64'), mime });
const jpeg = Uint8Array.from([255,216,255,224,1,255,217]);
const failStatus = status => error => error.status === status;

test('Function: upload gate permits both participants, denies third account and inactive profile', () => {
  const conversation = { user_id: sender, owner_id: cid };
  for (const id of [sender,cid]) requireParticipant(id,{status:'ACTIVE'},conversation,{user_id:id});
  assert.throws(() => requireParticipant(mid,{status:'ACTIVE'},conversation,{user_id:mid}),failStatus(403));
  assert.throws(() => requireParticipant(sender,{status:'ACTIVE'},conversation,null),failStatus(403));
  assert.throws(() => requireParticipant(sender,{status:'SUSPENDED'},conversation,{user_id:sender}),failStatus(403));
});

test('Function: Storage adapter only treats explicit missing-object responses as absent; upload never upserts', async () => {
  let error = {code:'NoSuchKey',statusCode:'400'};
  const store = uploadStore({storage:{from: bucket => {
    assert.equal(bucket,'owner-media');
    return {download: async () => ({error}), upload: async (name,bytes,options) => { assert.equal(name,'sender/chat/id.jpg'); assert.deepEqual(options,{contentType:'image/jpeg',upsert:false}); return {}; }};
  }}});
  assert.equal(await store.object('x'),null);
  error = {statusCode:404}; assert.equal(await store.object('x'),null);
  for (const e of [{statusCode:403},{statusCode:500},{message:'Network failure'}]) {error=e; await assert.rejects(store.object('x'),failStatus(503));}
  await store.put('sender/chat/id.jpg',jpeg);
});

// Installed Expo transitive codec, no downloaded dependencies. The adapter exercises
// real JPEG/PNG pixels locally; exact Jimp 1.6 + Deno runtime remains a DEV gate.
const realCodec = jpegCodec(async bytes => {
  const image = await Jimp.read(Buffer.from(bytes));
  return { bitmap: image.bitmap, scaleToFit: ({w,h}) => image.scaleToFit(w,h), getBuffer: (mime, {quality}) => image.quality(quality).getBufferAsync(mime) };
});

test('Function: reject PDF, MIME spoof, WebP, invalid base64 and invalid IDs', async () => {
  for (const mime of ['application/pdf', 'image/webp', 'text/plain']) assert.throws(() => parseInput(input(jpeg, mime)), failStatus(415));
  for (const base64 of ['abc', 'AA=A', '!!!!', 'data:image/jpeg;base64,AAAA']) assert.throws(() => parseInput({...input(jpeg), base64}), failStatus(400));
  assert.throws(() => parseInput({...input(jpeg), client_message_id: '../bad'}), failStatus(400));
  const never = async () => assert.fail('signature rejection must precede decode');
  await assert.rejects(validateImage(parseInput(input(Buffer.from('%PDF-1.7'))), never), failStatus(415));
  await assert.rejects(validateImage(parseInput(input(jpeg, 'image/png')), never), failStatus(415));
  await assert.rejects(validateImage(parseInput(input([137,80,78,71,0,0,0,0], 'image/png')), never), failStatus(415));
});

test('Function: 5 MB limit before and after decoding; valid signature with corrupt payload rejected', async () => {
  const large = Buffer.alloc(MAX_BYTES + 1); large.set(jpeg);
  await assert.rejects(async () => validateImage(parseInput(input(large)), realCodec), failStatus(413));
  await assert.rejects(validateImage(parseInput(input(jpeg)), realCodec), failStatus(422));
  await assert.rejects(validateImage(parseInput(input(jpeg)), async () => large), failStatus(413));
  await assert.rejects(validateImage(parseInput(input(jpeg)), async () => new Uint8Array([1,2,3,4])), failStatus(422));
});

test('Function: real PNG decode, transparent pixels become white, JPEG output can be decoded', async () => {
  const png = await new Jimp(2, 2, 0x00000000).getBufferAsync('image/png');
  const result = await validateImage(parseInput(input(png, 'image/png')), realCodec);
  assert.equal(result[0], 255); assert.equal(result[1], 216);
  const image = await Jimp.read(Buffer.from(result));
  assert.equal(image.bitmap.width, 2);
  assert.ok(image.bitmap.data[0] > 250 && image.bitmap.data[1] > 250 && image.bitmap.data[2] > 250);
  const again = await validateImage(parseInput(input(result)), realCodec);
  assert.ok(again.length <= MAX_BYTES);
});

test('Function: codec rejects invalid dimensions and flattens half-transparent pixels', async () => {
  const pixels = new Uint8Array([0, 0, 0, 128]);
  const codec = jpegCodec(async () => ({ bitmap: {width:1,height:1,data:pixels}, scaleToFit: ({w,h}) => { assert.equal(w,1600); assert.equal(h,1600); }, getBuffer: async (mime, {quality}) => { assert.equal(mime,'image/jpeg'); assert.equal(quality,80); return jpeg; } }));
  await codec(jpeg); assert.deepEqual([...pixels], [127,127,127,255]);
  await assert.rejects(jpegCodec(async () => ({bitmap:{width:20000,height:20000,data:new Uint8Array(0)}}))(jpeg));
});

test('Function: bounded streaming body even without Content-Length', async () => {
  assert.deepEqual(await readBody(new Request('https://local.invalid', {method:'POST',body:JSON.stringify(input(jpeg))})), input(jpeg));
  await assert.rejects(readBody(new Request('https://local.invalid', {method:'POST',body:'{}', headers:{'content-length':String(MAX_BODY_BYTES + 1)}})), failStatus(413));
  const stream = new ReadableStream({start(c) { c.enqueue(new Uint8Array(MAX_BODY_BYTES)); c.enqueue(new Uint8Array(1)); c.close(); }});
  await assert.rejects(readBody(new Request('https://local.invalid', {method:'POST',body:stream,duplex:'half'})), failStatus(413));
});

function memory() {
  const metadata = new Map(), objects = new Map(), messages = new Map();
  let uploads = 0;
  const store = {
    message: async (s,id) => messages.get(s+id) ?? null,
    metadata: async p => metadata.get(p) ?? null,
    claim: async m => { if(metadata.has(m.path)) throw Error('unique'); metadata.set(m.path,m); },
    object: async n => objects.get(n) ?? null,
    put: async (n,b) => { if(objects.has(n)) throw Error('conflict'); objects.set(n,b.slice()); uploads++; },
  };
  return {store, metadata, objects, messages, get uploads(){return uploads;}};
}
test('Function: concurrent retries yield one immutable object and one metadata row', async () => {
  const m = memory(), data = parseInput(input(jpeg));
  const paths = await Promise.all(Array.from({length:5}, () => storeImage(m.store, sender, data, jpeg)));
  assert.equal(new Set(paths.map(p=>p.path)).size,1); assert.equal(m.objects.size,1); assert.equal(m.metadata.size,1); assert.equal(m.uploads,1);
  await assert.rejects(storeImage(m.store,sender,data,Uint8Array.from([...jpeg,1])),failStatus(409));
  assert.deepEqual([...m.objects.values()][0],jpeg);
  await assert.rejects(storeImage(m.store,sender,{...data,conversation_id:sender},jpeg),failStatus(409));
});

test('Function: recover metadata-only, uploaded object/lost response, and message-first partial failure', async () => {
  for (const scenario of ['metadata-only','lost-upload-response','message-first']) {
    const m = memory(), data = parseInput(input(jpeg));
    const original = m.store.put; let fail = true;
    if(scenario === 'message-first') m.messages.set(sender+mid,{conversation_id:cid,message_type:'IMAGE',storage_path:`owner-media/${sender}/chat/${mid}.jpg`});
    m.store.put = async (n,b) => { if(fail) { fail=false; if(scenario==='lost-upload-response') await original(n,b); throw Error('disconnected'); } await original(n,b); };
    if(scenario==='lost-upload-response') await storeImage(m.store,sender,data,jpeg);
    else await assert.rejects(storeImage(m.store,sender,data,jpeg));
    await storeImage(m.store,sender,data,jpeg);
    assert.equal(m.objects.size,1); assert.equal(m.metadata.size,1); assert.equal(m.uploads,1);
  }
});

test('Function: old orphan object, foreign metadata and reused message IDs are never overwritten', async () => {
  const data = parseInput(input(jpeg)), name = `${sender}/chat/${mid}.jpg`;
  const orphan = memory(); orphan.objects.set(name,jpeg);
  await assert.rejects(storeImage(orphan.store,sender,data,jpeg),failStatus(409)); assert.equal(orphan.metadata.size,0);
  const foreign = memory(); foreign.metadata.set('owner-media/'+name,{path:'owner-media/'+name,owner_id:cid,purpose:'chat',context_id:cid});
  await assert.rejects(storeImage(foreign.store,sender,data,jpeg),failStatus(409)); assert.equal(foreign.objects.size,0);
  const message = memory(); message.messages.set(sender+mid,{conversation_id:cid,message_type:'TEXT',storage_path:null});
  await assert.rejects(storeImage(message.store,sender,data,jpeg),failStatus(409)); assert.equal(message.metadata.size,0);
});

test('Function: unknown Storage errors must not be treated as missing objects', async () => {
  const m = memory(); m.store.object = async () => { throw Error('Storage offline'); };
  await assert.rejects(storeImage(m.store,sender,parseInput(input(jpeg)),jpeg),/offline/);
  assert.equal(m.metadata.size,0); assert.equal(m.uploads,0);
});
