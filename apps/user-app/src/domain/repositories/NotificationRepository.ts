export interface UserNotification {
  id: string; title: string; body: string; created_at: string; read_at: string | null;
  target_type: string | null; target_id: string | null;
}
export interface NotificationRepository {
  list(page: number): Promise<UserNotification[]>;
  markRead(id: string): Promise<void>;
}
