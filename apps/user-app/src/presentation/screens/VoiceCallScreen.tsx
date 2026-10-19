import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ScreenProps } from '../../navigation/types';
import { useRepositories } from '../../providers/RepositoryProvider';
import { activeCall, callLabel, type CallAction } from '../../domain/repositories/CallRepository';
import { useAuthSession } from '../hooks/useAuthSession';
import { useVoiceCalls } from '../hooks/useVoiceCalls';
import { CallButton, CallControls, CallLayout, CallNotice } from '../components/CallUi';
import VoiceMedia from '../components/VoiceMedia';

export function VoiceCallScreen(props: ScreenProps<'VoiceCall'>) {
  return <VoiceCallContent key={props.route.params.id} {...props} />;
}
function VoiceCallContent({ route, navigation }: ScreenProps<'VoiceCall'>) {
  const { calls, chat } = useRepositories();
  const { session } = useAuthSession();
  const { data, error: loadError, refresh } = useVoiceCalls();
  const call = data?.find(c => c.id === route.params.id);
  const [contact, setContact] = useState('Pemilik kos');
  useEffect(() => {
    let active = true;
    if (call?.conversation_id) void chat.listConversations().then(rows => {
      const match = rows.find(c => c.id === call.conversation_id);
      if (active && match) setContact(match.property_name);
    }).catch(() => {});
    return () => { active = false; };
  }, [chat, call?.conversation_id]);
  const [error, setError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [backgroundEnded, setBackgroundEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const id = route.params.id;
  const mediaFailed = useCallback((message: string) => {
    setMediaError(message);
    void calls.update(id, 'fail').then(refresh).catch(() => { /* Polling reconciles uncertain network failure. */ });
  }, [calls, id, refresh]);
  const act = async (action: CallAction) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await calls.update(id, action); refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Aksi gagal. Coba lagi.'); }
    finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => navigation.addListener('beforeRemove', () => {
    void calls.update(id, 'end').catch(() => {});
  }), [calls, id, navigation]);
  useEffect(() => {
    if (call?.status !== 'CONNECTED' || backgroundEnded || mediaError) return;
    let active = true, pending = false;
    const ping = async () => {
      if (pending || AppState.currentState !== 'active') return;
      pending = true;
      try { await calls.heartbeat(id); }
      catch { if (active) setError('Koneksi status terputus. Sedang mencoba lagi…'); }
      finally { pending = false; }
    };
    void ping();
    const timer = setInterval(() => { void ping(); }, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [calls, id, call?.status, backgroundEnded, mediaError]);
  // First release supports foreground calls only: leave audio immediately on background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        setBackgroundEnded(true);
        void calls.update(id, 'end').then(refresh).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [calls, id, refresh]);
  const incoming = call?.status === 'RINGING' && call.receiver_id === session?.user.id && !backgroundEnded;
  return <CallLayout name={contact} onBack={() => navigation.goBack()} status={backgroundEnded ? 'Panggilan dihentikan saat aplikasi masuk latar belakang.' : incoming ? 'Panggilan suara masuk' : call ? callLabel[call.status] : data ? 'Panggilan tidak ditemukan.' : 'Memuat panggilan…'}>
      {!!loadError && <><CallNotice>{loadError}</CallNotice><CallControls><CallButton icon="refresh" label="Muat ulang" onPress={refresh} /></CallControls></>}
      {call?.status === 'CONNECTED' && call.call_type === 'VOICE' && !mediaError && !backgroundEnded && <VoiceMedia callId={id} onError={mediaFailed} />}
      <CallControls>
        {incoming ? <>
          <CallButton icon="call" label="Tolak" tone="end" disabled={busy} onPress={() => { void act('decline'); }} />
          <CallButton icon="call" label="Terima" tone="accept" disabled={busy} onPress={() => { void act('accept'); }} />
        </> : call && activeCall(call.status) && !backgroundEnded
          ? <CallButton icon="call" label={call.status === 'RINGING' ? 'Batalkan' : 'Akhiri'} tone="end" disabled={busy} onPress={() => { void act('end'); }} />
          : <CallButton icon="close" label="Tutup" onPress={() => navigation.goBack()} />}
      </CallControls>
      {!!(error || mediaError) && <CallNotice>{mediaError || error}</CallNotice>}
  </CallLayout>;
}
