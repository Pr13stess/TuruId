import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicReview } from '../../domain/propertyFeedback';
export async function listPublicReviews(client: SupabaseClient, propertyId: string, page: number): Promise<PublicReview[]> {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
  const { data, error } = await client.from('reviews').select('id,rating,review_text,created_at')
    .eq('property_id', propertyId).eq('moderation_status', 'APPROVED')
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * 20, page * 20 + 20);
  if (error) throw new Error('Ulasan gagal dimuat. Coba lagi.');
  return (data ?? []).map(row => {
    if (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 || !Number.isFinite(Date.parse(row.created_at)))
      throw new Error('Data ulasan tidak valid.');
    return row;
  });
}
