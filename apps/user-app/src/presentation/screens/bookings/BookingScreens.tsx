import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from "../../components/Typography";
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
  return <Text className={`overflow-hidden rounded-chip px-[10px] py-[6px] text-caption ${status === "CANCELLED" ? "bg-soft text-danger" : "bg-accent-soft text-accent-strong"}`}>{bookingLabels[status]}</Text>;
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
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View className="gap-[8px] p-[20px]"><Text className="text-title font-bold text-ink">Booking saya</Text><Text className="shrink text-label leading-muted text-muted">Pantau pesanan dan masa tinggalmu di sini.</Text>
      <Text className="text-caption leading-muted text-muted">{mode === 'mock' ? 'DATA DEMO · tersimpan selama sesi aplikasi' : 'PEMBAYARAN SANDBOX · tanpa uang nyata'}</Text>
    </View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 8 }}>
      {(Object.keys(bookingFilters) as BookingFilter[]).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }}
        className={`rounded-control border p-[11px] ${filter === key ? "border-accent-strong bg-accent-soft" : "border-line bg-surface"}`} onPress={() => { setFilter(key); setPage(0); }}>
        <Text className={`text-label font-semibold ${filter === key ? "text-accent-strong" : "text-primary"}`}>{bookingFilters[key]}</Text>
      </Pressable>)}
    </ScrollView></View>
    <FlatList style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 120, gap: 14 }} data={state.data?.items ?? []} keyExtractor={item => item.id}
      refreshing={state.loading} onRefresh={() => { if (!state.loading) reload(); }} alwaysBounceVertical
      ListEmptyComponent={<View style={{ gap: 16 }}><Status loading={state.loading} error={state.error} empty="Belum ada booking pada kategori ini" onRetry={state.error ? reload : undefined} />
        {!state.loading && !state.error && <Button title="Cari kos" onPress={() => navigation.navigate('HomeTab')} />}</View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Detail booking ${item.code}, ${bookingLabels[item.status]}`} className="gap-[12px] rounded-card border border-line bg-surface p-[18px] shadow-card"
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
        <View className="flex-row flex-wrap items-center justify-between gap-[10px]"><Text className="text-caption text-muted">{item.code}</Text><Badge status={item.status} /></View>
        <Text className="text-header font-bold text-ink">{item.propertyName}</Text><Text className="shrink text-label leading-muted text-muted">{item.roomName} · {item.planName}</Text>
        <Text className="shrink text-label leading-muted text-muted">Dipesan {date(item.createdAt)}</Text>
        <View className="flex-row flex-wrap items-center justify-between gap-[10px]"><Text className="shrink text-label leading-muted text-muted">DP + deposit saat pesan</Text><Text className="text-body font-bold text-accent-strong">{rupiah(item.payNow)}</Text></View>
        <Text className="text-label font-bold text-accent-strong">Lihat detail →</Text>
      </Pressable>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.items.length) ? <View className="flex-row flex-wrap items-center justify-center gap-[10px] py-[15px]">
        <Button secondary title="Sebelumnya" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
        <Text className="shrink text-label leading-muted text-muted">{page + 1}</Text>
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
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40, gap: 18, maxWidth: 650, width: '100%', alignSelf: 'center' }} alwaysBounceVertical refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={colors.primary} colors={[colors.primary]} />}>
      {!b ? <Status loading={state.loading} error={state.error} onRetry={reload} /> : <>
        <Text className="text-caption leading-muted text-muted">DEMO / SANDBOX PAYMENT · tanpa uang nyata</Text>
        <View className="flex-row flex-wrap items-center justify-between gap-[10px]"><Text className="text-caption text-muted">{b.code}</Text><Badge status={b.status} /></View>
        <Text className="text-title font-bold text-ink">{b.propertyName}</Text><Text className="shrink text-label leading-muted text-muted">{b.roomName} · {b.planName}</Text>
        <View className="gap-[12px] rounded-card border border-line bg-surface p-[18px] shadow-card"><Text className="text-header font-bold text-ink">Rincian biaya saat pemesanan</Text>
          {([['Harga sewa', b.rent], ['DP (bagian dari sewa)', b.downPayment], ['Deposit jaminan', b.deposit], ['Bayar saat pemesanan', b.payNow], ['Sisa sewa saat masuk', b.remainingRent]] as const).map(([label, amount]) =>
            <View key={label} className="flex-row flex-wrap items-center justify-between gap-[10px]"><Text className="shrink text-label leading-muted text-muted">{label}</Text><Text className="text-body font-bold text-accent-strong">{rupiah(amount)}</Text></View>)}
          <Text className="shrink text-label leading-muted text-muted">Nominal mengikuti catatan saat booking dibuat, meskipun harga kos kemudian berubah.</Text>
        </View>
        <View className="gap-[12px] rounded-card border border-line bg-surface p-[18px] shadow-card"><Text className="text-header font-bold text-ink">Masa tinggal</Text>
          <Text className="shrink text-label leading-muted text-muted">Rencana masuk: {date(b.moveIn)}</Text><Text className="shrink text-label leading-muted text-muted">Check-in: {date(b.checkedIn)}</Text><Text className="shrink text-label leading-muted text-muted">Checkout: {date(b.checkedOut)}</Text>
          {b.status === 'CONFIRMED' && <Text className="shrink text-label leading-muted text-muted">Pesanan terkonfirmasi. Hubungi pemilik untuk mengatur kedatangan.</Text>}
          {b.status === 'ACTIVE' && <Text className="shrink text-label leading-muted text-muted">Kamu sudah check-in. Checkout dicatat oleh pemilik kos.</Text>}
          {b.status === 'COMPLETED' && <Text className="shrink text-label leading-muted text-muted">Masa tinggal selesai.</Text>}
          {b.status === 'CANCELLED' && <Text className="shrink text-label leading-muted text-muted">{b.cancelNote || 'Booking dibatalkan. Periksa status pembayaran dan pengembalian dana di bawah.'}</Text>}
        </View>
        <View className="gap-[12px] rounded-card border border-line bg-surface p-[18px] shadow-card"><Text className="text-header font-bold text-ink">Pembayaran dan pengembalian dana</Text>
          {!state.data?.payments.length && <Text className="shrink text-label leading-muted text-muted">Belum ada transaksi tercatat.</Text>}
          {state.data?.payments.map(payment => <View key={payment.id} style={{ gap: 8 }}>
            <View className="flex-row flex-wrap items-center justify-between gap-[10px]"><Text className="shrink text-label leading-muted text-muted">{paymentLabels[payment.status] ?? payment.status}</Text><Text className="text-body font-bold text-accent-strong">{rupiah(payment.amount)}</Text></View>
            <Text className="shrink text-label leading-muted text-muted">{date(payment.createdAt)}</Text>
            {payment.refunds.map(refund => <Text key={refund.id} className="shrink text-label leading-muted text-muted">Pengembalian: {paymentLabels[refund.status] ?? refund.status} · {rupiah(refund.amount)}</Text>)}
          </View>)}
        </View>
        {payable && <Button title="Lanjutkan pembayaran / kelola checkout" onPress={() => navigation.navigate('Checkout', { bookingId: b.id, planId: b.planId })} />}
        {b.status === 'COMPLETED' && <Button title="Beri / lihat ulasan" onPress={() => navigation.navigate('WriteReview', { bookingId: b.id })} />}
        {b.status === 'CONFIRMED' && <Text className="shrink text-label leading-muted text-muted">Pembatalan setelah pembayaran memerlukan proses refund oleh pengelola. Pengajuan langsung dari aplikasi belum tersedia.</Text>}
        <Button secondary title="Kembali ke daftar booking" onPress={() => navigation.navigate('Main', { screen: 'BookingTab' })} />
      </>}
    </ScrollView>
  </SafeAreaView>;
}
