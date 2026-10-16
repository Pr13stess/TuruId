import type { BookingStatus } from './models';

export const bookingLabels: Record<BookingStatus, string> = {
  DRAFT: 'Draft', HELD: 'Menunggu pembayaran', PENDING_PAYMENT: 'Menunggu pembayaran',
  CONFIRMED: 'Terkonfirmasi', ACTIVE: 'Sedang dihuni', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
};
export const bookingFilters = {
  ALL: 'Semua', WAITING: 'Menunggu bayar', ACTIVE: 'Aktif', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
} as const;
export type BookingFilter = keyof typeof bookingFilters;
export const filterStatuses: Record<BookingFilter, BookingStatus[]> = {
  ALL: [], WAITING: ['DRAFT', 'HELD', 'PENDING_PAYMENT'], ACTIVE: ['CONFIRMED', 'ACTIVE'],
  COMPLETED: ['COMPLETED'], CANCELLED: ['CANCELLED'],
};
export const paymentLabels: Record<string, string> = {
  PENDING: 'Menunggu pembayaran', SUCCESS: 'Berhasil', FAILED: 'Gagal', EXPIRED: 'Kedaluwarsa',
  CANCELLED: 'Dibatalkan', REFUNDED: 'Dikembalikan', PARTIALLY_REFUNDED: 'Dikembalikan sebagian',
  PROCESSING: 'Diproses', COMPLETED: 'Selesai',
};
export interface BookingItem {
  id: string; code: string; planId: string; status: BookingStatus; createdAt: string;
  propertyName: string; roomName: string; planName: string;
  moveIn: string | null; checkedIn: string | null; checkedOut: string | null;
  rent: number; downPayment: number; deposit: number; payNow: number; remainingRent: number;
  cancelNote: string | null;
}
export interface BookingPage { items: BookingItem[]; hasMore: boolean }
export interface BookingDetail {
  booking: BookingItem;
  payments: { id: string; status: string; amount: number; createdAt: string;
    refunds: { id: string; status: string; amount: number }[] }[];
}
export function parseBooking(raw: unknown): BookingItem {
  if (!raw || typeof raw !== 'object') throw new Error('Data booking tidak valid.');
  const r = raw as Record<string, unknown>;
  const text = (key: string) => { if (typeof r[key] !== 'string' || !r[key]) throw new Error('Data booking tidak valid.'); return r[key] as string; };
  const money = (key: string) => { const value = r[key]; if (value === null || value === '' || !['number', 'string'].includes(typeof value)) throw new Error('Nominal booking tidak valid.'); const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error('Nominal booking tidak valid.'); return n; };
  const optional = (key: string) => typeof r[key] === 'string' ? r[key] as string : null;
  const status = text('status') as BookingStatus;
  if (!Object.hasOwn(bookingLabels, status)) throw new Error('Status booking tidak dikenal.');
  const createdAt = text('created_at');
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Tanggal booking tidak valid.');
  return {
    id: text('id'), code: text('booking_code'), planId: text('pricing_plan_id'), status, createdAt,
    propertyName: optional('property_name_snapshot') || 'Kos', roomName: optional('room_type_name_snapshot') || 'Kamar', planName: optional('pricing_plan_name_snapshot') || 'Paket sewa',
    moveIn: optional('planned_move_in_date'), checkedIn: optional('checked_in_at'), checkedOut: optional('checked_out_at'),
    rent: money('rent_price_snapshot'), downPayment: money('down_payment_snapshot'), deposit: money('security_deposit_snapshot'),
    payNow: money('pay_now_snapshot'), remainingRent: money('remaining_rent_snapshot'), cancelNote: optional('cancel_note'),
  };
}
