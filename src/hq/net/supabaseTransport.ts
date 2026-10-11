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

      await new Promise<void>((resolve, reject) => {
        room!.subscribe((status) => {
          if (status === "SUBSCRIBED") { void room!.track(me!); resolve(); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
        });
      });

      inbox = supabase.channel(`playground-dm-${myId}`, { config: { broadcast: { self: false } } });
      inbox.on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat(payload as WireChat)).subscribe();
    },
    updateProfile(profile, pos) {
      me = { ...profile, ...pos };
      void room?.track(me);
    },
    move(pos) {
      if (!me) return;
      me = { ...me, ...pos };
      void room?.send({ type: "broadcast", event: "move", payload: { id: me.id, ...pos } });
    },
    chat(msg) {
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
      room = null; inbox = null; me = null; known.clear();
    },
  };
}
