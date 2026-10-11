import type { RealtimeChannel } from "@supabase/supabase-js";
import { batchesOf, type Peer, type Profile } from "../types";
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
  let me: Peer | null = null;
  const known = new Set<string>();
  const batchRooms = new Map<number, RealtimeChannel>();
  const outbox = new Map<string, Promise<RealtimeChannel>>();
  let onChat: ((msg: WireChat) => void) | null = null;
  /** Joins the chat room of every batch this person belongs to, and leaves the ones they left. */
  async function syncBatches(batches: number[]) {
    for (const [n, channel] of batchRooms) if (!batches.includes(n)) { void channel.unsubscribe(); batchRooms.delete(n); }
    if (!onChat) return;
    const supabase = await getSupabase();
    const handle = onChat;
    for (const n of batches) {
      if (batchRooms.has(n)) continue;
      const channel = supabase.channel(`playground-batch-${n}`, { config: { broadcast: { self: false } } });
      channel.on("broadcast", { event: "chat" }, ({ payload }) => handle(payload as WireChat)).subscribe();
      batchRooms.set(n, channel);
    }
  }

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
      void syncBatches(batchesOf(profile));
    },
    updateProfile(profile, pos) {
      me = { ...profile, ...pos };
      void room?.track(me);
      void syncBatches(batchesOf(profile));
    },
    move(pos) {
      if (!me) return;
      me = { ...me, ...pos };
      void room?.send({ type: "broadcast", event: "move", payload: { id: me.id, ...pos } });
    },
    chat(msg) {
      if (msg.room?.startsWith("batch-")) { void batchRooms.get(Number(msg.room.slice(6)))?.send({ type: "broadcast", event: "chat", payload: msg }); return; }
      if (!msg.to) { void room?.send({ type: "broadcast", event: "chat", payload: msg }); return; }
      // A private message goes to the recipient's own channel. The channel is kept open,
      // so a quick exchange (a game, a run of messages) does not reconnect every time.
      const to = msg.to;
      const ready = outbox.get(to) ?? getSupabase().then((supabase) => new Promise<RealtimeChannel>((resolve) => {
        const dm = supabase.channel(`playground-dm-${to}`);
        dm.subscribe((status) => { if (status === "SUBSCRIBED") resolve(dm); });
      }));
      outbox.set(to, ready);
      void ready.then((dm) => dm.send({ type: "broadcast", event: "chat", payload: msg }));
    },
    leave() {
      void room?.unsubscribe();
      void inbox?.unsubscribe();
      for (const channel of batchRooms.values()) void channel.unsubscribe();
      for (const ready of outbox.values()) void ready.then((dm) => dm.unsubscribe());
      outbox.clear();
      batchRooms.clear(); onChat = null;
      room = null; inbox = null; me = null; known.clear();
    },
  };
}
