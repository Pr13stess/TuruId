import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from "./Typography";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRepositories } from '../../providers/RepositoryProvider';
import { useResource } from '../hooks/useResource';
import { colors } from '../theme';

export function FavoriteButton({ propertyId, compact = false }: { propertyId: string; compact?: boolean }) {
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
  return <View className={`shrink gap-[8px] ${compact ? "items-end" : ""}`}>
    <Pressable accessibilityRole="button"
      accessibilityLabel={state.error ? 'Coba muat favorit' : state.data ? 'Hapus dari favorit' : 'Simpan kos ke favorit'}
      accessibilityState={{ selected: state.data === true, disabled: busy || state.loading, busy: busy || state.loading }}
      disabled={busy || state.loading} onPress={state.error ? reload : toggle}
      className={`${compact ? "h-[48px] w-[48px] items-center justify-center rounded-pill border border-line bg-surface shadow-card" : "min-h-[44px] self-start flex-row items-center gap-[9px] rounded-pill border bg-surface px-[14px]"} ${compact ? "" : state.data ? "border-accent-strong" : "border-primary"} active:bg-soft ${busy || state.loading ? "opacity-60" : ""}`}>
      {busy || state.loading ? <ActivityIndicator size="small" color={state.data ? colors.accentStrong : colors.primary} /> : <Ionicons name={state.data ? "bookmark" : "bookmark-outline"} size={22} color={state.data ? colors.accentStrong : colors.primary} />}
      {!compact && <Text className={`text-label font-semibold ${state.data ? "text-accent-strong" : "text-primary"}`}>
        {state.error ? 'Coba lagi' : busy ? 'Menyimpan…' : state.loading ? 'Memuat…' : state.data ? 'Tersimpan' : 'Simpan kos'}
      </Text>}
    </Pressable>
    {!!(error || state.error) && <Text className={`text-label leading-muted text-danger ${compact ? "rounded-control bg-surface p-[8px]" : ""}`}>{error || state.error}</Text>}
  </View>;
}
