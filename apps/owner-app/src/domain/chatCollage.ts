type PhotoMessage = {
  id: string; sender_id: string | null; created_at: string; message_type: string;
  storage_path?: string | null; image_url?: string | null;
};

// Presentation-only grouping: existing messages have no persisted album ID.
// Anchor the window to the first photo so a long stream cannot become one album.
export function chatGroups<T extends PhotoMessage>(messages: T[]): T[][] {
  const groups: T[][] = [];
  const seen = new Set<string>();
  const isPhoto = (m: T) => m.message_type === "IMAGE" && !!(m.storage_path || m.image_url);
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    const group = groups[groups.length - 1];
    const first = group?.[0];
    const elapsed = first ? Date.parse(message.created_at) - Date.parse(first.created_at) : NaN;
    const sameDay = first && new Date(first.created_at).toDateString() === new Date(message.created_at).toDateString();
    if (first && first.sender_id && isPhoto(first) && isPhoto(message) && first.sender_id === message.sender_id &&
        sameDay && elapsed >= 0 && elapsed <= 120_000 && group.length < 10) group.push(message);
    else groups.push([message]);
  }
  return groups;
}
