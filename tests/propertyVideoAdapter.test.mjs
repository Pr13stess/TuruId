import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabasePropertyRepository as UserProperties } from '../apps/user-app/src/data/supabase/SupabasePropertyRepository.ts';
import { SupabasePropertyRepository as OwnerProperties } from '../apps/owner-app/src/data/supabase/Repositories.ts';
import { uploadPropertyVideo } from '../apps/owner-app/src/data/supabase/propertyVideo.ts';
import { mockProperties } from '../apps/user-app/src/data/mock/fixtures.ts';

const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const client = fetch => createClient('https://fixture.invalid','test-public-key',{global:{fetch},auth:{persistSession:false,autoRefreshToken:false}});
test('property video: photo-only schema stays readable; other video query failures surface', async () => {
  let code='PGRST205';
  const repository=new UserProperties(client(async input => {
    const url=new URL(String(input));
    if(url.pathname.endsWith('/property_catalog'))return json([mockProperties[0]]);
    if(url.pathname.endsWith('/property_videos'))return json({code,message:'fixture'},code==='PGRST205'?404:403);
    throw Error('unexpected request');
  }));
  assert.equal((await repository.get(mockProperties[0].id)).name,mockProperties[0].name);
  code='42501';await assert.rejects(repository.get(mockProperties[0].id), /Video kos gagal/);
});
test('property video: signed URL uses private bucket, photo save retains old RPC, video uses atomic wrapper', async () => {
  const calls=[];
  const c=client(async(input,options)=>{
    const url=new URL(String(input));calls.push({url,options});
    if(url.pathname.includes('/object/sign/'))return json({signedURL:'/object/sign/property-videos/owner/video.mp4?token=fake'});
    return json('property-id');
  });
  const url=await new UserProperties(c).videoUrl('property-videos/owner/video.mp4');
  assert.match(url,/token=fake/);
  assert.equal(JSON.parse(calls[0].options.body).expiresIn,1800);
  const owner=new OwnerProperties(c);
  await owner.save({photos:[]});
  await owner.save({photos:['photo'],video_path:'property-videos/owner/video.mp4'});
  await owner.save({photos:['photo'],video_path:''});
  assert.match(calls[1].url.pathname,/\/owner_save_property$/);
  assert.match(calls[2].url.pathname,/\/owner_save_property_gallery$/);
  assert.match(calls[3].url.pathname,/\/owner_save_property_gallery$/);
  assert.throws(()=>owner.save({photos:Array(11).fill('photo')}),/10 foto/);
});
test('property video: upload uses multipart file and stable upload ID without base64 or storage writes', async () => {
  const uploadId='00000000-0000-4000-8000-000000000001';
  const file=new File(['fake test bytes'],'tour.mp4',{type:'video/mp4'});
  let calls=0;
  const c=client(async(input,options)=>{
    calls++;
    assert.match(new URL(String(input)).pathname,/\/functions\/v1\/property-video-upload$/);
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get('upload_id'),uploadId);
    assert.equal(options.body.get('file').type,'video/mp4');
    return json({path:`property-videos/owner/${uploadId}.mp4`});
  });
  await uploadPropertyVideo(c,{uri:'blob:test',uploadId,file});
  await uploadPropertyVideo(c,{uri:'blob:test',uploadId,file});
  assert.equal(calls,2);
});
