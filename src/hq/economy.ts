import { accountsEnabled, saveToAccount } from "./net/auth";
import { updateMyProfile } from "./net/session";
import { useHq } from "./store";

/**
 * Coins, the daily streak and the shop. This is for fun, not security: balances
 * live on each person's own profile, so a determined teammate could cheat.
 */
export interface ShopItem {
  id: string; kind: "hat" | "pet" | "fx"; name: string; emoji: string; price: number;
  /** Limited editions can only be bought before this date (YYYY-MM-DD). Owners keep them afterwards. */
  until?: string;
  note?: string;
}
export const onSale = (item: ShopItem) => !item.until || new Date() < new Date(`${item.until}T00:00:00`);
export const SHOP: ShopItem[] = [
  { id: "party", kind: "hat", name: "Party hat", emoji: "🥳", price: 25 },
  { id: "cap", kind: "hat", name: "Baseball cap", emoji: "🧢", price: 30 },
  { id: "beanie", kind: "hat", name: "Beanie", emoji: "🧶", price: 40 },
  { id: "ears", kind: "hat", name: "Cat ears", emoji: "🐱", price: 60 },
  { id: "flowers", kind: "hat", name: "Flower crown", emoji: "🌸", price: 70 },
  { id: "wizard", kind: "hat", name: "Wizard hat", emoji: "🧙", price: 80 },
  { id: "halo", kind: "hat", name: "Halo", emoji: "😇", price: 120 },
  { id: "duck", kind: "pet", name: "Duck", emoji: "🦆", price: 100 },
  { id: "cat", kind: "pet", name: "Cat", emoji: "🐈", price: 150 },
  { id: "dog", kind: "pet", name: "Dog", emoji: "🐕", price: 150 },
  { id: "robot", kind: "pet", name: "Robot", emoji: "🤖", price: 200 },
  { id: "ghost", kind: "fx", name: "Halloween Ghost", emoji: "👻", price: 180, until: "2026-11-02", note: "Halloween 2026" },
  { id: "gold", kind: "fx", name: "Golden Founder", emoji: "🏆", price: 300, until: "2026-12-01", note: "Opening season" },
  { id: "neon", kind: "fx", name: "Neon Glow", emoji: "💡", price: 220 },
  { id: "ice", kind: "fx", name: "Frost", emoji: "🧊", price: 200 },
  { id: "shadow", kind: "fx", name: "Shadow Ninja", emoji: "🥷", price: 240 },
];
export const EARNING = { daily: 20, streakBonus: 5, streakCap: 7, chat: 1, chatCap: 20, win: 10, best: 15, meeting: 5 };

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
let toastN = 0, saveTimer = 0;

/** Writes coins and purchases to the account a moment later, so quick changes are saved together. */
function persist() {
  if (!accountsEnabled) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const me = useHq.getState().me;
    if (me && !me.id.startsWith("guest-")) void saveToAccount({ coins: me.coins ?? 0, streak: me.streak ?? 0, lastDay: me.lastDay, owned: me.owned ?? [], look: me.look }).catch(() => undefined);
  }, 1500);
}

export function earn(amount: number, why: string) {
  const me = useHq.getState().me;
  if (!me || amount <= 0) return;
  updateMyProfile({ ...me, coins: (me.coins ?? 0) + amount });
  useHq.setState({ toast: { text: `+${amount} coins · ${why}`, n: ++toastN } });
  persist();
}

/** Things that only pay a limited number of times a day, counted on this device. */
function underDailyCap(key: string, cap: number): boolean {
  try {
    const raw = JSON.parse(window.localStorage.getItem("playground.daily") ?? "{}");
    const today = raw.day === dayKey() ? raw : { day: dayKey() };
    if ((today[key] ?? 0) >= cap) return false;
    today[key] = (today[key] ?? 0) + 1;
    window.localStorage.setItem("playground.daily", JSON.stringify(today));
    return true;
  } catch { return false; }
}
export const earnForChat = () => { if (underDailyCap("chat", EARNING.chatCap)) earn(EARNING.chat, "chatting"); };
export const earnForMeeting = () => { if (underDailyCap("meeting", 1)) earn(EARNING.meeting, "joining the meeting room"); };

/** Once a day, on coming in: coins for showing up, more for each day in a row (up to a week). */
export function dailyCheckIn() {
  const me = useHq.getState().me;
  const today = dayKey();
  if (!me || me.lastDay === today) return;
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const streak = me.lastDay === yesterday ? (me.streak ?? 0) + 1 : 1;
  const amount = EARNING.daily + Math.min(streak - 1, EARNING.streakCap) * EARNING.streakBonus;
  updateMyProfile({ ...me, coins: (me.coins ?? 0) + amount, streak, lastDay: today });
  useHq.setState({ toast: { text: `+${amount} coins · day ${streak} streak`, n: ++toastN } });
  persist();
}

export function buy(item: ShopItem): boolean {
  const me = useHq.getState().me;
  if (!me || !onSale(item) || (me.owned ?? []).includes(item.id) || (me.coins ?? 0) < item.price) return false;
  updateMyProfile({ ...me, coins: (me.coins ?? 0) - item.price, owned: [...(me.owned ?? []), item.id], look: { ...me.look, [item.kind]: item.id } });
  persist();
  return true;
}

/** Puts an owned item on, or takes it off if it is already on. */
export function wear(item: ShopItem) {
  const me = useHq.getState().me;
  if (!me || !(me.owned ?? []).includes(item.id)) return;
  updateMyProfile({ ...me, look: { ...me.look, [item.kind]: me.look[item.kind] === item.id ? undefined : item.id } });
  persist();
}
