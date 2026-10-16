import type { Checkout } from "../models";
import type { BookingFilter, BookingPage, BookingDetail } from "../bookings";
export interface CheckoutRepository {
  listBookings(filter: BookingFilter, page: number): Promise<BookingPage>;
  getBookingDetail(id: string): Promise<BookingDetail>;
  /** Holds one unit and opens a payment session. Safe to repeat. */
  start(planId: string): Promise<{ bookingId: string }>;
  /** Server truth: status, hold deadline and server clock. */
  get(bookingId: string): Promise<Checkout>;
  cancel(bookingId: string): Promise<void>;
  /** Mock mode only: stands in for the Xendit test-mode simulator. */
  simulatePayment?(bookingId: string): Promise<void>;
}
