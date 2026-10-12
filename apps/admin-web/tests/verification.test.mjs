import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { adminConfig, VerificationRepository } from '../src/repository.ts';
import { canReview, decisionReason, evidenceObject, parseQueue } from '../src/verification.ts';

const dev='https://fhapolumdqqewwhxnjcb.supabase.co';
const uid='00000000-0000-4000-8000-000000000001';
const sid='00000000-0000-4000-8000-000000000002';
const item={id:sid,target_type:'OWNER',status:'PENDING',name:'Owner Uji',owner_name:'Owner Uji',address:'',city:'',description:'Bukti uji',
  evidence_path:`owner-media/${uid}/verification/${sid}.jpg`,submitted_at:'2026-10-12T00:00:00Z',reviewed_at:null,review_reason:null,
  target_updated_at:'2026-10-12T00:00:00.123456Z',current_status:'PENDING',owner_status:'PENDING',publication_status:null,is_latest:true};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function fixture() {
  const state={admin:true,active:true,failure:null,calls:[]};
  const user={id:uid,email:'admin@fixture.invalid',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const c=createClient('https://fixture.invalid','test-public-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,options)=>{
    const url=new URL(String(input));const body=options?.body?JSON.parse(options.body):null;
    state.calls.push({url,body});
    if(url.pathname.endsWith('/token'))return json({access_token:'fixture',refresh_token:'fixture',token_type:'bearer',expires_in:3600,user});
    if(url.pathname.endsWith('/user'))return json(user);
    if(url.pathname.endsWith('/user_roles'))return json(state.admin?[{role:'ADMIN'}]:[]);
    if(url.pathname.endsWith('/profiles'))return json({status:state.active?'ACTIVE':'SUSPENDED'});
    if(url.pathname.includes('/rpc/')) {
      if(state.failure)return json(state.failure,400);
      return json(url.pathname.endsWith('/admin_verification_queue')?{items:[item],total:1}:sid);
    }
    if(url.pathname.includes('/storage/v1/object/sign/'))return json({signedURL:'/object/sign/owner-media/test?token=fixture'});
    throw Error('Unexpected request');
  }}});
  await c.auth.signInWithPassword({email:user.email,password:'test-only'});
  return {state,repo:new VerificationRepository(c)};
}
test('admin config only accepts confirmed DEV and public browser credentials',()=>{
  assert.deepEqual(adminConfig(dev,'sb_publishable_fixture'),{url:dev,key:'sb_publishable_fixture'});
  assert.throws(()=>adminConfig('https://production.invalid','sb_publishable_fixture'),/DEV/);
  assert.throws(()=>adminConfig(dev,'sb_secret_fixture'),/secret/);
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(adminConfig(dev,jwt('anon')).url,dev);
  assert.throws(()=>adminConfig(dev,jwt('service_role')),/secret/);
  assert.throws(()=>adminConfig(dev,''),/belum lengkap/);
});
test('review requires a current pending submission and rejection reason',()=>{
  assert.equal(canReview(item),true);
  assert.equal(canReview({...item,is_latest:false}),false);
  assert.equal(canReview({...item,current_status:'APPROVED'}),false);
  assert.equal(canReview({...item,status:'REJECTED'}),false);
  assert.throws(()=>decisionReason('REJECTED','  '),/minimal 5/);
  assert.throws(()=>decisionReason('APPROVED','x'.repeat(2001)),/2.000/);
  assert.equal(decisionReason('REJECTED','  Bukti buram  '),'Bukti buram');
  assert.equal(decisionReason('APPROVED',''),'');
});
test('evidence accepts private verification images, rejects chat/property paths, URL and traversal',()=>{
  assert.equal(evidenceObject(item.evidence_path),`${uid}/verification/${sid}.jpg`);
  for(const path of ['https://other.invalid/proof.jpg',item.evidence_path.replace('/verification/','/chat/'),item.evidence_path.replace(sid,'../secret'),item.evidence_path+'.pdf'])
    assert.throws(()=>evidenceObject(path));
});
test('queue parser refuses malformed data instead of rendering untrusted structures',()=>{
  assert.equal(parseQueue({items:[item],total:1}).items[0],item);
  for(const value of [null,{items:[],total:-1},{items:[{...item,owner_name:{bad:true}}],total:1},{items:[{...item,is_latest:'yes'}],total:1}])assert.throws(()=>parseQueue(value));
});
test('non-admin and inactive admin never reach queue, decision, or evidence endpoints',async()=>{
  for(const field of ['admin','active']) {
    const {state,repo}=await fixture();state[field]=false;
    await assert.rejects(repo.list('OWNER','PENDING',0),/akses admin/);
    await assert.rejects(repo.decide(item,'APPROVED',''),/akses admin/);
    await assert.rejects(repo.evidence(item.evidence_path),/akses admin/);
    assert.equal(state.calls.filter(c=>c.url.pathname.includes('/rpc/')||c.url.pathname.includes('/storage/')).length,0);
  }
});
test('queue sends separate target/status/page; evidence uses a short-lived signed URL',async()=>{
  const {repo,state}=await fixture();
  await repo.list('PROPERTY','REJECTED',2);
  assert.deepEqual(state.calls.find(c=>c.url.pathname.endsWith('/admin_verification_queue')).body,{kind:'PROPERTY',filter_status:'REJECTED',page_number:2});
  assert.match(await repo.evidence(item.evidence_path),/token=fixture/);
  assert.equal(state.calls.at(-1).body.expiresIn,300);
});
test('decision preserves exact server timestamp; retries submit same decision; stale response is an error',async()=>{
  const {repo,state}=await fixture();
  state.failure={code:'503',message:'network fixture'};
  await assert.rejects(repo.decide(item,'REJECTED','Bukti buram'),/belum dapat dikonfirmasi/);
  state.failure=null;
  await repo.decide(item,'REJECTED','Bukti buram');
  const writes=state.calls.filter(c=>c.url.pathname.endsWith('/admin_review_verification'));
  assert.deepEqual(writes[0].body,writes[1].body);
  assert.equal(writes[0].body.expected_updated_at,item.target_updated_at);
  state.failure={code:'40001',message:'stale'};
  await assert.rejects(repo.decide(item,'APPROVED',''),/Data berubah/);
});
test('missing RPC reports backend not activated; no mock success or direct table update',async()=>{
  const {repo,state}=await fixture();state.failure={code:'PGRST202',message:'missing function'};
  await assert.rejects(repo.list('OWNER','PENDING',0),/belum diaktifkan/);
  await assert.rejects(repo.decide(item,'APPROVED',''),/belum diaktifkan/);
  assert.ok(state.calls.every(c=>!c.url.pathname.endsWith('/verification_submissions')));
});
