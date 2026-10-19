import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useRepositories } from '../../providers/RepositoryProvider';
import type { VoiceCall } from '../../domain/repositories/CallRepository';

export function useVoiceCalls() {
  const { calls } = useRepositories();
  const [data, setData] = useState<VoiceCall[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    let active = true, busy = false;
    const check = async () => {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const rows = await calls.list();
        if (active) { setData(rows); setError(''); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Status panggilan gagal dimuat.'); }
      finally { busy = false; }
    };
    void check();
    const timer = setInterval(() => { void check(); }, 3000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, [calls, revision]);
  return { data, error, refresh };
}
