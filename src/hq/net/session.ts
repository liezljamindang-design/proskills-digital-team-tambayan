import { START } from "../data/office";
import { ZONES } from "../data/office";
import { zoneAt } from "../office/engine";
import { safeImage } from "../media";
import { MANUAL } from "../status";
import { ARCADE, PUBLIC, useHq } from "../store";
import { batchesOf, displayName, REACTIONS, type Profile, type Quote } from "../types";
import { loadHistory, saveMarks, saveMessage } from "./history";
import { startRoster } from "./roster";
import { createLocalTransport } from "./localTransport";
import { createSupabaseTransport } from "./supabaseTransport";
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
// Random part included so two people never produce the same message id.
const nextId = () => `${Date.now().toString(36)}-${++lineId}-${Math.random().toString(36).slice(2, 7)}`;

/** Adds a line about what someone just did to the public room, for this viewer only. */
function note(id: string, name: string, text: string) {
  useHq.getState().addLine(PUBLIC, { id: nextId(), from: id, name, text: `${name} ${text}`, time: clock(), system: true });
}
const DRINK = { coffee: "a hot coffee ☕", iced: "an iced coffee 🧊", tea: "a milk tea 🧋" } as const;
const MOOD = {
  happy: "is happy 😊", laugh: "is laughing 😆", love: "is in love 😍", wow: "is amazed 😮", cool: "is feeling cool 😎", shy: "is feeling shy ☺️",
  think: "is thinking 🤔", sleepy: "is sleepy 🥱", cry: "is crying 😢", angry: "is angry 😠", dance: "is dancing 💃", blink: "blinked 😉",
} as const;
/** Everything that changed between two versions of a person, as short activity lines. */
function changes(old: Profile, next: Profile): string[] {
  const a = old.act ?? {}, b = next.act ?? {}, out: string[] = [];
  if (a.pose !== b.pose) out.push(b.pose === "sleep" ? "is sleeping 💤" : b.pose === "sit" ? "sat down" : a.pose === "sleep" ? "woke up" : "stood up");
  if (a.drink !== b.drink) out.push(b.drink ? `bought ${DRINK[b.drink]}` : "finished their drink");
  if (Boolean(a.phone) !== Boolean(b.phone)) out.push(b.phone ? "is on their phone 📱" : "put their phone away");
  if (b.mood && a.mood !== b.mood) out.push(MOOD[b.mood]);
  if (a.radio !== b.radio) out.push(b.radio ? `is listening to ${String(b.radio).slice(0, 40)} 🎧` : "turned the music off");
  const joined = batchesOf(next).filter((b) => !batchesOf(old).includes(b));
  if (joined.length) out.push(`joined Batch ${joined.join(", ")}`);
  if (old.status !== next.status) out.push(next.status === "offline" ? "went offline" : old.status === "offline" && !next.status ? "is back online" : next.status ? `is now: ${MANUAL[next.status].emoji} ${MANUAL[next.status].label}` : "cleared their status");
  return out;
}
const leaving = new Map<string, number>();
const lastRoom = new Map<string, string>();
/**
 * Room changes, kept short: entering a room is announced; leaving is only announced
 * when the person has not walked into another room a few seconds later.
 */
function noteZone(id: string, name: string, from: string | null, to: string | null) {
  if (to === from) return;
  const room = (z: string) => (z === "game" ? "arcade 🎮" : ZONES.find((r) => r.id === z)!.name);
  window.clearTimeout(leaving.get(id));
  leaving.delete(id);
  if (to) {
    if (lastRoom.get(id) !== to) note(id, name, `entered the ${room(to)}`);
    lastRoom.set(id, to);
  } else if (from) {
    lastRoom.set(id, from);
    leaving.set(id, window.setTimeout(() => { leaving.delete(id); lastRoom.delete(id); note(id, name, `left the ${room(from)}`); }, 6000));
  }
}

