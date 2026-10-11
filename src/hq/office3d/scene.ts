import * as THREE from "three";
import { HQ } from "../config";
import { BALL_SPOT, COURT, DANCE_FLOOR, ENTRANCE, FLOOR, FURNITURE, POOL, RUGS, SEAT_IDS, WALL_HEIGHT, WALLS, ZONES } from "../data/office";
import type { FurnitureItem } from "../types";

/** The office as a 3D model: floor, rooms, walls and every piece of furniture. Floor (x, y) maps to 3D (x, z). */
export const UNIT = 36; // the flat drawing's height pixels per floor unit
const COLORS = {
  desk: "#ffffff", dark: "#2b3140", soft: "#2aa845", gold: "#f4c21f", pot: "#f1f3f7", green: "#2fb344", shade: "#fff1c2",
  trunk: "#a9794d", wall: "#e9edf4", leaf: "#33b34a", leaf2: "#1e8f35", screen: "#10141c",
};
type M = keyof typeof COLORS;
const cache = new Map<string, THREE.MeshStandardMaterial>();
const material = (color: string, extra?: THREE.MeshStandardMaterialParameters) => {
  const key = color + JSON.stringify(extra ?? {});
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.02, ...extra }));
  return cache.get(key)!;
};

/** A box given the way the flat drawing gives it: footprint on the floor, bottom and top in height pixels. */
function box(parent: THREE.Object3D, x: number, y: number, w: number, h: number, z0: number, z1: number, m: M | string, extra?: THREE.MeshStandardMaterialParameters) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, (z1 - z0) / UNIT, h), material(COLORS[m as M] ?? m, extra));
  mesh.position.set(x + w / 2, (z0 + z1) / 2 / UNIT, y + h / 2);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function ball(parent: THREE.Object3D, x: number, y: number, z: number, r: number, color: string, squash = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material(color));
  mesh.position.set(x, z / UNIT, y); mesh.scale.y = squash; mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function furniture(parent: THREE.Object3D, f: FurnitureItem) {
  const g = new THREE.Group();
  const { x, y, w, h } = f;
  switch (f.kind) {
    case "desk":
      box(g, x + 0.06, y + 0.08, 0.1, h - 0.16, 0, 12, "gold"); box(g, x + w - 0.16, y + 0.08, 0.1, h - 0.16, 0, 12, "gold");
      box(g, x, y, w, h, 12, 15, "desk");
      box(g, x + w / 2 - 0.03, y + 0.12, 0.06, 0.06, 15, 20, "dark"); box(g, x + w / 2 - 0.22, y + 0.12, 0.44, 0.05, 19, 36, "dark");
      box(g, x + w / 2 - 0.19, y + 0.165, 0.38, 0.01, 21, 34, "#1c2a44", { emissive: "#3f8fe6", emissiveIntensity: 0.55 });
      break;
    case "chair":
      box(g, x + w / 2 - 0.04, y + h / 2 - 0.04, 0.08, 0.08, 0, 7, "gold"); box(g, x, y, w, h, 7, 10, "dark"); box(g, x, y + h - 0.07, w, 0.07, 10, 21, "dark");
      break;
    case "plant":
      box(g, x, y, w, h, 0, 10, "pot");
      ball(g, x + w / 2 - 0.08, y + h / 2, 20, 0.16, COLORS.leaf2); ball(g, x + w / 2 + 0.09, y + h / 2 + 0.03, 21, 0.16, COLORS.leaf2); ball(g, x + w / 2, y + h / 2 - 0.02, 29, 0.19, COLORS.leaf);
      break;
    case "tree":
      box(g, x, y, w, h, 0, 9, "pot"); box(g, x + w / 2 - 0.05, y + h / 2 - 0.05, 0.1, 0.1, 9, 34, "trunk");
      ball(g, x + w / 2 - 0.2, y + h / 2, 40, 0.3, COLORS.leaf2); ball(g, x + w / 2 + 0.2, y + h / 2 + 0.05, 42, 0.3, COLORS.leaf2); ball(g, x + w / 2, y + h / 2 - 0.12, 44, 0.3, COLORS.leaf2); ball(g, x + w / 2, y + h / 2, 56, 0.36, COLORS.leaf);
      break;
    case "treadmill":
      box(g, x, y + 0.25, w, h - 0.25, 0, 4, "dark"); box(g, x + 0.06, y + 0.3, w - 0.12, h - 0.35, 4, 4.6, "#555c6b");
      box(g, x + 0.04, y, 0.06, 0.08, 0, 24, "gold"); box(g, x + w - 0.1, y, 0.06, 0.08, 0, 24, "gold"); box(g, x, y, w, 0.1, 22, 27, "dark");
      box(g, x + 0.12, y + 0.1, w - 0.24, 0.01, 23, 26.5, "#1c2a44", { emissive: "#33c447", emissiveIntensity: 0.7 });
      break;
    case "weights":
      box(g, x + 0.1, y + 0.1, w - 0.2, h - 0.2, 0, 9, "dark"); box(g, x, y + h / 2 - 0.03, w, 0.06, 12, 14, "#c9d1dc");
      for (const wx of [x, x + 0.16, x + w - 0.14, x + w - 0.3]) box(g, wx, y + 0.06, 0.12, h - 0.12, 6, 20, wx === x || wx === x + w - 0.14 ? "#e03131" : "dark");
      break;
    case "bag": {
      box(g, x - 0.05, y - 0.05, w + 0.1, h + 0.1, 0, 2, "dark"); box(g, x + w / 2 - 0.03, y + h / 2 - 0.03, 0.06, 0.06, 0, 46, "dark");
      const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.75, 16), material("#e03131")); bag.position.set(x + w / 2, 0.58, y + h / 2); bag.castShadow = true; g.add(bag);
      break;
    }
    case "hoop": {
      const dir = x < 3 ? 1 : -1, cx = x + w / 2;
      box(g, cx - 0.05, y + h / 2 - 0.05, 0.1, 0.1, 0, 66, "dark"); box(g, cx + dir * 0.08 - 0.02, y - 0.1, 0.04, h + 0.2, 60, 84, "#ffffff");
      box(g, cx + dir * 0.1 - 0.005, y + h / 2 - 0.15, 0.01, 0.3, 64, 74, "#e03131");
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 24), material("#ff922b")); ring.rotation.x = Math.PI / 2; ring.position.set(cx + dir * 0.28, 64 / UNIT, y + h / 2); g.add(ring);
      break;
    }
    case "speaker":
      box(g, x, y, w, h, 0, 32, "dark");
      for (const [z, r] of [[22, 0.09], [10, 0.14]] as const) { const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 20), material("#555c6b")); cone.rotation.x = Math.PI / 2; cone.position.set(x + w / 2, z / UNIT, y + h + 0.005); g.add(cone); }
      break;
    case "piano":
      box(g, x, y, w, h - 0.2, 0, 22, "dark"); box(g, x + 0.06, y + h - 0.2, w - 0.12, 0.2, 12, 14.5, "#ffffff");
      for (let k = 0; k < 9; k++) box(g, x + 0.14 + k * ((w - 0.34) / 8), y + h - 0.2, 0.05, 0.11, 14.5, 15.5, "dark").castShadow = false;
      box(g, x + 0.06, y + h - 0.2, 0.07, 0.18, 0, 12, "dark"); box(g, x + w - 0.13, y + h - 0.2, 0.07, 0.18, 0, 12, "dark");
      break;
    case "sofa":
      if (w >= h) { box(g, x, y, w, 0.16, 0, 19, "soft"); box(g, x, y + 0.16, w, h - 0.16, 0, 9, "soft"); box(g, x, y, 0.1, h, 0, 14, "soft"); box(g, x + w - 0.1, y, 0.1, h, 0, 14, "soft"); }
      else { box(g, x + w - 0.16, y, 0.16, h, 0, 19, "soft"); box(g, x, y, w - 0.16, h, 0, 9, "soft"); box(g, x, y, w, 0.1, 0, 14, "soft"); box(g, x, y + h - 0.1, w, 0.1, 0, 14, "soft"); }
      break;
    case "table": box(g, x + w / 2 - 0.2, y + h / 2 - 0.15, 0.4, 0.3, 0, 12, "gold"); box(g, x, y, w, h, 12, 15, "desk"); break;
    case "low-table": box(g, x + 0.05, y + 0.05, w - 0.1, h - 0.1, 0, 5, "gold"); box(g, x, y, w, h, 5, 8, "desk"); break;
    case "counter":
      box(g, x, y, w, h, 0, 19, "dark"); box(g, x - 0.03, y - 0.03, w + 0.06, h + 0.06, 19, 22, "desk");
      box(g, x + 0.2, y + 0.1, 0.5, 0.32, 22, 37, "green"); [1.0, 1.25, 1.5].forEach((dx) => box(g, x + dx, y + 0.2, 0.13, 0.13, 22, 27, "gold"));
      break;
    case "lamp": {
      box(g, x, y, w, h, 0, 2, "gold"); box(g, x + w / 2 - 0.03, y + h / 2 - 0.03, 0.06, 0.06, 2, 36, "gold");
      box(g, x - 0.04, y - 0.04, w + 0.08, h + 0.08, 36, 48, "shade", { emissive: "#ffe89a", emissiveIntensity: 0.9 });
      const glow = new THREE.PointLight("#ffdf8a", 1.6, 3.2, 1.6); glow.position.set(x + w / 2, 42 / UNIT, y + h / 2); g.add(glow);
      break;
    }
    case "arcade":
      box(g, x, y, w, h, 0, 44, "dark"); box(g, x, y, w, h, 44, 50, "gold");
      box(g, x + 0.06, y + h, w - 0.12, 0.01, 22, 40, "#101a3a", { emissive: "#35e6ff", emissiveIntensity: 0.9 });
      box(g, x, y + h, w, 0.13, 13, 17, "green");
      g.userData.arcade = true;
      break;
    case "pingpong":
      box(g, x + 0.1, y + 0.1, 0.1, h - 0.2, 0, 12, "gold"); box(g, x + w - 0.2, y + 0.1, 0.1, h - 0.2, 0, 12, "gold");
      box(g, x, y, w, h, 12, 14.5, "green"); box(g, x + w / 2 - 0.015, y - 0.04, 0.03, h + 0.08, 14.5, 19, "desk"); box(g, x + 0.02, y + h / 2 - 0.01, w - 0.04, 0.02, 14.5, 14.7, "desk");
      break;
    case "foosball":
      box(g, x + 0.08, y + 0.08, 0.1, h - 0.16, 0, 11, "dark"); box(g, x + w - 0.18, y + 0.08, 0.1, h - 0.16, 0, 11, "dark");
      box(g, x, y, w, h, 11, 16, "dark"); box(g, x + 0.06, y + 0.06, w - 0.12, h - 0.12, 16, 16.6, "green");
      [0.25, 0.5, 0.75].forEach((k) => box(g, x + w * k - 0.02, y - 0.12, 0.04, h + 0.24, 18, 19.2, "gold"));
      break;
    case "beanbag": ball(g, x + w / 2, y + h / 2, 7, 0.33, COLORS.gold, 0.6); ball(g, x + w / 2, y + h / 2 - 0.06, 13, 0.22, "#ffd95a", 0.7); break;
    case "stool": box(g, x + w / 2 - 0.04, y + h / 2 - 0.04, 0.08, 0.08, 0, 11, "gold"); box(g, x, y, w, h, 11, 14, "soft"); break;
    case "bed":
      box(g, x, y, w, 0.07, 0, 19, "dark"); box(g, x, y + 0.07, w, h - 0.07, 0, 6, "desk"); box(g, x + 0.04, y + 0.1, w - 0.08, h - 0.14, 6, 10, "pot");
      box(g, x + 0.15, y + 0.16, w - 0.3, 0.24, 10, 13, "gold"); box(g, x + 0.04, y + 0.5, w - 0.08, h - 0.54, 10, 12, "soft");
      break;
    case "shelf": {
      box(g, x, y, w, h, 0, 38, "dark");
      const n = Math.round(w / 0.16), spines = ["#f4c21f", "#33c447", "#6fb4ff", "#ff6b6b"];
      [6, 17, 28].forEach((z, row) => { for (let i = 0; i < n; i++) box(g, x + 0.05 + i * ((w - 0.1) / n), y + h, ((w - 0.1) / n) * 0.8, 0.02, z, z + 8 - ((i + row) % 3), spines[(i + row) % 4]); });
      break;
    }
    case "fridge":
      box(g, x, y, w, h, 0, 42, "pot"); box(g, x + 0.07, y + h, w - 0.14, 0.01, 14, 37, "screen");
      [18, 25, 32].forEach((z) => box(g, x + 0.12, y + h + 0.01, w - 0.24, 0.01, z, z + 2.5, z === 25 ? "#33c447" : "#f4c21f", { emissive: z === 25 ? "#33c447" : "#f4c21f", emissiveIntensity: 0.6 }));
      break;
    case "reception":
      box(g, x, y, w, h, 0, 17, "desk"); box(g, x - 0.04, y - 0.04, w + 0.08, h + 0.08, 17, 19.5, "gold");
      box(g, x + 0.1, y + 0.3, 0.08, 0.4, 19.5, 31, "dark"); box(g, x + 0.34, y + h - 0.4, 0.14, 0.14, 19.5, 25, "green");
      break;
    default: return;
  }
  if (SEAT_IDS.has(f.id)) g.userData.seat = f.id;
  if (f.kind === "treadmill" || f.kind === "weights") g.userData.gym = f.id;
  if (f.kind === "hoop") g.userData.hoop = true;
  parent.add(g);
}

