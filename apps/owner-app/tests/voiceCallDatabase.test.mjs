import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('voice RPC contract: USER-only account and Owner can call both directions; outsiders denied; terminal actions idempotent', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const q = async (sql,args=[]) => (await db.query(sql,args)).rows;
  const as = async n => { await db.exec('reset role; set role authenticated;'); await q("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]); };
  const rpc = async (name,args=[]) => (await q(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args))[0].result;
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated;`);
    for (const folder of ['base','migrations']) for (const f of (await readdir(`supabase/${folder}`)).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/${folder}/${f}`,'utf8'));
    for (const n of [1,2,3]) {
      await q('insert into auth.users(id,email) values($1,$2)',[id(n),`voice${n}@example.test`]);
      await q('insert into public.profiles(id,full_name) values($1,$2)',[id(n),`Person ${n}`]);
      await q('insert into public.user_roles(user_id,role) values($1,$2)',[id(n),n===1?'OWNER':'USER']);
    }
    await q('insert into public.owner_profiles(user_id,display_name) values($1,$2)',[id(1),'Owner']);
    await q("insert into public.properties(id,owner_id,name,address) values($1,$2,'Voice test','Jalan Uji')",[id(10),id(1)]);
    await q('insert into public.conversations(id,property_id,owner_id,user_id) values($1,$2,$3,$4)',[id(11),id(10),id(1),id(2)]);
    for (const n of [1,2]) await q('insert into public.conversation_participants(conversation_id,user_id) values($1,$2)',[id(11),id(n)]);
    await as(2);
    const outgoing = await rpc('communication_start',[id(11),'VOICE']);
    assert.equal(outgoing.caller_id,id(2)); assert.equal(outgoing.receiver_id,id(1));
    await assert.rejects(rpc('communication_start',[id(11),'VOICE']),/sedang dalam panggilan/);
    assert.equal((await rpc('owner_read',['calls'])).length,1);
    await assert.rejects(rpc('communication_call',[outgoing.id,'accept']),/Hanya penerima/);
    await as(3);
    assert.equal((await rpc('owner_read',['calls'])).length,0);
    assert.equal((await q('select id from public.calls')).length,0);
    await assert.rejects(rpc('communication_call',[outgoing.id,'accept']),/Bukan peserta/);
    await assert.rejects(rpc('communication_start',[id(11),'VOICE']),/Bukan peserta/);
    await as(1); await rpc('communication_call',[outgoing.id,'accept']); await rpc('communication_call',[outgoing.id,'accept']);
    await rpc('communication_call',[outgoing.id,'ping']);
    await as(2); await rpc('communication_call',[outgoing.id,'ping']);
    await rpc('communication_call',[outgoing.id,'end']); await rpc('communication_call',[outgoing.id,'end']);
    assert.equal((await rpc('owner_read',['calls']))[0].status,'COMPLETED');
    assert.equal((await q("select id from public.messages where client_message_id=$1",[outgoing.id])).length,1);
    await as(1); const incoming = await rpc('communication_start',[id(11),'VOICE']);
    assert.equal(incoming.receiver_id,id(2));
    await as(2); await rpc('communication_call',[incoming.id,'decline']);
    assert.equal((await rpc('owner_read',['calls'])).find(c=>c.id===incoming.id).status,'DECLINED');
    const cancelled = await rpc('communication_start',[id(11),'VOICE']);
    await rpc('communication_call',[cancelled.id,'end']);
    assert.equal((await rpc('owner_read',['calls'])).find(c=>c.id===cancelled.id).status,'CANCELLED');
    await as(1);
    const missed = await rpc('communication_start',[id(11),'VOICE']);
    await db.exec('reset role');
    await q("update public.calls set created_at=now()-interval '46 seconds' where id=$1",[missed.id]);
    await as(2);
    assert.equal((await rpc('owner_read',['calls'])).find(c=>c.id===missed.id).status,'MISSED');
  } finally { await db.close(); }
});
