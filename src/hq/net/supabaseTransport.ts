import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Peer, Profile } from "../types";
import { getSupabase } from "./supabase";
import type { Handlers, Point, Transport, WireChat } from "./transport";

/**
 * Live transport: Supabase Realtime. Presence carries who is here and what
 * they look like; broadcast carries movement and chat.
 *
 * Privacy note: private messages are sent to a channel named after the
 * recipient and shown only to them, but the channel is not access-controlled
 * yet. Treat them as "not shown to others", not as secret, until Realtime
 * authorization policies are added in the Supabase project.
 */
export function createSupabaseTransport(): Transport {
  let room: RealtimeChannel | null = null;
  let inbox: RealtimeChannel | null = null;
  let batchRoom: RealtimeChannel | null = null;
  let batchNo: number | undefined;
  let onChat: ((msg: WireChat) => void) | null = null;
  /** Joins the chat room of the batch this person belongs to, leaving the previous one. */
  async function syncBatch(batch: number | undefined) {
    if (batch === batchNo) return;
    batchNo = batch;
    void batchRoom?.unsubscribe();
    batchRoom = null;
    if (!batch || !onChat) return;
    const supabase = await getSupabase();
    const handle = onChat;
    batchRoom = supabase.channel(`playground-batch-${batch}`, { config: { broadcast: { self: false } } });
    batchRoom.on("broadcast", { event: "chat" }, ({ payload }) => handle(payload as WireChat)).subscribe();
  }
  let me: Peer | null = null;
  const known = new Set<string>();

  return {
    mode: "supabase",
    async join(profile: Profile, pos: Point, handlers: Handlers) {
      const supabase = await getSupabase();
      me = { ...profile, ...pos };
      const myId = me.id;

      room = supabase.channel("playground", { config: { presence: { key: myId }, broadcast: { self: false } } });
      room
        .on("presence", { event: "sync" }, () => {
          const state = room!.presenceState<Peer>();
          const here = new Set<string>();
          for (const [id, entries] of Object.entries(state)) {
            if (id === myId || !entries.length) continue;
            here.add(id);
            const p = entries[entries.length - 1];
            // Presence positions are only a starting point; movement arrives by broadcast.
            if (!known.has(id)) handlers.onPeer({ ...p, id, x: p.x, y: p.y });
            else handlers.onPeer({ ...p, id, x: NaN, y: NaN });
          }
          for (const id of known) if (!here.has(id)) handlers.onPeerLeft(id);
          known.clear();
          here.forEach((id) => known.add(id));
        })
        .on("broadcast", { event: "move" }, ({ payload }) => handlers.onMove(payload.id, { x: payload.x, y: payload.y }))
        .on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat(payload as WireChat));

      // The library retries by itself after a failed first attempt, so wait for success
      // for a while instead of giving up on the first error.
      await new Promise<void>((resolve, reject) => {
        let last = "no answer from the realtime service";
        const timer = window.setTimeout(() => reject(new Error(last)), 20000);
        room!.subscribe((status, err) => {
          if (status === "SUBSCRIBED") { window.clearTimeout(timer); void room!.track(me!); resolve(); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") last = `${status}${err?.message ? `: ${err.message}` : ""}`;
        });
      });

      inbox = supabase.channel(`playground-dm-${myId}`, { config: { broadcast: { self: false } } });
      inbox.on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat(payload as WireChat)).subscribe();
      onChat = handlers.onChat;
      void syncBatch(profile.batch);
    },
    updateProfile(profile, pos) {
      me = { ...profile, ...pos };
      void room?.track(me);
      void syncBatch(profile.batch);
    },
    move(pos) {
      if (!me) return;
      me = { ...me, ...pos };
      void room?.send({ type: "broadcast", event: "move", payload: { id: me.id, ...pos } });
    },
    chat(msg) {
      if (msg.room) { void batchRoom?.send({ type: "broadcast", event: "chat", payload: msg }); return; }
      if (!msg.to) { void room?.send({ type: "broadcast", event: "chat", payload: msg }); return; }
      // A private message goes to the recipient's own channel.
      void getSupabase().then((supabase) => {
        const dm = supabase.channel(`playground-dm-${msg.to}`);
        dm.subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          void dm.send({ type: "broadcast", event: "chat", payload: msg }).then(() => supabase.removeChannel(dm));
        });
      });
    },
    leave() {
      void room?.unsubscribe();
      void inbox?.unsubscribe();
      void batchRoom?.unsubscribe();
      batchRoom = null; batchNo = undefined; onChat = null;
      room = null; inbox = null; me = null; known.clear();
    },
  };
}
