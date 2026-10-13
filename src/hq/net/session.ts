import { keepAlive } from "./keepAlive";
import { HOOPS, START } from "../data/office";
import { earn } from "../economy";
import { ZONES } from "../data/office";
import { zoneAt } from "../office/engine";
import { safeImage } from "../media";
import { mentionedIds, mentions } from "../mentions";
import { MANUAL } from "../status";
import { ARCADE, PUBLIC, useHq } from "../store";
import { batchesOf, displayName, FOODS, REACTIONS, type Profile, type Quote } from "../types";
import { notifyOthers, refreshPush } from "./push";
import { loadHistory, saveMarks, saveMessage } from "./history";
import { startRoster } from "./roster";
import { createLocalTransport } from "./localTransport";
import { createSupabaseTransport } from "./supabaseTransport";
import { supabaseConfigured } from "./supabase";
import type { Point, PongMsg, Transport } from "./transport";

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
/** Everything that changed between two versions of a person, as short activity lines. */
function changes(old: Profile, next: Profile): string[] {
  // Kept short on purpose: faces, sitting, phones and music show on the chibi itself and are not announced.
  const a = old.act ?? {}, b = next.act ?? {}, out: string[] = [];
  if (b.drink && a.drink !== b.drink) out.push(`bought ${DRINK[b.drink]}`);
  if (b.food && a.food !== b.food && FOODS[b.food]) out.push(`is eating ${b.food} ${FOODS[b.food].toLowerCase()}`);
  if (b.party && !a.party) out.push("started a party 🎉");
  const bought = (next.owned ?? []).filter((id) => !(old.owned ?? []).includes(id));
  if (bought.length) out.push("bought something new in the shop 🛍️");
  const joined = batchesOf(next).filter((n) => !batchesOf(old).includes(n));
  if (joined.length) out.push(`joined Batch ${joined.join(", ")}`);
  if (old.status !== next.status) {
    if (next.status === "offline") out.push("went offline");
    else if (old.status === "offline") out.push("is back online");
    else if (next.status) out.push(`is now: ${MANUAL[next.status].emoji} ${MANUAL[next.status].label}`);
  }
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
  // Only the meeting room is announced. Every other room would flood the chat; the People tab shows where everyone is.
  if (to) {
    if ((to === "huddle" || to === "focus") && lastRoom.get(id) !== to) note(id, name, `joined the ${room(to)}`);
    lastRoom.set(id, to);
  } else if (from) {
    lastRoom.set(id, from);
    leaving.set(id, window.setTimeout(() => { leaving.delete(id); lastRoom.delete(id); }, 6000));
  }
  if ((from === "huddle" || from === "focus") && to !== from) note(id, name, `left the ${room(from)}`);
}

// One device per account: the newest sign-in stays, the older one steps out.
const mySession = Math.random().toString(36).slice(2);
let mySince = 0, takeoverTimer = 0;
function announceTakeover() {
  const me = useHq.getState().me;
  if (me && transport) transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", takeover: { session: mySession, since: mySince } });
}
function stepOut() {
  window.clearInterval(takeoverTimer);
  void import("./voice").then((v) => v.stopListening()).catch(() => undefined);
  transport?.leave(); transport = null;
  useHq.setState({ joined: false, kicked: true, peers: {}, gameOpen: false, sheetOpen: false });
}