const ZONE_TINT: Record<string, string> = { focus: "#dbe8ff", huddle: "#e2ebf8", cafe: "#ffeccf", lounge: "#ecd3b4", deck: "#c6e9c2", nap: "#e4defb", game: "#22203f", lobby: "#ffffff", gym: "#d9dee8", library: "#f0e2c8", dance: "#2b1f4a", cinema: "#3a3552", court: "#d98a4e", pool: "#f3ead2", plaza: "#f6f1e4", canteen: "#ffe3c2", music: "#f7d6e6" };

function label(text: string, color: string, size = 46): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 96;
  const c = canvas.getContext("2d")!;
  c.font = `700 ${size}px Nunito, system-ui, sans-serif`; c.fillStyle = color; c.textBaseline = "middle";
  c.fillText(text, 8, 50, 496);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

export interface Office { root: THREE.Group; wallX: THREE.Object3D; wallZ: THREE.Object3D }

export function buildOffice(): Office {
  const root = new THREE.Group();
  const { width: W, depth: D } = FLOOR, wallH = WALL_HEIGHT;

  // The slab everything stands on.
  const slab = box(root, 0, 0, W, D, -14, 0, "#eef3f8"); slab.castShadow = false;
  box(root, ENTRANCE.from, D - 0.02, ENTRANCE.to - ENTRANCE.from, 0.06, 0, 1.2, "gold");

  // Room floors and their names.
  for (const zone of ZONES) {
    const { x, y, w, h } = zone.rect;
    const plate = box(root, x + 0.06, y + 0.06, w - 0.12, h - 0.12, 0, 0.5, ZONE_TINT[zone.id] ?? "#ffffff"); plate.castShadow = false;
    const name = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: label(`${zone.key}  ${zone.name}`, ["game", "dance", "cinema"].includes(zone.id) ? "#f4f0ff" : "#4a5568"), transparent: true, depthWrite: false }));
    name.rotation.x = -Math.PI / 2; name.position.set(x + 1.55, 0.03, y + h - 0.38);
    root.add(name);
  }
  // Lounge planks, deck boards and café tiles.
  for (let px = 0.5; px < 6; px += 0.5) { const p = box(root, px - 0.008, 5.1, 0.016, 4.0, 0.5, 0.7, "#b98a5a"); p.castShadow = false; }
  for (let py = 5.5; py < 9.3; py += 0.5) { const p = box(root, 12.1, py - 0.008, 5.8, 0.016, 0.5, 0.7, "#7bbf78"); p.castShadow = false; }
  for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) { const t = box(root, 11.6 + i * 0.7, 0.08 + j * 0.68, 0.7, 0.68, 0.5, 0.7, "#f6d9ab"); t.castShadow = false; }
  for (const gy of [10.4, 11.4, 12.4, 13.4]) { const l = box(root, 0.1, gy - 0.01, 5.8, 0.02, 0.5, 0.75, "#35e6ff", { emissive: "#35e6ff", emissiveIntensity: 0.8 }); l.castShadow = false; }
  for (const gx of [1, 2, 3, 4, 5]) { const l = box(root, gx - 0.01, 9.9, 0.02, 4.0, 0.5, 0.75, "#35e6ff", { emissive: "#35e6ff", emissiveIntensity: 0.8 }); l.castShadow = false; }
  // Basketball court paint and the swimming pool.
  { const c = COURT, line = (x: number, y: number, w: number, h: number) => { box(root, x, y, w, h, 0.5, 0.9, "#ffffff").castShadow = false; };
    box(root, c.x, c.y, c.w, c.h, 0.5, 0.7, "#c8743a").castShadow = false;
    line(c.x, c.y, c.w, 0.05); line(c.x, c.y + c.h - 0.05, c.w, 0.05); line(c.x, c.y, 0.05, c.h); line(c.x + c.w - 0.05, c.y, 0.05, c.h); line(c.x + c.w / 2 - 0.025, c.y, 0.05, c.h);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.025, 6, 40), material("#ffffff")); ring.rotation.x = Math.PI / 2; ring.position.set(c.x + c.w / 2, 0.025, c.y + c.h / 2); root.add(ring);
    for (const kx of [c.x, c.x + c.w - 1.4]) box(root, kx, c.y + c.h / 2 - 0.9, 1.4, 1.8, 0.7, 0.85, "#e8a36b").castShadow = false;
    for (const [bx, by] of [[0, 0], [0.32, 0.1], [0.12, 0.32]]) { const b = ball(root, BALL_SPOT.x + bx, BALL_SPOT.y + by, 5.6, 0.14, "#ff922b"); b.userData.ball = true; }
    const p = POOL;
    box(root, p.x - 0.25, p.y - 0.25, p.w + 0.5, p.h + 0.5, 0.5, 1.4, "#f1f3f5").castShadow = false;
    box(root, p.x, p.y, p.w, p.h, 1.4, 1.7, "#4dabf7", { roughness: 0.1, metalness: 0.35, emissive: "#1c7ed6", emissiveIntensity: 0.25 }).castShadow = false;
    for (let i = 1; i < 4; i++) box(root, p.x + (p.w / 4) * i - 0.02, p.y + 0.1, 0.04, p.h - 0.2, 1.7, 1.85, i % 2 ? "#ffffff" : "#e03131").castShadow = false;
    box(root, p.x + p.w - 0.1, p.y + 1.0, 0.5, 0.05, 0, 22, "#c9d1dc"); box(root, p.x + p.w - 0.1, p.y + 1.5, 0.5, 0.05, 0, 22, "#c9d1dc");
  }
  // Cinema screen on the back wall, and the light-up dance floor with a disco ball.
  box(root, 27.3, 7.06, 5.9, 0.06, 16, 72, "screen").castShadow = false;
  box(root, 27.45, 7.12, 5.6, 0.02, 20, 68, "#16324f", { emissive: "#6fb4ff", emissiveIntensity: 0.75 }).castShadow = false;
  { const d = DANCE_FLOOR, tints = ["#ff4fa3", "#35c9ff", "#ffd43b", "#7ee08f"], n = 6, m = 5;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const c = tints[(i * 3 + j * 5) % 4]; box(root, d.x + (d.w / n) * i + 0.03, d.y + (d.h / m) * j + 0.03, d.w / n - 0.06, d.h / m - 0.06, 0.5, 1, c, { emissive: c, emissiveIntensity: 0.55 }).castShadow = false; }
    const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), material("#e9edf4", { metalness: 0.9, roughness: 0.15, flatShading: true })); disco.position.set(d.x + d.w / 2, 2.1, d.y + d.h / 2); root.add(disco);
    box(root, d.x + d.w / 2 - 0.01, d.y + d.h / 2 - 0.01, 0.02, 0.02, 86, 100, "dark").castShadow = false;
  }
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.02, 48), material("#fbe9a8")); plaza.position.set(9, 0.025, 7.85); plaza.receiveShadow = true; root.add(plaza);
  for (const r of RUGS) { const rug = box(root, r.x, r.y, r.w, r.h, 0.5, 1.4, "#22a03c"); rug.castShadow = false; const edge = box(root, r.x + 0.1, r.y + 0.1, r.w - 0.2, r.h - 0.2, 1.4, 1.6, "#35b850"); edge.castShadow = false; }

  // The two outer walls. Each hides itself when the camera swings round to its side.
  const wallX = new THREE.Group(), wallZ = new THREE.Group();
  root.add(wallX, wallZ);
  box(wallX, -0.14, 0, 0.14, D, -14, wallH, "#e6ebf3"); box(wallZ, -0.14, -0.14, W + 0.14, 0.14, -14, wallH, "#f4f7fb");
  [["#17b02a", 8], ["#1565c0", 12], ["#f4c21f", 16]].forEach(([color, z]) => {
    box(wallX, 0, 0, 0.02, D, Number(z) - 1.5, Number(z) + 1.5, String(color)).castShadow = false;
    box(wallZ, 0, 0, W, 0.02, Number(z) - 1.5, Number(z) + 1.5, String(color)).castShadow = false;
  });
  box(wallX, -0.16, 0, 0.18, D, wallH, wallH + 2, "gold"); box(wallZ, -0.16, -0.16, W + 0.16, 0.18, wallH, wallH + 2, "gold");
  // Windows, screens and the name sign.
  const glow = { emissive: "#bfe3ff", emissiveIntensity: 0.55 };
  box(wallZ, 7.5, 0.0, 3.0, 0.03, 50, 74, "#bfe3ff", glow).castShadow = false;
  for (const [a, b] of [[0.8, 3.4], [5.4, 8.6]]) box(wallX, 0, a, 0.03, b - a, 32, 70, "#bfe3ff", glow).castShadow = false;
  box(wallZ, 12.4, 0, 3.6, 0.04, 30, 70, "screen").castShadow = false;
  [60, 53, 46, 39].forEach((z, i) => box(wallZ, 12.8, 0.04, [2.2, 2.6, 1.8, 2.3][i], 0.01, z, z + 2.8, i === 0 ? "#f4c21f" : "#6fb4ff", { emissive: i === 0 ? "#f4c21f" : "#6fb4ff", emissiveIntensity: 0.7 }).castShadow = false);
  const scoreboard = box(wallX, 0, 10.4, 0.04, 3.0, 28, 70, "screen"); scoreboard.castShadow = false; scoreboard.userData.arcade = true;
  [0, 1, 2, 3, 4].forEach((i) => box(wallX, 0.04, 12.8 - i * 0.5, 0.01, 0.35, 35, 41 + [20, 12, 24, 9, 16][i], i % 2 ? "#33c447" : "#f4c21f", { emissive: i % 2 ? "#33c447" : "#f4c21f", emissiveIntensity: 0.7 }).castShadow = false);
  [["#17b02a", 5.6], ["#f4c21f", 6.5], ["#1565c0", 7.4]].forEach(([color, y]) => box(wallX, 0, Number(y) + 3.3, 0.03, 0.55, 20, 50, String(color)).castShadow = false);
  box(wallZ, 0.4, 0, 5.7, 0.03, 36, 68, "#ffffff").castShadow = false;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.8), new THREE.MeshBasicMaterial({ map: label(HQ.name, "#10141c", 38), transparent: true }));
  sign.position.set(3.25 + 0.2, 52 / UNIT, 0.05); wallZ.add(sign);

  // Inner walls: low solid ones with a gold cap, and glass round the Collaboration Room.
  for (const wall of WALLS) {
    const along = wall.to - wall.from, t = 0.1;
    const [x, y, w, h] = wall.axis === "x" ? [wall.at - t / 2, wall.from, t, along] : [wall.from, wall.at - t / 2, along, t];
    if (wall.solid) { box(root, x, y, w, h, 0, wall.height, "wall"); box(root, x - 0.015, y - 0.015, w + 0.03, h + 0.03, wall.height, wall.height + 1.4, "gold"); }
    else box(root, x + (wall.axis === "x" ? 0.03 : 0), y + (wall.axis === "y" ? 0.03 : 0), wall.axis === "x" ? 0.04 : w, wall.axis === "y" ? 0.04 : h, 0, wall.height, "#8fc1ff", { transparent: true, opacity: 0.28, roughness: 0.1 }).castShadow = false;
  }

  for (const item of FURNITURE) furniture(root, item);

  // Outside: a lawn, a path to the door, trees and bushes, so the office sits in a place.
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(44, 44, 0.2, 72), material("#bfe3a8"));
  lawn.position.set(W / 2, -0.5, D / 2); lawn.receiveShadow = true; root.add(lawn);
  box(root, ENTRANCE.from - 0.2, D, ENTRANCE.to - ENTRANCE.from + 0.4, 12, -14.5, -13.8, "#e8dcc4").castShadow = false;
  const outside: [number, number][] = [];
  for (let tx = -3; tx <= W + 3; tx += 5.5) if (Math.abs(tx - W / 2) > 3) outside.push([tx + (tx % 2), D + 2.5 + ((tx * 7) % 3)]);
  for (let ty = 1; ty <= D; ty += 5) outside.push([W + 2.5 + (ty % 2), ty]);
  outside.push([-4, D + 6], [W / 2 + 6, D + 8], [W / 2 - 7, D + 7.5], [W + 5, D + 5]);
  for (const [tx, ty] of outside) {
    const g = new THREE.Group(); g.position.y = -14 / UNIT; root.add(g);
    box(g, tx - 0.08, ty - 0.08, 0.16, 0.16, 0, 34, "trunk");
    ball(g, tx, ty, 54, 0.75, COLORS.leaf); ball(g, tx - 0.45, ty + 0.2, 42, 0.5, COLORS.leaf2); ball(g, tx + 0.45, ty - 0.15, 44, 0.52, COLORS.leaf2);
  }
  for (let bx = 1.5; bx < W; bx += 3.2) if (Math.abs(bx - W / 2) > 1.6) { const b = ball(root, bx, D + 0.8, -6, 0.55, COLORS.leaf2, 0.7); b.castShadow = true; }
  for (let by = 2; by < D; by += 3.5) { const b = ball(root, W + 0.9, by, -6, 0.55, COLORS.leaf2, 0.7); b.castShadow = true; }
  ["#ff4fa3", "#ffd43b", "#ffffff", "#ff922b"].forEach((color, i) => { for (let k = 0; k < 5; k++) ball(root, ENTRANCE.from - 1.7 + i * 0.25 + k * 0.05, D + 0.5 + (k % 2) * 0.25 + i * 0.1, -11, 0.07, color); });

  // Inside: hanging lights, a pond on the Garden Deck, a TV, a whiteboard, a clock and a neon arcade sign.
  for (const [lx, ly, color] of [[2.6, 2.1, "#fff1c2"], [9, 2, "#fff1c2"], [14.6, 2.1, "#ffd9a0"], [3, 7, "#ffd9a0"], [9, 9.5, "#fff1c2"], [15, 12, "#d6c9ff"], [22, 3, "#fff1c2"], [30, 3, "#ffd9a0"], [17, 17.5, "#fff1c2"], [24.6, 18, "#ffd9a0"], [31, 18, "#ffb3d9"]] as const) {
    box(root, lx - 0.01, ly - 0.01, 0.02, 0.02, 62, 86, "dark").castShadow = false;
    const bulb = ball(root, lx, ly, 60, 0.16, color); bulb.castShadow = false;
    bulb.material = material(color, { emissive: color, emissiveIntensity: 1.1 });
  }
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.04, 40), material("#74c0fc", { roughness: 0.15, metalness: 0.3 }));
  pond.position.set(16.3, 0.03, 8.3); root.add(pond);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ball(root, 16.3 + Math.cos(a) * 0.82, 8.3 + Math.sin(a) * 0.82, 2, 0.11, "#adb5bd", 0.6); }
  ball(root, 16.1, 8.2, 2.2, 0.16, "#2f9e44", 0.15); ball(root, 16.55, 8.5, 2.2, 0.12, "#2f9e44", 0.15);
  box(wallX, 0.02, 5.5, 0.05, 1.9, 22, 52, "screen").castShadow = false;
  box(wallX, 0.07, 5.6, 0.01, 1.7, 25, 49, "#16324f", { emissive: "#3f8fe6", emissiveIntensity: 0.6 }).castShadow = false;
  box(wallZ, 3.0, 0.02, 2.4, 0.04, 14, 34, "#ffffff").castShadow = false; box(wallZ, 2.95, 0.0, 2.5, 0.03, 13, 35, "dark").castShadow = false;
  [["#e03131", 3.2, 28, 0.9], ["#1565c0", 3.2, 23, 1.4], ["#2f9e44", 3.2, 18, 0.7]].forEach(([c, lx, z, len]) => box(wallZ, Number(lx), 0.06, Number(len), 0.01, Number(z), Number(z) + 1.2, String(c)).castShadow = false);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 32), material("#ffffff")); clock.rotation.x = Math.PI / 2; clock.position.set(11.7, 58 / UNIT, 0.05); wallZ.add(clock);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 32), material(COLORS.dark)); rim.position.copy(clock.position); wallZ.add(rim);
  box(wallZ, 11.69, 0.08, 0.02, 0.01, 58, 67, "dark").castShadow = false; box(wallZ, 11.7, 0.08, 0.18, 0.01, 57.5, 58.5, "dark").castShadow = false;
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: label("★ ARCADE ★", "#ff4fd8", 60), transparent: true }));
  neon.rotation.y = Math.PI / 2; neon.position.set(0.06, 78 / UNIT - 0.1, 11.9); wallX.add(neon);
  return { root, wallX, wallZ };
}
