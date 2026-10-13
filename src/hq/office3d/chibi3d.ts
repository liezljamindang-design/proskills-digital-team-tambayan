import * as THREE from "three";
import type { Act, Look, Mood } from "../types";
import { drinkOf } from "../types";

/**
 * A chibi as a small 3D toy figure, built from simple shapes. The face is
 * painted onto the head, so every reaction is just a different painting.
 */
const INK = "#2b2233", GOLD = "#f4c21f";
const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, ...extra });

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Paints the face. The front of the head is a quarter of the way along the picture. */
function paintFace(look: Look, act: Act | undefined, fit: string): THREE.CanvasTexture {
  const W = 512, H = 256, cx = W * 0.25, cy = H * 0.53;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.fillStyle = look.skin; c.fillRect(0, 0, W, H);
  const mood: Mood | undefined = act?.mood, asleep = act?.pose === "sleep";
  const eye = 21; // half the distance between the eyes
  const stroke = (width: number, color = INK) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round"; };
  const arc = (x: number, y: number, up: boolean, r = 9) => { c.beginPath(); c.arc(x, y + (up ? 5 : -5), r, up ? Math.PI * 1.15 : Math.PI * 0.15, up ? Math.PI * 1.85 : Math.PI * 0.85); c.stroke(); };
  const openEyes = (dx = 0, dy = 0) => {
    for (const s of [-1, 1]) {
      c.fillStyle = INK; c.beginPath(); c.ellipse(cx + s * eye + dx, cy + dy, 7.5, 11, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(cx + s * eye + dx + 2.5, cy + dy - 4.5, 3, 0, Math.PI * 2); c.fill();
    }
  };
  // Cheeks
  c.fillStyle = mood === "shy" ? "rgba(240,101,149,0.8)" : "rgba(242,155,176,0.55)";
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * 36, cy + 16, mood === "shy" ? 13 : 10, 6.5, 0, 0, Math.PI * 2); c.fill(); }

  // Eyes
  stroke(4);
  if (asleep) { arc(cx - eye, cy, false); arc(cx + eye, cy, false); }
  else if (mood === "happy" || mood === "dance") { arc(cx - eye, cy, true); arc(cx + eye, cy, true); }
  else if (mood === "laugh") { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * (eye + 9), cy - 8); c.lineTo(cx + s * (eye - 7), cy); c.lineTo(cx + s * (eye + 9), cy + 8); c.stroke(); } }
  else if (mood === "love") {
    c.fillStyle = "#e64980";
    for (const s of [-1, 1]) { const x = cx + s * eye, y = cy + 2; c.beginPath(); c.moveTo(x, y + 9); c.bezierCurveTo(x - 16, y - 3, x - 7, y - 15, x, y - 5); c.bezierCurveTo(x + 7, y - 15, x + 16, y - 3, x, y + 9); c.fill(); }
  } else if (mood === "wow") {
    for (const s of [-1, 1]) { c.fillStyle = "#ffffff"; c.beginPath(); c.arc(cx + s * eye, cy, 11, 0, Math.PI * 2); c.fill(); stroke(2.5); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(cx + s * eye, cy, 5, 0, Math.PI * 2); c.fill(); }
  } else if (mood === "sleepy") { stroke(4); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * eye - 8, cy + 1); c.lineTo(cx + s * eye + 8, cy + 1); c.stroke(); } }
  else if (mood === "cry") {
    arc(cx - eye, cy - 2, false); arc(cx + eye, cy - 2, false);
    c.fillStyle = "#4dabf7"; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * eye, cy + 20, 4.5, 9, 0, 0, Math.PI * 2); c.fill(); }
  } else if (mood === "think") openEyes(3, -3);
  else openEyes();
  if (mood === "angry" || mood === "think") { stroke(4.5); c.beginPath(); c.moveTo(cx - eye - 11, cy - 22); c.lineTo(cx - eye + 9, cy - (mood === "angry" ? 14 : 22)); if (mood === "angry") { c.moveTo(cx + eye + 11, cy - 22); c.lineTo(cx + eye - 9, cy - 14); } c.stroke(); }

  // Mouth
  const my = cy + 27; stroke(3.5, "#9a4b55"); c.fillStyle = "#9a4b55";
  if (mood === "happy" || mood === "dance" || mood === "love") { c.beginPath(); c.moveTo(cx - 10, my - 3); c.quadraticCurveTo(cx, my + 14, cx + 10, my - 3); c.closePath(); c.fill(); }
  else if (mood === "laugh") { c.beginPath(); c.moveTo(cx - 14, my - 5); c.quadraticCurveTo(cx, my + 20, cx + 14, my - 5); c.closePath(); c.fill(); }
  else if (mood === "wow" || mood === "sleepy") { c.beginPath(); c.ellipse(cx, my + 2, mood === "wow" ? 6 : 4.5, mood === "wow" ? 8 : 5.5, 0, 0, Math.PI * 2); c.fill(); }
  else if (mood === "angry" || mood === "cry") { c.beginPath(); c.moveTo(cx - 8, my + 4); c.quadraticCurveTo(cx, my - 5, cx + 8, my + 4); c.stroke(); }
  else if (mood === "cool") { c.beginPath(); c.moveTo(cx - 5, my); c.quadraticCurveTo(cx + 4, my + 5, cx + 12, my - 4); c.stroke(); }
  else if (mood === "think") { c.beginPath(); c.moveTo(cx, my + 1); c.lineTo(cx + 11, my + 1); c.stroke(); }
  else { c.beginPath(); c.moveTo(cx - 7, my - 2); c.quadraticCurveTo(cx, my + 5, cx + 7, my - 2); c.stroke(); }

  // Glasses and shades sit on the face.
  const shades = fit === "cool" || mood === "cool";
  if (shades) { c.fillStyle = "#111318"; for (const s of [-1, 1]) { c.beginPath(); c.roundRect(cx + s * eye - 15, cy - 11, 30, 19, 6); c.fill(); } stroke(3.5, "#111318"); c.beginPath(); c.moveTo(cx - 6, cy - 5); c.lineTo(cx + 6, cy - 5); c.stroke(); }
  else if (fit === "nerd" || look.accessory === "glasses") { stroke(fit === "nerd" ? 4.5 : 3); for (const s of [-1, 1]) { c.beginPath(); if (fit === "nerd") c.roundRect(cx + s * eye - 14, cy - 13, 28, 25, 5); else c.arc(cx + s * eye, cy, 14, 0, Math.PI * 2); c.stroke(); } c.beginPath(); c.moveTo(cx - 7, cy - 2); c.lineTo(cx + 7, cy - 2); c.stroke(); }
  else if (fit === "funk") { c.fillStyle = "rgba(255,79,163,0.5)"; stroke(3, "#c2255c"); for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * eye, cy, 14, 0, Math.PI * 2); c.fill(); c.stroke(); } }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface ChibiParts { inner: THREE.Group; legL: THREE.Object3D; legR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D; pose?: "sit" | "sleep" }

