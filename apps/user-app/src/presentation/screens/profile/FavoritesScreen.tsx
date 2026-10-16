import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { MinusIcon } from '../../Icons/FavoriteIcons';

export function FavoritesScreen({ navigation }: ScreenProps<'Favorites'>) {
  const { favorites } = useRepositories();
  const [page, setPage] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const load = useCallback(() => favorites.list(page), [favorites, page]);
  const state = useResource(load), reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await favorites.set(id, false); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Favorit gagal dihapus.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={state.data?.slice(0, 20) ?? []} keyExtractor={item => item.propertyId}
      contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 16 }} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      ListEmptyComponent={<Status loading={state.loading} error={state.error} empty="Belum ada favorit di halaman ini. Simpan kos dari halaman detail." onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <View style={{ padding: 18, gap: 12, backgroundColor: colors.surface, borderRadius: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ flex: 1, paddingTop: 10, fontSize: 16, fontWeight: '700', color: colors.primary }}>{item.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Hapus ${item.name} dari favorit`}
            accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => remove(item.propertyId)}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
              marginRight: -8, opacity: busy ? 0.4 : pressed ? 0.6 : 1 })}>
            <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.line,
              backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
              <MinusIcon color={colors.primary} size={16} />
            </View>
          </Pressable>
        </View>
        {item.available && <Button title="Lihat kos" onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.propertyId })} />}
      </View>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View style={{ gap: 12 }}>
        <Button secondary title="Sebelumnya" disabled={page === 0 || busy} onPress={() => setPage(p => p - 1)} />
        <Button secondary title="Berikutnya" disabled={busy || (state.data?.length ?? 0) <= 20} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
