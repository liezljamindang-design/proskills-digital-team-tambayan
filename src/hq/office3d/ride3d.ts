import * as THREE from "three";
import { isCar, type Ride } from "../rides";

const mat = (color: string, extra?: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });
const add = (g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };

/** The name someone typed, painted for a frame or a number plate. */
function plate(text: string, color: string, bg?: string) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
  const c = cv.getContext("2d")!;
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, 256, 64); }
  c.fillStyle = color; c.font = "800 38px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text.slice(0, 14), 128, 34, 244);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

/** Builds a bike or car, facing +z (the way the chibi faces). `seat` is how high the rider sits. */
export function buildRide(ride: Ride): { group: THREE.Group; seat: number; wheels: THREE.Object3D[] } {
  const g = new THREE.Group(), wheels: THREE.Object3D[] = [];
  const paint = mat(ride.color), dark = mat("#22262e"), metal = mat("#c9d1dc", { metalness: 0.6, roughness: 0.3 });
  const label = ride.name?.trim();
  if (!isCar(ride.kind)) {
    const r = ride.kind === "bmx" ? 0.15 : 0.21, thick = ride.kind === "mtb" ? 0.045 : ride.kind === "road" ? 0.018 : 0.03, span = ride.kind === "bmx" ? 0.3 : 0.38;
    for (const z of [-span, span]) { const w = add(g, new THREE.TorusGeometry(r, thick, 8, 22), dark, 0, r + thick, z); w.rotation.y = Math.PI / 2; wheels.push(w); add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), metal, 0, r + thick, z).rotation.z = Math.PI / 2; }
    const top = r + thick + 0.22;
    const bar = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, m: THREE.Material, t = 0.028) => {
      const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), len = a.distanceTo(b);
      const tube = add(g, new THREE.CylinderGeometry(t, t, len, 8), m, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    };
    const hub = r + thick;
    bar(0, hub, -span, 0, top, -0.08, paint); bar(0, top, -0.08, 0, top + 0.02, span * 0.62, paint); bar(0, hub + 0.02, 0, 0, top, -0.08, paint); bar(0, hub + 0.02, 0, 0, top + 0.02, span * 0.62, paint); bar(0, hub, -span, 0, hub + 0.02, 0, paint, 0.02);
    // The handlebar sits at the rider's hands (their arms reach forward at about shoulder height), on a tall stem from the front wheel.
    const grip = top + 0.07 - 0.2 + 0.43, reach = 0.25;
    bar(0, hub, span, 0, top + 0.06, span * 0.62, metal, 0.02); bar(0, top + 0.06, span * 0.62, 0, grip, reach, metal, 0.02);
    const drop = ride.kind === "road";
    add(g, new THREE.CylinderGeometry(0.02, 0.02, drop ? 0.34 : 0.46, 8), dark, 0, grip, reach).rotation.z = Math.PI / 2;
    for (const x of [-1, 1]) add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.08, 8), mat(ride.color), x * (drop ? 0.15 : 0.21), grip, reach).rotation.z = Math.PI / 2;
    add(g, new THREE.BoxGeometry(0.12, 0.035, 0.2), dark, 0, top + 0.07, -0.1);
    if (label) for (const side of [1, -1]) { const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), plate(label, "#ffffff")); tag.position.set(side * 0.032, top + 0.01, 0.1); tag.rotation.y = side * Math.PI / 2; g.add(tag); }
    return { group: g, seat: top + 0.07 - 0.2, wheels };
  }
  const kart = ride.kind === "kart", jeep = ride.kind === "jeep";
  const wide = kart ? 0.62 : 0.72, long = jeep ? 1.35 : kart ? 0.95 : 1.05, base = 0.14, tall = kart ? 0.14 : 0.3;
  add(g, new THREE.BoxGeometry(wide, tall, long), paint, 0, base + tall / 2, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), dark, x * (wide / 2 + 0.01), 0.13, z * (long / 2 - 0.2)); w.rotation.z = Math.PI / 2; wheels.push(w); }
  add(g, new THREE.BoxGeometry(wide * 0.8, 0.04, 0.06), metal, 0, base + 0.06, long / 2 + 0.02);
  for (const x of [-1, 1]) add(g, new THREE.SphereGeometry(0.05, 10, 8), mat("#fff3bf", { emissive: "#ffe066", emissiveIntensity: 0.9 }), x * wide * 0.3, base + tall * 0.6, long / 2);
  if (kart) { add(g, new THREE.BoxGeometry(wide * 0.7, 0.3, 0.06), dark, 0, base + tall + 0.1, -long / 2 + 0.12); add(g, new THREE.TorusGeometry(0.1, 0.02, 6, 16), dark, 0, 0.06 + 0.43, 0.22).rotation.x = -0.6; add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6), dark, 0, 0.06 + 0.34, 0.28).rotation.x = -0.9; }
  else {
    // An open-top cabin, so the driver stays in view: a windscreen in front, a seat back behind.
    add(g, new THREE.BoxGeometry(wide * 0.92, 0.2, 0.03), mat("#bfe3ff", { transparent: true, opacity: 0.55 }), 0, base + tall + 0.1, 0.24).rotation.x = -0.25;
    add(g, new THREE.BoxGeometry(wide * 0.9, 0.22, 0.06), dark, 0, base + tall + 0.1, -0.2);
    // A steering wheel at the driver's hands.
    add(g, new THREE.TorusGeometry(0.1, 0.02, 6, 18), dark, 0, 0.12 + 0.43, 0.2).rotation.x = -0.5;
    add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), dark, 0, 0.12 + 0.36, 0.26).rotation.x = -0.9;
    if (jeep) {
      for (const [x, z] of [[-1, -0.55], [1, -0.55], [-1, 0.26], [1, 0.26]]) add(g, new THREE.BoxGeometry(0.03, 0.5, 0.03), metal, x * (wide / 2 - 0.03), base + tall + 0.25, z);
      add(g, new THREE.BoxGeometry(wide + 0.04, 0.05, 1.0), paint, 0, base + tall + 0.52, -0.15);
      for (const side of [1, -1]) add(g, new THREE.BoxGeometry(0.012, 0.06, long * 0.9), mat("#f4c21f"), side * (wide / 2 + 0.005), base + tall * 0.75, 0);
    }
  }
  if (label) {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), plate(label, "#10141c", "#ffffff")); back.position.set(0, base + tall * 0.45, -long / 2 - 0.005); back.rotation.y = Math.PI; g.add(back);
    for (const side of [1, -1]) { const door = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.115), plate(label, "#ffffff")); door.position.set(side * (wide / 2 + 0.004), base + tall * 0.5, kart ? 0 : -0.05); door.rotation.y = side * Math.PI / 2; g.add(door); }
  }
  return { group: g, seat: kart ? 0.06 : 0.12, wheels };
}

export function disposeRide(group: THREE.Object3D) {
  group.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mm = m.material as THREE.MeshStandardMaterial | undefined; mm?.map?.dispose(); mm?.dispose(); });
}
