// Song search for the Music menu. Runs on Vercel so the YouTube key stays on the server
// (Vercel setting: YOUTUBE_API_KEY). Results are cached for a week, because the free
// YouTube quota only covers about 100 new searches a day for the whole team.
const memory = new Map();

export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: "no-key" });
  const q = String(req.query?.q || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2) return res.status(400).json({ error: "short" });
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=2592000");
  if (memory.has(q)) return res.status(200).json({ songs: memory.get(q) });
  const params = new URLSearchParams({ part: "snippet", type: "video", videoCategoryId: "10", videoEmbeddable: "true", safeSearch: "moderate", maxResults: "12", q, key });
  const reply = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!reply.ok) { res.setHeader("Cache-Control", "no-store"); return res.status(reply.status === 403 ? 429 : 502).json({ error: reply.status === 403 ? "quota" : "failed" }); }
  const data = await reply.json();
  const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').slice(0, 120);
  const songs = (data.items || []).filter((i) => /^[\w-]{11}$/.test(i.id?.videoId || "")).map((i) => ({ id: i.id.videoId, title: decode(i.snippet?.title), by: decode(i.snippet?.channelTitle) }));
  if (memory.size > 500) memory.clear();
  memory.set(q, songs);
  return res.status(200).json({ songs });
}
