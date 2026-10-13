export type ZoneId = "lobby" | "focus" | "huddle" | "cafe" | "lounge" | "game" | "deck" | "nap" | "gym" | "library" | "dance" | "cinema" | "court" | "pool" | "plaza" | "canteen" | "music";

export interface Zone {
  id: ZoneId;
  key: number;
  name: string;
  summary: string;
  rect: { x: number; y: number; w: number; h: number };
}

export type FurnitureKind =
  | "desk" | "chair" | "plant" | "sofa" | "table" | "low-table" | "counter" | "lamp"
  | "arcade" | "pingpong" | "beanbag" | "stool" | "bed" | "shelf" | "fridge" | "reception" | "foosball" | "tree" | "treadmill" | "weights" | "bag" | "hoop" | "speaker" | "piano" | "drums" | "guitar" | "mic";

/** One object on the floor. Its footprint is both how it is drawn and what the avatar bumps into. */
export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  monitors?: number;
}

export interface WallSegment {
  id: string;
  axis: "x" | "y";
  at: number;
  from: number;
  to: number;
  height: number;
  /** A low solid wall. Without it the wall is glass. */
  solid?: boolean;
}

/** How a person's chibi looks. Everyone designs their own when they join. */
export interface Look {
  skin: string;
  hair: string;
  outfit: string;
  style: HairStyle;
  accessory: Accessory;
  /** "pants" covers the legs in a dark colour; "skirt" leaves them showing. */
  bottoms: "pants" | "skirt";
  /** The clothing style worn on top. */
  fit: Fit;
  /** Bought in the shop. */
  hat?: string;
  pet?: string;
  /** A special all-over skin, such as a limited edition. */
  fx?: string;
}
export type Fit = "basic" | "nerd" | "funk" | "cool" | "sporty" | "formal" | "hoodie" | "punk" | "royal";
export type HairStyle = "short" | "swept" | "bob" | "long-straight" | "long-wavy" | "bun" | "ponytail" | "pigtails";
export type Accessory = "none" | "glasses" | "headset" | "headphones" | "bow" | "clip";

