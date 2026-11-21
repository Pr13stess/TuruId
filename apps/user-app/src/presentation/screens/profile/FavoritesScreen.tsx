import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Text } from "../../components/Typography";
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { Input } from "../../components/Input";
import { PropertyCardPhotos } from "../../components/PropertyCardPhotos";
import type { Favorite } from "../../../domain/repositories/FavoriteRepository";
import { MinusIcon } from '../../Icons/FavoriteIcons';

export function FavoritesScreen({ navigation }: ScreenProps<'Favorites'>) {
  const { favorites } = useRepositories();
  const [page, setPage] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("id-ID");
  const searching = term.length > 0;
  const sourcePage = searching ? 0 : page;
  const load = useCallback(async () => {
    if (!searching) return favorites.list(sourcePage);
    const all: Favorite[] = [];
    for (let nextPage = 0; ; nextPage += 1) {
      const batch = await favorites.list(nextPage);
      all.push(...batch.slice(0, 20));
      if (batch.length <= 20) break;
    }
    return [...new Map(all.map(item => [item.propertyId, item])).values()];
  }, [favorites, searching, sourcePage]);
  const state = useResource(load), reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const matches = searching
    ? (state.data ?? []).filter(item => item.name.toLocaleLowerCase("id-ID").includes(term))
    : state.data ?? [];
  const visible = searching ? matches.slice(page * 20, (page + 1) * 20) : matches.slice(0, 20);
  const hasNext = searching ? matches.length > (page + 1) * 20 : matches.length > 20;
  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await favorites.set(id, false); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Favorit gagal dihapus.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View className="w-full max-w-[600px] self-center px-[20px] pt-[16px] pb-[4px]">
      <Input label="Cari favorit" placeholder="Cari nama kos..." value={query}
        onChangeText={text => { setQuery(text); setPage(0); }} autoCapitalize="none" returnKeyType="search" />
    </View>
    <FlatList keyboardShouldPersistTaps="handled" data={visible} keyExtractor={item => item.propertyId}
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40, gap: 16, width: "100%", maxWidth: 600, alignSelf: "center" }} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={error ? <Text className="text-label leading-muted text-danger">{error}</Text> : null}
      ListEmptyComponent={<Status loading={state.loading} error={state.error} empty={searching ? "Tidak ada favorit yang cocok dengan pencarianmu." : "Belum ada favorit di halaman ini. Simpan kos dari halaman detail."} onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <View className="overflow-hidden rounded-card border border-line bg-surface">
        {item.available && <FavoritePhotos propertyId={item.propertyId} name={item.name}
          onPress={() => navigation.navigate("PropertyDetail", { propertyId: item.propertyId })} />}
        <View className="gap-[12px] p-[18px]">
        <View className="flex-row items-start gap-[8px]">
          <Text className="flex-1 pt-[10px] text-header font-bold text-ink">{item.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Hapus ${item.name} dari favorit`}
            accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => remove(item.propertyId)}
            className={`-mr-[8px] h-[44px] w-[44px] items-center justify-center ${busy ? "opacity-40" : "active:opacity-60"}`}>
            <View className="h-[26px] w-[26px] items-center justify-center rounded-pill border border-line bg-soft">
              <MinusIcon color={colors.danger} size={16} />
            </View>
          </Pressable>
        </View>
        {item.available && <Button title="Lihat kos" onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.propertyId })} />}
        </View>
      </View>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || matches.length > 0) ? <View className="gap-[12px]">
        <Button secondary title="Sebelumnya" disabled={page === 0 || busy} onPress={() => setPage(p => p - 1)} />
        <Button secondary title="Berikutnya" disabled={busy || !hasNext} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}

function FavoritePhotos({ propertyId, name, onPress }: { propertyId: string; name: string; onPress: () => void }) {
  const { properties } = useRepositories();
  const load = useCallback(() => properties.get(propertyId), [properties, propertyId]);
  const state = useResource(load);
  const images = state.data?.images ?? [];
  return <PropertyCardPhotos key={JSON.stringify(images)} images={images} name={name} onPress={onPress} />;
}
