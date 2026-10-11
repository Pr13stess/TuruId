export const MAX_CHAT_PHOTOS = 10;
export type GalleryItem = { id: string; path?: string | null; fallback?: string | null };
export function galleryImages(messages: { id: string; message_type: string; storage_path?: string | null; image_url?: string | null }[]): GalleryItem[] {
  const unique = new Map<string, GalleryItem>();
  for (const m of messages) {
    if (m.message_type === "IMAGE" && (m.storage_path || m.image_url))
      unique.set(m.id, { id: m.id, path: m.storage_path, fallback: m.image_url });
  }
  return [...unique.values()];
}
export function initialPhoto(items: GalleryItem[], id: string) {
  return Math.max(0, items.findIndex(item => item.id === id));
}
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function swipeAction(dx: number, dy: number, scale: number): "next" | "previous" | "close" | null {
  if (scale > 1.01) return null;
  if (dy > 120 && dy > Math.abs(dx) * 1.25) return "close";
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.25) return dx < 0 ? "next" : "previous";
  return null;
}

// One stable ID per photo, independent failures, serial uploads to bound memory.
export function imageBatch<T>(payloads: T[], newId: () => string) {
  if (!payloads.length || payloads.length > MAX_CHAT_PHOTOS) throw new Error("Pilih 1–10 foto.");
  const jobs = payloads.map(payload => ({ payload, id: newId(), sent: false }));
  let active: Promise<void> | null = null;
  return {
    total: jobs.length,
    run(send: (payload: T, id: string, index: number) => Promise<void>, progress?: (sent: number, total: number) => void) {
      if (active) return active;
      active = Promise.resolve().then(async () => {
        let error = "";
        progress?.(jobs.filter(j => j.sent).length, jobs.length);
        for (const [index, job] of jobs.entries()) {
          if (job.sent) continue;
          try { await send(job.payload, job.id, index); job.sent = true; }
          catch (e) { error = e instanceof Error ? e.message : "Gambar gagal dikirim."; }
          progress?.(jobs.filter(j => j.sent).length, jobs.length);
        }
        const failed = jobs.filter(j => !j.sent).length;
        if (failed) throw new Error(`${failed} dari ${jobs.length} foto belum terkirim. ${error}`);
      }).finally(() => { active = null; });
      return active;
    },
  };
}
