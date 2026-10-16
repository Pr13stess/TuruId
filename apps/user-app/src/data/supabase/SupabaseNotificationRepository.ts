import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationRepository, UserNotification } from '../../domain/repositories/NotificationRepository';

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(page: number): Promise<UserNotification[]> {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
    const { data: auth, error: authError } = await this.client.auth.getUser();
    if (authError || !auth.user) throw new Error('Silakan masuk kembali.');
    const { data, error } = await this.client.from('notifications')
      .select('id,title,body,created_at,read_at,target_type,target_id')
      .eq('recipient_id', auth.user.id).order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(page * 20, page * 20 + 20);
    if (error) throw new Error('Notifikasi gagal dimuat. Coba lagi.');
    return data ?? [];
  }
  async markRead(id: string) {
    // Existing RPC validates active session and only updates the actor's notification.
    // This action does not create an owner profile or grant an OWNER role.
    const { error } = await this.client.rpc('owner_profile', { action: 'read', input: { id } });
    if (error) throw new Error('Notifikasi belum ditandai dibaca. Coba lagi.');
  }
}
