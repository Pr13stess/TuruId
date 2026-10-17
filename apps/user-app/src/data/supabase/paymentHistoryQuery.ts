import type { SupabaseClient } from '@supabase/supabase-js';
import { parsePaymentHistory, type PaymentHistoryPage } from '../../domain/paymentHistory';
export async function listPaymentHistory(client: SupabaseClient, page: number): Promise<PaymentHistoryPage> {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error('Silakan masuk kembali.');
  // Inner join filters transactions, not just the embedded booking. RLS can also
  // allow owners/admins, so scope explicitly to bookings made by this User.
  const { data, error } = await client.from('payments')
    .select('id,booking_id,status,gross_amount,created_at,bookings!inner(booking_code,property_name_snapshot,user_id)')
    .eq('bookings.user_id', auth.user.id)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * 20, page * 20 + 20);
  if (error) throw new Error('Riwayat pembayaran gagal dimuat. Coba lagi.');
  return { items: (data ?? []).slice(0, 20).map(parsePaymentHistory), hasMore: (data?.length ?? 0) > 20 };
}