function hat(parent: THREE.Object3D, id: string | undefined, top: number) {
  if (id === "party") { const cone = add(parent, new THREE.ConeGeometry(0.13, 0.34, 20), mat("#ff4fa3"), 0.05, top + 0.12, 0); cone.rotation.z = -0.15; add(parent, new THREE.SphereGeometry(0.04, 12, 8), mat("#ffd43b"), 0.08, top + 0.3, 0); }
  else if (id === "cap") { add(parent, new THREE.SphereGeometry(0.365, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat("#1565c0"), 0, top - 0.33, 0); const brim = add(parent, new THREE.BoxGeometry(0.34, 0.03, 0.26), mat("#0d4a94"), 0, top - 0.17, 0.36); brim.rotation.x = 0.15; }
  else if (id === "beanie") { add(parent, new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), mat("#e03131"), 0, top - 0.33, 0); add(parent, new THREE.TorusGeometry(0.34, 0.045, 8, 28), mat("#ffffff"), 0, top - 0.26, 0).rotation.x = Math.PI / 2; add(parent, new THREE.SphereGeometry(0.07, 12, 8), mat("#ffffff"), 0, top + 0.07, 0); }
  else if (id === "ears") { for (const s of [-1, 1]) { const ear = add(parent, new THREE.ConeGeometry(0.1, 0.2, 4), mat("#2a2230"), s * 0.2, top + 0.02, 0); ear.rotation.z = -s * 0.25; add(parent, new THREE.ConeGeometry(0.05, 0.11, 4), mat("#f29bb0"), s * 0.2, top + 0.0, 0.04).rotation.z = -s * 0.25; } }
  else if (id === "flowers") { ["#ff4fa3", "#ffd43b", "#ffffff", "#b197fc", "#ff922b", "#35c9ff", "#ff4fa3", "#ffd43b"].forEach((color, i, all) => { const a = (i / all.length) * Math.PI * 2; add(parent, new THREE.SphereGeometry(0.06, 10, 8), mat(color), Math.cos(a) * 0.31, top - 0.16, Math.sin(a) * 0.31); }); }
  else if (id === "wizard") { add(parent, new THREE.CylinderGeometry(0.45, 0.45, 0.03, 28), mat("#5f3dc4"), 0, top - 0.1, 0); add(parent, new THREE.ConeGeometry(0.25, 0.6, 24), mat("#6741d9"), 0, top + 0.2, 0).rotation.z = 0.08; add(parent, new THREE.SphereGeometry(0.04, 8, 6), mat("#ffd43b", { emissive: "#ffd43b", emissiveIntensity: 0.6 }), 0.02, top + 0.2, 0.2); }
  else if (id === "halo") { add(parent, new THREE.TorusGeometry(0.2, 0.03, 10, 32), mat("#ffd43b", { emissive: "#ffd43b", emissiveIntensity: 0.9 }), 0, top + 0.14, 0).rotation.x = Math.PI / 2; }
}