export async function joinOffice(me: Profile): Promise<void> {
  transport?.leave();
  transport = supabaseConfigured ? createSupabaseTransport() : createLocalTransport();
  const s = useHq.getState;
  await transport.join({ ...me, birthYear: undefined }, myPos, {
    onPeer: (peer) => {
      const old = s().peers[peer.id];
      const isNew = !old;
      s().upsertPeer(peer);
      if (old) changes(old, peer).forEach((text) => note(peer.id, displayName(peer), text));
      if (isNew) s().addLine(PUBLIC, { id: nextId(), from: peer.id, name: peer.name, text: `${displayName(peer)} is online and walked in.`, time: clock(), system: true });
    },
    onPeerLeft: (id) => {
      const peer = s().peers[id];
      if (!peer) return;
      s().removePeer(id);
      s().addLine(PUBLIC, { id: nextId(), from: id, name: peer.name, text: `${displayName(peer)} went offline.`, time: clock(), system: true });
    },
    onMove: (id, pos) => {
      const peer = s().peers[id];
      s().movePeer(id, pos.x, pos.y);
      if (peer) noteZone(id, displayName(peer), zoneAt(peer.x, peer.y), zoneAt(pos.x, pos.y));
    },
    onChat: (msg) => {
      const thread = msg.room ?? (msg.to ? msg.from : PUBLIC); // a private message files under its sender
      // Arcade chat is only for people who are inside the arcade right now.
      if (msg.room === ARCADE && s().myZone !== "game") return;
      if (msg.react && typeof msg.react.id === "string" && REACTIONS.includes(msg.react.emoji)) return applyReaction(thread, msg.react.id, msg.react.emoji, msg.from, Boolean(msg.react.on));
      if (msg.pin && typeof msg.pin.id === "string") return s().patchLine(thread, msg.pin.id, (l) => ({ ...l, pinned: Boolean(msg.pin!.on) }));
      const reply = msg.reply && typeof msg.reply.id === "string" ? { id: msg.reply.id, name: String(msg.reply.name).slice(0, 50), text: String(msg.reply.text).slice(0, 90) } : undefined;
      const image = safeImage(msg.image) ? msg.image : undefined; // never show an image we did not expect
      const text = typeof msg.text === "string" ? msg.text.slice(0, 280) : "";
      if (!text && !image) return;
      s().addLine(thread, { id: msg.id, from: msg.from, name: msg.name, text, time: clock(), image, reply });
      s().showBubble(msg.from, text || (image?.startsWith("data:") ? "📷 Photo" : "GIF"), Boolean(msg.to || (msg.room && msg.room !== ARCADE)));
    },
  });
  useHq.getState().setJoined(true);
  void loadHistory(me);
  startRoster(me);
}

/** Sends a message to the public room, to a batch room ("batch-7"), or privately when `to` is a person's id. */
export function say(text: string, to?: string, image?: string, reply?: Quote) {
  const me = useHq.getState().me;
  const clean = text.trim().slice(0, 280);
  if (!me || (!clean && !image) || !transport) return;
  const id = nextId();
  const name = displayName(me);
  const room = to === ARCADE || to?.startsWith("batch-") ? to : undefined;
  transport.chat({ id, from: me.id, name, text: clean, to: room ? undefined : to, room, image, reply });
  const line = { id, from: me.id, name, text: clean, time: clock(), image, reply };
  useHq.getState().addLine(to ?? PUBLIC, line);
  saveMessage(to ?? PUBLIC, line, me);
  useHq.getState().showBubble(me.id, clean || (image?.startsWith("data:") ? "📷 Photo" : "GIF"), Boolean(to) && to !== ARCADE);
}

function applyReaction(thread: string, id: string, emoji: string, who: string, on: boolean) {
  useHq.getState().patchLine(thread, id, (l) => {
    const people = (l.reactions?.[emoji] ?? []).filter((p) => p !== who);
    if (on) people.push(who);
    const reactions = { ...l.reactions, [emoji]: people };
    if (!people.length) delete reactions[emoji];
    return { ...l, reactions };
  });
}
/** Where a thread's messages are sent: everyone, a room, or one person. */
const route = (thread: string) => (thread === PUBLIC ? {} : thread === ARCADE || thread.startsWith("batch-") ? { room: thread } : { to: thread });

/** Adds or removes my reaction on a message, for everyone in that conversation. */
export function toggleReaction(thread: string, id: string, emoji: string) {
  const me = useHq.getState().me;
  const line = useHq.getState().threads[thread]?.find((l) => l.id === id);
  if (!me || !line || !transport) return;
  const on = !line.reactions?.[emoji]?.includes(me.id);
  applyReaction(thread, id, emoji, me.id, on);
  transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", ...route(thread), react: { id, emoji, on } });
  saveMarks(thread, id, me);
}

/** Pins or unpins a message, for everyone in that conversation. */
export function togglePin(thread: string, id: string) {
  const me = useHq.getState().me;
  const line = useHq.getState().threads[thread]?.find((l) => l.id === id);
  if (!me || !line || !transport) return;
  const on = !line.pinned;
  useHq.getState().patchLine(thread, id, (l) => ({ ...l, pinned: on }));
  transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", ...route(thread), pin: { id, on } });
  saveMarks(thread, id, me);
}

/** Called by the movement loop every frame it moves; sends at most about eight updates a second. */
export function reportMove(pos: Point) {
  const me = useHq.getState().me;
  if (me && transport) noteZone(me.id, displayName(me), zoneAt(myPos.x, myPos.y), zoneAt(pos.x, pos.y));
  myPos = pos;
  if (!transport) return;
  const now = performance.now();
  window.clearTimeout(trailing);
  if (now - lastSent >= 120) { lastSent = now; transport.move(pos); }
  else trailing = window.setTimeout(() => { lastSent = performance.now(); transport?.move(myPos); }, 130); // make sure the resting place is sent
}

export function updateMyProfile(me: Profile) {
  const old = useHq.getState().me;
  if (old && transport) changes(old, me).forEach((text) => note(me.id, displayName(me), text));
  useHq.getState().setMe(me);
  transport?.updateProfile({ ...me, birthYear: undefined }, myPos);
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
