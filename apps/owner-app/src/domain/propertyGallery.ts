export const MAX_PROPERTY_PHOTOS = 10;
export const MAX_PROPERTY_VIDEO_BYTES = 50 * 1024 * 1024;
export type PropertyVideoInput = { uri: string; uploadId: string; file?: File };
export type GalleryAsset = {
  uri: string; type?: string | null; mimeType?: string | null;
  fileName?: string | null; fileSize?: number; duration?: number | null;
};

export function validateGallerySelection(assets: GalleryAsset[], photoCount: number, hasVideo: boolean) {
  let photos = photoCount;
  let videos = hasVideo ? 1 : 0;
  for (const asset of assets) {
    if (asset.type === "video") {
      videos++;
      if (asset.mimeType ? asset.mimeType !== "video/mp4" : !asset.fileName?.toLowerCase().endsWith(".mp4"))
        throw new Error("Video harus berformat MP4.");
      if (asset.fileSize != null && asset.fileSize > MAX_PROPERTY_VIDEO_BYTES)
        throw new Error("Ukuran video maksimal 50 MB.");
      if (asset.duration != null && (!Number.isFinite(asset.duration) || asset.duration <= 0 || asset.duration > 60_000))
        throw new Error("Durasi video maksimal 60 detik.");
    } else if (asset.type === "image") {
      photos++;
    } else throw new Error("Pilih foto atau video MP4.");
  }
  if (photos > MAX_PROPERTY_PHOTOS) throw new Error("Galeri kos maksimal 10 foto, termasuk foto yang sudah dipilih.");
  if (videos > 1) throw new Error("Galeri kos maksimal 1 video. Lepaskan video sebelumnya untuk mengganti.");
}

// Keep each success immediately. On partial failure, only unsent media is retried.
export function propertyUploadQueue<T>(items: T[]) {
  const jobs = items.map(item => ({ item, done: false }));
  let active: Promise<void> | null = null;
  return {
    remaining: () => jobs.filter(job => !job.done).length,
    run(upload: (item: T) => Promise<void>) {
      if (active) return active;
      active = Promise.resolve().then(async () => {
        // Stop on the first failure (including legacy photo rate limiting).
        for (const job of jobs) {
          if (job.done) continue;
          await upload(job.item);
          job.done = true;
        }
      }).finally(() => { active = null; });
      return active;
    },
  };
}
