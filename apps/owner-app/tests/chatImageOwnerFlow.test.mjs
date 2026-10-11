import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseCommunicationRepository } from '../src/data/supabase/Repositories.ts';
import { sendChatImage } from '../src/domain/sendChatImage.ts';
import { imageAttempt } from '../src/domain/chatUpload.ts';

test('Owner image: existing communication_send RPC retains ID, caption and image path', async () => {
  const path='owner-media/sender/chat/id.jpg', calls=[];
  const client=createClient('https://test.invalid','public-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async (url,options)=>{
    assert.equal(new URL(String(url)).pathname,'/rest/v1/rpc/communication_send');
    calls.push(JSON.parse(options.body));
    return new Response('null',{headers:{'Content-Type':'application/json'}});
  }}});
  const communication=new SupabaseCommunicationRepository(client);
  await sendChatImage(async()=>path,p=>communication.send('conversation','caption',p,'stable-id'),async()=>assert.fail('unexpected reconciliation'));
  assert.deepEqual(calls,[{cid:'conversation',content:'caption',image_path:path,client_id:'stable-id'}]);
});

test('Owner image: partial failure retries upload with same ID, lost RPC response is reconciled', async () => {
  for(const lost of [false,true]) {
    const attempt=imageAttempt('stable-id',{base64:'same-bytes'});
    let uploaded=0, messages=0, failed=false;
    const work=(_payload,id)=>sendChatImage(async()=>{assert.equal(id,'stable-id');uploaded++;return 'path';},async()=>{
      if(!failed){failed=true;if(lost)messages=1;throw Error('offline');}messages=1;
    },async()=>messages===1);
    if(lost) await attempt.run(work);
    else { await assert.rejects(attempt.run(work),/offline/); await attempt.run(work); }
    assert.equal(messages,1);assert.equal(uploaded,lost?1:2);
  }
});

test('Owner image: upload failure cannot create a message; failed reconciliation stays retryable',async()=>{
  await assert.rejects(sendChatImage(async()=>{throw Error('upload failed');},async()=>assert.fail('must not send'),async()=>false),/upload failed/);
  await assert.rejects(sendChatImage(async()=>'path',async()=>{throw Error('send failed');},async()=>false),/send failed/);
});
