import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatImagePayload } from "../../domain/chatUpload";

export async function uploadChatImage(client: SupabaseClient, sender: string, conversationId: string, clientId: string, image: ChatImagePayload) {
  const { data, error } = await client.functions.invoke("chat-image-upload", { body: { ...image, conversation_id: conversationId, client_message_id: clientId } });
  if (error) {
    let detail = "";
    try { detail = (await error.context?.json())?.error ?? ""; } catch {}
    throw new Error(detail || "Gambar gagal diunggah. Coba lagi.");
  }
  if (data?.error) throw new Error(data.error);
  const expected = "owner-media/" + sender + "/chat/" + clientId.toLowerCase() + ".jpg";
  if (data?.path !== expected) throw new Error("Lokasi hasil unggahan tidak valid.");
  return expected;
}

export async function findImageMessage(client: SupabaseClient, sender: string, conversationId: string, path: string, clientId: string) {
  const { data, error } = await client.from("messages").select("*").eq("sender_id", sender).eq("client_message_id", clientId).maybeSingle();
  if (error) throw new Error("Status pengiriman belum dapat diperiksa. Coba lagi.");
  if (data && (data.conversation_id !== conversationId || data.message_type !== "IMAGE" || data.storage_path !== path)) throw new Error("ID pesan sudah digunakan untuk pesan berbeda.");
  return data;
}

export async function insertImageMessage(client: SupabaseClient, sender: string, conversationId: string, path: string, clientId: string) {
  const existing = await findImageMessage(client, sender, conversationId, path, clientId);
  if (existing) return existing;
  try {
    const { data, error } = await client.from("messages").insert({ conversation_id: conversationId, sender_id: sender, message_type: "IMAGE", storage_path: path, client_message_id: clientId }).select("*").single();
    if (error) throw error;
    if (!data) throw new Error("Pesan belum dapat dikonfirmasi.");
    return data;
  } catch (error) {
    // Includes a committed insert whose response was lost, and a concurrent retry.
    const committed = await findImageMessage(client, sender, conversationId, path, clientId);
    if (committed) return committed;
    throw new Error(error instanceof Error ? error.message : "Gambar belum terkirim. Coba lagi.");
  }
}
