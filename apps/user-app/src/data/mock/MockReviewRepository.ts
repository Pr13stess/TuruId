import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { CheckoutRepository } from '../../domain/repositories/CheckoutRepository';
import { reviewText, type ReviewRepository, type OwnReview } from '../../domain/repositories/ReviewRepository';
export class MockReviewRepository implements ReviewRepository {
  private readonly records = new Map<string, OwnReview>();
  constructor(private readonly auth: AuthRepository, private readonly checkout: CheckoutRepository) {}
  private async key(id: string) {
    const session = await this.auth.getSession();
    if (!session) throw new Error('Silakan masuk kembali.');
    return `${session.user.id}:${id}`;
  }
  async get(id: string) {
    const row = this.records.get(await this.key(id));
    return row ? { ...row } : null;
  }
  async submit(id: string, rating: number, text: string) {
    const body = reviewText(rating, text), key = await this.key(id);
    const { booking } = await this.checkout.getBookingDetail(id);
    if (booking.status !== 'COMPLETED') throw new Error('Ulasan hanya untuk booking selesai milik sendiri.');
    const existing = this.records.get(key);
    if (existing) {
      if (existing.rating === rating && existing.review_text === body) return existing.id;
      throw new Error('Booking ini sudah memiliki ulasan.');
    }
    const next: OwnReview = { id: `mock-review-${this.records.size + 1}`, rating, review_text: body, moderation_status: 'PENDING' };
    this.records.set(key, next);
    return next.id;
  }
}
