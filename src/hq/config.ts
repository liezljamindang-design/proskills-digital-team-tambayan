/**
 * Settings, all optional and set as environment variables where the site is hosted:
 *   VITE_HQ_NAME       the name shown in the top bar
 *   VITE_MEETING_URL   the team's Zoom link, opened from the Collaboration Room
 *   VITE_CLASSROOM_URL   the Zoom link for live training, opened from the Classroom (uses the team link if not set)
 *   VITE_CLASS_TITLE / VITE_CLASS_SCHEDULE   what the Classroom whiteboard says
 *   VITE_HQ_LOGO   path to a logo file placed in /public, e.g. "/logo.png"
 */
export const HQ = {
  name: (import.meta.env.VITE_HQ_NAME as string | undefined) || "Pro Skills Digital Tambayan",
  /** The team's standing video-meeting link, opened from the Collaboration Room. Only https links are used. */
  meetingUrl: /^https:\/\//.test((import.meta.env.VITE_MEETING_URL as string | undefined) ?? "") ? (import.meta.env.VITE_MEETING_URL as string) : "",
  /** The live-training video link, opened from the Classroom. Falls back to the team link. Only https links are used. */
  classroomUrl: /^https:\/\//.test((import.meta.env.VITE_CLASSROOM_URL as string | undefined) ?? "") ? (import.meta.env.VITE_CLASSROOM_URL as string) : /^https:\/\//.test((import.meta.env.VITE_MEETING_URL as string | undefined) ?? "") ? (import.meta.env.VITE_MEETING_URL as string) : "",
  /** Written on the Classroom whiteboard and its room card. */
  classTitle: (import.meta.env.VITE_CLASS_TITLE as string | undefined) || "Batch 13 Class",
  classSchedule: (import.meta.env.VITE_CLASS_SCHEDULE as string | undefined) || "1:00 PM - 5:00 PM",
  logo: (import.meta.env.VITE_HQ_LOGO as string | undefined) || "/logo.png",
};
