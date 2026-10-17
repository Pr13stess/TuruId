import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const migration = '202610170002_chat_notifications.sql';

test('chat notification trigger: direct User writes, Owner RPC, isolation and atomicity', async t => {
  const db = new PGlite();
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async n => {
    await db.exec('reset role; set role authenticated;');
    await query("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]);
  };
  const insert = async (sender, number, kind = 'TEXT') => query(`insert into public.messages
    (id,conversation_id,sender_id,message_type,text_content,storage_path,client_message_id)
    values($1,$2,$3,$4,'Test', $5,$1) on conflict do nothing`,
    [id(number), id(5000), id(sender), kind, kind === 'IMAGE' ? `owner-media/${id(sender)}/chat/${id(number)}.jpg` : null]);
  const notices = async number => query('select * from public.notifications where event_key=$1', [`message:${id(number)}`]);
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid);
      create function storage.foldername(name text) returns text[] language sql immutable as $$
        select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
      $$;
      alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated;
      grant select on storage.objects to anon,authenticated;`);
    for (const file of (await readdir('supabase/migrations')).sort()) {
      if (file !== migration) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    }
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    // Execute the existing Owner SQL unchanged to exercise actual RPC coexistence.
    for (const file of ['202610020001_owner.sql', '202610020002_communication.sql', '202610020003_storage_permissions.sql']) {
      await db.exec(await readFile(`apps/owner-app/supabase/migrations/${file}`, 'utf8'));
    }
    const before = (await query('select count(*)::int n from public.notifications'))[0].n;
    await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
    assert.equal((await query('select count(*)::int n from public.notifications'))[0].n, before, 'no backfill');

    await t.test('User text and image create one event each; retry cannot duplicate', async () => {
      await as(3);
      await insert(3, 9001); await insert(3, 9001); await insert(3, 9002, 'IMAGE');
      assert.equal((await notices(9001)).length, 0, 'sender cannot read receiver notification');
      await as(1);
      for (const number of [9001, 9002]) {
        const rows = await notices(number);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].recipient_id, id(1));
        assert.equal(rows[0].target_id, id(5000));
        assert.equal(rows[0].body, 'Buka percakapan untuk membaca pesan.');
      }
    });

    await t.test('Owner RPC and trigger use same key, including RPC retries', async () => {
      await as(1);
      for (let i = 0; i < 2; i++) await query('select public.communication_send($1,$2,$3,$4)', [id(5000), 'Owner message', '', id(9003)]);
      const [message] = await query('select id from public.messages where client_message_id=$1', [id(9003)]);
      await as(3);
      assert.equal((await query('select * from public.notifications where event_key=$1', [`message:${message.id}`])).length, 1);
    });

    await t.test('third account cannot read events, spoof messages or mark another event read', async () => {
      await as(1); const [notice] = await notices(9001);
      await as(4);
      assert.equal((await notices(9001)).length, 0);
      await assert.rejects(insert(4, 9004));
      await assert.rejects(insert(3, 9005));
      await query('select public.owner_profile($1,$2)', ['read', { id: notice.id }]);
      await as(1); assert.equal((await notices(9001))[0].read_at, null);
      await query('select public.owner_profile($1,$2)', ['read', { id: notice.id }]);
      assert.ok((await notices(9001))[0].read_at);
    });

    await t.test('Owner image RPC retains path and creates one event; User can mark it read without OWNER role', async () => {
      const path = `owner-media/${id(1)}/chat/${id(9009)}.jpg`;
      await db.exec('reset role');
      await query("insert into public.owner_uploads(path,owner_id,purpose,context_id) values($1,$2,'chat',$3)", [path, id(1), id(5000)]);
      await as(1);
      for (let i = 0; i < 2; i++) await query('select public.communication_send($1,$2,$3,$4)', [id(5000), '', path, id(9009)]);
      const [message] = await query('select id,storage_path from public.messages where client_message_id=$1', [id(9009)]);
      assert.equal(message.storage_path, path);
      await as(3);
      const rows = await query('select * from public.notifications where event_key=$1', [`message:${message.id}`]);
      assert.equal(rows.length, 1);
      assert.equal((await query("select * from public.user_roles where user_id=$1 and role='OWNER'", [id(3)])).length, 0);
      await query('select public.owner_profile($1,$2)', ['read', { id: rows[0].id }]);
      assert.ok((await query('select read_at from public.notifications where id=$1', [rows[0].id]))[0].read_at);
    });

    await t.test('CALL_EVENT and a recipient removed from conversation do not get chat events', async () => {
      await as(3); await insert(3, 9006, 'CALL_EVENT');
      await db.exec('reset role'); assert.equal((await notices(9006)).length, 0);
      await query('delete from public.conversation_participants where conversation_id=$1 and user_id=$2', [id(5000), id(1)]);
      await as(3); await insert(3, 9007);
      await db.exec('reset role'); assert.equal((await notices(9007)).length, 0);
      await query('insert into public.conversation_participants(conversation_id,user_id) values($1,$2)', [id(5000), id(1)]);
    });

    await t.test('rollback cancels message and event together; function cannot be invoked by client', async () => {
      await as(3);
      await db.exec('begin'); await insert(3, 9008); await db.exec('rollback');
      assert.equal((await query('select * from public.messages where id=$1', [id(9008)])).length, 0);
      await as(1); assert.equal((await notices(9008)).length, 0);
      await assert.rejects(query('select private.notify_chat_message_insert()'), /permission denied/);
    });
  } finally { await db.close(); }
});
