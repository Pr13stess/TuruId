export interface OwnReview {
  id: string; rating: number; review_text: string; moderation_status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED';
}
export interface ReviewRepository {
  get(bookingId: string): Promise<OwnReview | null>;
  submit(bookingId: string, rating: number, text: string): Promise<string>;
}
export function reviewText(rating: number, text: string) {
  const body = text.trim();
  const length = [...body].length;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || length < 5 || length > 2000)
    throw new Error('Pilih 1–5 bintang dan tulis ulasan 5–2000 karakter.');
  return body;
}
