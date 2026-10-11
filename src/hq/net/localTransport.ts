import type { Peer, Profile } from "../types";
import type { Handlers, Point, Transport, WireChat } from "./transport";

type Msg =
  | { t: "hello" | "here"; peer: Peer }
  | { t: "move"; id: string; x: number; y: number }
  | { t: "chat"; msg: WireChat }
  | { t: "bye"; id: string };

/**
 * Preview transport: connects the tabs of one browser with a BroadcastChannel.
 * Nothing leaves the device, so it needs no accounts and no server. Open the
 * HQ in two tabs to see two people.
 */
export function createLocalTransport(): Transport {
  let channel: BroadcastChannel | null = null;
  let me: Peer | null = null;
  let handlers: Handlers | null = null;
  let heartbeat = 0;
  const seen = new Map<string, number>();

  const post = (m: Msg) => channel?.postMessage(m);
  const bye = () => me && post({ t: "bye", id: me.id });

  return {
    mode: "local",
    async join(profile: Profile, pos: Point, h: Handlers) {
      me = { ...profile, ...pos };
      handlers = h;
      channel = new BroadcastChannel("playground");
      channel.onmessage = (e: MessageEvent<Msg>) => {
        const m = e.data;
        if (!me || !handlers) return;
        if (m.t === "hello" || m.t === "here") {
          if (m.peer.id === me.id) return;
          seen.set(m.peer.id, Date.now());
          handlers.onPeer(m.peer);
          if (m.t === "hello") post({ t: "here", peer: me }); // introduce ourselves to the newcomer
        } else if (m.t === "move") {
          seen.set(m.id, Date.now());
          handlers.onMove(m.id, { x: m.x, y: m.y });
        } else if (m.t === "chat") {
          if (m.msg.room ? m.msg.room === `batch-${me.batch}` : !m.msg.to || m.msg.to === me.id) handlers.onChat(m.msg);
        } else if (m.t === "bye") {
          seen.delete(m.id);
          handlers.onPeerLeft(m.id);
        }
      };
      post({ t: "hello", peer: me });
      // Keep-alive, and drop anyone whose tab closed without saying goodbye.
      heartbeat = window.setInterval(() => {
        if (!me) return;
        post({ t: "here", peer: me });
        const now = Date.now();
        for (const [id, at] of seen) if (now - at > 12_000) { seen.delete(id); handlers?.onPeerLeft(id); }
      }, 4000);
      window.addEventListener("pagehide", bye);
    },
    updateProfile(profile, pos) {
      me = { ...profile, ...pos };
      post({ t: "here", peer: me });
    },
    move(pos) {
      if (!me) return;
      me = { ...me, ...pos };
      post({ t: "move", id: me.id, ...pos });
    },
    chat(msg) { post({ t: "chat", msg }); },
    leave() {
      bye();
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", bye);
      channel?.close();
      channel = null; me = null; handlers = null;
    },
  };
}
