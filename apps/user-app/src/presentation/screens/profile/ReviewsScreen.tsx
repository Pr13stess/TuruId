import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { OwnerReviewReply } from '../../components/OwnerReviewReply';

export function ReviewsScreen({ route }: ScreenProps<'Reviews'>) {
  const { properties, mode } = useRepositories();
  const [page, setPage] = useState(0);
  const load = useCallback(() => properties.listReviews(route.params.propertyId, page), [properties, route.params.propertyId, page]);
  const state = useResource(load), reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={state.data?.slice(0, 20) ?? []} keyExtractor={item => item.id}
      contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 14 }} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={mode === 'mock' ? <Text style={{ color: colors.muted }}>Mode demo belum memiliki isi ulasan.</Text> : null}
      ListEmptyComponent={<Status loading={state.loading} error={state.error} empty="Belum ada ulasan ditayangkan di halaman ini." onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <View style={{ padding: 18, gap: 10, borderRadius: 12, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Penyewa terverifikasi</Text>
        <View accessible accessibilityLabel={`Rating ${item.rating} dari 5`} style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(n => <Svg key={n} width={20} height={20} viewBox="0 0 24 24" accessible={false}>
            <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"
              stroke={colors.orange} fill={n <= item.rating ? colors.orange : 'none'} strokeLinejoin="round" />
          </Svg>)}
        </View>
        {!!item.review_text && <Text style={{ color: colors.ink, lineHeight: 22 }}>{item.review_text}</Text>}
        <OwnerReviewReply text={item.owner_reply} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
      </View>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View style={{ gap: 10 }}>
        <Button secondary title="Sebelumnya" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
        <Button secondary title="Berikutnya" disabled={(state.data?.length ?? 0) <= 20} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