function pet(parent: THREE.Object3D, id: string | undefined) {
  if (!id) return;
  const g = new THREE.Group(); g.position.set(0.5, 0, 0.12); g.name = "pet"; parent.add(g);
  const colors: Record<string, [string, string]> = { duck: ["#ffd43b", "#f08c00"], cat: ["#f59f00", "#f08c00"], dog: ["#c98f6a", "#8d5b3e"], robot: ["#adb5bd", "#35c9ff"] };
  const [main, accent] = colors[id] ?? colors.cat;
  if (id === "robot") {
    add(g, new THREE.BoxGeometry(0.22, 0.2, 0.18), mat(main, { metalness: 0.6, roughness: 0.35 }), 0, 0.12, 0);
    add(g, new THREE.BoxGeometry(0.2, 0.16, 0.16), mat("#ced4da", { metalness: 0.6, roughness: 0.35 }), 0, 0.31, 0);
    for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.028, 8, 6), mat(accent, { emissive: accent, emissiveIntensity: 1 }), s * 0.05, 0.32, 0.085);
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.1), mat("#868e96"), 0, 0.44, 0); add(g, new THREE.SphereGeometry(0.03, 8, 6), mat("#e03131", { emissive: "#e03131", emissiveIntensity: 0.8 }), 0, 0.5, 0);
    return;
  }
  add(g, new THREE.SphereGeometry(0.14, 16, 12), mat(main), 0, 0.13, 0).scale.set(1, 0.85, 1.2);
  add(g, new THREE.SphereGeometry(0.1, 16, 12), mat(main), 0, 0.28, 0.12);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.016, 6, 6), mat(INK), s * 0.04, 0.3, 0.21);
  if (id === "duck") add(g, new THREE.ConeGeometry(0.035, 0.08, 8), mat(accent), 0, 0.27, 0.24).rotation.x = Math.PI / 2;
  else if (id === "cat") { for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.04, 0.08, 4), mat(main), s * 0.06, 0.38, 0.11); add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.22), mat(accent), 0, 0.2, -0.17).rotation.x = -0.6; }
  else { for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.045, 8, 6), mat(accent), s * 0.1, 0.27, 0.11).scale.set(0.6, 1.3, 0.8); add(g, new THREE.SphereGeometry(0.02, 6, 6), mat(INK), 0, 0.26, 0.22); add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.14), mat(accent), 0, 0.22, -0.17).rotation.x = -0.8; }
}

