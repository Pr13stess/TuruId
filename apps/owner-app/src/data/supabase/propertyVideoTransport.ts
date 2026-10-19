import type { PropertyVideoInput } from "../../domain/propertyGallery";

// Web and Node tests keep the browser File/SDK fetch path.
export function videoUploadBody(video: PropertyVideoInput): FormData {
  if (!video.file) throw new Error("Pilih ulang file video. (VIDEO_FILE)");
  const form = new FormData();
  form.append("upload_id", video.uploadId);
  form.append("file", video.file);
  return form;
}

export function videoUploadFetch(base: typeof fetch, _url: string): typeof fetch {
  return base;
}
