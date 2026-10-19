import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Text, View } from 'react-native';
import { useRepositories } from '../../providers/RepositoryProvider';
import { voiceSession } from '../../domain/voiceSession';
import { Button } from './Primitives';
import { colors } from '../theme';
import type { VoiceMediaProps } from './VoiceMedia.types';

export default function VoiceMedia({ callId, onError }: VoiceMediaProps) {
  const { calls } = useRepositories();
  const session = useRef<ReturnType<typeof voiceSession> | null>(null);
  const [status, setStatus] = useState('Menghubungkan audio…');
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  useEffect(() => {
    const current = voiceSession({
      sdk: () => import('react-native-agora'),
      permission: async () => {
        const granted = Platform.OS === 'android'
          ? await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO) === PermissionsAndroid.RESULTS.GRANTED
          : (await (await import('expo-audio')).requestRecordingPermissionsAsync()).granted;
        if (!granted) throw new Error('Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan aplikasi lalu telepon lagi.');
      },
      token: () => calls.token(callId), status: setStatus, failed: onError,
    });
    session.current = current;
    void current.start();
    return () => { current.stop(); session.current = null; };
  }, [calls, callId, onError]);
  return <View style={{ gap: 16 }}>
    <Text accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: colors.primary }}>{status}</Text>
    <Button title={muted ? 'Aktifkan mikrofon' : 'Matikan mikrofon'} secondary onPress={() => {
      if (session.current?.mute(!muted)) setMuted(!muted);
    }} />
    <Button title={speaker ? 'Gunakan earpiece' : 'Gunakan speaker'} secondary onPress={() => {
      if (session.current?.speaker(!speaker)) setSpeaker(!speaker);
    }} />
  </View>;
}
