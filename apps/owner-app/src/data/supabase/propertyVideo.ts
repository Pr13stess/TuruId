import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyVideoInput } from "../../domain/propertyGallery";

export async function uploadPropertyVideo(client: SupabaseClient, video: PropertyVideoInput) {
  const form = new FormData();
  form.append("upload_id", video.uploadId);
  // Native FormData accepts a local URI; web uses ImagePicker's File.
  form.append("file", video.file ?? ({ uri: video.uri, name: "property.mp4", type: "video/mp4" } as unknown as Blob));
  const { data, error } = await client.functions.invoke("property-video-upload", { body: form });
  if (error) {
    let message = "Video gagal diunggah. Coba lagi; foto yang berhasil tetap tersimpan di formulir.";
    try { message = (await error.context?.json())?.error || message; } catch {}
    throw new Error(message);
  }
  if (typeof data?.path !== "string" || !data.path.startsWith("property-videos/") || !data.path.endsWith(`/${video.uploadId}.mp4`))
    throw new Error("Hasil unggahan video tidak valid.");
  return data.path as string;
}

export const videoSchemaMissing = (error: { code?: string } | null) => error?.code === "PGRST205" || error?.code === "42P01";
