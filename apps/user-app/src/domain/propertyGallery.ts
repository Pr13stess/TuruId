export type PropertyGalleryItem = { id: string; path: string; kind: "photo" | "video" };

export function propertyGallery(photos: string[], video?: string | null): PropertyGalleryItem[] {
  return [
    ...(video ? [{ id: "video", path: video, kind: "video" as const }] : []),
    ...photos.map((path, i) => ({ id: `photo-${i}`, path, kind: "photo" as const })),
  ];
}
