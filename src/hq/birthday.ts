import type { Profile } from "./types";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
export const birthdayKey = (month: number, day: number) => `${pad(month)}-${pad(day)}`;
export const todayKey = () => { const d = new Date(); return birthdayKey(d.getMonth() + 1, d.getDate()); };
export const isBirthday = (p: Pick<Profile, "birthday">) => Boolean(p.birthday) && p.birthday === todayKey();

/** Everyone in the office whose birthday is today, by this device's date. */
export function celebrants(me: Profile | null, peers: Record<string, Profile>): Profile[] {
  return [...(me ? [me] : []), ...Object.values(peers)].filter(isBirthday);
}
