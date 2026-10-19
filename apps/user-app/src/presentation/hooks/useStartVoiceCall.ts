import { useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRepositories } from '../../providers/RepositoryProvider';

export function useStartVoiceCall(open: (id: string) => void) {
  const { calls } = useRepositories();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const start = async (conversation: () => Promise<string>) => {
    if (lock.current) return;
    if (Platform.OS === 'web') { Alert.alert('Panggilan suara', 'Gunakan development build Android/iOS untuk menelepon.'); return; }
    lock.current = true; setBusy(true);
    try { const call = await calls.start(await conversation()); open(call.id); }
    catch (e) { Alert.alert('Panggilan belum dimulai', e instanceof Error ? e.message : 'Coba lagi.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { start, busy };
}
