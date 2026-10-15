import * as THREE from "three";
import type { Celebrant } from "../birthday";
import { FLOOR } from "../data/office";

/**
 * Birthday decorations for the 3D office: hot air balloons drifting over the building, each with the
 * birthday person's name and photo on a banner, plus bunting and floating party balloons.
 */
const COLOURS = ["#ff4fa3", "#ffd43b", "#4dabf7", "#51cf66", "#ff922b", "#cc5de8"];

function bannerTexture(c: Celebrant) {
  const cv = document.createElement("canvas"); cv.width = 768; cv.height = 256;
  const g = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = (img?: HTMLImageElement) => {
    g.clearRect(0, 0, 768, 256);
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(8, 8, 752, 240, 40); g.fill();
    g.lineWidth = 10; g.strokeStyle = "#ff4fa3"; g.stroke();
    let x = 60;
    if (img) {
      g.save(); g.beginPath(); g.arc(138, 128, 96, 0, Math.PI * 2); g.clip(); g.drawImage(img, 42, 32, 192, 192); g.restore();
      g.lineWidth = 8; g.strokeStyle = "#ffd43b"; g.beginPath(); g.arc(138, 128, 96, 0, Math.PI * 2); g.stroke();
      x = 256;
    }
    g.textBaseline = "middle"; g.fillStyle = "#c2255c"; g.font = "900 54px Nunito, system-ui, sans-serif"; g.fillText("HAPPY BIRTHDAY", x, 88, 768 - x - 30);
    g.fillStyle = "#10141c"; g.font = "900 64px Nunito, system-ui, sans-serif"; g.fillText(`${c.name.split(" ")[0]}! 🎂`, x, 168, 768 - x - 30);
    tex.needsUpdate = true;
  };
  draw();
  if (c.photo) { const img = new Image(); img.crossOrigin = "anonymous"; img.referrerPolicy = "no-referrer"; img.onload = () => { try { draw(img); } catch { draw(); } }; img.src = c.photo; }
  return tex;
}

function hotAirBalloon(c: Celebrant, i: number) {
  const g = new THREE.Group();
  // Striped envelope
  const stripes = 12, env = new THREE.Group();
  for (let k = 0; k < stripes; k++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 18, (k / stripes) * Math.PI * 2, (Math.PI * 2) / stripes), new THREE.MeshStandardMaterial({ color: COLOURS[(k + i) % COLOURS.length], roughness: 0.6 }));
    seg.scale.y = 1.2; env.add(seg);
  }
  env.position.y = 3.2; g.add(env);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 0.6, 16, 1, true), new THREE.MeshStandardMaterial({ color: "#ffffff", side: THREE.DoubleSide }));
  skirt.position.y = 1.35; g.add(skirt);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1), new THREE.MeshStandardMaterial({ color: "#7a4a1e" }));
    rope.position.set(x, 0.55, z); g.add(rope);
  }
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: "#a86a33", roughness: 0.9 }));
  basket.position.y = -0.1; g.add(basket);
  // The banner hanging under the basket, facing both ways.
  const tex = bannerTexture(c);
  for (const side of [1, -1]) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide }));
    banner.position.set(0, -0.95, side * 0.02); if (side < 0) banner.rotation.y = Math.PI; g.add(banner);
  }
  return g;
}

export interface Festive { group: THREE.Group; animate(t: number): void; dispose(): void }

export function buildFestive(party: Celebrant[]): Festive {
  const group = new THREE.Group(); group.name = "festive";
  const W = FLOOR.width, D = FLOOR.depth;
  const balloons: { g: THREE.Group; x: number; z: number; y: number; r: number; s: number; p: number }[] = [];
  // Hot air balloons: a few per celebrant, circling slowly over the building.
  const spots = [[W * 0.3, D * 0.45, 6.5], [W * 0.7, D * 0.4, 7.5], [W * 0.5, D * 0.85, 6]];
  party.slice(0, 3).forEach((c, ci) => spots.forEach(([x, z, y], k) => {
    if (party.length > 1 && k > 0 && k !== ci) return;
    const g = hotAirBalloon(c, ci * 3 + k); group.add(g);
    balloons.push({ g, x: x + ci * 2, z, y, r: 2.2 + k, s: 0.08 + k * 0.03, p: ci + k * 2 });
  }));
  // Bunting across the Central Hall and the front of the office.
  const flagGeo = new THREE.ConeGeometry(0.16, 0.34, 3);
  const garland = (x0: number, z0: number, x1: number, z1: number, h: number) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.45);
    for (let i = 0; i <= n; i++) {
      const k = i / n, sag = Math.sin(k * Math.PI) * 0.5;
      const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: COLOURS[i % COLOURS.length] }));
      f.position.set(x0 + (x1 - x0) * k, h - sag, z0 + (z1 - z0) * k); f.rotation.x = Math.PI; group.add(f);
    }
  };
  garland(6.6, 5, 11.4, 14, 2.1); garland(11.4, 5, 6.6, 14, 2.1);
  garland(0.5, D - 0.2, W - 0.5, D - 0.2, 2.2);
  garland(12.8, 14.6, 21.2, 14.6, 2.1);
  // Party balloons bobbing around the Central Hall and the entrance.
  const party3: { m: THREE.Object3D; y: number; p: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const x = i < 14 ? 6.8 + (i % 7) * 0.7 : 12.9 + ((i - 14) % 6) * 1.35, z = i < 14 ? (i < 7 ? 5.3 : 13.6) : 14.9 + ((i - 14) % 2) * 6.6;
    const b = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), new THREE.MeshStandardMaterial({ color: COLOURS[i % COLOURS.length], roughness: 0.3, metalness: 0.1 }));
    ball.scale.y = 1.2; ball.position.y = 1.5; b.add(ball);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.3), new THREE.MeshBasicMaterial({ color: "#ffffff" })); str.position.y = 0.75; b.add(str);
    b.position.set(x, 0, z); group.add(b); party3.push({ m: b, y: 0, p: i * 0.7 });
  }
  return {
    group,
    animate(t) {
      for (const b of balloons) {
        const a = t * b.s + b.p;
        b.g.position.set(b.x + Math.cos(a) * b.r, b.y + Math.sin(t * 0.6 + b.p) * 0.35, b.z + Math.sin(a) * b.r * 0.6);
        b.g.rotation.y = Math.sin(t * 0.2 + b.p) * 0.4;
      }
      for (const p of party3) { p.m.position.y = Math.sin(t * 1.6 + p.p) * 0.08; p.m.rotation.z = Math.sin(t * 1.1 + p.p) * 0.08; }
    },
    dispose() {
      group.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material & { map?: THREE.Texture }; if (mat) { mat.map?.dispose(); mat.dispose(); } });
    },
  };
}
