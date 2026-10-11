/** Photos and GIFs in chat: shrinking photos so they fit in a live message, and checking what is safe to show. */

const GIF_HOSTS = /^(media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com|c\.tenor\.com|i\.imgur\.com)$/;
/** Live messages are small, so a photo has to fit in about 150 KB once encoded. */
const MAX_DATA_URL = 150_000;

/** True for an image we are willing to display: a small inline photo, or a GIF from a known GIF host. */
export function safeImage(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)) return src.length <= MAX_DATA_URL * 1.4;
  try { const u = new URL(src); return u.protocol === "https:" && GIF_HOSTS.test(u.hostname); } catch { return false; }
}

/** Turns a Giphy, Tenor or Imgur link someone pasted into a direct image link, when it can. */
export function gifFromLink(link: string): string | null {
  const text = link.trim();
  if (safeImage(text) && !text.startsWith("data:")) return text;
  const giphy = /giphy\.com\/gifs\/(?:[^/]*-)?([A-Za-z0-9]+)(?:[/?#]|$)/.exec(text);
  return giphy ? `https://i.giphy.com/${giphy[1]}.gif` : null;
}

const readAsDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("read failed"));
  reader.readAsDataURL(file);
});

/** Shrinks a photo until it is small enough to send. Small GIFs are sent as they are so they keep moving. */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not a picture.");
  if (file.type === "image/gif" && file.size <= MAX_DATA_URL * 0.7) return readAsDataUrl(file);
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("That picture could not be opened."); });
  for (const side of [900, 720, 560, 420, 300]) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55]) {
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= MAX_DATA_URL) return url;
    }
  }
  throw new Error("That picture is too large to send, even after shrinking.");
}

export const GIPHY_KEY = (import.meta.env.VITE_GIPHY_KEY as string | undefined) || "";
export interface GifResult { id: string; preview: string; full: string; title: string }

/** Searches Giphy (or returns what is trending when the search is empty). Needs VITE_GIPHY_KEY. */
export async function searchGifs(query: string): Promise<GifResult[]> {
  const base = query.trim() ? "search" : "trending";
  const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: "18", rating: "pg", ...(query.trim() ? { q: query.trim() } : {}) });
  const res = await fetch(`https://api.giphy.com/v1/gifs/${base}?${params}`);
  if (!res.ok) throw new Error("GIF search failed");
  const json = (await res.json()) as { data: { id: string; title: string; images: Record<string, { url: string }> }[] };
  return json.data
    .map((g) => ({ id: g.id, title: g.title || "GIF", preview: g.images.fixed_height_small?.url ?? g.images.fixed_height?.url, full: g.images.fixed_height?.url ?? g.images.original?.url }))
    .filter((g) => safeImage(g.preview) && safeImage(g.full));
}
