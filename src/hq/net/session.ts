import { START } from "../data/office";
import { ZONES } from "../data/office";
import { zoneAt } from "../office/engine";
import { MANUAL } from "../status";
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

/** Adds a line about what someone just did to the public room, for this viewer only. */
function note(id: string, name: string, text: string) {
  useHq.getState().addLine(PUBLIC, { id: nextId(), from: id, name, text: `${name} ${text}`, time: clock(), system: true });
}
const DRINK = { coffee: "a hot coffee ☕", iced: "an iced coffee 🧊", tea: "a milk tea 🧋" } as const;
const MOOD = { happy: "is happy 😊", angry: "is angry 😠", dance: "is dancing 💃", blink: "blinked 😉" } as const;
/** Everything that changed between two versions of a person, as short activity lines. */
function changes(old: Profile, next: Profile): string[] {
  const a = old.act ?? {}, b = next.act ?? {}, out: string[] = [];
  if (a.pose !== b.pose) out.push(b.pose === "sleep" ? "is sleeping 💤" : b.pose === "sit" ? "sat down" : a.pose === "sleep" ? "woke up" : "stood up");
  if (a.drink !== b.drink) out.push(b.drink ? `ordered ${DRINK[b.drink]}` : "finished their drink");
  if (Boolean(a.phone) !== Boolean(b.phone)) out.push(b.phone ? "is on their phone 📱" : "put their phone away");
  if (b.mood && a.mood !== b.mood) out.push(MOOD[b.mood]);
  if (old.status !== next.status) out.push(next.status ? `is now: ${MANUAL[next.status].emoji} ${MANUAL[next.status].label}` : "cleared their status");
  return out;
}
function noteZone(id: string, name: string, from: string | null, to: string | null) {
  if (!to || to === from) return;
  note(id, name, to === "game" ? "entered the arcade 🎮" : `entered the ${ZONES.find((z) => z.id === to)!.name}`);
}

export async function joinOffice(me: Profile): Promise<void> {
  transport?.leave();
  transport = supabaseConfigured ? (await import("./supabaseTransport")).createSupabaseTransport() : createLocalTransport();
  const s = useHq.getState;
  await transport.join(me, myPos, {
    onPeer: (peer) => {
      const old = s().peers[peer.id];
      const isNew = !old;
      s().upsertPeer(peer);
      if (old) changes(old, peer).forEach((text) => note(peer.id, peer.name, text));
      if (isNew) s().addLine(PUBLIC, { id: nextId(), from: peer.id, name: peer.name, text: `${peer.name} walked in.`, time: clock(), system: true });
    },
    onPeerLeft: (id) => {
      const peer = s().peers[id];
      if (!peer) return;
      s().removePeer(id);
      s().addLine(PUBLIC, { id: nextId(), from: id, name: peer.name, text: `${peer.name} left.`, time: clock(), system: true });
    },
    onMove: (id, pos) => {
      const peer = s().peers[id];
      s().movePeer(id, pos.x, pos.y);
      if (peer) noteZone(id, peer.name, zoneAt(peer.x, peer.y), zoneAt(pos.x, pos.y));
    },
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
  const me = useHq.getState().me;
  if (me && transport) noteZone(me.id, me.name, zoneAt(myPos.x, myPos.y), zoneAt(pos.x, pos.y));
  myPos = pos;
  if (!transport) return;
  const now = performance.now();
  window.clearTimeout(trailing);
  if (now - lastSent >= 120) { lastSent = now; transport.move(pos); }
  else trailing = window.setTimeout(() => { lastSent = performance.now(); transport?.move(myPos); }, 130); // make sure the resting place is sent
}

export function updateMyProfile(me: Profile) {
  const old = useHq.getState().me;
  if (old && transport) changes(old, me).forEach((text) => note(me.id, me.name, text));
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
