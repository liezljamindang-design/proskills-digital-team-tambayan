import { START } from "../data/office";
import { PUBLIC, useHq } from "../store";
import type { Profile } from "../types";
import { createLocalTransport } from "./localTransport";
import { supabaseConfigured } from "./supabase";
import type { Point, Transport } from "./transport";

/** The one live connection to the office, and the actions that go through it. */
let transport: Transport | null = null;
let myPos: Point = { ...START };
let lastSent = 0;
let trailing = 0;
let lineId = 0;

export const liveMode = supabaseConfigured;
const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const nextId = () => `${Date.now().toString(36)}-${++lineId}`;

export async function joinOffice(me: Profile): Promise<void> {
  transport?.leave();
  transport = supabaseConfigured ? (await import("./supabaseTransport")).createSupabaseTransport() : createLocalTransport();
  const s = useHq.getState;
  await transport.join(me, myPos, {
    onPeer: (peer) => {
      const isNew = !s().peers[peer.id];
      s().upsertPeer(peer);
      if (isNew) s().addLine(PUBLIC, { id: nextId(), from: peer.id, name: peer.name, text: `${peer.name} walked in.`, time: clock(), system: true });
    },
    onPeerLeft: (id) => {
      const peer = s().peers[id];
      if (!peer) return;
      s().removePeer(id);
      s().addLine(PUBLIC, { id: nextId(), from: id, name: peer.name, text: `${peer.name} left.`, time: clock(), system: true });
    },
    onMove: (id, pos) => s().movePeer(id, pos.x, pos.y),
    onChat: (msg) => {
      const thread = msg.to ? msg.from : PUBLIC; // a private message files under its sender
      s().addLine(thread, { id: msg.id, from: msg.from, name: msg.name, text: msg.text, time: clock() });
      s().showBubble(msg.from, msg.text, Boolean(msg.to));
    },
  });
  useHq.getState().setJoined(true);
}

/** Sends a message to the public room, or privately when `to` is a person's id. */
export function say(text: string, to?: string) {
  const me = useHq.getState().me;
  const clean = text.trim().slice(0, 280);
  if (!me || !clean || !transport) return;
  const id = nextId();
  transport.chat({ id, from: me.id, name: me.name, text: clean, to });
  useHq.getState().addLine(to ?? PUBLIC, { id, from: me.id, name: me.name, text: clean, time: clock() });
  useHq.getState().showBubble(me.id, clean, Boolean(to));
}

/** Called by the movement loop every frame it moves; sends at most about eight updates a second. */
export function reportMove(pos: Point) {
  myPos = pos;
  if (!transport) return;
  const now = performance.now();
  window.clearTimeout(trailing);
  if (now - lastSent >= 120) { lastSent = now; transport.move(pos); }
  else trailing = window.setTimeout(() => { lastSent = performance.now(); transport?.move(myPos); }, 130); // make sure the resting place is sent
}

export function updateMyProfile(me: Profile) {
  useHq.getState().setMe(me);
  transport?.updateProfile(me, myPos);
}

export const myPosition = () => myPos;

/** Changes what I am doing (pose, drink, phone, mood) and tells everyone. */
export function setAct(patch: Partial<NonNullable<Profile["act"]>>) {
  const me = useHq.getState().me;
  if (me) updateMyProfile({ ...me, act: { ...me.act, ...patch } });
}

let moodTimer = 0;
/** A short reaction: it shows on your chibi for a few seconds, then clears. */
export function react(mood: NonNullable<NonNullable<Profile["act"]>["mood"]>) {
  setAct({ mood });
  window.clearTimeout(moodTimer);
  moodTimer = window.setTimeout(() => setAct({ mood: undefined }), mood === "dance" ? 8000 : 5000);
}

/** Opens the team meeting in a new tab. Browsers may refuse when it was not a direct click. */
export function openMeeting(url: string) {
  if (!url) return;
  const tab = window.open(url, "_blank");
  if (tab) tab.opener = null;
  useHq.setState({ meetingBlocked: !tab });
}
