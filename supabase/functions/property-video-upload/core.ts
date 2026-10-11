export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export function isMissingVideo(error: { statusCode?: string | number; code?: string }) {
  return String(error.statusCode) === "404" || error.code === "NoSuchKey" || error.code === "not_found";
}
export class VideoError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const invalid = () => new VideoError(422, "Berkas MP4 tidak valid atau tidak didukung. Gunakan MP4 biasa, bukan video streaming.");
type Box = { kind: string; start: number; end: number };

// Validate bounded ISO BMFF structure and durations from the file, never client metadata.
// This is container validation, not a full codec decode/transcode.
export function inspectMp4(bytes: Uint8Array, mime: string) {
  if (bytes.length > MAX_VIDEO_BYTES) throw new VideoError(413, "Ukuran video maksimal 50 MB.");
  if (mime !== "video/mp4" || bytes.length < 32) throw invalid();
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, length = 4) => String.fromCharCode(...bytes.subarray(at, at + length));
  const boxes = (start: number, end: number): Box[] => {
    const out: Box[] = [];
    for (let at = start; at < end;) {
      if (end - at < 8 || out.length > 10_000) throw invalid();
      let size = data.getUint32(at), header = 8;
      if (size === 1) {
        if (end - at < 16) throw invalid();
        const large = data.getBigUint64(at + 8);
        if (large > BigInt(MAX_VIDEO_BYTES)) throw invalid();
        size = Number(large); header = 16;
      } else if (size === 0) size = end - at;
      if (size < header || size > end - at) throw invalid();
      out.push({ kind: text(at + 4), start: at + header, end: at + size });
      at += size;
    }
    return out;
  };
  const one = (items: Box[], kind: string) => {
    const found = items.filter(b => b.kind === kind);
    if (found.length !== 1) throw invalid();
    return found[0];
  };
  const duration = (box: Box) => {
    const version = bytes[box.start];
    const offset = version === 0 ? 12 : version === 1 ? 20 : -1;
    if (offset < 0 || box.end - box.start < offset + (version === 1 ? 12 : 8)) throw invalid();
    const timescale = data.getUint32(box.start + offset);
    const ticks = version === 1 ? Number(data.getBigUint64(box.start + offset + 4)) : data.getUint32(box.start + offset + 4);
    const seconds = ticks / timescale;
    if (!timescale || !Number.isFinite(seconds) || seconds <= 0) throw invalid();
    if (seconds > 60) throw new VideoError(422, "Durasi video maksimal 60 detik.");
    return seconds;
  };
  const top = boxes(0, bytes.length);
  const ftyp = one(top, "ftyp");
  if (ftyp.end - ftyp.start < 8 || (ftyp.end - ftyp.start) % 4) throw invalid();
  const brands = [text(ftyp.start)];
  for (let i = ftyp.start + 8; i < ftyp.end; i += 4) brands.push(text(i));
  if (!brands.some(b => ["isom", "iso2", "mp41", "mp42", "avc1"].includes(b)) || brands.includes("qt  ")) throw invalid();
  if (top.some(b => b.kind === "moof") || !top.some(b => b.kind === "mdat" && b.end > b.start)) throw invalid();
  const moov = one(top, "moov");
  const movie = boxes(moov.start, moov.end);
  if (movie.some(b => b.kind === "mvex")) throw invalid();
  let seconds = duration(one(movie, "mvhd"));
  let videoTracks = 0;
  for (const track of movie.filter(b => b.kind === "trak")) {
    const mdia = one(boxes(track.start, track.end), "mdia");
    const media = boxes(mdia.start, mdia.end);
    seconds = Math.max(seconds, duration(one(media, "mdhd")));
    const hdlr = one(media, "hdlr");
    if (hdlr.end - hdlr.start < 12) throw invalid();
    if (text(hdlr.start + 8) === "vide") videoTracks++;
  }
  if (!videoTracks) throw invalid();
  return { duration: seconds, size: bytes.length };
}

export type VideoMetadata = { path: string; owner_id: string; sha256: string; byte_size: number; duration_seconds: number };
export type VideoStore = {
  metadata(path: string): Promise<VideoMetadata | null>;
  reserve(meta: VideoMetadata): Promise<void>;
  download(path: string): Promise<Uint8Array | null>;
  upload(path: string, bytes: Uint8Array): Promise<void>;
};
export async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
export async function storeVideo(store: VideoStore, meta: VideoMetadata, bytes: Uint8Array) {
  let existing = await store.metadata(meta.path);
  if (!existing) {
    try { await store.reserve(meta); }
    catch (error) { existing = await store.metadata(meta.path); if (!existing) throw error; }
  }
  if (existing && (existing.owner_id !== meta.owner_id || existing.sha256 !== meta.sha256 || existing.byte_size !== meta.byte_size || existing.duration_seconds !== meta.duration_seconds))
    throw new VideoError(409, "Identitas unggahan sudah digunakan untuk video lain.");
  const verify = async (stored: Uint8Array) => {
    if (stored.length !== meta.byte_size || await digest(stored) !== meta.sha256)
      throw new VideoError(409, "Objek video berbeda. Pilih ulang video; objek lama tidak ditimpa.");
  };
  const stored = await store.download(meta.path);
  if (stored) { await verify(stored); return { path: meta.path }; }
  try { await store.upload(meta.path, bytes); }
  catch (error) {
    const recovered = await store.download(meta.path);
    if (!recovered) throw error;
    await verify(recovered);
  }
  return { path: meta.path };
}
