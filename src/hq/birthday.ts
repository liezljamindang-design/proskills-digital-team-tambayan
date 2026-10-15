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

/** The words of an admin's birthday announcement. It is an ordinary chat message, so it is saved and everyone sees it. */
export const BALLOON = "🎈 Happy birthday, ";
export const announcement = (name: string) => `${BALLOON}${name}! 🎂🎉 Let's celebrate!`;
const sameDay = (ms: number) => new Date(ms).toDateString() === new Date().toDateString();

/** Who to celebrate today: anyone whose birthday it is (online or not), plus anyone an admin announced today. */
export interface Celebrant { key: string; name: string; look?: Profile["look"]; photo?: string }
export function everyoneToCelebrate(
  me: Profile | null,
  peers: Record<string, Profile>,
  away: Record<string, { id: string; name: string; firstName?: string; look: Profile["look"]; photo?: string; birthday?: string }>,
  lines: { id: string; text: string }[],
): Celebrant[] {
  const out = new Map<string, Celebrant>();
  const people = [...(me ? [me] : []), ...Object.values(peers), ...Object.values(away)];
  for (const p of people) if (p.birthday === todayKey()) out.set(p.id, { key: p.id, name: p.name, look: p.look, photo: p.photo });
  for (const l of lines) {
    if (!l.text.startsWith(BALLOON) || !sameDay(parseInt(l.id.split("-")[0], 36))) continue;
    const name = l.text.slice(BALLOON.length).split("! ")[0].trim();
    if (!name) continue;
    const who = people.find((p) => p.name === name || (p.firstName ? `${p.name} (${p.firstName})` : p.name) === name);
    const key = who?.id ?? `name:${name}`;
    if (!out.has(key)) out.set(key, { key, name: who?.name ?? name, look: who?.look, photo: who?.photo });
  }
  // Celebrations set up ahead of time, for people the app can't find in the member list.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  for (const d of DECORATE) {
    if (d.date !== today) continue;
    const who = people.find((p) => p.name.toLowerCase().includes(d.name.toLowerCase()));
    const key = who?.id ?? `name:${d.name}`;
    if (!out.has(key)) out.set(key, { key, name: who?.name ?? d.name, look: who?.look, photo: who?.photo });
  }
  return [...out.values()];
}

/** Office decorations booked for a day (Philippine date). First names only. They end by themselves the next day. */
const DECORATE: { date: string; name: string }[] = [
  { date: "2026-10-15", name: "Protegenes" },
];
