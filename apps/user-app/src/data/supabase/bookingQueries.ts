import type { SupabaseClient } from '@supabase/supabase-js';
import { filterStatuses, parseBooking, type BookingFilter, type BookingPage, type BookingDetail } from '../../domain/bookings';

const columns = 'id,booking_code,pricing_plan_id,status,created_at,property_name_snapshot,room_type_name_snapshot,pricing_plan_name_snapshot,planned_move_in_date,checked_in_at,checked_out_at,rent_price_snapshot,down_payment_snapshot,security_deposit_snapshot,pay_now_snapshot,remaining_rent_snapshot,cancel_note';
async function actor(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  return data.user.id;
}
export async function listBookings(client: SupabaseClient, filter: BookingFilter, page: number): Promise<BookingPage> {
  if (!Object.hasOwn(filterStatuses, filter) || !Number.isSafeInteger(page) || page < 0) throw new Error('Filter booking tidak valid.');
  const userId = await actor(client);
  let query = client.from('bookings').select(columns).eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  if (filterStatuses[filter].length) query = query.in('status', filterStatuses[filter]);
  const { data, error } = await query.range(page * 20, page * 20 + 20);
  if (error) throw new Error('Daftar booking gagal dimuat. Coba lagi.');
  return { items: (data ?? []).slice(0, 20).map(parseBooking), hasMore: (data?.length ?? 0) > 20 };
}
export async function getBookingDetail(client: SupabaseClient, id: string): Promise<BookingDetail> {
  const userId = await actor(client);
  const { data, error } = await client.from('bookings').select(columns).eq('id', id).eq('user_id', userId).maybeSingle();
  if (error || !data) throw new Error('Booking tidak ditemukan atau tidak bisa diakses.');
  const booking = parseBooking(data);
  const { data: payments, error: paymentError } = await client.from('payments')
    .select('id,status,gross_amount,created_at,refunds(id,status,amount)').eq('booking_id', id)
    .order('created_at', { ascending: false });
  if (paymentError) throw new Error('Status pembayaran gagal dimuat. Coba lagi.');
  const amount = (v: unknown) => { const n = Number(v); if (v === null || !Number.isSafeInteger(n) || n < 0) throw new Error('Nominal transaksi tidak valid.'); return n; };
  return { booking, payments: (payments ?? []).map(p => ({
    id: p.id, status: p.status, amount: amount(p.gross_amount), createdAt: p.created_at,
    refunds: (p.refunds ?? []).map(r => ({ id: r.id, status: r.status, amount: amount(r.amount) })),
  })) };
}
