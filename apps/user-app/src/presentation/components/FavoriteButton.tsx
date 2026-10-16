import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRepositories } from '../../providers/RepositoryProvider';
import { useResource } from '../hooks/useResource';
import { Button } from './Primitives';
import { colors } from '../theme';

export function FavoriteButton({ propertyId }: { propertyId: string }) {
  const { favorites } = useRepositories();
  const load = useCallback(() => favorites.has(propertyId), [favorites, propertyId]);
  const state = useResource(load);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  async function toggle() {
    if (lock.current || state.data === null) return;
    lock.current = true; setBusy(true); setError(null);
    try { await favorites.set(propertyId, !state.data); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Favorit gagal diperbarui.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8, marginVertical: 12 }}>
    <Button secondary title={state.error ? 'Coba muat favorit' : busy ? 'Menyimpan…' : state.loading ? 'Memuat favorit…' : state.data ? '♥ Tersimpan' : '♡ Simpan kos'}
      disabled={busy || state.loading} onPress={state.error ? reload : toggle} />
    {!!(error || state.error) && <Text style={{ color: colors.danger }}>{error || state.error}</Text>}
  </View>;
}
