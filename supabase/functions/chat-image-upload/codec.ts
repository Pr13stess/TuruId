// Small adapter so validation/white compositing can be tested without a Deno server.
type Bitmap = { width: number; height: number; data: { readonly length: number; [index: number]: number } };
export type DecodedImage = {
  bitmap: Bitmap;
  scaleToFit(options: { w: number; h: number }): unknown;
  getBuffer(mime: "image/jpeg", options: { quality: number }): Promise<ArrayLike<number>>;
};
export function jpegCodec(read: (bytes: Uint8Array) => Promise<DecodedImage>) {
  return async (bytes: Uint8Array) => {
    const image = await read(bytes);
    const { width, height, data } = image.bitmap;
    if (!width || !height || width * height > 20_000_000 || data.length !== width * height * 4) throw new Error("Resolusi tidak valid.");
    // Explicit white matte, including fully transparent PNG pixels; alpha is removed.
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * a + 255 * (1 - a));
      data[i + 3] = 255;
    }
    if (width > 1600 || height > 1600) image.scaleToFit({ w: 1600, h: 1600 });
    // JPEG encoder emits fresh pixels, not original EXIF/location metadata.
    return Uint8Array.from(await image.getBuffer("image/jpeg", { quality: 80 }));
  };
}
