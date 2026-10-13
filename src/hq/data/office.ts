import { HQ } from "../config";
import type { FurnitureItem, WallSegment, Zone } from "../types";

/** Floor is 34 units wide and 22 deep: room for 100+ people. The entrance is on the front edge (y = 22). */
export const FLOOR = { width: 34, depth: 22 };
/** The lawn you can walk and ride on: it wraps the front and the right-hand side of the building. */
export const WORLD = { width: FLOOR.width + 6, depth: FLOOR.depth + 9 };
export const START = { x: 17, y: 21.3 };
export const ENTRANCE = { from: 16.1, to: 17.9 };
/** The pickleball court: painted on the floor, so you can walk across it. Tap it to play. */
export const PICKLE = { x: 8.0, y: 15.6, w: 3.8, h: 4.6 };
/** Where the basketballs sit on the court, and where each hoop's ring is. */
export const BALL_SPOT = { x: 2.7, y: 19.9 };
export const HOOPS = [{ id: "hoop-1", x: 0.93, y: 18.3 }, { id: "hoop-2", x: 6.27, y: 18.3 }];
/** The light-up dance floor. */
export const DANCE_FLOOR = { x: 19.6, y: 8.6, w: 5.4, h: 4.2 };
/** The basketball court's painted floor. */
export const COURT = { x: 0.5, y: 15.2, w: 6.2, h: 6.2 };
/** Where you stand to use the arcade cabinets. */
export const ARCADE_SPOT = { x: 1.7, y: 11.2 };

