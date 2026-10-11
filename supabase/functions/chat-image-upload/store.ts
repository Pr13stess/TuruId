import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";
import { UploadError, type UploadStore, type Metadata } from "./core.ts";

export function uploadStore(admin: SupabaseClient): UploadStore {
  const bucket = admin.storage.from("owner-media");
  return {
    async message(sender, clientId) {
      const { data, error } = await admin.from("messages").select("conversation_id,message_type,storage_path").eq("sender_id", sender).eq("client_message_id", clientId).maybeSingle();
      if (error) throw new UploadError(503, "Pemeriksaan pesan gagal. Coba lagi.");
      return data;
    },
    async metadata(path) {
      const { data, error } = await admin.from("owner_uploads").select("path,owner_id,purpose,context_id").eq("path", path).maybeSingle();
      if (error) throw new UploadError(503, "Pemeriksaan metadata gagal. Coba lagi.");
      return data;
    },
    async claim(metadata: Metadata) {
      const { error } = await admin.from("owner_uploads").insert(metadata);
      if (error) throw new UploadError(503, "Penyimpanan metadata gagal. Coba lagi.");
    },
    async object(name) {
      const { data, error } = await bucket.download(name);
      if (error) {
        // Storage returns 400 with code NoSuchKey in some versions. Only a definite
        // missing object permits creation; auth/network errors must never mean absent.
        const e = error as { statusCode?: string | number; code?: string };
        if (String(e.statusCode) === "404" || e.code === "NoSuchKey" || e.code === "not_found") return null;
        throw new UploadError(503, "Pemeriksaan objek gagal. Coba lagi.");
      }
      if (!data) throw new UploadError(503, "Objek tidak dapat diperiksa.");
      return new Uint8Array(await data.arrayBuffer());
    },
    async put(name, bytes) {
      const { error } = await bucket.upload(name, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) throw new UploadError(503, "Unggahan gagal. Coba lagi dengan gambar yang sama.");
    },
  };
}
