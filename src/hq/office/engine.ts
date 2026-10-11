import { FLOOR, FURNITURE, WALLS, ZONES } from "../data/office";
import type { WallSegment, ZoneId } from "../types";

/** Movement rules: collisions against furniture and glass, and A* pathfinding for tap-to-move. */
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export type Box = Rect & { depth: number };

export const PLAYER_RADIUS = 0.2;
export const SPEED = 2.4; // floor units per second: a relaxed walk

export const wallRect = (w: WallSegment): Rect =>
  w.axis === "x" ? { x: w.at - 0.04, y: w.from, w: 0.08, h: w.to - w.from } : { x: w.from, y: w.at - 0.04, w: w.to - w.from, h: 0.08 };

const OBSTACLES: Rect[] = [...FURNITURE, ...WALLS.map(wallRect)];

export function canStand(x: number, y: number): boolean {
  const r = PLAYER_RADIUS;
  if (x < r || y < r || x > FLOOR.width - r || y > FLOOR.depth - r) return false;
  for (const o of OBSTACLES) if (x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.h + r) return false;
  return true;
}

export function zoneAt(x: number, y: number): ZoneId | null {
  for (const z of ZONES) {
    const r = z.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return z.id;
  }
  return null;
}

export function zoneEntry(id: ZoneId): Point {
  const r = ZONES.find((z) => z.id === id)!.rect;
  return { x: r.x + r.w / 2, y: r.y + r.h - 0.4 };
}

export function sceneToFloor(sx: number, sy: number): Point {
  return { x: (sx / 32 + sy / 16) / 2, y: (sy / 16 - sx / 32) / 2 };
}

/**
 * Where an actor standing at `pos` belongs in the back-to-front draw order,
 * given the footprints of the scene objects in that order.
 */
export function slotFor(pos: Point, boxes: Box[]): number {
  let frontMax = -1;
  let behindMin = -1;
  boxes.forEach((b, i) => {
    const dx = Math.max(b.x - pos.x, 0, pos.x - (b.x + b.w));
    const dy = Math.max(b.y - pos.y, 0, pos.y - (b.y + b.h));
    if (dx > 1.5 || dy > 1.5) return;
    const inFront = pos.x > b.x + b.w || pos.y > b.y + b.h;
    const behind = pos.x < b.x || pos.y < b.y;
    if (inFront && !behind) frontMax = i;
    else if (behind && !inFront && behindMin < 0) behindMin = i;
  });
  if (frontMax < 0 && behindMin < 0) {
    const d = pos.x + pos.y;
    const i = boxes.findIndex((b) => b.depth > d);
    return i < 0 ? boxes.length : i;
  }
  return behindMin >= 0 && frontMax < behindMin ? behindMin : frontMax + 1;
}

/* ---------- Pathfinding grid ---------- */
const CELL = 0.25;
const COLS = Math.round(FLOOR.width / CELL);
const ROWS = Math.round(FLOOR.depth / CELL);
const centre = (i: number): Point => ({ x: ((i % COLS) + 0.5) * CELL, y: (Math.floor(i / COLS) + 0.5) * CELL });
const BLOCKED = new Uint8Array(COLS * ROWS);
for (let i = 0; i < BLOCKED.length; i++) { const c = centre(i); BLOCKED[i] = canStand(c.x, c.y) ? 0 : 1; }

function nearestFreeCell(p: Point): number {
  const cx = Math.min(COLS - 1, Math.max(0, Math.floor(p.x / CELL)));
  const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(p.y / CELL)));
  for (let ring = 0; ring < Math.max(COLS, ROWS); ring++) {
    let best = -1, bestD = Infinity;
    for (let y = cy - ring; y <= cy + ring; y++) for (let x = cx - ring; x <= cx + ring; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== ring) continue;
      const i = y * COLS + x;
      if (BLOCKED[i]) continue;
      const c = centre(i), d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) return best;
  }
  return 0;
}

function astar(start: number, goal: number): number[] {
  const n = COLS * ROWS;
  const g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1), queued = new Uint8Array(n), closed = new Uint8Array(n);
  const gx = goal % COLS, gy = Math.floor(goal / COLS), open = [start];
  g[start] = 0; f[start] = 0;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    if (cur === goal) { const out: number[] = []; for (let c = cur; c !== -1; c = came[c]) out.push(c); return out.reverse(); }
    closed[cur] = 1;
    const cx = cur % COLS, cy = Math.floor(cur / COLS);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      if (BLOCKED[ni] || closed[ni]) continue;
      if (dx && dy && (BLOCKED[cy * COLS + nx] || BLOCKED[ny * COLS + cx])) continue; // no cutting corners
      const t = g[cur] + (dx && dy ? Math.SQRT2 : 1);
      if (t < g[ni]) {
        came[ni] = cur; g[ni] = t;
        const hx = Math.abs(nx - gx), hy = Math.abs(ny - gy);
        f[ni] = t + Math.max(hx, hy) + (Math.SQRT2 - 1) * Math.min(hx, hy);
        if (!queued[ni]) { queued[ni] = 1; open.push(ni); }
      }
    }
  }
  return [];
}

function clearLine(a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.08);
  for (let i = 1; i <= steps; i++) { const t = i / steps; if (!canStand(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; }
  return true;
}

export function findPath(from: Point, to: Point): Point[] {
  const cells = astar(nearestFreeCell(from), nearestFreeCell(to));
  if (!cells.length) return [];
  const raw = cells.map(centre);
  if (canStand(to.x, to.y)) raw.push(to);
  const path: Point[] = [];
  let anchor = from, i = 0;
  while (i < raw.length) {
    let far = i;
    for (let j = raw.length - 1; j > i; j--) if (clearLine(anchor, raw[j])) { far = j; break; }
    path.push(raw[far]); anchor = raw[far]; i = far + 1;
  }
  return path;
}