export async function joinOffice(joining: Profile): Promise<void> {
  // Everyone starts as active when they come in; a status set after that is kept until they leave.
  keepAlive();
  const me: Profile = { ...joining, status: undefined };
  useHq.getState().setMe(me);
  mySince = Date.now();
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
      if (msg.from && msg.name && s().names[msg.from] !== msg.name) useHq.setState({ names: { ...s().names, [msg.from]: String(msg.name).slice(0, 60) } });
      const thread = msg.room ?? (msg.to ? msg.from : PUBLIC); // a private message files under its sender
      // Arcade chat is only for people who are inside the arcade right now.
      if (msg.room === ARCADE && s().myZone !== "game") return;
      if (msg.takeover) {
        if (msg.from !== s().me?.id || msg.takeover.session === mySession) return;
        if (msg.takeover.since >= mySince) stepOut();
        else { announceTakeover(); window.setTimeout(() => { const mine = s().me; if (mine) transport?.updateProfile(mine, myPos); }, 1500); } // the other one is older: tell it again, then show up again once it has left
        return;
      }
      if (msg.seen) { if (typeof msg.seen.upTo === "string") s().setSeen(thread, msg.from, msg.seen.upTo.slice(0, 60)); return; }
      if (msg.rtc) { rtcListener?.(msg.from, msg.rtc); return; }
      if (msg.pong) { receivePong(msg.from, msg.name, msg.pong); return; }
      if (msg.hoop) {
        const h = msg.hoop;
        if (HOOPS[h.hoop] && Number.isFinite(h.x) && Number.isFinite(h.y)) {
          s().addShot({ id: msg.id, from: msg.from, x: h.x, y: h.y, hoop: h.hoop, made: Boolean(h.made), at: Date.now() });
          setTimeout(() => s().showBubble(msg.from, h.made ? "🏀 Swish!" : "🏀 Missed!", false), 1000);
        }
        return;
      }
      if (msg.poke && POKES[msg.poke.kind]) {
        const poke = POKES[msg.poke.kind], mine = msg.poke.to === s().me?.id;
        note(msg.from, msg.name, `${poke.verb} ${mine ? "you" : String(msg.poke.toName).slice(0, 40)} ${poke.emoji}`);
        s().showBubble(msg.from, `${poke.emoji} ${mine ? "you!" : String(msg.poke.toName).slice(0, 24)}`, false);
        if (mine) { ping(); react("happy"); }
        return;
      }
      if (msg.partyOver) { if (s().me?.act?.party) setAct({ party: undefined }); return; }
      if (msg.react && typeof msg.react.id === "string" && REACTIONS.includes(msg.react.emoji)) return applyReaction(thread, msg.react.id, msg.react.emoji, msg.from, Boolean(msg.react.on));
      if (msg.pin && typeof msg.pin.id === "string") return s().patchLine(thread, msg.pin.id, (l) => ({ ...l, pinned: Boolean(msg.pin!.on) }));
      const reply = msg.reply && typeof msg.reply.id === "string" ? { id: msg.reply.id, name: String(msg.reply.name).slice(0, 50), text: String(msg.reply.text).slice(0, 90) } : undefined;
      const image = safeImage(msg.image) ? msg.image : undefined; // never show an image we did not expect
      const text = typeof msg.text === "string" ? msg.text.slice(0, 280) : "";
      if (!text && !image) return;
      const mention = mentionsMe(text);
      if (mention) ping();
      s().addLine(thread, { id: msg.id, from: msg.from, name: msg.name, text, time: clock(), image, reply, mention });
      s().showBubble(msg.from, text || (image?.startsWith("data:") ? "📷 Photo" : "GIF"), Boolean(msg.to || (msg.room && msg.room !== ARCADE)));
    },
  });
  useHq.getState().setJoined(true);
  void refreshPush();
  // Preview only: ?crowd=100 fills the office with pretend members, to see how it copes.
  const crowd = !supabaseConfigured ? Number(new URLSearchParams(window.location.search).get("crowd")) : 0;
  if (crowd > 0) void import("./crowd").then((c) => c.startCrowd(Math.min(300, crowd)));
  void import("./voice").then((v) => v.startListening()).catch(() => undefined); // hear whoever is talking, without joining
  announceTakeover();
  window.setTimeout(() => { const mine = useHq.getState().me; if (mine) transport?.updateProfile(mine, myPos); }, 1500); // in case an older device of yours just left
  window.clearInterval(takeoverTimer);
  takeoverTimer = window.setInterval(announceTakeover, 45000); // catches a device that was asleep
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
  // People called by @name are told even if they are offline or only get private notifications.
  const st = useHq.getState(), called = to && !room ? [] : mentionedIds(clean, [...Object.values(st.peers), ...Object.values(st.away)]).filter((id) => id !== me.id);
  if (to !== ARCADE) void notifyOthers({ to: room ? undefined : to, room, text: clean, mentions: called.length ? called : undefined });
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

