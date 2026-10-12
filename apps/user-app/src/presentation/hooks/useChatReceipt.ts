import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

export function useChatReceipt(sync: () => Promise<string | null>, ready: boolean) {
  const focused = useIsFocused();
  const [result, setResult] = useState<{ sync: typeof sync; readAt: string | null }>();
  useEffect(() => {
    if (!focused || !ready) return;
    let active = true;
    let busy = false;
    const poll = async () => {
      if (!active || busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const readAt = await sync();
        if (active) setResult({ sync, readAt });
      } catch {
        // Failure must never be interpreted as a read acknowledgement.
      } finally { busy = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void poll(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [sync, ready, focused]);
  return result?.sync === sync ? result.readAt : null;
}
