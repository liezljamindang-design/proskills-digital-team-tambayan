import type { FurnitureItem, WallSegment, Zone } from "../types";

/** Floor is 18 units wide and 14 deep. The entrance is on the front edge (y = 14). */
export const FLOOR = { width: 18, depth: 14 };
export const START = { x: 9, y: 13.3 };
export const ENTRANCE = { from: 8.1, to: 9.9 };
/** Where you stand to use the arcade cabinets. */
export const ARCADE_SPOT = { x: 1.7, y: 11.2 };

export const ZONES: Zone[] = [
  { id: "lobby", key: 1, name: "Lobby", summary: "Where everyone lands. Say hi on your way in.", rect: { x: 6.6, y: 5, w: 4.8, h: 9 } },
  { id: "focus", key: 2, name: "Work Room", summary: "Desks for whoever is working right now. Your status shows what you are on.", rect: { x: 0, y: 0, w: 6.5, h: 4.2 } },
  { id: "huddle", key: 3, name: "Collaboration Room", summary: "The glass meeting room. Join the team's live Zoom call from here.", rect: { x: 7, y: 0, w: 4, h: 4 } },
  { id: "cafe", key: 4, name: "Café", summary: "Walk in and order a coffee. Your chibi sips it.", rect: { x: 11.5, y: 0, w: 6.5, h: 4.2 } },
  { id: "lounge", key: 5, name: "Lounge", summary: "Sit on the sofa and scroll your phone.", rect: { x: 0, y: 5, w: 6, h: 4.2 } },
  { id: "game", key: 6, name: "Recreation Room", summary: "The arcade. Walk in and it opens up, with everyone who is inside.", rect: { x: 0, y: 9.8, w: 6, h: 4.2 } },
  { id: "deck", key: 7, name: "Garden Deck", summary: "Trees, a bench and fresh pretend air.", rect: { x: 12, y: 5, w: 6, h: 4.4 } },
  { id: "nap", key: 8, name: "Sleeping Quarters", summary: "Stop here and your chibi lies down on a bed. Move to wake up.", rect: { x: 12, y: 10, w: 6, h: 4 } },
];

function workstation(id: string, x: number, y: number): FurnitureItem[] {
  return [
    { id, kind: "desk", x, y, w: 1.0, h: 0.6, monitors: 1 },
    { id: `${id}-chair`, kind: "chair", x: x + 0.31, y: y + 0.76, w: 0.38, h: 0.38 },
  ];
}
const plant = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "plant", x, y, w: 0.34, h: 0.34 });
const tree = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "tree", x, y, w: 0.5, h: 0.5 });
const bean = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "beanbag", x, y, w: 0.6, h: 0.6 });
const stool = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "stool", x, y, w: 0.3, h: 0.3 });
const lamp = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "lamp", x, y, w: 0.26, h: 0.26 });
const chair = (id: string, x: number, y: number): FurnitureItem => ({ id, kind: "chair", x, y, w: 0.36, h: 0.36 });
const bed = (id: string, x: number): FurnitureItem => ({ id, kind: "bed", x, y: 10.45, w: 0.7, h: 1.2 });