export const PARTY_SECONDS = 30;
let partyTimer = 0;
/** Starts the party for everyone, or ends it for everyone if one is running. */
export function toggleParty() {
  const state = useHq.getState(), me = state.me;
  if (!me || !transport) return;
  const running = Boolean(me.act?.party) || Object.values(state.peers).some((p) => p.act?.party);
  if (!running) {
    setAct({ party: true });
    // A party lasts thirty seconds, then winds down by itself.
    window.clearTimeout(partyTimer);
    partyTimer = window.setTimeout(() => { if (useHq.getState().me?.act?.party) setAct({ party: undefined }); }, PARTY_SECONDS * 1000);
    return;
  }
  window.clearTimeout(partyTimer);
  if (me.act?.party) setAct({ party: undefined });
  transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", partyOver: true });
}

/** Friendly gestures you can aim at a teammate. */
export const POKES: Record<string, { label: string; verb: string; emoji: string }> = {
  wave: { label: "Wave", verb: "waved at", emoji: "👋" },
  highfive: { label: "High-five", verb: "high-fived", emoji: "🙌" },
  hug: { label: "Hug", verb: "hugged", emoji: "🤗" },
  cheer: { label: "Cheer", verb: "cheered for", emoji: "🎉" },
};
const seenSent = new Map<string, string>();
let seenTimer = 0;
/** Tells the others in a conversation that I have read it up to this message. Sent a moment later, so a burst counts once. */
export function markSeen(thread: string, upTo: string) {
  if (thread === ARCADE || seenSent.get(thread) === upTo) return;
  seenSent.set(thread, upTo);
  window.clearTimeout(seenTimer);
  seenTimer = window.setTimeout(() => {
    const me = useHq.getState().me;
    if (!me || !transport) return;
    for (const [t, id] of seenSent) {
      if (sentOut.get(t) === id) continue;
      sentOut.set(t, id);
      transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", room: t.startsWith("batch-") ? t : undefined, to: t === PUBLIC || t.startsWith("batch-") ? undefined : t, seen: { upTo: id } });
    }
  }, 1200);
}
const sentOut = new Map<string, string>();

/** Picks up a basketball. Only on the court. */
export function pickUpBall() {
  if (useHq.getState().myZone === "court") setAct({ ball: true });
}
let lastShot = 0;
/** Shoots at the nearest hoop. The closer you stand, the more often it goes in. */
export function shoot() {
  const state = useHq.getState(), me = state.me;
  if (!me || !transport || !me.act?.ball || state.myZone !== "court" || Date.now() - lastShot < 1800) return;
  lastShot = Date.now();
  const at = myPos, hoop = Math.hypot(HOOPS[0].x - at.x, HOOPS[0].y - at.y) <= Math.hypot(HOOPS[1].x - at.x, HOOPS[1].y - at.y) ? 0 : 1;
  const d = Math.hypot(HOOPS[hoop].x - at.x, HOOPS[hoop].y - at.y);
  const made = Math.random() < Math.min(0.9, Math.max(0.2, 0.95 - d * 0.15));
  const id = nextId();
  transport.chat({ id, from: me.id, name: displayName(me), text: "", hoop: { x: at.x, y: at.y, hoop, made } });
  state.addShot({ id, from: me.id, x: at.x, y: at.y, hoop, made, at: Date.now() });
  setTimeout(() => {
    useHq.getState().showBubble(me.id, made ? "🏀 Swish!" : "🏀 Missed!", false);
    react(made ? "happy" : "cry");
    const score = useHq.getState().hoopScore;
    if (made && score.made % 5 === 0) earn(2, "5 baskets");
  }, 1000);
}

