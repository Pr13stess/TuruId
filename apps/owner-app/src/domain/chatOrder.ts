/** Unread first, newest activity within each group, deterministic ties. */
export function orderChats<T extends { id: string; unread?: number; updated_at?: string }>(chats: readonly T[]): T[] {
  const time = (value?: string) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return [...chats].sort((a, b) =>
    Number((b.unread ?? 0) > 0) - Number((a.unread ?? 0) > 0) ||
    time(b.updated_at) - time(a.updated_at) || a.id.localeCompare(b.id),
  );
}
