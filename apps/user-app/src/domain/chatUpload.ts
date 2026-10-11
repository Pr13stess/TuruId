export type ChatImagePayload = { base64: string; mime: "image/jpeg" | "image/png" };
export const legacyChatUpload = process.env.EXPO_PUBLIC_CHAT_IMAGE_UPLOAD === "legacy";
export function imagePayload(base64: string, declaredMime?: string | null): ChatImagePayload {
  const mime = base64.startsWith("/9j/") ? "image/jpeg" : base64.startsWith("iVBORw0KGgo") ? "image/png" : null;
  if (!mime || (declaredMime && declaredMime !== mime)) throw new Error("Hanya gambar JPEG/PNG yang sesuai isinya dapat dikirim.");
  const size = base64.length * 3 / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  return { base64, mime };
}

// One selection owns one ID. Keep this attempt after failure; replace only on success
// or explicit cancellation. Concurrent button presses share the same promise.
export function imageAttempt<T>(id: string, payload: T) {
  let pending: Promise<void> | null = null;
  return {
    id, payload,
    run(send: (payload: T, id: string) => Promise<void>) {
      if (!pending) pending = Promise.resolve().then(() => send(payload, id)).catch(error => { pending = null; throw error; });
      return pending;
    },
  };
}
