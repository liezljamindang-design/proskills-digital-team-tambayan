export type ZoneId = "lobby" | "focus" | "huddle" | "cafe" | "lounge" | "game" | "deck" | "nap";

export interface Zone {
  id: ZoneId;
  key: number;
  name: string;
  summary: string;
  rect: { x: number; y: number; w: number; h: number };
}

export type FurnitureKind =
  | "desk" | "chair" | "plant" | "sofa" | "table" | "low-table" | "counter" | "lamp"
  | "arcade" | "pingpong" | "beanbag" | "stool" | "bed" | "shelf" | "fridge" | "reception" | "foosball" | "tree";

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
}
export type Fit = "basic" | "nerd" | "funk" | "cool" | "sporty" | "formal" | "hoodie" | "punk" | "royal";
export type HairStyle = "short" | "swept" | "bob" | "long-straight" | "long-wavy" | "bun" | "ponytail" | "pigtails";
export type Accessory = "none" | "glasses" | "headset" | "headphones" | "bow" | "clip";

export interface Profile {
  id: string;
  name: string;
  role: string;
  look: Look;
  /** Fewest moves this person has finished Memory Match in. */
  best?: number;
  /** A status the person picked themselves. Unset means it follows the room they are in. */
  status?: ManualStatus;
  act?: Act;
  /** Month and day only, as "MM-DD". */
  birthday?: string;
  /** Kept on your own account and device only. It is never sent to other people. */
  birthYear?: number;
  /** Shown in brackets beside the username. */
  firstName?: string;
  /** Batch 1 to 13, if they picked one. It adds them to that batch's own chat room. */
  batch?: number;
}
export const BATCHES = 13;
/** "username (First name)" when a first name was given. */
export const displayName = (p: Pick<Profile, "name" | "firstName">) => (p.firstName ? `${p.name} (${p.firstName})` : p.name);
export type ManualStatus = "dnd" | "brb" | "meeting" | "working" | "client" | "interview" | "call";
export type Mood = "happy" | "laugh" | "love" | "wow" | "cool" | "shy" | "think" | "sleepy" | "cry" | "angry" | "dance" | "blink";
export type Drink = "coffee" | "iced" | "tea";
/** What a person is doing right now. Shared live with everyone, never saved. */
export interface Act {
  pose?: "sit" | "sleep";
  /** While sitting: how far the chibi is nudged on screen to land on the seat. */
  at?: { dx: number; dy: number };
  drink?: Drink;
  phone?: boolean;
  mood?: Mood;
  /** The radio station they are listening to, by name. */
  radio?: string;
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
}
export interface Quote { id: string; name: string; text: string }
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export type ThemeChoice = "light" | "dark";
