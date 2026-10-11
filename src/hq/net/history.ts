import { ARCADE, PUBLIC, useHq } from "../store";
import { batchesOf, type ChatLine, type Profile } from "../types";
import { safeImage } from "../media";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Saved chat. Messages in the public room, batch rooms and private chats between
 * signed-in people are kept in the "tambayan_messages" table, so they are still
 * there after a reload. If the table has not been created, everything here quietly
 * does nothing and chat works live-only, as before.
 */
const TABLE = "tambayan_messages";
const isGuest = (id: string) => id.startsWith("guest-");
let available = supabaseConfigured;

/** The name a conversation is stored under, or null when it is not stored (arcade chat, chats with guests). */
function storageKey(thread: string, me: Profile): string | null {
  if (thread === PUBLIC || thread.startsWith("batch-")) return thread;
  if (thread === ARCADE || isGuest(me.id) || isGuest(thread)) return null;
  return `dm:${[me.id, thread].sort().join(":")}`;
}

const stamp = (iso: string) => {
  const d = new Date(iso), today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString([], today ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

interface Row { id: string; thread: string; from_id: string; name: string; body: string; image: string | null; reply: ChatLine["reply"] | null; reactions: ChatLine["reactions"] | null; pinned: boolean; created_at: string }

/** Loads the most recent saved messages for every conversation this person can see. */
export async function loadHistory(me: Profile): Promise<void> {
  if (!available) return;
  try {
    const supabase = await getSupabase();
    const rooms = [PUBLIC, ...batchesOf(me).map((b) => `batch-${b}`)];
    const queries = rooms.map((room) => supabase.from(TABLE).select("*").eq("thread", room).order("created_at", { ascending: false }).limit(100));
    if (!isGuest(me.id)) queries.push(supabase.from(TABLE).select("*").like("thread", `dm:%${me.id}%`).order("created_at", { ascending: false }).limit(300));
    const results = await Promise.all(queries);
    if (results.some((r) => r.error)) { available = false; return; }
    const byThread = new Map<string, ChatLine[]>();
    for (const row of results.flatMap((r) => (r.data ?? []) as Row[]).reverse()) {
      const thread = row.thread.startsWith("dm:") ? row.thread.slice(3).split(":").find((id) => id !== me.id) ?? "" : row.thread;
      if (!thread) continue;
      const line: ChatLine = {
        id: row.id, from: row.from_id, name: row.name, text: row.body, time: stamp(row.created_at),
        image: safeImage(row.image) ? row.image : undefined, reply: row.reply ?? undefined, reactions: row.reactions ?? undefined, pinned: row.pinned,
      };
      byThread.set(thread, [...(byThread.get(thread) ?? []), line]);
    }
    // Oldest first within each conversation.
    for (const [thread, lines] of byThread) useHq.getState().mergeHistory(thread, lines.sort((a, b) => a.id.localeCompare(b.id)));
  } catch { available = false; }
}

export function saveMessage(thread: string, line: ChatLine, me: Profile) {
  const key = storageKey(thread, me);
  if (!available || !key) return;
  void getSupabase().then((supabase) => supabase.from(TABLE).insert({
    id: line.id, thread: key, from_id: line.from, name: line.name, body: line.text, image: line.image ?? null, reply: line.reply ?? null,
  })).then((r) => { if (r.error && /does not exist|schema cache|not find/i.test(r.error.message)) available = false; }, () => undefined);
}

/** Saves a message's reactions and pinned state after either changes. */
export function saveMarks(thread: string, id: string, me: Profile) {
  const line = useHq.getState().threads[thread]?.find((l) => l.id === id);
  if (!available || !line || !storageKey(thread, me)) return;
  void getSupabase().then((supabase) => supabase.from(TABLE).update({ reactions: line.reactions ?? {}, pinned: Boolean(line.pinned) }).eq("id", id)).then(() => undefined, () => undefined);
}
