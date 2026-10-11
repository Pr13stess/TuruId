export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_BODY_BYTES = Math.ceil(MAX_BYTES / 3) * 4 + 1024;
export class UploadError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export type Input = { conversation_id: string; client_message_id: string; mime: "image/jpeg" | "image/png"; base64: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseInput(value: unknown): Input {
  if (!value || typeof value !== "object") throw new UploadError(400, "Data gambar tidak valid.");
  const v = value as Record<string, unknown>;
  if (typeof v.conversation_id !== "string" || !uuid.test(v.conversation_id) || typeof v.client_message_id !== "string" || !uuid.test(v.client_message_id))
    throw new UploadError(400, "ID percakapan atau pesan tidak valid.");
  if (v.mime !== "image/jpeg" && v.mime !== "image/png") throw new UploadError(415, "Hanya JPEG dan PNG yang diterima.");
  if (typeof v.base64 !== "string" || !v.base64.length) throw new UploadError(400, "Gambar kosong.");
  if (v.base64.length > Math.ceil(MAX_BYTES / 3) * 4) throw new UploadError(413, "Ukuran gambar maksimal 5 MB.");
  if (v.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.base64))
    throw new UploadError(400, "Encoding gambar tidak valid.");
  return { conversation_id: v.conversation_id.toLowerCase(), client_message_id: v.client_message_id.toLowerCase(), mime: v.mime, base64: v.base64 };
}
export async function readBody(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) throw new UploadError(413, "Ukuran gambar maksimal 5 MB.");
  const reader = req.body?.getReader();
  if (!reader) throw new UploadError(400, "Data gambar kosong.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new UploadError(413, "Ukuran gambar maksimal 5 MB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new UploadError(400, "Data gambar tidak valid."); }
}

export type Codec = (bytes: Uint8Array) => Promise<Uint8Array>;
export async function validateImage(input: Input, decodeToJpeg: Codec): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(input.base64), c => c.charCodeAt(0));
  if (!bytes.length || bytes.length > MAX_BYTES) throw new UploadError(413, "Ukuran gambar maksimal 5 MB.");
  const png = [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (input.mime === "image/png" ? !png : !jpeg) throw new UploadError(415, "Isi gambar tidak sesuai MIME.");
  let clean: Uint8Array;
  try { clean = await decodeToJpeg(bytes); }
  catch { throw new UploadError(422, "Gambar rusak atau tidak dapat didekode."); }
  if (clean.length < 4 || clean[0] !== 255 || clean[1] !== 216 || clean[2] !== 255) throw new UploadError(422, "Normalisasi gambar gagal.");
  if (clean.length > MAX_BYTES) throw new UploadError(413, "Hasil gambar melebihi 5 MB.");
  return clean;
}

export type Metadata = { path: string; owner_id: string; purpose: string; context_id: string | null };
export type StoredMessage = { conversation_id: string; message_type: string; storage_path: string | null };
export interface UploadStore {
  message(sender: string, clientId: string): Promise<StoredMessage | null>;
  metadata(path: string): Promise<Metadata | null>;
  claim(metadata: Metadata): Promise<void>;
  object(name: string): Promise<Uint8Array | null>;
  put(name: string, bytes: Uint8Array): Promise<void>;
}
function sameMetadata(found: Metadata | null, expected: Metadata) {
  return found && found.path === expected.path && found.owner_id === expected.owner_id && found.purpose === "chat" && found.context_id === expected.context_id;
}
function sameBytes(a: Uint8Array, b: Uint8Array) { return a.length === b.length && a.every((v,i) => v === b[i]); }

// Metadata is reserved before upload. No overwrite, update or deletion, even on failure.
// Unique path and Storage's upsert:false arbitrate concurrent requests.
export async function storeImage(store: UploadStore, sender: string, input: Input, clean: Uint8Array) {
  const name = `${sender}/chat/${input.client_message_id}.jpg`;
  const path = `owner-media/${name}`;
  const expected = { path, owner_id: sender, purpose: "chat", context_id: input.conversation_id };
  const message = await store.message(sender, input.client_message_id);
  if (message && (message.conversation_id !== input.conversation_id || message.message_type !== "IMAGE" || message.storage_path !== path))
    throw new UploadError(409, "ID pesan sudah dipakai untuk pesan lain.");
  const metadata = await store.metadata(path);
  if (metadata && !sameMetadata(metadata, expected)) throw new UploadError(409, "Metadata gambar tidak cocok.");
  let existing = await store.object(name);
  if (!metadata) {
    // Do not attach existing legacy/orphan objects to a new conversation.
    if (existing) throw new UploadError(409, "Objek lama tanpa metadata tidak boleh digunakan ulang.");
    try { await store.claim(expected); }
    catch (error) {
      if (!sameMetadata(await store.metadata(path), expected)) throw error;
    }
  }
  if (!existing) {
    try { await store.put(name, clean); }
    catch (error) {
      // Conflict OR lost success response: verify content, never ignore the error blindly.
      existing = await store.object(name);
      if (!existing) throw error;
    }
  }
  if (existing && !sameBytes(existing, clean)) throw new UploadError(409, "ID pesan dipakai untuk gambar berbeda.");
  return { path };
}
