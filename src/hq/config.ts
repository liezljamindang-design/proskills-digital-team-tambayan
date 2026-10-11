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
  name: (import.meta.env.VITE_HQ_NAME as string | undefined) || "Pro Skills Digital Tambayan",
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
