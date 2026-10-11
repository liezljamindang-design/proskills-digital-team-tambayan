/**
 * Settings, all optional and set as environment variables where the site is hosted:
 *   VITE_HQ_NAME       the name shown in the top bar
 *   VITE_MEETING_URL   the team's Zoom link, opened from the Collaboration Room
 *   VITE_HQ_LOGO   path to a logo file placed in /public, e.g. "/logo.png"
 */
export const HQ = {
  name: (import.meta.env.VITE_HQ_NAME as string | undefined) || "Pro Skills Digital Tambayan",
  /** The team's standing video-meeting link, opened from the Collaboration Room. Only https links are used. */
  meetingUrl: /^https:\/\//.test((import.meta.env.VITE_MEETING_URL as string | undefined) ?? "") ? (import.meta.env.VITE_MEETING_URL as string) : "",
  logo: (import.meta.env.VITE_HQ_LOGO as string | undefined) || "",
};
