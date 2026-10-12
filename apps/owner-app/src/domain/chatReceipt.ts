import type { SupabaseClient } from '@supabase/supabase-js';

/** Receipts acknowledge an opened conversation, not delivery to a device. */
export async function syncChatReceipt(client: SupabaseClient, conversationId: string, userId: string): Promise<string | null> {
  // Existing participant-only RPC uses the server clock to mark this actor's read time.
  const { error: markError } = await client.rpc('communication_messages', { cid: conversationId });
  if (markError) throw new Error(markError.message);
  const { data, error } = await client.from('conversation_participants')
    .select('user_id,last_read_at').eq('conversation_id', conversationId).neq('user_id', userId);
  if (error) throw new Error(error.message);
  if (!data?.length || data.some(row => !row.last_read_at || !Number.isFinite(Date.parse(row.last_read_at)))) return null;
  return data.reduce((oldest, row) => Date.parse(row.last_read_at) < Date.parse(oldest) ? row.last_read_at : oldest, data[0].last_read_at);
}

export function groupWasRead(messages: readonly { created_at: string }[], readAt: string | null): boolean {
  if (!readAt || !messages.length) return false;
  const boundary = Date.parse(readAt);
  return Number.isFinite(boundary) && messages.every(message => {
    const created = Date.parse(message.created_at);
    // Millisecond equality is conservative: Postgres timestamps have finer precision.
    return Number.isFinite(created) && created < boundary;
  });
}