export interface Profile {
  id: string;
  name: string;
  role: string;
  look: Look;
  /** Their Google sign-in photo, shown in lists instead of the chibi face. */
  photo?: string;
  /** Fewest moves this person has finished Memory Match in. */
  best?: number;
  /** A status the person picked themselves. Unset means it follows the room they are in. */
  status?: ManualStatus;
  act?: Act;
  /** Month and day only, as "MM-DD". */
  birthday?: string;
  /** Kept on your own account and device only. It is never sent to other people. */
  birthYear?: number;
  /** Coins earned by showing up, chatting and playing. Spent in the shop. */
  coins?: number;
  /** Days in a row this person has come in, and the last day counted (YYYY-MM-DD). */
  streak?: number;
  lastDay?: string;
  /** Shop items this person has bought. */
  owned?: string[];
  /** Shown in brackets beside the username. */
  firstName?: string;
  /** Batch 1 to 13, if they picked one. It adds them to that batch's own chat room. */
  batch?: number;
  /** Admins can sit in several batches at once. When set, this is the full list. */
  batches?: number[];
  /** Set from the account, not typed in by the person. */
  admin?: boolean;
  /** An admin who prefers not to show the Admin label beside their name. */
  hideAdmin?: boolean;
}
/** Every batch a person belongs to. */
export const batchesOf = (p: Pick<Profile, "batch" | "batches">): number[] => (p.batches?.length ? p.batches : p.batch ? [p.batch] : []);
export const BATCHES = 13;
/** "username (First name)" when a first name was given. */
export const displayName = (p: Pick<Profile, "name" | "firstName">) => (p.firstName ? `${p.name} (${p.firstName})` : p.name);
export type ManualStatus = "offline" | "dnd" | "brb" | "meeting" | "working" | "client" | "interview" | "call";
export type Mood = "happy" | "laugh" | "love" | "wow" | "cool" | "shy" | "think" | "sleepy" | "cry" | "angry" | "dance" | "blink";
/** A drink id: one of the DRINKS keys. */
export type Drink = string;
interface DrinkInfo { label: string; emoji: string; cup: string; top: string; hot?: boolean; place: "cafe" | "canteen"; adult?: boolean }
/** Café and canteen drinks. cup and top are the colours of the glass and the drink. */
export const DRINKS: Record<string, DrinkInfo> = {
  coffee: { label: "Hot coffee", emoji: "☕", cup: "#ffffff", top: "#6b4226", hot: true, place: "cafe" },
  barako: { label: "Kapeng barako", emoji: "☕", cup: "#ffffff", top: "#3b2314", hot: true, place: "cafe" },
  iced: { label: "Iced coffee", emoji: "🧊", cup: "#cfeaff", top: "#8a5a3a", place: "cafe" },
  tea: { label: "Milk tea", emoji: "🧋", cup: "#f1d9b5", top: "#c79a63", place: "cafe" },
  tsokolate: { label: "Tsokolate", emoji: "🍫", cup: "#ffffff", top: "#5a2e1a", hot: true, place: "cafe" },
  salabat: { label: "Salabat", emoji: "🫚", cup: "#ffffff", top: "#e0b04a", hot: true, place: "cafe" },
  sago: { label: "Sago't gulaman", emoji: "🥤", cup: "#e9d8c4", top: "#a0662f", place: "canteen" },
  buko: { label: "Buko juice", emoji: "🥥", cup: "#f4f1e6", top: "#ffffff", place: "canteen" },
  calamansi: { label: "Calamansi juice", emoji: "🍋", cup: "#f6f9d2", top: "#c8d93a", place: "canteen" },
  mango: { label: "Mango shake", emoji: "🥭", cup: "#ffe39a", top: "#ffb627", place: "canteen" },
  melon: { label: "Melon juice", emoji: "🍈", cup: "#e5f7cf", top: "#f7c27a", place: "canteen" },
  pandan: { label: "Buko pandan", emoji: "🥤", cup: "#d8f2c8", top: "#5fbf5a", place: "canteen" },
  soda: { label: "Softdrinks", emoji: "🥤", cup: "#e03131", top: "#2b1a12", place: "canteen" },
  beer: { label: "Malamig na beer", emoji: "🍺", cup: "#f5c542", top: "#fffbe8", place: "canteen", adult: true },
  tuba: { label: "Tuba", emoji: "🥥", cup: "#f0dcc4", top: "#d9a86c", place: "canteen", adult: true },
  lambanog: { label: "Lambanog", emoji: "🥃", cup: "#eef4f7", top: "#e8eef2", place: "canteen", adult: true },
  basi: { label: "Basi", emoji: "🍷", cup: "#f3e3e3", top: "#8a2a2a", place: "canteen", adult: true },
  gin: { label: "Gin pomelo", emoji: "🍸", cup: "#fde2ea", top: "#f29bb0", place: "canteen", adult: true },
};
export const drinkOf = (id?: string) => (id ? DRINKS[id] ?? DRINKS.coffee : undefined);
/** The canteen menu. The key is what is shown in the chibi's hand. */
export const FOODS: Record<string, string> = {
  "🍛": "Adobo rice", "🍜": "Pancit", "🍗": "Fried chicken", "🍲": "Sinigang", "🥟": "Siomai", "🌯": "Lumpia wrap",
  "🍔": "Burger", "🍕": "Pizza", "🍟": "Fries", "🍝": "Spaghetti", "🍣": "Sushi", "🥗": "Salad",
  "🥪": "Sandwich", "🍩": "Donut", "🍧": "Halo-halo", "🍦": "Ice cream", "🍌": "Banana cue", "🥭": "Mango",
};
/** What a person is doing right now. Shared live with everyone, never saved. */
export interface Act {
  pose?: "sit" | "sleep";
  /** While sitting: how far the chibi is nudged on screen to land on the seat. */
  at?: { dx: number; dy: number };
  drink?: Drink;
  /** Food from the canteen: one of the FOODS keys. */
  food?: string;
  phone?: boolean;
  mood?: Mood;
  /** The radio station they are listening to, by name. */
  radio?: string;
  /** DJ mode: the station (by id) they are inviting everyone to tune in to. */
  dj?: string;
  /** When they became the DJ. Only the most recent DJ counts, so there is one at a time. */
  djAt?: number;
  /** They switched party mode on. The party runs while anyone has this set. */
  party?: boolean;
  /** The bike or car they are riding. */
  ride?: { kind: string; color: string; name?: string };
  /** The latest trick done on a bike or in a car. `n` changes each time, so everyone plays it once. */
  trick?: { kind: "wheelie" | "hop" | "spin"; n: number };
  /** Holding a basketball on the court. */
  ball?: boolean;
  /** Using gym equipment: running on a treadmill or lifting weights. */
  gym?: "run" | "lift";
  /** Playing a band instrument in the Music Room. */
  band?: "drums" | "guitar" | "bass" | "mic";
  /** They have joined the voice chat. */
  voice?: boolean;
}

/** Someone else in the office. */
export interface Peer extends Profile {
  x: number;
  y: number;
}

export interface ChatLine {
  id: string;
  from: string;
  name: string;
  text: string;
  time: string;
  system?: boolean;
  /** A photo (small data URL) or a GIF link attached to the message. */
  image?: string;
  /** The message this one answers, as a short quote. */
  reply?: Quote;
  /** Who reacted, by emoji. */
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  /** This message mentions me by name. */
  mention?: boolean;
}
export interface Quote { id: string; name: string; text: string }
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export type ThemeChoice = "light" | "dark";
