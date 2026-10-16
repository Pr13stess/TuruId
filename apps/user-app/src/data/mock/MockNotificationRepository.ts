import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { NotificationRepository, UserNotification } from '../../domain/repositories/NotificationRepository';
export class MockNotificationRepository implements NotificationRepository {
  constructor(private readonly auth: AuthRepository) {}
  async list(page: number): Promise<UserNotification[]> {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
    if (!await this.auth.getSession()) throw new Error('Silakan masuk kembali.');
    return []; // No fake events pretending to have been delivered by the backend.
  }
  async markRead() { throw new Error('Tidak ada notifikasi pada sesi demo ini.'); }
}