/** Builds one chibi. Rebuild it whenever the person's look or what they are doing changes. */
export function buildChibi(look: Look, act?: Act): THREE.Group {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const fit = look.fit ?? "basic";
  const skin = mat(look.skin), hair = mat(look.hair, { roughness: 0.55 });
  const bodyColor = fit === "formal" ? "#1f2a44" : fit === "punk" ? "#16161d" : fit === "cool" ? "#1b1d26" : fit === "nerd" ? "#7a4a36" : look.outfit;
  const sleeveColor = fit === "nerd" ? look.outfit : bodyColor;
  const cloth = mat(bodyColor), sleeve = mat(sleeveColor);
  const sitting = act?.pose === "sit", asleep = act?.pose === "sleep";

  // Legs and shoes hang from a hip joint so they can swing.
  const leg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.09, 0.27, 0); inner.add(hip);
    add(hip, new THREE.CylinderGeometry(0.07, 0.065, 0.22, 12), look.bottoms === "pants" ? mat("#2a2f45") : skin, 0, -0.12, 0);
    add(hip, new THREE.SphereGeometry(0.085, 14, 10), mat(INK), 0, -0.23, 0.03).scale.set(1, 0.6, 1.35);
    return hip;
  };
  const legL = leg(-1), legR = leg(1);
  if (look.bottoms === "skirt") add(inner, new THREE.CylinderGeometry(0.19, 0.27, 0.13, 20), cloth, 0, 0.27, 0);

  // Body
  add(inner, new THREE.CylinderGeometry(0.16, 0.22, 0.34, 20), cloth, 0, 0.44, 0);
  add(inner, new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 0, 0.61, 0);
  add(inner, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), skin, 0, 0.64, 0);

  const arm = (side: number) => {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.2, 0.58, 0); shoulder.rotation.z = side * 0.28; inner.add(shoulder);
    add(shoulder, new THREE.CapsuleGeometry(0.052, 0.16, 6, 10), sleeve, 0, -0.11, 0);
    add(shoulder, new THREE.SphereGeometry(0.058, 12, 10), skin, 0, -0.25, 0);
    return shoulder;
  };
  const armL = arm(-1), armR = arm(1);

  // Head, with the face painted on. The head is turned so the painting faces forward.
  const headY = 0.97, R = 0.34;
  const face = paintFace(look, act, fit);
  const head = add(inner, new THREE.SphereGeometry(R, 32, 24), new THREE.MeshStandardMaterial({ map: face, roughness: 0.75 }), 0, headY, 0);
  head.userData.face = face;
  for (const s of [-1, 1]) add(inner, new THREE.SphereGeometry(0.06, 10, 8), skin, s * 0.33, headY - 0.02, 0);

  // Hair: a cap tipped back to leave the face clear, plus whatever the style adds.
  const cap = add(inner, new THREE.SphereGeometry(R + 0.022, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, headY, 0);
  cap.rotation.x = -0.42;
  const back = add(inner, new THREE.SphereGeometry(R + 0.02, 32, 16, 0, Math.PI, 0, Math.PI * 0.78), hair, 0, headY, 0);
  back.rotation.y = Math.PI; // the back half of the head
  const fringe = add(inner, new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, look.style === "swept" ? 0.08 : 0, headY + 0.2, 0.2);
  fringe.scale.set(look.style === "swept" ? 1.5 : 1.45, 0.5, 0.7); fringe.rotation.x = 0.5;
  switch (look.style) {
    case "bob": add(inner, new THREE.SphereGeometry(R + 0.05, 24, 14, 0, Math.PI, 0, Math.PI * 0.95), hair, 0, headY - 0.03, 0).rotation.y = Math.PI; break;
    case "long-straight": case "long-wavy": {
      const fall = add(inner, new THREE.CapsuleGeometry(0.25, 0.34, 6, 14), hair, 0, headY - 0.3, -0.16); fall.scale.set(1.15, 1, 0.55);
      if (look.style === "long-wavy") for (const s of [-1, 1]) add(inner, new THREE.SphereGeometry(0.11, 12, 10), hair, s * 0.27, headY - 0.38, -0.02);
      break;
    }
    case "bun": add(inner, new THREE.SphereGeometry(0.15, 16, 12), hair, 0, headY + 0.37, -0.08); break;
    case "ponytail": add(inner, new THREE.SphereGeometry(0.13, 14, 10), hair, 0, headY + 0.08, -0.4); add(inner, new THREE.SphereGeometry(0.1, 14, 10), hair, 0, headY - 0.1, -0.48); add(inner, new THREE.SphereGeometry(0.07, 12, 8), hair, 0, headY - 0.26, -0.5); break;
    case "pigtails": for (const s of [-1, 1]) { add(inner, new THREE.SphereGeometry(0.13, 14, 10), hair, s * 0.4, headY - 0.02, -0.08); add(inner, new THREE.SphereGeometry(0.1, 14, 10), hair, s * 0.43, headY - 0.2, -0.08); } break;
    default: break;
  }

  // Clothing styles
  const top = headY + R;
  if (fit === "nerd") { add(inner, new THREE.BoxGeometry(0.13, 0.05, 0.03), mat("#e03131"), 0, 0.62, 0.15); }
  else if (fit === "funk") { ["#ff4fa3", "#ffd43b", "#35c9ff"].forEach((color, i) => { add(inner, new THREE.TorusGeometry(0.2 - i * 0.012, 0.028, 8, 28), mat(color), 0, 0.36 + i * 0.09, 0).rotation.x = Math.PI / 2; }); }
  else if (fit === "cool") { add(inner, new THREE.BoxGeometry(0.1, 0.3, 0.02), mat(look.outfit), 0, 0.46, 0.185); }
  else if (fit === "sporty") { for (const s of [-1, 1]) add(inner, new THREE.BoxGeometry(0.03, 0.3, 0.02), mat("#ffffff"), s * 0.13, 0.45, 0.165); add(inner, new THREE.TorusGeometry(R + 0.025, 0.035, 8, 30), mat("#e03131"), 0, headY + 0.14, 0).rotation.x = Math.PI / 2 - 0.2; }
  else if (fit === "formal") { add(inner, new THREE.BoxGeometry(0.12, 0.3, 0.02), mat("#ffffff"), 0, 0.47, 0.18); add(inner, new THREE.BoxGeometry(0.05, 0.24, 0.025), mat(look.outfit), 0, 0.46, 0.195); }
  else if (fit === "hoodie") { add(inner, new THREE.TorusGeometry(0.17, 0.07, 10, 26), cloth, 0, 0.64, -0.04).rotation.x = Math.PI / 2 - 0.3; add(inner, new THREE.BoxGeometry(0.2, 0.09, 0.03), mat("#000000", { transparent: true, opacity: 0.18 }), 0, 0.36, 0.2); }
  else if (fit === "punk") { for (let i = 0; i < 5; i++) add(inner, new THREE.ConeGeometry(0.05, 0.2, 6), mat("#e64980"), 0, top + 0.03 - Math.abs(i - 2) * 0.03, 0.16 - i * 0.09); add(inner, new THREE.TorusGeometry(0.09, 0.02, 6, 18), mat("#c9ccd6", { metalness: 0.8, roughness: 0.3 }), 0, 0.66, 0).rotation.x = Math.PI / 2; }
  else if (fit === "royal") {
    add(inner, new THREE.CylinderGeometry(0.19, 0.16, 0.1, 12, 1, true), mat(GOLD, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), 0, top + 0.0, 0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(inner, new THREE.ConeGeometry(0.04, 0.1, 4), mat(GOLD, { metalness: 0.7, roughness: 0.3 }), Math.cos(a) * 0.18, top + 0.09, Math.sin(a) * 0.18); }
    add(inner, new THREE.TorusGeometry(0.2, 0.025, 8, 28), mat(GOLD, { metalness: 0.7, roughness: 0.3 }), 0, 0.46, 0).rotation.set(Math.PI / 2, 0.5, 0);
  } else add(inner, new THREE.ConeGeometry(0.07, 0.1, 3), mat("#ffffff"), 0, 0.58, 0.14).rotation.set(Math.PI, 0, 0);

  // Accessories picked in the avatar editor
  if (look.accessory === "headset") { add(inner, new THREE.TorusGeometry(R + 0.03, 0.02, 6, 24, Math.PI), mat(GOLD), 0, headY + 0.02, 0); add(inner, new THREE.BoxGeometry(0.05, 0.12, 0.1), mat(INK), -(R + 0.03), headY - 0.02, 0); add(inner, new THREE.SphereGeometry(0.03, 8, 6), mat(INK), -0.2, headY - 0.2, 0.26); }
  else if (look.accessory === "headphones") { add(inner, new THREE.TorusGeometry(0.15, 0.03, 8, 22), mat(GOLD), 0, 0.66, 0.02).rotation.x = Math.PI / 2 - 0.25; }
  else if (look.accessory === "bow") { for (const s of [-1, 1]) add(inner, new THREE.ConeGeometry(0.07, 0.12, 4), mat(GOLD), s * 0.07, top - 0.03, 0.12).rotation.z = s * Math.PI / 2; }
  else if (look.accessory === "clip") add(inner, new THREE.BoxGeometry(0.1, 0.03, 0.03), mat(GOLD), 0.2, headY + 0.2, 0.25);

  if (fit !== "royal" && fit !== "punk") hat(inner, look.hat, top);
  else hat(inner, look.hat === "halo" ? "halo" : undefined, top + 0.12);

  // In the hands
  if (act?.drink && !asleep) { const cup = add(armR, new THREE.CylinderGeometry(0.05, 0.04, 0.11, 12), mat(drinkOf(act.drink)!.cup), 0.02, -0.27, 0.07); cup.name = "cup"; }
  // Using the phone: held up in both hands in front of the face, screen glowing onto it.
  if (act?.phone && !asleep) {
    const phone = new THREE.Group(); phone.name = "phone"; phone.position.set(0, 0.74, 0.31); phone.rotation.x = 0.5; inner.add(phone);
    add(phone, new THREE.BoxGeometry(0.1, 0.17, 0.018), mat("#1b1d26"), 0, 0, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.084, 0.148), new THREE.MeshBasicMaterial({ color: "#bfe3ff" }));
    screen.name = "screen"; screen.rotation.y = Math.PI; screen.position.z = -0.0095; phone.add(screen);
    // The screen's light on the face: a soft blue wash over the lower face.
    const glow = new THREE.Mesh(new THREE.SphereGeometry(R + 0.006, 24, 16, Math.PI / 2 - 0.85, 1.7, 1.05, 1.0), new THREE.MeshBasicMaterial({ color: "#8cc8ff", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.name = "phoneGlow"; glow.position.set(0, headY, 0); inner.add(glow);
    const spill = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: "#8cc8ff", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    spill.name = "phoneSpill"; spill.position.set(0, 0.62, 0.2); spill.rotation.x = -0.9; inner.add(spill);
  }

  // Special skins change how every surface looks.
  if (look.fx) inner.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || !m.color) return;
    if (look.fx === "gold") { m.color.lerp(new THREE.Color("#f5c542"), 0.85); m.metalness = 0.85; m.roughness = 0.28; if (m.map) m.color.set("#ffe08a"); }
    else if (look.fx === "ghost") { m.color.lerp(new THREE.Color("#ffffff"), 0.75); m.transparent = true; m.opacity = 0.55; m.emissive = new THREE.Color("#b197fc"); m.emissiveIntensity = 0.25; }
    else if (look.fx === "neon") { m.emissive = m.color.clone(); m.emissiveIntensity = 0.75; }
    else if (look.fx === "ice") { m.color.lerp(new THREE.Color("#a5d8ff"), 0.65); m.roughness = 0.25; m.metalness = 0.2; }
    else if (look.fx === "shadow") { m.color.multiplyScalar(0.22); m.emissive = new THREE.Color("#7048e8"); m.emissiveIntensity = 0.18; }
  });

  pet(root, asleep ? undefined : look.pet);

  if (sitting) { legL.rotation.x = legR.rotation.x = -Math.PI / 2 + 0.1; inner.position.y = 0.08; }
  if (asleep) { inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.52, -0.05); } // lying on the bed, head on the pillow
  const parts: ChibiParts = { inner, legL, legR, armL, armR, pose: act?.pose };
  root.userData.parts = parts;
  root.userData.mood = act?.mood;
  return root;
}

