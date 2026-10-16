import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps, TabScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { bookingFilters, bookingLabels, paymentLabels, type BookingFilter } from '../../../domain/bookings';
import type { BookingStatus } from '../../../domain/models';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { rupiah } from '../../format';

const date = (value: string | null) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ditetapkan';
function Badge({ status }: { status: BookingStatus }) {
  return <Text style={[s.badge, status === 'CANCELLED' && s.cancelled]}>{bookingLabels[status]}</Text>;
}

export function BookingsScreen({ navigation }: TabScreenProps<'BookingTab'>) {
  const { checkout, mode } = useRepositories();
  const [filter, setFilter] = useState<BookingFilter>('ALL');
  const [page, setPage] = useState(0);
  const focused = useIsFocused();
  const load = useCallback(() => checkout.listBookings(filter, page), [checkout, filter, page]);
  const state = useResource(load, focused ? 10000 : 0);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} style={s.safe}>
    <View style={s.heading}><Text style={s.title}>Booking saya</Text><Text style={s.muted}>Pantau pesanan dan masa tinggalmu di sini.</Text>
      <Text style={s.demo}>{mode === 'mock' ? 'DATA DEMO · tersimpan selama sesi aplikasi' : 'PEMBAYARAN SANDBOX · tanpa uang nyata'}</Text>
    </View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
      {(Object.keys(bookingFilters) as BookingFilter[]).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }}
        style={[s.filter, filter === key && s.selected]} onPress={() => { setFilter(key); setPage(0); }}>
        <Text style={[s.filterText, filter === key && { color: colors.surface }]}>{bookingFilters[key]}</Text>
      </Pressable>)}
    </ScrollView></View>
    <FlatList style={{ flex: 1 }} contentContainerStyle={s.list} data={state.data?.items ?? []} keyExtractor={item => item.id}
      refreshing={state.loading} onRefresh={() => { if (!state.loading) reload(); }} alwaysBounceVertical
      ListEmptyComponent={<View style={{ gap: 16 }}><Status loading={state.loading} error={state.error} empty="Belum ada booking pada kategori ini" onRetry={state.error ? reload : undefined} />
        {!state.loading && !state.error && <Button title="Cari kos" onPress={() => navigation.navigate('HomeTab')} />}</View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Detail booking ${item.code}, ${bookingLabels[item.status]}`} style={s.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
        <View style={s.row}><Text style={s.code}>{item.code}</Text><Badge status={item.status} /></View>
        <Text style={s.name}>{item.propertyName}</Text><Text style={s.muted}>{item.roomName} · {item.planName}</Text>
        <Text style={s.muted}>Dipesan {date(item.createdAt)}</Text>
        <View style={s.row}><Text style={s.muted}>DP + deposit saat pesan</Text><Text style={s.value}>{rupiah(item.payNow)}</Text></View>
        <Text style={s.link}>Lihat detail →</Text>
      </Pressable>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.items.length) ? <View style={s.paging}>
        <Button secondary title="Sebelumnya" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
        <Text style={s.muted}>{page + 1}</Text>
        <Button secondary title="Berikutnya" disabled={!state.data?.hasMore} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}

export function BookingDetailScreen({ route, navigation }: ScreenProps<'BookingDetail'>) {
  const { checkout } = useRepositories();
  const focused = useIsFocused();
  const load = useCallback(() => checkout.getBookingDetail(route.params.bookingId), [checkout, route.params.bookingId]);
  const state = useResource(load, focused ? 10000 : 0);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const b = state.data?.booking;
  const payable = b && ['HELD', 'PENDING_PAYMENT'].includes(b.status);
  return <SafeAreaView edges={['bottom']} style={s.safe}>
    <ScrollView contentContainerStyle={s.detail} alwaysBounceVertical refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={colors.primary} colors={[colors.primary]} />}>
      {!b ? <Status loading={state.loading} error={state.error} onRetry={reload} /> : <>
        <Text style={s.demo}>DEMO / SANDBOX PAYMENT · tanpa uang nyata</Text>
        <View style={s.row}><Text style={s.code}>{b.code}</Text><Badge status={b.status} /></View>
        <Text style={s.title}>{b.propertyName}</Text><Text style={s.muted}>{b.roomName} · {b.planName}</Text>
        <View style={s.card}><Text style={s.name}>Rincian biaya saat pemesanan</Text>
          {([['Harga sewa', b.rent], ['DP (bagian dari sewa)', b.downPayment], ['Deposit jaminan', b.deposit], ['Bayar saat pemesanan', b.payNow], ['Sisa sewa saat masuk', b.remainingRent]] as const).map(([label, amount]) =>
            <View key={label} style={s.row}><Text style={s.muted}>{label}</Text><Text style={s.value}>{rupiah(amount)}</Text></View>)}
          <Text style={s.muted}>Nominal mengikuti catatan saat booking dibuat, meskipun harga kos kemudian berubah.</Text>
        </View>
        <View style={s.card}><Text style={s.name}>Masa tinggal</Text>
          <Text style={s.muted}>Rencana masuk: {date(b.moveIn)}</Text><Text style={s.muted}>Check-in: {date(b.checkedIn)}</Text><Text style={s.muted}>Checkout: {date(b.checkedOut)}</Text>
          {b.status === 'CONFIRMED' && <Text style={s.muted}>Pesanan terkonfirmasi. Hubungi pemilik untuk mengatur kedatangan.</Text>}
          {b.status === 'ACTIVE' && <Text style={s.muted}>Kamu sudah check-in. Checkout dicatat oleh pemilik kos.</Text>}
          {b.status === 'COMPLETED' && <Text style={s.muted}>Masa tinggal selesai.</Text>}
          {b.status === 'CANCELLED' && <Text style={s.muted}>{b.cancelNote || 'Booking dibatalkan. Periksa status pembayaran dan pengembalian dana di bawah.'}</Text>}
        </View>
        <View style={s.card}><Text style={s.name}>Pembayaran dan pengembalian dana</Text>
          {!state.data?.payments.length && <Text style={s.muted}>Belum ada transaksi tercatat.</Text>}
          {state.data?.payments.map(payment => <View key={payment.id} style={{ gap: 8 }}>
            <View style={s.row}><Text style={s.muted}>{paymentLabels[payment.status] ?? payment.status}</Text><Text style={s.value}>{rupiah(payment.amount)}</Text></View>
            <Text style={s.muted}>{date(payment.createdAt)}</Text>
            {payment.refunds.map(refund => <Text key={refund.id} style={s.muted}>Pengembalian: {paymentLabels[refund.status] ?? refund.status} · {rupiah(refund.amount)}</Text>)}
          </View>)}
        </View>
        {payable && <Button title="Lanjutkan pembayaran / kelola checkout" onPress={() => navigation.navigate('Checkout', { bookingId: b.id, planId: b.planId })} />}
        {b.status === 'CONFIRMED' && <Text style={s.muted}>Pembatalan setelah pembayaran memerlukan proses refund oleh pengelola. Pengajuan langsung dari aplikasi belum tersedia.</Text>}
        <Button secondary title="Kembali ke daftar booking" onPress={() => navigation.navigate('Main', { screen: 'BookingTab' })} />
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, heading: { padding: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary }, name: { fontSize: 16, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 12, color: colors.muted, lineHeight: 19, flexShrink: 1 }, demo: { fontSize: 10, color: colors.muted, lineHeight: 16 },
  filters: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 }, filter: { padding: 11, borderRadius: 10, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.primary }, filterText: { fontSize: 12, color: colors.primary },
  list: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 120, gap: 14 },
  card: { backgroundColor: colors.surface, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: colors.line, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  code: { fontSize: 11, color: colors.muted }, badge: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.orangeSoft, color: colors.primary, fontSize: 11, borderRadius: 8, overflow: 'hidden' },
  cancelled: { backgroundColor: colors.soft, color: colors.danger }, value: { fontSize: 13, color: colors.primary, fontWeight: '700' }, link: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  paging: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', paddingVertical: 15 },
  detail: { flexGrow: 1, padding: 20, paddingBottom: 40, gap: 18, maxWidth: 650, width: '100%', alignSelf: 'center' },
});
