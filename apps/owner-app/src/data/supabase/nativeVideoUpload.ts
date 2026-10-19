import { MAX_PROPERTY_VIDEO_BYTES, type PropertyVideoInput } from "../../domain/propertyGallery";

type LocalVideoFile = Blob & { exists: boolean; size: number };

/** Inspect without reading the whole movie into JS memory or converting to base64. */
export function nativeVideoBody(video: PropertyVideoInput, open: (uri: string) => LocalVideoFile): FormData {
  let file: LocalVideoFile;
  try {
    file = open(video.uri);
    if (!file.exists || !Number.isFinite(file.size) || file.size <= 0)
      throw new Error("unreadable");
  } catch {
    throw new Error("File video tidak dapat dibaca. Batalkan sisa unggahan lalu pilih ulang video dari perangkat. (VIDEO_FILE)");
  }
  if (file.size > MAX_PROPERTY_VIDEO_BYTES) throw new Error("Ukuran video maksimal 50 MB. (VIDEO_SIZE)");
  const form = new FormData();
  form.append("upload_id", video.uploadId);
  form.append("file", file, "property.mp4");
  return form;
}

/** Only this upload endpoint uses Expo's file-capable transport. SDK auth is unchanged. */
export function routeVideoFetch(base: typeof fetch, native: typeof fetch, supabaseUrl: string): typeof fetch {
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/property-video-upload`;
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    return url.split("?")[0] === endpoint && method.toUpperCase() === "POST"
      ? native(input, init)
      : base(input, init);
  };
}
