import type { SupabaseClient } from '@supabase/supabase-js';
import { reviewText, type ReviewRepository, type OwnReview } from '../../domain/repositories/ReviewRepository';
export class SupabaseReviewRepository implements ReviewRepository {
  constructor(private readonly client: SupabaseClient) {}
  async get(bookingId: string): Promise<OwnReview | null> {
    const { data: auth, error: authError } = await this.client.auth.getUser();
    if (authError || !auth.user) throw new Error('Silakan masuk kembali.');
    const { data, error } = await this.client.from('reviews')
      .select('id,rating,review_text,moderation_status').eq('booking_id', bookingId).eq('user_id', auth.user.id).maybeSingle();
    if (error) throw new Error('Ulasan gagal dimuat. Coba lagi.');
    if (!data) return null;
    if (!['PENDING', 'APPROVED', 'HIDDEN', 'REJECTED'].includes(data.moderation_status) || !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5)
      throw new Error('Data ulasan tidak valid.');
    return { ...data, review_text: data.review_text ?? '' } as OwnReview;
  }
  async submit(bookingId: string, rating: number, text: string) {
    const body = reviewText(rating, text);
    const { data, error } = await this.client.rpc('user_submit_review', { p_booking_id: bookingId, p_rating: rating, p_text: body });
    if (error) throw new Error(error.code === 'PGRST202' ? 'Fitur ulasan belum diaktifkan di server.' : error.message);
    if (typeof data !== 'string' || !data) throw new Error('Konfirmasi ulasan belum diterima. Coba lagi.');
    return data;
  }
}
