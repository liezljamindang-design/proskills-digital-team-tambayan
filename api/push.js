// Sends phone and desktop notifications for new chat messages (Web Push).
// Runs on Vercel, never in the browser. It uses two server-only settings that the
// Supabase integration adds to Vercel by itself: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// The notification signing keys are created here on first use and kept in a table that
// browsers cannot read, so nobody ever has to copy a secret by hand.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let keys = null;
async function vapid(db) {
  if (keys) return keys;
  const { data, error } = await db.from("tambayan_push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (error) throw new Error("setup");
  if (data) { keys = { publicKey: data.public_key, privateKey: data.private_key }; return keys; }
  const made = webpush.generateVAPIDKeys();
  await db.from("tambayan_push_config").insert({ id: 1, public_key: made.publicKey, private_key: made.privateKey });
  // Someone else may have created them a moment earlier: always use what is stored.
  const again = await db.from("tambayan_push_config").select("public_key, private_key").eq("id", 1).single();
  if (again.error) throw new Error("setup");
  keys = { publicKey: again.data.public_key, privateKey: again.data.private_key };
  return keys;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!URL || !SERVICE) return res.status(503).json({ error: "not-configured" });
  const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  let k;
  try { k = await vapid(db); } catch { return res.status(503).json({ error: "tables-missing" }); }
  if (req.method === "GET") return res.status(200).json({ publicKey: k.publicKey });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  // Only a signed-in member can trigger notifications, and only in their own name.
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoError } = await db.auth.getUser(token);
  if (whoError || !who?.user) return res.status(401).json({ error: "sign-in" });
  const sender = who.user.id;

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const text = String(body.text || "").slice(0, 140);
  const to = typeof body.to === "string" ? body.to.slice(0, 80) : "";
  const room = typeof body.room === "string" ? body.room.slice(0, 20) : "";
  const batch = /^batch-\d{1,2}$/.test(room) ? Number(room.slice(6)) : 0;

  const member = await db.from("tambayan_members").select("name, first_name").eq("id", sender).maybeSingle();
  const name = String(member.data?.name || who.user.user_metadata?.name || "A teammate").slice(0, 40);

  let query = db.from("tambayan_push").select("endpoint, sub, member_id, scope, batches").neq("member_id", sender);
  if (to) query = query.eq("member_id", to);
  else if (batch) query = query.contains("batches", [batch]);
  else query = query.eq("scope", "all"); // the public room only reaches people who asked for everything
  const { data: found, error } = await query.limit(1000);
  if (error) return res.status(503).json({ error: "tables-missing" });
  // People called by @name are notified even if they only asked for private messages.
  const called = Array.isArray(body.mentions) ? body.mentions.filter((m) => typeof m === "string" && m !== sender).slice(0, 20) : [];
  const extra = called.length && !to ? (await db.from("tambayan_push").select("endpoint, sub, member_id, scope, batches").in("member_id", called)).data || [] : [];
  const seen = new Set(), subs = [];
  for (const s of [...extra, ...(found || [])]) if (!seen.has(s.endpoint)) { seen.add(s.endpoint); subs.push(s); }

  webpush.setVapidDetails("mailto:noreply@tambayan.invalid", k.publicKey, k.privateKey);
  const title = to ? name : batch ? `${name} · Batch ${batch}` : `${name} · Everyone`;
  const tag = to ? `dm-${sender}` : room || "all";
  const payload = JSON.stringify({ title, body: text || "Sent a photo", tag });
  const calling = JSON.stringify({ title: `${name} mentioned you`, body: text || "Sent a photo", tag: `mention-${sender}` });
  const dead = [];
  await Promise.allSettled((subs || []).map((s) => webpush.sendNotification(s.sub, called.includes(s.member_id) ? calling : payload, { TTL: 3600 }).catch((err) => { if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint); })));
  if (dead.length) await db.from("tambayan_push").delete().in("endpoint", dead);
  return res.status(200).json({ sent: (subs || []).length - dead.length });
}
