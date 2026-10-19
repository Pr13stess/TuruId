import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceSession } from '../apps/user-app/src/domain/voiceSession.ts';
import { SupabaseCallRepository } from '../apps/user-app/src/data/supabase/SupabaseCallRepository.ts';
import { unavailableCalls } from '../apps/user-app/src/data/mock/UnavailableCallRepository.ts';

const credentials = { appId: 'test-app', token: 'test-token', channel: 'call-room', uid: 2 };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function harness(overrides = {}) {
  const actions = [], errors = [], statuses = [];
  let handler;
  const engine = Object.fromEntries(['initialize', 'enableAudio', 'setDefaultAudioRouteToSpeakerphone', 'joinChannel', 'renewToken', 'muteLocalAudioStream', 'setEnableSpeakerphone', 'leaveChannel', 'release'].map(name => [name, (...args) => { actions.push([name, ...args]); return 0; }]));
  engine.registerEventHandler = h => { handler = h; };
  const sdk = { createAgoraRtcEngine: () => { actions.push(['create']); return engine; }, ConnectionStateType: { ConnectionStateFailed: 5, ConnectionStateReconnecting: 4 }, ChannelProfileType: { ChannelProfileCommunication: 0 }, ClientRoleType: { ClientRoleBroadcaster: 1 } };
  const session = voiceSession({ sdk: async () => sdk, permission: async () => {}, token: async () => credentials, status: s => statuses.push(s), failed: e => errors.push(e), ...overrides });
  return { session, engine, actions, errors, statuses, handler: () => handler };
}
test('voice: joins audio only once, mute/speaker work, cleanup releases exactly once', async () => {
  const h = harness();
  await h.session.start(); await h.session.start();
  const join = h.actions.find(a => a[0] === 'joinChannel');
  assert.deepEqual(join.slice(1,4), ['test-token','call-room',2]);
  assert.equal(join[4].publishMicrophoneTrack, true);
  assert.equal(join[4].publishCameraTrack, false);
  assert.equal(join[4].autoSubscribeVideo, false);
  h.handler().onUserJoined(); assert.equal(h.statuses.at(-1), 'Suara terhubung');
  assert.equal(h.session.mute(true), true); assert.equal(h.session.speaker(true), true);
  h.session.stop(); h.session.stop();
  assert.equal(h.actions.filter(a => a[0] === 'create').length, 1);
  assert.equal(h.actions.filter(a => a[0] === 'release').length, 1);
  assert.equal(h.session.mute(false), false);
});
test('voice: denied microphone never requests token or creates engine', async () => {
  let tokens = 0;
  const h = harness({ permission: async () => { throw new Error('Izin mikrofon ditolak'); }, token: async () => { tokens++; return credentials; } });
  await h.session.start();
  assert.equal(tokens, 0); assert.equal(h.actions.length, 0); assert.match(h.errors[0], /mikrofon/);
});
test('voice: leaving while token is loading cannot create late engine', async () => {
  const token = deferred(); let requested;
  const waiting = new Promise(r => { requested = r; });
  const h = harness({ token: () => { requested(); return token.promise; } });
  const start = h.session.start(); await waiting;
  h.session.stop(); token.resolve(credentials); await start;
  assert.equal(h.actions.length, 0); assert.equal(h.errors.length, 0);
});
test('voice: renewal is single-flight and cannot touch released engine', async () => {
  const renewal = deferred(); let requests = 0;
  const h = harness({ token: () => ++requests === 1 ? Promise.resolve(credentials) : renewal.promise });
  await h.session.start();
  h.handler().onTokenPrivilegeWillExpire(); h.handler().onRequestToken();
  assert.equal(requests, 2);
  h.session.stop(); renewal.resolve(credentials); await new Promise(r => setImmediate(r));
  assert.equal(h.actions.filter(a => a[0] === 'renewToken').length, 0);
});
test('voice: expired token renews and connection failure releases audio and reports once', async () => {
  const h = harness(); await h.session.start();
  h.handler().onRequestToken(); await new Promise(r => setImmediate(r));
  assert.equal(h.actions.filter(a => a[0] === 'renewToken').length, 1);
  h.handler().onConnectionStateChanged({}, 5); h.handler().onError(1, 'another error');
  assert.equal(h.errors.length, 1); assert.equal(h.actions.filter(a => a[0] === 'release').length, 1);
});
test('voice repository: reuses participant RPCs, sends only VOICE and fetches token by call ID', async () => {
  const calls = [], edges = [];
  const repo = new SupabaseCallRepository({
    rpc: async (name, args) => { calls.push([name, args]); return { data: name === 'owner_read' ? [] : name === 'communication_start' ? { id: 'call' } : null, error: null }; },
    functions: { invoke: async (name, args) => { edges.push([name, args]); return { data: credentials, error: null }; } },
  });
  await repo.list(); assert.equal((await repo.start('conversation')).id, 'call');
  await repo.update('call', 'accept'); await repo.heartbeat('call'); await repo.token('call');
  assert.deepEqual(calls, [['owner_read',{section:'calls'}],['communication_start',{cid:'conversation',kind:'VOICE'}],['communication_call',{call_id:'call',action:'accept'}],['communication_call',{call_id:'call',action:'ping'}]]);
  assert.deepEqual(edges, [['agora-token',{body:{call_id:'call'}}]]);
});
test('voice repository: unavailable backend, malformed token and mock never pretend to connect', async () => {
  const repo = new SupabaseCallRepository({ rpc: async () => ({error:{code:'PGRST202',message:'missing'}}), functions:{invoke:async()=>({data:{appId:'a'},error:null})} });
  await assert.rejects(repo.list(), /Backend panggilan belum tersedia/);
  await assert.rejects(repo.token('call'), /Token panggilan tidak valid/);
  await assert.rejects(unavailableCalls.start('conversation'), /Mode mock tidak mengirim audio/);
});