export const FURNITURE: FurnitureItem[] = [
  // Work Room: two rows of desks with an aisle down the middle
  ...[0.4, 1.6, 3.6, 4.8].flatMap((x, i) => [...workstation(`desk-a${i}`, x, 0.8), ...workstation(`desk-b${i}`, x, 2.5)]),
  { id: "work-shelf", kind: "shelf", x: 2.75, y: 0.15, w: 0.7, h: 0.32 },
  plant("work-plant", 6.0, 0.2),

  // Collaboration Room
  { id: "huddle-table", kind: "table", x: 8.1, y: 1.3, w: 1.8, h: 1.0 },
  chair("huddle-c1", 8.25, 0.8), chair("huddle-c2", 8.85, 0.8), chair("huddle-c3", 9.45, 0.8),
  chair("huddle-c4", 8.25, 2.45), chair("huddle-c5", 8.85, 2.45), chair("huddle-c6", 9.45, 2.45),
  plant("huddle-plant", 10.5, 0.2),

  // Café
  { id: "cafe-counter", kind: "counter", x: 12.6, y: 0.8, w: 3.0, h: 0.55 },
  stool("stool-1", 12.9, 1.55), stool("stool-2", 13.7, 1.55), stool("stool-3", 14.5, 1.55), stool("stool-4", 15.2, 1.55),
  { id: "cafe-fridge", kind: "fridge", x: 16.4, y: 0.25, w: 0.6, h: 0.55 },
  { id: "cafe-vending", kind: "fridge", x: 17.15, y: 0.25, w: 0.6, h: 0.55 },
  { id: "cafe-t1", kind: "table", x: 12.2, y: 2.6, w: 0.75, h: 0.75 }, stool("cafe-s1", 13.1, 2.8), stool("cafe-s2", 11.75, 2.8),
  { id: "cafe-t2", kind: "table", x: 16.4, y: 2.6, w: 0.75, h: 0.75 }, stool("cafe-s3", 17.3, 2.8), stool("cafe-s4", 15.95, 2.8),

  // Lounge
  { id: "lounge-sofa", kind: "sofa", x: 0.6, y: 5.5, w: 2.2, h: 0.6 },
  { id: "lounge-table", kind: "low-table", x: 1.25, y: 6.8, w: 0.9, h: 0.45 },
  { id: "lounge-shelf", kind: "shelf", x: 3.6, y: 5.15, w: 1.2, h: 0.32 },
  bean("bean-1", 3.6, 6.2), bean("bean-2", 4.5, 6.9), bean("bean-5", 3.3, 7.6),
  { id: "lounge-sofa-2", kind: "sofa", x: 0.3, y: 7.3, w: 0.6, h: 1.5 },
  lamp("lounge-lamp", 0.2, 5.2), plant("lounge-plant", 5.4, 5.2),

  // Recreation Room
  { id: "arcade-1", kind: "arcade", x: 0.5, y: 10.2, w: 0.52, h: 0.46 },
  { id: "arcade-2", kind: "arcade", x: 1.3, y: 10.2, w: 0.52, h: 0.46 },
  { id: "arcade-3", kind: "arcade", x: 2.1, y: 10.2, w: 0.52, h: 0.46 },
  { id: "pingpong", kind: "pingpong", x: 3.5, y: 10.8, w: 1.5, h: 0.85 },
  { id: "foosball", kind: "foosball", x: 0.9, y: 12.3, w: 1.3, h: 0.7 },
  bean("bean-6", 4.6, 12.6), plant("game-plant", 5.4, 10.1),

  // Lobby
  { id: "reception", kind: "reception", x: 6.9, y: 11.3, w: 0.6, h: 1.5 },
  tree("lobby-tree", 8.75, 7.6),
  plant("lobby-plant-1", 7.4, 13.4), plant("lobby-plant-2", 10.3, 13.4), lamp("lobby-lamp", 10.9, 11.6),
  { id: "lobby-bench", kind: "sofa", x: 10.6, y: 9.4, w: 0.6, h: 1.6 },

  // Garden Deck
  { id: "deck-bench", kind: "sofa", x: 13.4, y: 6.0, w: 1.8, h: 0.6 },
  { id: "deck-table", kind: "low-table", x: 13.9, y: 7.0, w: 0.8, h: 0.5 },
  bean("bean-3", 16.2, 6.4), bean("bean-4", 15.8, 7.6),
  tree("deck-t1", 12.3, 5.2), tree("deck-t2", 17.2, 5.2), tree("deck-t3", 17.2, 8.6), tree("deck-t4", 12.3, 8.6),
  plant("deck-p1", 14.9, 5.2), plant("deck-p2", 17.5, 6.9), lamp("deck-lamp", 16.2, 5.3),

  // Sleeping Quarters
  bed("bed-1", 12.7), bed("bed-2", 13.9), bed("bed-3", 15.1), bed("bed-4", 16.3),
  lamp("nap-lamp", 17.4, 10.4), plant("nap-plant", 17.4, 13.4),
];

export const WALL_HEIGHT = 80;

