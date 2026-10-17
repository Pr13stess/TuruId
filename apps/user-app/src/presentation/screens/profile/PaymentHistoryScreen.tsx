import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { paymentLabels } from '../../../domain/bookings';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { rupiah } from '../../format';

export function PaymentHistoryScreen({ navigation }: ScreenProps<'PaymentHistory'>) {
  const { checkout, mode } = useRepositories();
  const [page, setPage] = useState(0);
  const focused = useIsFocused();
  const load = useCallback(() => checkout.listPayments(page), [checkout, page]);
  const state = useResource(load, focused ? 15000 : 0), reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} style={s.safe}>
    <FlatList data={state.data?.items ?? []} keyExtractor={item => item.id}
      contentContainerStyle={s.list} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={<Text style={s.muted}>{mode === 'mock' ? 'Data demo · selama sesi aplikasi' : 'Pembayaran sandbox · tanpa uang nyata'}</Text>}
      ListEmptyComponent={<Status loading={state.loading} error={state.error}
        empty="Belum ada transaksi di halaman ini." onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button"
        accessibilityLabel={`${item.propertyName}, ${rupiah(item.amount)}, ${paymentLabels[item.status] ?? 'Status belum dikenal'}. Buka detail booking.`}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.bookingId })}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
        <View style={s.row}><Text style={s.code}>{item.bookingCode}</Text>
          <Text style={[s.badge, item.status === 'SUCCESS' && { color: colors.green }]}>{paymentLabels[item.status] ?? 'Status belum dikenal'}</Text></View>
        <Text style={s.name}>{item.propertyName}</Text>
        <Text style={s.amount}>{rupiah(item.amount)}</Text>
        <Text style={s.muted}>{new Date(item.createdAt).toLocaleString('id-ID')}</Text>
        <Text style={s.link}>Lihat detail booking</Text>
      </Pressable>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.items.length) ? <View style={s.pager}>
        <Button secondary title="Sebelumnya" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
        <Text style={s.muted}>{page + 1}</Text>
        <Button secondary title="Berikutnya" disabled={!state.data?.hasMore} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, list: { flexGrow: 1, padding: 20, gap: 16 },
  card: { padding: 18, gap: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  code: { color: colors.muted, fontSize: 12 }, badge: { color: colors.primary, backgroundColor: colors.soft, padding: 8, borderRadius: 8, fontSize: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' }, amount: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
});