/** Frees the shapes and paintings of a chibi that is being replaced. */
export function disposeChibi(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material as THREE.MeshStandardMaterial | undefined;
    m?.map?.dispose(); m?.dispose();
  });
}

/** Moves the limbs for this moment: walking, dancing, a bounce after a poke, or gentle breathing. */
export function animateChibi(root: THREE.Object3D, t: number, o: { moving: boolean; dance: boolean; boing?: number; dizzy?: number; lift?: number; play?: boolean; strum?: boolean; sing?: boolean; eat?: number; grip?: number }) {
  const p = root.userData.parts as ChibiParts | undefined;
  if (!p || p.pose === "sleep") return;
  const baseY = p.pose === "sit" ? 0.08 : 0;
  let y = baseY, tilt = 0, spin = 0;
  if (p.pose !== "sit") {
    const swing = o.moving ? Math.sin(t * 11) * 0.7 : 0;
    p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing * 0.8; p.armR.rotation.x = swing * 0.8;
    if (o.moving) y += Math.abs(Math.sin(t * 11)) * 0.035;
  }
  if (o.dance && !o.moving) {
    tilt = Math.sin(t * 8) * 0.2; y += Math.abs(Math.sin(t * 8)) * 0.09;
    p.armL.rotation.z = -0.28 - 1.6 - Math.sin(t * 8) * 0.4; p.armR.rotation.z = 0.28 + 1.6 - Math.sin(t * 8) * 0.4;
  } else { p.armL.rotation.z = -0.28; p.armR.rotation.z = 0.28; if (!o.moving) y += Math.sin(t * 2.2) * 0.008; }
  if (o.play) { p.armL.rotation.x = -1.25 + Math.sin(t * 9) * 0.22; p.armR.rotation.x = -1.25 + Math.sin(t * 9 + 2) * 0.22; tilt = Math.sin(t * 2) * 0.06; }
  // Riding: both hands reach forward to the handlebar or the steering wheel, with a slight lean.
  if (o.grip !== undefined) { p.armL.rotation.x = -1.15 * o.grip; p.armR.rotation.x = -1.15 * o.grip; p.armL.rotation.z = -0.12; p.armR.rotation.z = 0.12; p.legL.rotation.x = -0.5 * o.grip; p.legR.rotation.x = -0.5 * o.grip; p.inner.rotation.x = 0.12 * o.grip; } else p.inner.rotation.x = 0;
  if (o.eat !== undefined) { p.armR.rotation.x = -0.5 - o.eat * 1.9; p.armR.rotation.z = 0.28 - o.eat * 0.35; tilt = o.eat * 0.05; }
  if (o.strum) { p.armR.rotation.x = -0.75 + Math.sin(t * 11) * 0.3; p.armL.rotation.x = -1.0; p.armL.rotation.z = -0.75; tilt = Math.sin(t * 2.5) * 0.07; }
  if (o.sing) { p.armR.rotation.x = -1.9; tilt = Math.sin(t * 3) * 0.12; y += Math.abs(Math.sin(t * 3)) * 0.03; }
  if (o.lift !== undefined) { p.armL.rotation.z = -0.28 - 1.2 - o.lift * 1.5; p.armR.rotation.z = 0.28 + 1.2 + o.lift * 1.5; y -= (1 - o.lift) * 0.05; }
  if (o.boing !== undefined) { const k = (t - o.boing) / 0.55; if (k >= 0 && k < 1) y += Math.sin(k * Math.PI) * 0.35; }
  if (o.dizzy !== undefined) { const k = (t - o.dizzy) / 1.6; if (k >= 0 && k < 1) { spin = k * Math.PI * 4; tilt = Math.sin(k * Math.PI * 6) * 0.2; } }
  p.inner.position.y = y; p.inner.rotation.z = tilt; p.inner.rotation.y = spin;
  // On the phone: both hands up holding it, the thumb scrolling, the screen flickering as the feed moves.
  const phone = root.getObjectByName("phone");
  if (phone && o.grip === undefined && !o.lift && !o.play && !o.strum && !o.sing) {
    const scroll = Math.sin(t * 3.1) * 0.06;
    p.armL.rotation.x = -1.95; p.armR.rotation.x = -1.95 + scroll;
    p.armL.rotation.z = 0.42; p.armR.rotation.z = -0.42;
    const screen = phone.getObjectByName("screen") as THREE.Mesh | undefined, glow = root.getObjectByName("phoneGlow") as THREE.Mesh | undefined;
    const k = 0.5 + 0.5 * Math.sin(t * 2.3) * Math.sin(t * 0.9 + 1);
    if (screen) (screen.material as THREE.MeshBasicMaterial).color.setHSL(0.58 - k * 0.08, 0.7, 0.78 + k * 0.12);
    if (glow) (glow.material as THREE.MeshBasicMaterial).opacity = 0.24 + k * 0.14;
    phone.position.y = 0.74 + Math.sin(t * 1.3) * 0.006;
  }
  const cup = root.getObjectByName("cup");
  if (cup && !o.moving) { const sip = Math.max(0, Math.sin(t * 1.6)) ** 6; p.armR.rotation.x = -sip * 2.2; }
  const companion = root.getObjectByName("pet");
  if (companion) companion.position.y = Math.abs(Math.sin(t * 3.2)) * 0.05;
}
