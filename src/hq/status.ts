import type { ManualStatus, Profile, ZoneId } from "./types";

export interface Status {
  id: string;
  label: string;
  emoji: string;
  /** Drives the colour: free to talk, busy, having fun, or resting. */
  tone: "ok" | "busy" | "fun" | "rest";
}

/** The status each room gives you just by standing in it. */
const BY_ZONE: Record<ZoneId, Status> = {
  lobby: { id: "available", label: "Available", emoji: "🟢", tone: "ok" },
  focus: { id: "working", label: "Working now", emoji: "💻", tone: "busy" },
  huddle: { id: "meeting", label: "In a meeting", emoji: "🗓️", tone: "busy" },
  cafe: { id: "break", label: "On a coffee break", emoji: "☕", tone: "rest" },
  lounge: { id: "chilling", label: "Chilling", emoji: "🛋️", tone: "rest" },
  game: { id: "playing", label: "Playing", emoji: "🎮", tone: "fun" },
  deck: { id: "outside", label: "Getting fresh air", emoji: "🌿", tone: "rest" },
  nap: { id: "sleeping", label: "Sleeping", emoji: "💤", tone: "rest" },
};
const AVAILABLE: Status = BY_ZONE.lobby;

/** Statuses a person can pin, whichever room they are in. */
export const MANUAL: Record<ManualStatus, Status> = {
  offline: { id: "offline", label: "Appear offline", emoji: "⚫", tone: "rest" },
  dnd: { id: "dnd", label: "Do not disturb", emoji: "⛔", tone: "busy" },
  brb: { id: "brb", label: "Be right back", emoji: "⏳", tone: "rest" },
  meeting: BY_ZONE.huddle,
  working: BY_ZONE.focus,
  client: { id: "client", label: "In a client meeting", emoji: "🤝", tone: "busy" },
  interview: { id: "interview", label: "In an interview", emoji: "🎙️", tone: "busy" },
  call: { id: "call", label: "On a call", emoji: "📞", tone: "busy" },
};

/** A pinned status wins; otherwise the room decides. */
export function statusOf(person: Pick<Profile, "status">, zone: ZoneId | null): Status {
  if (person.status && MANUAL[person.status]) return MANUAL[person.status];
  return zone ? BY_ZONE[zone] : AVAILABLE;
}

/** Statuses offered in the Work Room. They are dropped again when you walk out. */
export const WORK_STATUSES: ManualStatus[] = ["working", "client", "interview", "call"];

/** The one-word presence shown beside a name in the People list. */
export function presenceOf(p: Pick<Profile, "status">): { label: "Online" | "Offline" | "DND"; tone: "ok" | "off" | "busy" } {
  if (p.status === "offline") return { label: "Offline", tone: "off" };
  if (p.status === "dnd") return { label: "DND", tone: "busy" };
  return { label: "Online", tone: "ok" };
}