export const ZONES: Zone[] = [
  { id: "lobby", key: 1, name: "Central Hall", summary: "The open space in the middle. Say hi on your way through.", rect: { x: 6.6, y: 5, w: 4.8, h: 9 } },
  { id: "focus", key: 2, name: "Classroom", summary: `${HQ.classTitle} · Monday to Friday, ${HQ.classSchedule}. Live training on Zoom: walk in and the class opens.`, rect: { x: 0, y: 0, w: 6.5, h: 4.2 } },
  { id: "huddle", key: 3, name: "Collaboration Room", summary: "The glass meeting room. Join the team's live Zoom call from here.", rect: { x: 7, y: 0, w: 4, h: 4 } },
  { id: "cafe", key: 4, name: "Café", summary: "Libreng kape ni Arnold! Order a coffee, barako, tsokolate or salabat.", rect: { x: 11.5, y: 0, w: 6.5, h: 4.2 } },
  { id: "lounge", key: 5, name: "Lounge", summary: "Sit on the sofa and scroll your phone.", rect: { x: 0, y: 5, w: 6, h: 4.2 } },
  { id: "game", key: 6, name: "Recreation Room", summary: "The arcade. Walk in and it opens up, with everyone who is inside.", rect: { x: 0, y: 9.8, w: 6, h: 4.2 } },
  { id: "deck", key: 7, name: "Garden Deck", summary: "Trees, a bench and fresh pretend air.", rect: { x: 12, y: 5, w: 6, h: 4.4 } },
  { id: "nap", key: 8, name: "Sleeping Quarters", summary: "Stop here and your chibi lies down on a bed. Move to wake up.", rect: { x: 12, y: 10, w: 6, h: 4 } },
  { id: "gym", key: 9, name: "Gym", summary: "Treadmills, weights and punching bags. Your status shows you are working out.", rect: { x: 18.1, y: 0, w: 7.9, h: 6 } },
  { id: "library", key: 10, name: "Library", summary: "Quiet shelves, reading tables and study desks.", rect: { x: 26.1, y: 0, w: 7.9, h: 6 } },
  { id: "dance", key: 11, name: "Dance Studio", summary: "Step onto the light-up floor and your chibi starts dancing.", rect: { x: 18.5, y: 7, w: 7.7, h: 7 } },
  { id: "cinema", key: 17, name: "Cinema", summary: "Grab a seat in front of the big screen. Popcorn at the back.", rect: { x: 26.4, y: 7, w: 7.6, h: 7 } },
  { id: "court", key: 12, name: "Basketball Court", summary: "Shoot some hoops outside.", rect: { x: 0, y: 14.6, w: 7, h: 7.4 } },
  { id: "pool", key: 13, name: "Pickleball Court", summary: "Tap the court to play pickleball against a teammate or the robot.", rect: { x: 7.4, y: 14.6, w: 5, h: 7.4 } },
  { id: "plaza", key: 14, name: "Main Entrance", summary: "The front door. Everyone arrives here.", rect: { x: 12.8, y: 14.6, w: 8.4, h: 7.4 } },
  { id: "canteen", key: 15, name: "Canteen", summary: "Filipino food, juices, sago't gulaman and an inuman corner.", rect: { x: 21.6, y: 14.6, w: 6, h: 7.4 } },
  { id: "music", key: 16, name: "Music Room", summary: "A full band set: drums, guitar, bass, a mic and a piano.", rect: { x: 28, y: 14.6, w: 6, h: 7.4 } },
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
  // Classroom: two rows of student desks facing the whiteboard, with the trainer's desk up front
  ...[0.4, 1.6, 3.6, 4.8].flatMap((x, i) => [...workstation(`desk-a${i}`, x, 0.8), ...workstation(`desk-b${i}`, x, 2.5)]),
  { id: "trainer-desk", kind: "reception", x: 5.6, y: 1.6, w: 0.5, h: 0.9 },
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
  tree("deck-t1", 12.3, 5.2), tree("deck-t2", 17.2, 5.2), tree("deck-t4", 12.3, 8.6),
  plant("deck-p1", 14.9, 5.2), plant("deck-p2", 17.5, 6.9), lamp("deck-lamp", 16.2, 5.3),

  // Sleeping Quarters
  bed("bed-1", 12.7), bed("bed-2", 13.9), bed("bed-3", 15.1), bed("bed-4", 16.3),
  lamp("nap-lamp", 17.4, 10.4), plant("nap-plant", 17.4, 13.4),

  // Gym
  ...[18.7, 19.9, 21.1, 22.3].map((x, i): FurnitureItem => ({ id: `treadmill-${i}`, kind: "treadmill", x, y: 0.4, w: 0.6, h: 1.2 })),
  { id: "weights-rack", kind: "weights", x: 23.6, y: 0.3, w: 1.6, h: 0.5 },
  { id: "weights-1", kind: "weights", x: 19.0, y: 3.2, w: 1.2, h: 0.5 }, { id: "weights-2", kind: "weights", x: 21.0, y: 3.2, w: 1.2, h: 0.5 },
  { id: "bag-1", kind: "bag", x: 25.1, y: 2.0, w: 0.4, h: 0.4 }, { id: "bag-2", kind: "bag", x: 25.1, y: 3.4, w: 0.4, h: 0.4 },
  { id: "gym-fridge", kind: "fridge", x: 18.4, y: 4.9, w: 0.6, h: 0.55 }, plant("gym-plant", 25.5, 0.2), stool("gym-stool", 24.0, 4.6),

  // Library
  ...[26.5, 27.9, 29.3, 30.7, 32.1].map((x, i): FurnitureItem => ({ id: `lib-shelf-${i}`, kind: "shelf", x, y: 0.15, w: 1.2, h: 0.32 })),
  { id: "lib-shelf-a", kind: "shelf", x: 26.6, y: 1.9, w: 1.2, h: 0.32 }, { id: "lib-shelf-b", kind: "shelf", x: 28.0, y: 1.9, w: 1.2, h: 0.32 },
  { id: "lib-table", kind: "table", x: 30.2, y: 2.2, w: 1.8, h: 1.0 },
  chair("lib-c1", 30.35, 1.7), chair("lib-c2", 30.95, 1.7), chair("lib-c3", 31.55, 1.7),
  chair("lib-c4", 30.35, 3.35), chair("lib-c5", 30.95, 3.35), chair("lib-c6", 31.55, 3.35),
  ...workstation("lib-desk-1", 26.6, 3.4), ...workstation("lib-desk-2", 28.0, 3.4),
  bean("lib-bean-1", 32.9, 2.4), bean("lib-bean-2", 33.1, 3.6), bean("lib-bean-3", 32.5, 4.7), lamp("lib-lamp", 33.5, 0.6), plant("lib-plant", 26.3, 5.3),

  // Dance Studio
  { id: "dj-booth", kind: "counter", x: 21.0, y: 7.4, w: 2.4, h: 0.55 },
  { id: "dance-speaker-1", kind: "speaker", x: 19.0, y: 7.3, w: 0.45, h: 0.45 }, { id: "dance-speaker-2", kind: "speaker", x: 25.0, y: 7.3, w: 0.45, h: 0.45 },
  bean("dance-bean-1", 19.0, 12.9), bean("dance-bean-2", 24.9, 12.2), lamp("dance-lamp", 18.8, 10.9),

  // Cinema: three rows of seats facing the big screen on the back wall
  ...[9.6, 10.8, 12.0].flatMap((y, r) => Array.from({ length: 7 }, (_, c) => chair(`cinema-${r}-${c}`, 27.5 + c * 0.85, y))),
  { id: "cinema-speaker-1", kind: "speaker", x: 26.7, y: 7.3, w: 0.45, h: 0.45 }, { id: "cinema-speaker-2", kind: "speaker", x: 33.3, y: 7.3, w: 0.45, h: 0.45 },
  { id: "popcorn", kind: "counter", x: 31.6, y: 13.2, w: 2.0, h: 0.5 }, plant("cinema-plant", 26.7, 13.5),

  // Basketball Court
  { id: "hoop-1", kind: "hoop", x: 0.5, y: 17.9, w: 0.3, h: 0.8 }, { id: "hoop-2", kind: "hoop", x: 6.4, y: 17.9, w: 0.3, h: 0.8 },
  { id: "court-bench", kind: "sofa", x: 2.4, y: 14.5, w: 2.2, h: 0.5 }, 

  // Pickleball Court
  bean("pool-bean-1", 7.7, 20.8), bean("pool-bean-2", 8.7, 20.9), bean("pool-bean-3", 11.4, 20.8),
  { id: "pool-bench", kind: "sofa", x: 8.8, y: 14.7, w: 2.2, h: 0.5 }, lamp("pool-lamp", 7.6, 14.9),

  // Main Entrance
  { id: "front-desk", kind: "reception", x: 14.0, y: 17.4, w: 0.6, h: 1.5 },
  tree("plaza-tree-1", 13.1, 15.0),   plant("plaza-plant-1", 15.6, 21.5), plant("plaza-plant-2", 18.1, 21.5), lamp("plaza-lamp", 20.6, 21.4),
  { id: "plaza-bench", kind: "sofa", x: 18.4, y: 17.6, w: 2.2, h: 0.6 },

  // Canteen
  { id: "canteen-counter", kind: "counter", x: 22.4, y: 15.2, w: 3.0, h: 0.55 },
  stool("can-stool-1", 22.7, 15.95), stool("can-stool-2", 23.5, 15.95), stool("can-stool-3", 24.3, 15.95), stool("can-stool-4", 25.0, 15.95),
  { id: "canteen-fridge", kind: "fridge", x: 26.0, y: 14.8, w: 0.6, h: 0.55 }, { id: "canteen-vending", kind: "fridge", x: 26.8, y: 14.8, w: 0.6, h: 0.55 },
  ...[[23.0, 17.8], [25.4, 17.8], [23.0, 19.6], [25.4, 19.6]].flatMap(([x, y], i): FurnitureItem[] => [
    { id: `can-table-${i}`, kind: "table", x, y, w: 0.75, h: 0.75 }, stool(`can-s${i}a`, x - 0.45, y + 0.2), stool(`can-s${i}b`, x + 0.9, y + 0.2),
  ]),
  plant("canteen-plant", 27.1, 21.4),

  // Music Room
  { id: "piano", kind: "piano", x: 32.0, y: 15.2, w: 1.4, h: 0.8 }, stool("piano-stool", 32.5, 16.1),
  { id: "music-speaker-1", kind: "speaker", x: 28.4, y: 14.9, w: 0.45, h: 0.45 }, { id: "music-speaker-2", kind: "speaker", x: 31.2, y: 14.9, w: 0.45, h: 0.45 },
  // A full band set on the little stage: drums at the back, guitar and bass on stands, a mic out front
  { id: "drums", kind: "drums", x: 29.65, y: 15.15, w: 0.95, h: 0.75 },
  { id: "guitar", kind: "guitar", x: 28.95, y: 16.35, w: 0.28, h: 0.28 }, { id: "bass", kind: "guitar", x: 31.0, y: 16.35, w: 0.28, h: 0.28 },
  { id: "band-mic", kind: "mic", x: 30.02, y: 16.75, w: 0.2, h: 0.2 },
  { id: "music-sofa", kind: "sofa", x: 29.0, y: 18.6, w: 2.2, h: 0.6 },
  bean("music-bean-1", 32.2, 18.6), bean("music-bean-2", 33.0, 19.8), bean("music-bean-3", 31.6, 20.4), lamp("music-lamp", 33.5, 21.4),
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
  // The old outer edges are now inside the building
  { axis: "x", at: 18, from: 0, to: 4.2, solid: true }, { axis: "x", at: 18, from: 10, to: 14, solid: true },
  { axis: "y", at: 14, from: 0, to: 4.4, solid: true }, { axis: "y", at: 14, from: 13.6, to: 18, solid: true },
  // Gym and Library
  { axis: "y", at: 6, from: 18.1, to: 21, solid: true }, { axis: "y", at: 6, from: 23, to: 26, solid: true }, { axis: "x", at: 26, from: 0, to: 6, solid: true },
  { axis: "y", at: 6, from: 26, to: 29, solid: true }, { axis: "y", at: 6, from: 31, to: 34, solid: true },
  // Dance Studio and Cinema
  { axis: "y", at: 7, from: 18.5, to: 26.3, solid: true }, { axis: "y", at: 7, from: 26.3, to: 34, solid: true },
  { axis: "x", at: 26.3, from: 7, to: 9, solid: true }, { axis: "x", at: 26.3, from: 11, to: 14, solid: true },
  { axis: "x", at: 18.5, from: 7, to: 8.5, solid: true }, { axis: "x", at: 18.5, from: 10.5, to: 14, solid: true },
  { axis: "y", at: 14, from: 18.5, to: 21.5, solid: true }, { axis: "y", at: 14, from: 23.5, to: 29.5, solid: true }, { axis: "y", at: 14, from: 31.5, to: 34, solid: true },
  // Canteen and Music Room
  { axis: "x", at: 21.6, from: 14.6, to: 17, solid: true }, { axis: "x", at: 21.6, from: 19, to: 22, solid: true },
  { axis: "x", at: 28, from: 14.6, to: 17, solid: true }, { axis: "x", at: 28, from: 19, to: 22, solid: true },
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
  { id: "rug-entrance", x: 16.1, y: 20.2, w: 1.8, h: 1.7 },
  { id: "rug-yoga-1", x: 22.9, y: 2.6, w: 0.6, h: 1.5 }, { id: "rug-yoga-2", x: 23.8, y: 2.6, w: 0.6, h: 1.5 },
  { id: "rug-music", x: 28.9, y: 15.6, w: 2.4, h: 1.7 },
  { id: "rug-library", x: 32.2, y: 2.0, w: 1.6, h: 3.4 },
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
