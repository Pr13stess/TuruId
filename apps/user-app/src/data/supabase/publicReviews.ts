import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicReview } from '../../domain/propertyFeedback';
export async function listPublicReviews(client: SupabaseClient, propertyId: string, page: number): Promise<PublicReview[]> {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
  const query = (fields: string) => client.from('reviews').select(fields)
    .eq('property_id', propertyId).eq('moderation_status', 'APPROVED')
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * 20, page * 20 + 20);
  const legacyFields = 'id,rating,review_text,created_at';
  let result = await query(`${legacyFields},owner_reply,owner_reply_at`);
  // Only an absent reply column permits legacy reads; never hide network/RLS failures.
  if (result.error && ['42703', 'PGRST204'].includes(result.error.code)
      && /owner_reply(?:_at)?/.test(result.error.message)) result = await query(legacyFields);
  const { data, error } = result;
  if (error) throw new Error('Ulasan gagal dimuat. Coba lagi.');
  return (data ?? []).map(value => {
    const row = value as unknown as PublicReview;
    if (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 || !Number.isFinite(Date.parse(row.created_at)))
      throw new Error('Data ulasan tidak valid.');
    if (row.owner_reply != null && (typeof row.owner_reply !== 'string' || !row.owner_reply.trim()
      || [...row.owner_reply].length > 2000 || !row.owner_reply_at || !Number.isFinite(Date.parse(row.owner_reply_at))))
      throw new Error('Data balasan ulasan tidak valid.');
    return row;
  });
}
