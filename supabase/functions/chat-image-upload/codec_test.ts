import { Jimp } from "npm:jimp@1.6.0";
import { jpegCodec } from "./codec.ts";
import { MAX_BYTES, parseInput, validateImage } from "./core.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function input(bytes: Uint8Array, mime = "image/jpeg") {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return parseInput({
    conversation_id: "00000000-0000-4000-8000-000000000001",
    client_message_id: "00000000-0000-4000-8000-000000000002",
    mime, base64: btoa(binary),
  });
}
const codec = jpegCodec(bytes => Jimp.read(bytes.buffer as ArrayBuffer));

Deno.test("Jimp 1.6: transparent PNG becomes white JPEG and retry bytes are stable", async () => {
  const source = new Jimp({ width: 4, height: 4, color: 0x00000000 });
  const png = await source.getBuffer("image/png");
  const request = input(Uint8Array.from(png), "image/png");
  const jpeg = await validateImage(request, codec);
  const retry = await validateImage(request, codec);
  assert(jpeg.length === retry.length && jpeg.every((b, i) => b === retry[i]), "Retry must yield the same JPEG bytes");
  const decoded = await Jimp.read(jpeg.buffer as ArrayBuffer);
  assert(decoded.bitmap.width === 4 && decoded.bitmap.height === 4, "Small image should not be upscaled");
  assert(decoded.bitmap.data[0] >= 250 && decoded.bitmap.data[1] >= 250 && decoded.bitmap.data[2] >= 250, "Transparent background must be white");
  await validateImage(input(jpeg), codec);
});

Deno.test("Jimp 1.6: large dimensions resize to 1600 and JPEG remains decodable", async () => {
  const source = new Jimp({ width: 1800, height: 900, color: 0xff0000ff });
  const original = await source.getBuffer("image/jpeg", { quality: 90 });
  const normalized = await validateImage(input(Uint8Array.from(original)), codec);
  const decoded = await Jimp.read(normalized.buffer as ArrayBuffer);
  assert(decoded.bitmap.width === 1600 && decoded.bitmap.height === 800, "Resize dimensions are wrong");
  assert(normalized.length <= MAX_BYTES, "Output exceeds 5 MB");
});

Deno.test("Jimp 1.6: PDF, spoofed MIME, corrupt image and oversized file are rejected", async () => {
  const png = await new Jimp({ width: 2, height: 2, color: 0xffffffff }).getBuffer("image/png");
  const cases: [Uint8Array, string, number][] = [
    [new TextEncoder().encode("%PDF-1.7"), "image/jpeg", 415],
    [Uint8Array.from(png), "image/jpeg", 415],
    [new Uint8Array([255, 216, 255, 224]), "image/jpeg", 422],
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png", 422],
    [new Uint8Array(MAX_BYTES + 1), "image/jpeg", 413],
  ];
  for (const [bytes, mime, status] of cases) {
    let rejected = false;
    try { await validateImage(input(bytes, mime), codec); }
    catch (error) { rejected = (error as { status?: number }).status === status; }
    assert(rejected, `Expected rejection with status ${status}`);
  }
});
