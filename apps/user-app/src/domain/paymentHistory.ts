export interface PaymentHistoryItem {
  id: string; bookingId: string; bookingCode: string; propertyName: string;
  status: string; amount: number; createdAt: string;
}
export interface PaymentHistoryPage { items: PaymentHistoryItem[]; hasMore: boolean }
export function parsePaymentHistory(raw: unknown): PaymentHistoryItem {
  if (!raw || typeof raw !== 'object') throw new Error('Data pembayaran tidak valid.');
  const r = raw as Record<string, unknown>;
  const b = r.bookings as Record<string, unknown> | null;
  const text = (v: unknown): string => {
    if (typeof v !== 'string' || !v) throw new Error('Data pembayaran tidak valid.');
    return v;
  };
  const amount = Number(r.gross_amount);
  if (!['number', 'string'].includes(typeof r.gross_amount) || r.gross_amount === '' || !Number.isSafeInteger(amount) || amount < 0)
    throw new Error('Nominal pembayaran tidak valid.');
  const createdAt = text(r.created_at);
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Tanggal pembayaran tidak valid.');
  return { id: text(r.id), bookingId: text(r.booking_id), bookingCode: text(b?.booking_code),
    propertyName: typeof b?.property_name_snapshot === 'string' && b.property_name_snapshot ? b.property_name_snapshot : 'Kos',
    status: text(r.status), amount, createdAt };
}
