/**
 * Settings, all optional and set as environment variables where the site is hosted:
 *   VITE_HQ_NAME       the name shown in the top bar
 *   VITE_MEETING_URL   the team's Zoom link, opened from the Collaboration Room
 *   VITE_CLASSROOM_URL   the Zoom link for live training, opened from the Classroom (uses the team link if not set)
 *   VITE_CLASS_TITLE / VITE_CLASS_SCHEDULE   what the Classroom whiteboard says
 *   VITE_HQ_LOGO   path to a logo file placed in /public, e.g. "/logo.png"
 */
/** A link from the settings, tidied up: stray spaces or quotes removed, and "https://" added if it was left off. */
function link(value: string | undefined): string {
  const text = (value ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!text) return "";
  const full = /^https?:\/\//i.test(text) ? text.replace(/^http:/i, "https:") : `https://${text}`;
  try { const u = new URL(full); return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : ""; } catch { return ""; }
}
const MEETING = link(import.meta.env.VITE_MEETING_URL as string | undefined);
const CLASSROOM = link(import.meta.env.VITE_CLASSROOM_URL as string | undefined);

export const HQ = {
  name: (import.meta.env.VITE_HQ_NAME as string | undefined) || "Pro Skills Digital Lobby",
  /** The team's standing video-meeting link, opened from the Collaboration Room. */
  meetingUrl: MEETING,
  /** The live-training video link, opened from the Classroom. Falls back to the team link only when none is set. */
  classroomUrl: CLASSROOM || MEETING,
  /** True when the Classroom has its own link, rather than borrowing the team one. */
  classroomOwnLink: Boolean(CLASSROOM),
  /** Written on the Classroom whiteboard and its room card. */
  classTitle: (import.meta.env.VITE_CLASS_TITLE as string | undefined) || "Batch 13 Class",
  classSchedule: (import.meta.env.VITE_CLASS_SCHEDULE as string | undefined) || "1:00 PM - 5:00 PM",
  logo: (import.meta.env.VITE_HQ_LOGO as string | undefined) || "/logo.png",
};

/** Minutes since midnight for a time written like "1:00 PM". */
function minutes(text: string): number | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M/i.exec(text);
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === "P" ? 12 : 0)) * 60 + Number(m[2] ?? 0);
}
/** Whether class is on right now: Monday to Friday, going by Philippine time and the schedule on the sign (1:00 PM to 5:00 PM unless changed). */
export function classOngoing(now = new Date()): boolean {
  const [from, to] = HQ.classSchedule.split(/\s[-–—]\s|\sto\s/i);
  const start = minutes(from ?? "") ?? 13 * 60, end = minutes(to ?? "") ?? 17 * 60;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  // Class runs Monday to Friday only.
  if (/^(Sat|Sun)/.test(parts.find((p) => p.type === "weekday")?.value ?? "")) return false;
  const at = (Number(parts.find((p) => p.type === "hour")?.value) % 24) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
  return at >= start && at < end;
}
