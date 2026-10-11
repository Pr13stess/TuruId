import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { imageAttempt, imagePayload } from '../apps/user-app/src/domain/chatUpload.ts';
import { uploadChatImage, insertImageMessage, findImageMessage } from '../apps/user-app/src/data/supabase/chatImageUpload.ts';

const sender = '00000000-0000-4000-8000-000000000001';
const cid = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const path = `owner-media/${sender}/chat/${id}.jpg`;
const payload = {base64:'/9j/4AA=',mime:'image/jpeg'};

test('image draft: same ID and payload survive upload/send failure, concurrent presses share work', async () => {
  const attempt = imageAttempt(id,payload); const seen=[]; let fail=true;
  const send = async (p,i) => {seen.push([p,i]); if(fail) throw Error('offline');};
  const first = attempt.run(send); assert.equal(first,attempt.run(send));
  await assert.rejects(first,/offline/); fail=false;
  await attempt.run(send); await attempt.run(send);
  assert.equal(seen.length,2); assert.equal(seen[0][0],seen[1][0]); assert.equal(seen[1][1],id);
});

test('image client: JPEG/PNG sniff and client size check; unsupported formats fail', () => {
  assert.deepEqual(imagePayload(payload.base64,'image/jpeg'),payload);
  assert.equal(imagePayload('iVBORw0KGgoAAAAA','image/png').mime,'image/png');
  for(const mime of ['image/png','image/webp','application/pdf']) assert.throws(()=>imagePayload(payload.base64,mime));
  assert.throws(()=>imagePayload('JVBERi0xLjQ='));
  assert.throws(()=>imagePayload('/9j/'+'A'.repeat(7_000_000)),/5 MB/);
});

function backend() {
  const rows=[]; let uploads=0, inserts=0, failInsert=false, loseResponse=false, returnedPath=path, uploadError=false;
  const fetch = async (url, options={}) => {
    const u=new URL(String(url));
    if(u.pathname.endsWith('/functions/v1/chat-image-upload')) {
      uploads++;
      assert.equal(options.method,'POST');
      assert.deepEqual(JSON.parse(options.body),{...payload,conversation_id:cid,client_message_id:id});
      if(uploadError) return new Response(JSON.stringify({error:'Isi gambar tidak sesuai MIME.'}),{status:415,headers:{'Content-Type':'application/json'}});
      return new Response(JSON.stringify({path:returnedPath}),{headers:{'Content-Type':'application/json'}});
    }
    assert.equal(u.pathname,'/rest/v1/messages');
    if(options.method==='POST') {
      inserts++;
      if(failInsert) return new Response(JSON.stringify({message:'temporarily unavailable',code:'500'}),{status:500,headers:{'Content-Type':'application/json'}});
      const body=JSON.parse(options.body);
      if(rows.length) return new Response(JSON.stringify({message:'duplicate',code:'23505'}),{status:409,headers:{'Content-Type':'application/json'}});
      rows.push({id:'server-id',...body});
      if(loseResponse) throw new TypeError('connection lost after commit');
      return new Response(JSON.stringify(rows[0]),{headers:{'Content-Type':'application/json'}});
    }
    assert.equal(u.searchParams.get('sender_id'),'eq.'+sender);
    assert.equal(u.searchParams.get('client_message_id'),'eq.'+id);
    return new Response(JSON.stringify(rows),{headers:{'Content-Type':'application/json'}});
  };
  const client=createClient('https://test.invalid','public-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch}});
  return {client,rows,get uploads(){return uploads;},get inserts(){return inserts;},set failInsert(v){failInsert=v;},set loseResponse(v){loseResponse=v;},set returnedPath(v){returnedPath=v;},set uploadError(v){uploadError=v;}};
}

test('image adapter: invoke Function, exact bucket/path contract, no unsafe fallback on server rejection', async () => {
  const b=backend();
  assert.equal(await uploadChatImage(b.client,sender,cid,id,payload),path);
  b.returnedPath='chat-images/other.jpg'; await assert.rejects(uploadChatImage(b.client,sender,cid,id,payload),/Lokasi/);
  b.uploadError=true; await assert.rejects(uploadChatImage(b.client,sender,cid,id,payload),/MIME/);
  assert.equal(b.inserts,0);
});

test('image adapter: retry upload success/message failure uses same ID and inserts one message', async () => {
  const b=backend(), attempt=imageAttempt(id,payload);
  const send=async (image,clientId) => { const p=await uploadChatImage(b.client,sender,cid,clientId,image); await insertImageMessage(b.client,sender,cid,p,clientId); };
  b.failInsert=true; await assert.rejects(attempt.run(send)); assert.equal(b.rows.length,0);
  b.failInsert=false; await attempt.run(send);
  assert.equal(b.uploads,2); assert.equal(b.rows.length,1); assert.equal(b.rows[0].client_message_id,id);
  await insertImageMessage(b.client,sender,cid,path,id); assert.equal(b.inserts,2);
});

test('image adapter: lost insert response and concurrent retries reconcile committed row', async () => {
  const b=backend(); b.loseResponse=true;
  const result=await insertImageMessage(b.client,sender,cid,path,id);
  assert.equal(result.storage_path,path); assert.equal(b.rows.length,1);
  assert.ok(await findImageMessage(b.client,sender,cid,path,id));
  const c=backend(); await Promise.all([insertImageMessage(c.client,sender,cid,path,id),insertImageMessage(c.client,sender,cid,path,id)]);
  assert.equal(c.rows.length,1);
});

test('image adapter: mismatched message identity is rejected rather than accepted as successful retry', async () => {
  for(const fields of [{conversation_id:sender},{message_type:'TEXT'},{storage_path:'chat-images/other'}]) {
    const b=backend(); b.rows.push({conversation_id:cid,message_type:'IMAGE',storage_path:path,...fields});
    await assert.rejects(insertImageMessage(b.client,sender,cid,path,id),/berbeda/); assert.equal(b.inserts,0);
  }
});
