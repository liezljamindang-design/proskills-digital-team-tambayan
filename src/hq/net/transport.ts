import type { Peer, Profile } from "../types";

export interface Point { x: number; y: number }

/** A chat message on the wire. `to` is set for a private message, `room` for a batch room such as "batch-7". */
export interface WireChat { id: string; from: string; name: string; text: string; to?: string; room?: string; image?: string }

export interface Handlers {
  /** Someone joined, or changed their name or look. */
  onPeer(peer: Peer): void;
  onPeerLeft(id: string): void;
  onMove(id: string, pos: Point): void;
  onChat(msg: WireChat): void;
}

/**
 * How the office talks to other people's browsers. Two implementations:
 * "local" (other tabs of this browser, no setup, for previewing) and
 * "supabase" (everyone, over the internet).
 */
export interface Transport {
  readonly mode: "local" | "supabase";
  join(me: Profile, pos: Point, handlers: Handlers): Promise<void>;
  updateProfile(me: Profile, pos: Point): void;
  move(pos: Point): void;
  chat(msg: WireChat): void;
  leave(): void;
}
