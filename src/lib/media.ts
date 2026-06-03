// Normalises a stored image URL to a renderable one.
//  - already a proxy path or external (e.g. Unsplash) → unchanged
//  - a raw Azure blob URL → rewritten to the same-origin /api/media proxy
export function mediaUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith("/api/media/")) return stored;
  const marker = ".blob.core.windows.net/";
  const i = stored.indexOf(marker);
  if (i === -1) return stored;
  const after = stored.slice(i + marker.length); // {container}/{blobPath}
  const slash = after.indexOf("/");
  if (slash === -1) return stored;
  const blobPath = after.slice(slash + 1);
  return `/api/media/${blobPath.split("/").map(encodeURIComponent).join("/")}`;
}
