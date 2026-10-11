/** Photos and GIFs in chat: shrinking photos so they fit in a live message, and checking what is safe to show. */

const GIF_HOSTS = /^(media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com|c\.tenor\.com|i\.imgur\.com)$/;
/** Live messages are small, so a photo has to fit in about 150 KB once encoded. */
const MAX_DATA_URL = 150_000;

/** True for an image we are willing to display: a small inline photo, or a GIF from a known GIF host. */
export function safeImage(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)) return src.length <= MAX_DATA_URL * 1.4;
  if (/^https:\/\/fonts\.gstatic\.com\/s\/e\/notoemoji\/latest\/[0-9a-f_]+\/512\.gif$/.test(src)) return true; // the built-in animated set
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

/** Ready-made animated GIFs that need no set-up: Google's Noto animated emoji (free to use, CC BY 4.0). */
export const READY_GIFS: { code: string; words: string }[] = [
  { code: "1f602", words: "laugh lol haha joy tears" }, { code: "1f923", words: "rofl laugh rolling haha" }, { code: "1f600", words: "happy smile grin" },
  { code: "1f60d", words: "love heart eyes" }, { code: "1f970", words: "love hearts adore" }, { code: "1f618", words: "kiss love mwah" },
  { code: "1f60e", words: "cool sunglasses" }, { code: "1f929", words: "wow star amazing" }, { code: "1f973", words: "party celebrate birthday yay" },
  { code: "1f914", words: "thinking hmm" }, { code: "1f644", words: "eye roll whatever" }, { code: "1f62c", words: "awkward oops grimace" },
  { code: "1f62d", words: "cry sad sob" }, { code: "1f622", words: "sad tear cry" }, { code: "1f621", words: "angry mad" },
  { code: "1f631", words: "scream shock omg" }, { code: "1f62e", words: "wow surprised oh" }, { code: "1f92f", words: "mind blown wow" },
  { code: "1f634", words: "sleep tired zzz" }, { code: "1f971", words: "yawn tired bored" }, { code: "1f92a", words: "crazy silly goofy" },
  { code: "1f648", words: "shy monkey hide" }, { code: "1f47b", words: "ghost boo" }, { code: "1f480", words: "dead skull lol" },
  { code: "1f44d", words: "thumbs up ok yes good" }, { code: "1f44f", words: "clap applause bravo" }, { code: "1f64f", words: "thanks please pray salamat" },
  { code: "1f4aa", words: "strong muscle kaya" }, { code: "1f44b", words: "wave hi hello bye" }, { code: "1f91d", words: "deal handshake" },
  { code: "2764_fe0f", words: "heart love red" }, { code: "1f494", words: "broken heart sad" }, { code: "1f525", words: "fire lit hot" },
  { code: "1f389", words: "party popper congrats celebrate" }, { code: "1f4af", words: "100 perfect" }, { code: "2728", words: "sparkles magic" },
  { code: "1f680", words: "rocket launch go" }, { code: "1f440", words: "eyes looking" }, { code: "2705", words: "check done yes" },
  { code: "1f436", words: "dog puppy" }, { code: "1f431", words: "cat kitty" }, { code: "1f984", words: "unicorn" },
  { code: "2615", words: "coffee kape" }, { code: "1f355", words: "pizza food" }, { code: "1f37f", words: "popcorn movie" },
];
export const readyGifUrl = (code: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.gif`;

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
