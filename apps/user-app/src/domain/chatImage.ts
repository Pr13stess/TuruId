import type { SupabaseClient } from "@supabase/supabase-js";

export type ImageLease = { url: string; expiresAt: number };
export function imageLocation(path: string) {
  if (!path || /[\\?#%:]/.test(path) || path.split("/").some(p => !p || p === "." || p === ".."))
    throw new Error("Lokasi gambar tidak valid.");
  for (const bucket of ["owner-media", "chat-images"]) {
    if (path.startsWith(bucket + "/")) return { bucket, object: path.slice(bucket.length + 1) };
  }
  if (path.split("/").length !== 2) throw new Error("Lokasi gambar tidak dikenal.");
  return { bucket: "chat-images", object: path };
}
export async function signChatImage(client: SupabaseClient, path: string): Promise<ImageLease> {
  const { bucket, object } = imageLocation(path);
  const started = Date.now();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(object, 1800);
  if (error || !data?.signedUrl) throw new Error("Gambar belum dapat dimuat. Coba lagi.");
  return { url: data.signedUrl, expiresAt: started + 1800_000 };
}

// Independent of React Native: fake clocks can exercise expiry, offline recovery and disposal.
export function imageRenewal(
  resolve: () => Promise<ImageLease>,
  publish: (url: string, failed: boolean) => void,
  clock = { now: () => Date.now(), later: (fn: () => void, ms: number) => setTimeout(fn, ms), cancel: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) },
) {
  let stopped = false, busy = false, expiresAt = 0, lastAttempt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (ms: number) => {
    if (timer !== undefined) clock.cancel(timer);
    timer = clock.later(() => { void refresh(); }, ms);
  };
  const refresh = async () => {
    if (stopped || busy) return;
    const wait = 30_000 - (clock.now() - lastAttempt);
    if (wait > 0) { schedule(wait); return; }
    busy = true;
    lastAttempt = clock.now();
    try {
      const lease = await resolve();
      if (stopped) return;
      expiresAt = lease.expiresAt;
      publish(lease.url, false);
      if (Number.isFinite(expiresAt)) schedule(Math.max(30_000, expiresAt - clock.now() - 60_000));
    } catch {
      if (!stopped) { publish("", true); schedule(30_000); }
    } finally { busy = false; }
  };
  return {
    refresh,
    resume: () => { if (expiresAt - clock.now() <= 60_000) void refresh(); },
    failed: () => { if (!stopped) { publish("", true); void refresh(); } },
    stop: () => { stopped = true; if (timer !== undefined) clock.cancel(timer); },
  };
}
