import type { SupabaseClient } from "@supabase/supabase-js";
const OWNER_MEDIA_PREFIX = "owner-media/";
const SIGNED_URL_TTL_SECONDS = 3600;
function isOwnerMediaPath(value: string): boolean {
  return value.startsWith(OWNER_MEDIA_PREFIX) && !value.startsWith("http");
}
/**
 * property_media.storage_path (and similar columns) are raw paths into
 * the private "owner-media" bucket — e.g. "owner-media/<id>/property/x.jpg"
 * — not loadable URLs. This resolves every such path found across a page
 * of results into a temporary signed URL, in one batched Storage call.
 * Paths that are already a URL (http...) or a mock "demo://..." id are
 * left untouched.
 */
export async function resolveOwnerMediaImages<T extends { images: string[] }>(
  client: SupabaseClient,
  items: T[],
): Promise<T[]> {
  const paths = new Set<string>();
  for (const item of items)
    for (const img of item.images)
      if (isOwnerMediaPath(img)) paths.add(img.slice(OWNER_MEDIA_PREFIX.length));
  if (paths.size === 0) return items;
  const { data, error } = await client.storage
    .from("owner-media")
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
  if (error) return items; // Fall back to raw paths; PropertyImage shows a placeholder instead of crashing.
  const resolved = new Map<string, string>();
  for (const row of data)
    if (row.path && row.signedUrl) resolved.set(row.path, row.signedUrl);
  return items.map((item) => ({
    ...item,
    images: item.images.map((img) =>
      isOwnerMediaPath(img)
        ? (resolved.get(img.slice(OWNER_MEDIA_PREFIX.length)) ?? img)
        : img,
    ),
  }));
}
