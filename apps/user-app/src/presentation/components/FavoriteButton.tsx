import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRepositories } from '../../providers/RepositoryProvider';
import { useResource } from '../hooks/useResource';
import { HeartIcon } from '../Icons/FavoriteIcons';
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
    <Pressable accessibilityRole="button"
      accessibilityLabel={state.error ? 'Coba muat favorit' : state.data ? 'Hapus dari favorit' : 'Simpan kos ke favorit'}
      accessibilityState={{ selected: state.data === true, disabled: busy || state.loading, busy: busy || state.loading }}
      disabled={busy || state.loading} onPress={state.error ? reload : toggle}
      style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9,
        minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: colors.danger,
        backgroundColor: pressed ? colors.soft : colors.surface, opacity: busy || state.loading ? 0.6 : 1 })}>
      {busy || state.loading ? <ActivityIndicator size="small" color={colors.danger} /> : <HeartIcon color={colors.danger} filled={state.data === true} />}
      <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>
        {state.error ? 'Coba lagi' : busy ? 'Menyimpan…' : state.loading ? 'Memuat…' : state.data ? 'Tersimpan' : 'Simpan kos'}
      </Text>
    </Pressable>
    {!!(error || state.error) && <Text style={{ color: colors.danger }}>{error || state.error}</Text>}
  </View>;
}