/** Walls inside the office. Glass around the Collaboration Room; low solid walls elsewhere. Gaps are doorways. */
const RUNS: (Omit<WallSegment, "id" | "height"> & { solid?: boolean })[] = [
  { axis: "x", at: 7, from: 0, to: 4 }, { axis: "x", at: 11, from: 0, to: 4 },
  { axis: "y", at: 4, from: 7, to: 8.2 }, { axis: "y", at: 4, from: 9.8, to: 11 },
  // Work Room
  { axis: "x", at: 6.5, from: 0, to: 4.2, solid: true },
  { axis: "y", at: 4.2, from: 0, to: 2.6, solid: true }, { axis: "y", at: 4.2, from: 4.0, to: 6.5, solid: true },
  // Café
  { axis: "y", at: 4.2, from: 11.5, to: 13.6, solid: true }, { axis: "y", at: 4.2, from: 15.8, to: 18, solid: true },
  // Recreation Room
  { axis: "y", at: 9.8, from: 0, to: 4.2, solid: true }, { axis: "x", at: 6, from: 11.4, to: 14, solid: true },
  // Sleeping Quarters
  { axis: "y", at: 10, from: 14.2, to: 18, solid: true }, { axis: "x", at: 12, from: 11.6, to: 14, solid: true },
];
/** Each run is cut into pieces about a unit long, so walls sort correctly against furniture and people. */
export const WALLS: WallSegment[] = RUNS.flatMap((run, r) => {
  const pieces = Math.max(1, Math.round(run.to - run.from));
  const step = (run.to - run.from) / pieces;
  return Array.from({ length: pieces }, (_, i) => ({
    id: `wall-${r}-${i}`, axis: run.axis, at: run.at, from: run.from + i * step, to: run.from + (i + 1) * step,
    height: run.solid ? 22 : 46, solid: run.solid,
  }));
});

/** Flat decor: drawn on the floor, walked over, never a collision. */
export const RUGS = [
  { id: "rug-lobby", x: 8.1, y: 12.3, w: 1.8, h: 1.7 },
  { id: "rug-lounge", x: 0.4, y: 5.3, w: 3.0, h: 2.2 },
  { id: "rug-game", x: 3.2, y: 10.5, w: 2.1, h: 1.5 },
  { id: "rug-deck", x: 13.1, y: 5.8, w: 2.4, h: 2.0 },
  { id: "rug-nap", x: 12.5, y: 12.1, w: 4.8, h: 1.0 },
  { id: "rug-huddle", x: 7.7, y: 0.6, w: 2.6, h: 2.5 },
];

/** A place to sit: where the chibi is placed on the floor, and how far it is nudged on screen to land on the seat. */
export interface Seat { furniture: string; x: number; y: number; dx: number; dy: number }
const SEAT_HEIGHT: Partial<Record<FurnitureItem["kind"], number>> = { chair: 10, stool: 14, beanbag: 9 };
/** Every chair, stool, bean bag and sofa. Each spot is just in front of the piece so the chibi draws over it. */
export const SEATS: Seat[] = FURNITURE.flatMap((f): Seat[] => {
  const z = SEAT_HEIGHT[f.kind];
  if (z !== undefined) {
    const d = f.h / 2 + 0.03;
    return [{ furniture: f.id, x: f.x + f.w / 2, y: f.y + f.h + 0.03, dx: 32 * d, dy: -16 * d - z + 3 }];
  }
  if (f.kind === "sofa" && f.w >= f.h) {
    const n = Math.max(1, Math.floor((f.w - 0.4) / 0.6) + 1);
    return Array.from({ length: n }, (_, i) => ({ furniture: f.id, x: f.x + 0.5 + i * ((f.w - 1) / Math.max(1, n - 1)), y: f.y + f.h + 0.2, dx: 0, dy: -8 }));
  }
  return [];
});
export const SEAT_IDS = new Set(SEATS.map((s) => s.furniture));
/** The foot of each bed, where a sleeping chibi is placed. */
export const BED_FEET = FURNITURE.filter((f) => f.kind === "bed").map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h + 0.03 }));
