import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewReplyText } from "../../domain/reviewReply";

export async function replyToReview(client: SupabaseClient, id: string, text: string): Promise<void> {
  const { data, error } = await client.rpc("owner_reply_review", {
    p_review_id: id, p_text: reviewReplyText(text),
  });
  if (error) throw new Error(error.code === "PGRST202"
    ? "Fitur balas ulasan belum diaktifkan di server." : error.message);
  if (data !== id) throw new Error("Balasan belum dapat dikonfirmasi. Muat ulang atau coba kirim lagi.");
}
