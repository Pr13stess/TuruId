import type { SupabaseClient } from '@supabase/supabase-js';
import type { Favorite, FavoriteRepository } from '../../domain/repositories/FavoriteRepository';

export class SupabaseFavoriteRepository implements FavoriteRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async user() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('Silakan masuk kembali.');
    return data.user.id;
  }
  async list(page: number): Promise<Favorite[]> {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
    const user = await this.user();
    const { data, error } = await this.client.from('favorites').select('property_id,created_at')
      .eq('user_id', user).order('created_at', { ascending: false })
      .order('property_id', { ascending: false }).range(page * 20, page * 20 + 20);
    if (error) throw new Error('Favorit gagal dimuat. Coba lagi.');
    if (!data?.length) return [];
    // Public catalog keeps unpublished listings hidden, including for multi-role accounts.
    const { data: properties, error: catalogError } = await this.client.from('property_catalog')
      .select('id,name').in('id', data.map(row => row.property_id));
    if (catalogError) throw new Error('Detail favorit gagal dimuat. Coba lagi.');
    const names = new Map((properties ?? []).map(p => [p.id, p.name as string]));
    return data.map(row => ({ propertyId: row.property_id, createdAt: row.created_at,
      name: names.get(row.property_id) ?? 'Kos tidak tersedia', available: names.has(row.property_id) }));
  }
  async has(propertyId: string) {
    const user = await this.user();
    const { data, error } = await this.client.from('favorites').select('property_id')
      .eq('user_id', user).eq('property_id', propertyId).maybeSingle();
    if (error) throw new Error('Status favorit gagal dimuat.');
    return !!data;
  }
  async set(propertyId: string, saved: boolean) {
    const user = await this.user();
    const { error } = saved
      ? await this.client.from('favorites').upsert({ user_id: user, property_id: propertyId },
        { onConflict: 'user_id,property_id', ignoreDuplicates: true })
      : await this.client.from('favorites').delete().eq('user_id', user).eq('property_id', propertyId);
    if (error) throw new Error('Favorit gagal diperbarui. Coba lagi.');
    // Confirm persisted state, including retries after a lost response.
    if (await this.has(propertyId) !== saved) throw new Error('Favorit belum tersimpan. Coba lagi.');
  }
}
