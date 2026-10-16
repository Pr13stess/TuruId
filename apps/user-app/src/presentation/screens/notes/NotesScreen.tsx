import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';

export function NotesScreen({ navigation }: ScreenProps<'Notes'>) {
  const { notes } = useRepositories();
  const [page, setPage] = useState(0);
  const loader = useCallback(() => notes.list(page), [notes, page]);
  const state = useResource(loader);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} style={s.safe}>
    <FlatList data={state.data?.slice(0, 20) ?? []} keyExtractor={item => item.id}
      contentContainerStyle={s.list} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={<Text style={s.muted}>Catatan pribadi tentang kos yang kamu pertimbangkan.</Text>}
      ListEmptyComponent={<Status loading={state.loading} error={state.error}
        empty="Belum ada catatan. Buat catatan dari halaman detail kos." onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Buka catatan ${item.property_name}`}
        style={s.card} onPress={() => navigation.navigate('Note', { propertyId: item.property_id, propertyName: item.property_name })}>
        <Text style={s.title}>{item.property_name}</Text>
        <Text style={s.body} numberOfLines={3}>{item.content || 'Catatan kosong'}</Text>
        <Text style={s.muted}>{new Date(item.updated_at).toLocaleDateString('id-ID')}</Text>
      </Pressable>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View style={s.pager}>
        <Button secondary title="Sebelumnya" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
        <Text style={s.muted}>{page + 1}</Text>
        <Button secondary title="Berikutnya" disabled={(state.data?.length ?? 0) <= 20} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, list: { flexGrow: 1, padding: 20, gap: 16 },
  card: { padding: 18, gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary }, body: { fontSize: 14, lineHeight: 21, color: colors.ink },
  muted: { fontSize: 12, color: colors.muted }, pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
});
