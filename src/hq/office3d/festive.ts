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
    g.textBaseline = "middle"; g.fillStyle = "#c2255c"; g.font = "900 54px Nunito, system-ui, sans-serif"; g.fillText("Happy birthday", x, 88, 768 - x - 30);
    g.fillStyle = "#10141c"; g.font = "900 58px Nunito, system-ui, sans-serif"; g.fillText(`${c.name}! 🎂`, x, 168, 768 - x - 30);
    tex.needsUpdate = true;
  };
  draw();
  if (c.photo) { const img = new Image(); img.crossOrigin = "anonymous"; img.referrerPolicy = "no-referrer"; img.onload = () => { try { draw(img); } catch { draw(); } }; img.src = c.photo; }
  return tex;
}

/** A little propeller plane towing a long banner made of strips, so the banner can ripple in the wind. */
const STRIPS = 16;
function airplane(c: Celebrant) {
  const g = new THREE.Group();
  const plane = new THREE.Group(); g.add(plane);
  const white = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }), pink = new THREE.MeshStandardMaterial({ color: "#ff4fa3" }), yellow = new THREE.MeshStandardMaterial({ color: "#ffd43b" });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 6, 14), white); body.rotation.z = Math.PI / 2; plane.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), pink); wing.position.x = 0.15; plane.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.9), pink); tail.position.x = -0.9; plane.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.05), yellow); fin.position.set(-0.9, 0.25, 0); plane.add(fin);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: "#4dabf7", roughness: 0.1, metalness: 0.3 })); cockpit.position.set(0.35, 0.2, 0); plane.add(cockpit);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.08), new THREE.MeshStandardMaterial({ color: "#495057" })); prop.position.x = 1.05; prop.name = "prop"; plane.add(prop);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2), new THREE.MeshBasicMaterial({ color: "#495057" })); rope.rotation.z = Math.PI / 2; rope.position.x = -1.6; plane.add(rope);
  // The banner: strips side by side, each showing its slice of the picture.
  const tex = bannerTexture(c), W = 4.2, H = 1.4, strips: THREE.Mesh[] = [];
  const banner = new THREE.Group(); banner.position.x = -2.2; plane.add(banner);
  for (let i = 0; i < STRIPS; i++) {
    const geo = new THREE.PlaneGeometry(W / STRIPS + 0.002, H);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - (i + (1 - uv.getX(k))) / STRIPS);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.x = -(i + 0.5) * (W / STRIPS); banner.add(m); strips.push(m);
  }
  g.userData = { strips, prop, plane };
  return g;
}

export interface Festive { group: THREE.Group; animate(t: number): void; dispose(): void }

export function buildFestive(party: Celebrant[]): Festive {
  const group = new THREE.Group(); group.name = "festive";
  const W = FLOOR.width, D = FLOOR.depth;
  const planes: { g: THREE.Group; r: number; y: number; s: number; p: number }[] = [];
  // Airplanes circling the building, one per birthday person.
  party.slice(0, 3).forEach((c, ci) => { const g = airplane(c); g.scale.setScalar(1.9); group.add(g); planes.push({ g, r: 13 + ci * 2.5, y: 6.5 + ci * 1.2, s: 0.16, p: (ci * Math.PI * 2) / Math.min(3, party.length) }); });
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
      for (const f of planes) {
        const a = t * f.s + f.p, cx = W / 2, cz = D / 2;
        f.g.position.set(cx + Math.cos(a) * f.r, f.y + Math.sin(t * 0.8 + f.p) * 0.3, cz + Math.sin(a) * f.r * 0.75);
        // Face along the flight path (counter-clockwise), banking a little into the turn.
        f.g.rotation.set(0, -Math.atan2(Math.cos(a) * 0.75, -Math.sin(a)), 0);
        const u = f.g.userData as { strips: THREE.Mesh[]; prop: THREE.Object3D; plane: THREE.Object3D };
        u.plane.rotation.x = -0.18;
        u.prop.rotation.x = t * 40;
        u.strips.forEach((m, i) => { m.position.z = Math.sin(t * 6 - i * 0.55) * 0.12 * (i / STRIPS + 0.2); m.rotation.y = Math.cos(t * 6 - i * 0.55) * 0.25; });
      }
      for (const p of party3) { p.m.position.y = Math.sin(t * 1.6 + p.p) * 0.08; p.m.rotation.z = Math.sin(t * 1.1 + p.p) * 0.08; }
    },
    dispose() {
      group.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material & { map?: THREE.Texture }; if (mat) { mat.map?.dispose(); mat.dispose(); } });
    },
  };
}
