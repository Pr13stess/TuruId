import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../navigation/types';
import { useRepositories } from '../../providers/RepositoryProvider';
import { activeCall, callLabel, type CallAction } from '../../domain/repositories/CallRepository';
import { useAuthSession } from '../hooks/useAuthSession';
import { useVoiceCalls } from '../hooks/useVoiceCalls';
import { Button } from '../components/Primitives';
import VoiceMedia from '../components/VoiceMedia';
import { colors } from '../theme';

export function VoiceCallScreen(props: ScreenProps<'VoiceCall'>) {
  return <VoiceCallContent key={props.route.params.id} {...props} />;
}
function VoiceCallContent({ route, navigation }: ScreenProps<'VoiceCall'>) {
  const { calls } = useRepositories();
  const { session } = useAuthSession();
  const { data, error: loadError, refresh } = useVoiceCalls();
  const call = data?.find(c => c.id === route.params.id);
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
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>Panggilan suara</Text>
      <Text accessibilityLiveRegion="polite">{backgroundEnded ? 'Panggilan dihentikan saat aplikasi masuk latar belakang.' : call ? callLabel[call.status] : data ? 'Panggilan tidak ditemukan.' : 'Memuat panggilan…'}</Text>
      {!!loadError && <><Text accessibilityRole="alert">{loadError}</Text><Button title="Muat ulang" secondary onPress={refresh} /></>}
      {call?.status === 'CONNECTED' && call.call_type === 'VOICE' && !mediaError && !backgroundEnded && <VoiceMedia callId={id} onError={mediaFailed} />}
      {call?.status === 'RINGING' && call.receiver_id === session?.user.id && !backgroundEnded && <>
        <Button title="Terima panggilan" disabled={busy} onPress={() => { void act('accept'); }} />
        <Button title="Tolak" secondary disabled={busy} onPress={() => { void act('decline'); }} />
      </>}
      {call && activeCall(call.status) && <Button title={call.status === 'RINGING' ? 'Batalkan panggilan' : 'Akhiri panggilan'} disabled={busy} onPress={() => { void act('end'); }} />}
      {!!(error || mediaError) && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{mediaError || error}</Text>}
      <Text style={{ color: colors.muted }}>Panggilan tidak direkam. Untuk tahap ini, kedua aplikasi harus tetap terbuka.</Text>
    </ScrollView>
  </SafeAreaView>;
}
