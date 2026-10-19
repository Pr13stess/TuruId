import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyVideoInput } from "../../domain/propertyGallery";
import { videoUploadError } from "./videoUploadError";
import { videoUploadBody } from "./propertyVideoTransport";

export async function uploadPropertyVideo(client: SupabaseClient, video: PropertyVideoInput) {
  const form = videoUploadBody(video);
  const { data, error } = await client.functions.invoke("property-video-upload", { body: form });
  if (error) {
    throw new Error(await videoUploadError(error));
  }
  if (typeof data?.path !== "string" || !data.path.startsWith("property-videos/") || !data.path.endsWith(`/${video.uploadId}.mp4`))
    throw new Error("Hasil unggahan video tidak valid.");
  return data.path as string;
}

export const videoSchemaMissing = (error: { code?: string } | null) => error?.code === "PGRST205" || error?.code === "42P01";