export function poke(kind: string, to: string) {
  const state = useHq.getState(), me = state.me, target = state.peers[to];
  if (!me || !target || !transport || !POKES[kind]) return;
  const toName = displayName(target);
  transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", poke: { kind, to, toName } });
  note(me.id, displayName(me), `${POKES[kind].verb} ${toName} ${POKES[kind].emoji}`);
  state.showBubble(me.id, `${POKES[kind].emoji} ${target.name}`, false);
  react("happy");
}

/** True when a message calls me by @username or @firstname. */
function mentionsMe(text: string): boolean {
  const me = useHq.getState().me;
  return Boolean(me) && mentions(text, me!);
}

let audio: AudioContext | null = null;
/** A short, soft two-note chime, for mentions and gestures aimed at you. */
function ping() {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio!.createOscillator(), gain = audio!.createGain();
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
    });
  } catch { /* no sound available */ }
}

// ---- Ping-pong between two people ----
type PongListener = (msg: PongMsg) => void;
let pongListener: PongListener | null = null;
/** The open game listens here for the other player's moves. */
export function onPong(listener: PongListener | null) { pongListener = listener; }
/** The practice opponent. It lives in your own browser, so nothing is sent anywhere. */
export const BOT = "robot";
export function playRobot() {
  if (!useHq.getState().pong) useHq.setState({ pongMenu: false, pong: { opp: BOT, name: "Robot", stage: "playing", host: true, game: useHq.getState().pongGame } });
}
export function sendPong(to: string, msg: PongMsg) {
  if (to === BOT) return;
  const me = useHq.getState().me;
  if (me && transport) transport.chat({ id: nextId(), from: me.id, name: displayName(me), text: "", to, pong: msg });
}
function receivePong(from: string, name: string, msg: PongMsg) {
  const state = useHq.getState(), current = state.pong;
  if (msg.k === "invite") {
    if (current) { sendPong(from, { k: "decline" }); return; } // already busy with another game
    useHq.setState({ pong: { opp: from, name: String(name).slice(0, 40), stage: "invited", host: false, game: msg.g === "pickle" ? "pickle" : "pong" } });
    ping();
    return;
  }
  if (!current || current.opp !== from) return;
  if (msg.k === "accept" && current.stage === "inviting") useHq.setState({ pong: { ...current, stage: "playing" } });
  else if (msg.k === "decline" && current.stage === "inviting") { useHq.setState({ pong: null, toast: { text: `${current.name} can't play right now`, n: Date.now() } }); }
  else if (msg.k === "quit" && current.stage !== "playing") useHq.setState({ pong: null });
  else pongListener?.(msg);
}
export function invitePong(to: string) {
  const target = useHq.getState().peers[to];
  if (!target || useHq.getState().pong) return;
  const game = useHq.getState().pongGame;
  useHq.setState({ pongMenu: false, pong: { opp: to, name: displayName(target), stage: "inviting", host: true, game } });
  sendPong(to, game === "pickle" ? { k: "invite", g: "pickle" } : { k: "invite" });
}
export function answerPong(accept: boolean) {
  const current = useHq.getState().pong;
  if (!current || current.stage !== "invited") return;
  sendPong(current.opp, { k: accept ? "accept" : "decline" });
  useHq.setState({ pong: accept ? { ...current, stage: "playing" } : null });
}
export function leavePong() {
  const current = useHq.getState().pong;
  if (current) sendPong(current.opp, { k: "quit" });
  useHq.setState({ pong: null });
}

// ---- Voice chat set-up messages ----
type Rtc = NonNullable<import("./transport").WireChat["rtc"]>;
let rtcListener: ((from: string, msg: Rtc) => void) | null = null;
export function onRtc(listener: ((from: string, msg: Rtc) => void) | null) { rtcListener = listener; }
export function sendRtc(to: string, msg: Rtc) {
  const me = useHq.getState().me;
  if (me && transport) transport.chat({ id: nextId(), from: me.id, name: me.name, text: "", to, rtc: msg });
}
