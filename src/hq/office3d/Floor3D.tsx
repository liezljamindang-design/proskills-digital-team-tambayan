import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { isBirthday } from "../birthday";
import { FLOOR, FURNITURE, HOOPS, POOL, SEATS, START } from "../data/office";
import { useMovement, type Hit, type WalkView } from "../hooks/useMovement";
import { zoneAt } from "../office/engine";
import { myPosition } from "../net/session";
import { statusOf } from "../status";
import { useHq, type CamMode } from "../store";
import type { Act, Look } from "../types";
import { animateChibi, buildChibi, disposeChibi } from "./chibi3d";
import { buildOffice, UNIT } from "./scene";

interface Actor {
  holder: THREE.Group; chibi: THREE.Group; sig: string;
  x: number; y: number; tx: number; ty: number; facing: number; moving: boolean;
  act?: Act; boing?: number; dizzy?: number; self: boolean;
}
const VIEWS: { id: CamMode; label: string }[] = [
  { id: "iso", label: "Overhead" }, { id: "free", label: "Free look" }, { id: "third", label: "3rd person" },
  { id: "front", label: "Facing you" }, { id: "first", label: "1st person" },
];
const turnTo = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

/** The office in real 3D. Walking, chat and rooms work exactly as in the flat view; only the drawing differs. */
export function Floor3D() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const bubbles = useHq((s) => s.bubbles);
  const myZone = useHq((s) => s.myZone);
  const overview = useHq((s) => s.overview);
  const setOverview = useHq((s) => s.setOverview);
  const zoom = useHq((s) => s.zoom);
  const zoomBy = useHq((s) => s.zoomBy);
  const camMode = useHq((s) => s.camMode);
  const hostRef = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLDivElement>());
  const viewRef = useRef<WalkView | null>(null);
  const spin = useRef<(by: number) => void>(() => undefined);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { useHq.getState().setView3d(false); return; } // no 3D on this device: fall back to the flat view
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "floor-3d";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const office = buildOffice();
    scene.add(office.root);
    scene.add(new THREE.HemisphereLight("#ffffff", "#b9c6da", 1.25));
    const sun = new THREE.DirectionalLight("#fff6e5", 2.1);
    sun.position.set(FLOOR.width / 2 - 12, 24, FLOOR.depth / 2 + 11); sun.target.position.set(FLOOR.width / 2, 0, FLOOR.depth / 2);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20, near: 1, far: 90 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    const partyLights = ["#ff4fa3", "#35c9ff", "#ffd43b"].map((color) => { const l = new THREE.PointLight(color, 0, 14, 1.4); l.position.y = 3; scene.add(l); return l; });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 300);
    const cam = { az: Math.PI / 4, azGoal: Math.PI / 4, el: 0.62, heading: Math.PI, pos: new THREE.Vector3(20, 14, 20), look: new THREE.Vector3(START.x, 0, START.y), first: true, tilt: 0, steerAt: 0, steerClock: 0 };
    spin.current = (by) => { cam.azGoal += by; };

    const actors = new Map<string, Actor>();
    function sync() {
      const s = useHq.getState();
      const people: { id: string; look: Look; act?: Act; x: number; y: number; self: boolean }[] = [
        ...(s.me && s.joined ? [{ id: s.me.id, look: s.me.look, act: s.me.act, x: NaN, y: NaN, self: true }] : []),
        ...Object.values(s.peers).map((p) => ({ id: p.id, look: p.look, act: p.act, x: p.x, y: p.y, self: false })),
      ];
      const seen = new Set<string>();
      for (const p of people) {
        seen.add(p.id);
        const sig = JSON.stringify([p.look, p.act?.pose, p.act?.drink, p.act?.phone, p.act?.mood, p.act?.at]);
        let a = actors.get(p.id);
        if (!a) {
          const holder = new THREE.Group();
          holder.userData = p.self ? { self: true } : { peer: p.id };
          scene.add(holder);
          a = { holder, chibi: new THREE.Group(), sig: "", x: p.self ? myPosition().x : p.x, y: p.self ? myPosition().y : p.y, tx: p.x, ty: p.y, facing: p.self ? Math.PI : Math.PI / 4, moving: false, self: p.self };
          actors.set(p.id, a);
        }
        if (a.sig !== sig) {
          a.holder.remove(a.chibi); disposeChibi(a.chibi);
          a.chibi = buildChibi(p.look, p.act); a.holder.add(a.chibi); a.sig = sig;
        }
        a.act = p.act;
        if (!p.self) { a.tx = p.x; a.ty = p.y; }
      }
      for (const [id, a] of actors) if (!seen.has(id)) { scene.remove(a.holder); disposeChibi(a.chibi); actors.delete(id); }
    }
    sync();
    const unsubscribe = useHq.subscribe((s, prev) => { if (s.me !== prev.me || s.peers !== prev.peers || s.joined !== prev.joined) sync(); });
    const self = () => { const id = useHq.getState().me?.id; return id ? actors.get(id) : undefined; };

    // Dragging (mouse or one finger) looks around in every view; two fingers pinch to zoom. A drag must not also count as a tap to walk.
    let drag: { x: number; y: number; moved: boolean } | null = null, swallowAt = 0, pinch = 0;
    const canvas = renderer.domElement, fingers = new Map<number, { x: number; y: number }>();
    const spread = () => { const [p, q] = [...fingers.values()]; return Math.hypot(p.x - q.x, p.y - q.y); };
    const onDown = (e: PointerEvent) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) { pinch = spread(); if (drag) drag.moved = true; }
      else drag = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size >= 2) {
        const d = spread();
        if (pinch > 0 && Math.abs(d - pinch) > 4) { useHq.getState().zoomBy(d / pinch); pinch = d; }
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true; drag.x = e.clientX; drag.y = e.clientY;
      const mode = useHq.getState().camMode;
      if (mode === "iso" || mode === "free") {
        cam.azGoal -= dx * 0.008; cam.az = cam.azGoal;
        cam.el = Math.min(1.45, Math.max(0.12, cam.el + dy * 0.006));
      } else {
        // Walking views: sideways turns you, up and down tilts the camera.
        cam.heading -= dx * 0.008; cam.steerAt = performance.now();
        const a = self(); if (a) a.facing = cam.heading;
        cam.tilt = Math.min(1, Math.max(-0.5, cam.tilt + dy * 0.006));
      }
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (drag?.moved || pinch) swallowAt = performance.now();
      if (fingers.size < 2) pinch = 0;
      if (!fingers.size) drag = null; else if (drag) drag.moved = true;
    };
    canvas.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);

    const raycaster = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const tank = () => { const m = useHq.getState().camMode; return m === "third" || m === "front" || m === "first"; };

    viewRef.current = {
      element: canvas,
      pick(e): Hit {
        if (performance.now() - swallowAt < 400) return null;
        const r = canvas.getBoundingClientRect();
        raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
        const firstPerson = useHq.getState().camMode === "first";
        const targets: THREE.Object3D[] = [office.root, ...[...actors.values()].filter((a) => !(a.self && firstPerson)).map((a) => a.holder)];
        const hit = raycaster.intersectObjects(targets, true).find((h) => { let o: THREE.Object3D | null = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
        if (hit) {
          for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
            const d = o.userData;
            if (d.self) return { kind: "self" };
            if (d.peer) return { kind: "peer", id: d.peer };
            if (d.seat) return { kind: "seat", id: d.seat };
            if (d.arcade) return { kind: "arcade" };
            if (d.pingpong) return { kind: "pingpong" };
            if (d.ball) return { kind: "ball" };
            if (d.hoop) return { kind: "hoop" };
            if (d.gym) return { kind: "gym", id: d.gym };
          }
          return { kind: "floor", point: { x: hit.point.x, y: hit.point.z } };
        }
        const p = new THREE.Vector3();
        return raycaster.ray.intersectPlane(ground, p) ? { kind: "floor", point: { x: p.x, y: p.z } } : null;
      },
      render(pos, moving) {
        const a = self();
        if (a) {
          const dx = pos.x - a.x, dy = pos.y - a.y;
          if (moving && Math.hypot(dx, dy) > 0.0005 && Math.hypot(dx, dy) < 0.5) {
            const dir = Math.atan2(dx, dy);
            a.facing = turnTo(a.facing, dir, 0.3);
            // Walking to a clicked spot swings the chase camera round behind you.
            if (performance.now() - cam.steerAt > 250) cam.heading = turnTo(cam.heading, dir, 0.08);
          }
          a.x = pos.x; a.y = pos.y; a.moving = moving;
        }
        return true; // the 3D scene keeps drawing by itself
      },
      poke(dizzy) { const a = self(); if (a) { const t = performance.now() / 1000; if (dizzy) a.dizzy = t; else a.boing = t; } },
      steer(kx, ky) {
        const forward = -(kx + ky) / 2, right = (kx - ky) / 2;
        const now = performance.now(), dt = Math.min(0.05, (now - cam.steerClock) / 1000);
        cam.steerClock = now; cam.steerAt = now;
        if (tank()) {
          // First and third person: left and right turn you, up and down walk.
          cam.heading -= right * 2.4 * dt;
          const a = self(); if (a) a.facing = cam.heading;
          return [forward * Math.sin(cam.heading), forward * Math.cos(cam.heading)];
        }
        const turn = cam.az - Math.PI / 4, c = Math.cos(turn), s = Math.sin(turn);
        return [kx * c + ky * s, -kx * s + ky * c];
      },
    };

    const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();

    // Basketballs in the air, the ball in a player's hands, and the barbell for lifting.
    const ballGeo = new THREE.SphereGeometry(0.13, 16, 12), ballMat = new THREE.MeshStandardMaterial({ color: "#ff922b", roughness: 0.7 });
    const barMat = new THREE.MeshStandardMaterial({ color: "#3a4150", roughness: 0.5 }), plateMat = new THREE.MeshStandardMaterial({ color: "#e03131", roughness: 0.6 });
    const flying = new Map<string, { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t0: number; made: boolean; by: string }>();
    const RING_Y = 64 / UNIT;
    function prop(a: Actor, name: "ball" | "barbell" | "ripple" | "axe", on: boolean, color = "#e8590c") {
      let m = a.holder.getObjectByName(name);
      if (on && !m) {
        if (name === "ball") { m = new THREE.Mesh(ballGeo, ballMat); m.position.set(0, 0.36, 0.3); }
        else if (name === "axe") {
          m = new THREE.Group();
          const mk = (r: number, yy: number) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.035, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.6 })); d.rotation.x = Math.PI / 2; d.position.y = yy; (m as THREE.Group).add(d); };
          mk(0.11, 0); mk(0.08, 0.14);
          const neck = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: "#6f4b2c" })); neck.position.y = 0.38; m.add(neck);
          m.position.set(0.04, 0.3, 0.2); m.rotation.z = -1.0;
        }
        else if (name === "ripple") { m = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 28), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8 })); m.rotation.x = Math.PI / 2; }
        else {
          m = new THREE.Group();
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), barMat); bar.rotation.z = Math.PI / 2; m.add(bar);
          for (const sx of [-0.4, 0.4]) { const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16), plateMat); plate.rotation.z = Math.PI / 2; plate.position.x = sx; m.add(plate); }
        }
        m.name = name; a.holder.add(m);
      }
      if (m) m.visible = on;
      return m;
    }
    // Food from the canteen: the emoji floats in the chibi's hand and is lifted for each bite.
    const foodTextures = new Map<string, THREE.CanvasTexture>();
    function foodTexture(emoji: string) {
      let tex = foodTextures.get(emoji);
      if (!tex) {
        const cv = document.createElement("canvas"); cv.width = cv.height = 96;
        const c = cv.getContext("2d")!; c.font = '72px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, 48, 54);
        tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; foodTextures.set(emoji, tex);
      }
      return tex;
    }
    /** A music note that drifts up from anyone playing an instrument. */
    function note(a: Actor, emoji: string | undefined, t: number) {
      let sp = a.holder.getObjectByName("note") as THREE.Sprite | undefined;
      if (!emoji) { if (sp) sp.visible = false; return; }
      if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: foodTexture(emoji), transparent: true, depthWrite: false })); sp.name = "note"; sp.scale.setScalar(0.22); a.holder.add(sp); }
      const k = (t * 0.7 + a.x) % 1;
      sp.visible = true; sp.position.set(0.28 + Math.sin(k * 6) * 0.06, 0.95 + k * 0.45, 0); sp.material.opacity = 1 - k;
    }
    function plate(a: Actor, emoji: string | undefined, t: number) {
      let sp = a.holder.getObjectByName("food") as THREE.Sprite | undefined;
      if (!emoji) { if (sp) sp.visible = false; return; }
      if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); sp.name = "food"; sp.scale.setScalar(0.26); a.holder.add(sp); }
      if (sp.userData.emoji !== emoji) { sp.material.map = foodTexture(emoji); sp.material.needsUpdate = true; sp.userData.emoji = emoji; }
      const bite = Math.max(0, Math.sin(t * 1.8)) ** 4;
      sp.visible = true; sp.position.set(0.2 - bite * 0.14, 0.4 + bite * 0.2, 0.26);
    }
    let raf = 0, last = performance.now(), lastMode: CamMode | null = null;
    const head = new THREE.Vector3();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
      last = now;
      const s = useHq.getState(), mode = s.camMode, mine = self();
      if (mode !== lastMode) { cam.tilt = 0; if (mine && (mode === "third" || mode === "first")) cam.heading = mine.facing; if (mine && mode === "front") cam.heading = mine.facing; lastMode = mode; }
      const partyOn = Boolean(s.me?.act?.party) || Object.values(s.peers).some((p) => p.act?.party);

      office.animate(t);
      // Start any new shot, and move the ones already in the air.
      for (const shot of s.shots) {
        if (flying.has(shot.id) || Date.now() - shot.at > 600) continue;
        const mesh = new THREE.Mesh(ballGeo, ballMat); mesh.castShadow = true; scene.add(mesh);
        const h = HOOPS[shot.hoop], shooter = actors.get(shot.from);
        if (shooter) shooter.facing = Math.atan2(h.x - shot.x, h.y - shot.y);
        flying.set(shot.id, { mesh, from: new THREE.Vector3(shot.x, 0.8, shot.y), to: new THREE.Vector3(h.x, RING_Y, h.y), t0: t, made: shot.made, by: shot.from });
      }
      const shooting = new Set<string>();
      for (const [id, f] of flying) {
        const k = (t - f.t0) / 0.95;
        if (k < 1) {
          shooting.add(f.by);
          const end = f.made ? f.to : f.to.clone().add(new THREE.Vector3(0, 0.12, 0.26));
          f.mesh.position.lerpVectors(f.from, end, k); f.mesh.position.y += Math.sin(k * Math.PI) * 1.5;
        } else if (k < 2) {
          const j = k - 1;
          if (f.made) f.mesh.position.set(f.to.x, RING_Y - j * RING_Y + Math.abs(Math.sin(j * 9)) * 0.25 * (1 - j), f.to.z);
          else f.mesh.position.set(f.to.x + (f.to.x < 3 ? 1 : -1) * j * 1.2, Math.max(0.13, RING_Y + 0.12 - j * j * 2.2) + Math.abs(Math.sin(j * 8)) * 0.2 * (1 - j), f.to.z + 0.26 + j * 0.9);
        } else { scene.remove(f.mesh); flying.delete(id); }
      }

      for (const a of actors.values()) {
        if (!a.self) {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
          a.moving = d > 0.03;
          if (d > 2.5) { a.x = a.tx; a.y = a.ty; } // a jump (sitting down, a bed): no sliding across the room
          else if (a.moving) { const k = 1 - Math.exp(-dt * 9); a.x += dx * k; a.y += dy * k; a.facing = turnTo(a.facing, Math.atan2(dx, dy), 0.25); }
        }
        const pose = a.act?.pose;
        let ox = 0, oy = 0, oz = 0, facing = a.facing, piano = false;
        if (pose === "sit") {
          // Put the chibi on the actual seat: the walking code only knows a spot just in front of it.
          const seat = SEATS.find((q) => Math.hypot(q.x - a.x, q.y - a.y) < 0.3), f = seat && FURNITURE.find((q) => q.id === seat.furniture);
          if (seat && f) {
            const sofa = f.kind === "sofa";
            const top = (sofa ? 9 : f.kind === "chair" ? 10 : f.kind === "stool" ? 14 : 12) / UNIT;
            ox = (sofa ? seat.x : f.x + f.w / 2) - a.x; oz = (sofa ? f.y + 0.16 + (f.h - 0.16) / 2 - 0.05 : f.y + f.h / 2) - a.y; oy = top - 0.21;
            facing = f.kind === "chair" || f.id === "piano-stool" ? Math.PI : 0; // desk and meeting chairs face the table; the piano stool faces the keys
            piano = f.id === "piano-stool";
          }
        }
        if (pose === "sleep") facing = 0;
        // In the pool you sink to your shoulders, bob, and leave a ripple on the surface.
        const swimming = !pose && a.x > POOL.x && a.x < POOL.x + POOL.w && a.y > POOL.y && a.y < POOL.y + POOL.h;
        const ripple = prop(a, "ripple", swimming);
        if (swimming) {
          oy = -0.46 + Math.sin(t * 2.4 + a.x) * 0.035;
          if (ripple) { const k = (t * 0.9 + a.x) % 1; ripple.position.y = 0.055 - oy; ripple.scale.setScalar(0.8 + k * 0.9); (ripple as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>).material.opacity = 0.85 * (1 - k); }
        }
        const gym = a.act?.gym, band = a.act?.band;
        if (band === "drums") { facing = 0; oy = 0.1; }
        if (band === "mic" || band === "guitar" || band === "bass") facing = 0;
        // The instrument in your hands is rebuilt when you swap guitar for bass.
        const axeOn = band === "guitar" || band === "bass", old = a.holder.getObjectByName("axe");
        if (old && old.userData.kind !== band) a.holder.remove(old);
        const axe = prop(a, "axe", axeOn, band === "bass" ? "#1c7ed6" : "#e8590c"); if (axe && axeOn) axe.userData.kind = band;
        note(a, band || piano ? "🎵" : undefined, t);
        if (gym === "run") { facing = Math.PI; oy = 4.6 / UNIT; }
        if (gym === "lift") facing = 0;
        prop(a, "ball", Boolean(a.act?.ball) && !shooting.has([...actors].find(([, v]) => v === a)?.[0] ?? ""));
        plate(a, pose === "sleep" ? undefined : a.act?.food, t);
        const bar = prop(a, "barbell", gym === "lift");
        const liftK = Math.sin(t * 2.6) * 0.5 + 0.5;
        if (bar && gym === "lift") bar.position.set(0, 0.52 + liftK * 0.42, 0.12);
        a.holder.position.set(a.x + ox, oy, a.y + oz);
        a.holder.rotation.y = facing;
        a.holder.visible = !(a.self && mode === "first");
        animateChibi(a.chibi, t, { moving: a.moving || gym === "run" || swimming, lift: gym === "lift" ? liftK : undefined, play: piano || band === "drums", strum: band === "guitar" || band === "bass", sing: band === "mic", dance: partyOn || a.act?.mood === "dance" || (!pose && !gym && !band && zoneAt(a.x, a.y) === "dance"), boing: a.boing, dizzy: a.dizzy });
      }

      // Camera
      cam.az = turnTo(cam.az, cam.azGoal, 1 - Math.exp(-dt * 8));
      const mx = mine?.x ?? START.x, mz = mine?.y ?? START.y, fwd = new THREE.Vector3(Math.sin(cam.heading), 0, Math.cos(cam.heading));
      const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
      let fov = 30;
      if (mode === "third") { fov = 58; wantPos.set(mx, 2.1, mz).addScaledVector(fwd, -3.3 / Math.sqrt(s.zoom)); wantLook.set(mx, 1.0, mz).addScaledVector(fwd, 1.2); wantPos.y += cam.tilt * 2.5; }
      else if (mode === "front") { fov = 50; wantPos.set(mx, 1.5, mz).addScaledVector(fwd, 3.2 / Math.sqrt(s.zoom)); wantLook.set(mx, 0.85, mz); wantPos.y += cam.tilt * 2.5; }
      else if (mode === "first") { fov = 72; wantPos.set(mx, 1.18, mz).addScaledVector(fwd, 0.12); wantLook.copy(wantPos).addScaledVector(fwd, 2); wantLook.y += cam.tilt * 2.4 - 0.12; }
      else {
        const whole = s.overview, el = cam.el, dist = whole ? 58 : 19 / s.zoom;
        wantLook.set(whole ? FLOOR.width / 2 : mx, whole ? 0 : 0.6, whole ? FLOOR.depth / 2 : mz);
        wantPos.copy(wantLook).add(new THREE.Vector3(Math.sin(cam.az) * Math.cos(el), Math.sin(el), Math.cos(cam.az) * Math.cos(el)).multiplyScalar(dist));
      }
      const k = cam.first ? 1 : 1 - Math.exp(-dt * (mode === "first" ? 14 : 5));
      cam.first = false;
      cam.pos.lerp(wantPos, k); cam.look.lerp(wantLook, k);
      camera.position.copy(cam.pos); camera.lookAt(cam.look);
      if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix(); }
      // An outer wall between the camera and the room would block the view, so it steps aside.
      office.wallX.visible = cam.pos.x > 0.5; office.wallZ.visible = cam.pos.z > 0.5;

      partyLights.forEach((l, i) => { l.intensity = partyOn ? 60 : 0; if (partyOn) l.position.set(9 + Math.cos(t * 1.3 + i * 2.1) * 6, 3, 7 + Math.sin(t * 1.3 + i * 2.1) * 5); });
      sun.intensity = partyOn ? 0.9 : 2.1;
      renderer.render(scene, camera);

      // Name tags and speech bubbles are ordinary HTML, pinned above each head.
      const w = host!.clientWidth, h = host!.clientHeight;
      for (const [id, a] of actors) {
        const el = labels.current.get(id);
        if (!el) continue;
        head.set(a.holder.position.x, a.holder.position.y + (a.act?.pose === "sleep" ? 1.0 : 1.62), a.holder.position.z + (a.act?.pose === "sleep" ? -0.6 : 0)).project(camera);
        const hidden = head.z > 1 || (a.self && mode === "first");
        el.style.display = hidden ? "none" : "";
        if (!hidden) el.style.transform = `translate(-50%, -100%) translate(${((head.x + 1) / 2 * w).toFixed(1)}px, ${((1 - head.y) / 2 * h).toFixed(1)}px)`;
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf); unsubscribe(); observer.disconnect(); viewRef.current = null;
      canvas.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      for (const a of actors.values()) disposeChibi(a.chibi);
      scene.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); });
      renderer.dispose(); canvas.remove();
    };
  }, []);

  const makeView = useCallback(() => viewRef.current, []);
  useMovement(makeView);

  const people = [...(me ? [{ ...me, self: true, zone: myZone }] : []), ...Object.values(peers).map((p) => ({ ...p, self: false, zone: zoneAt(p.x, p.y) }))];
  const orbit = camMode === "iso" || camMode === "free";

  return (
    <div className="floor floor-is-3d">
      <div ref={hostRef} className="floor-3d-host" />
      <div className="tags" aria-hidden="true">
        {people.map((p) => {
          const status = statusOf(p, p.zone), bubble = bubbles[p.id];
          return (
            <div key={p.id} className="tag3d" ref={(el) => { if (el) labels.current.set(p.id, el); else labels.current.delete(p.id); }}>
              {bubble && <span className={`tag3d-say${bubble.private ? " is-private" : ""}`}>{bubble.text.length > 60 ? `${bubble.text.slice(0, 59)}…` : bubble.text}</span>}
              <span className={`tag3d-name${p.self ? " is-self" : ""}`}>
                {isBirthday(p) && "🎂 "}{p.self ? "You" : p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name}
                {status.id !== "available" && <span className="tag3d-status" title={status.label}>{status.emoji}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="view-controls">
        <label className="view-pick">
          <span>View</span>
          <select value={camMode} onChange={(e) => { if (e.target.value === "2d") useHq.getState().setView3d(false); else useHq.getState().setCamMode(e.target.value as CamMode); }}>
            {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            <option value="2d">Simple (flat)</option>
          </select>
        </label>
        {orbit && (
          <div className="view-turn" role="group" aria-label="Turn the view">
            <button type="button" onClick={() => spin.current(Math.PI / 4)} aria-label="Turn left">⟲</button>
            <button type="button" onClick={() => spin.current(-Math.PI / 4)} aria-label="Turn right">⟳</button>
          </div>
        )}
      </div>
      <p className="view-hint">
        {camMode === "iso" ? "" : "Drag to look around."}
      </p>

      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1.2)} disabled={!overview && zoom >= 2.2} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.2)} disabled={!overview && zoom <= 0.5} aria-label="Zoom out">−</button>
      </div>
      {orbit && (overview
        ? <p className="floor-note">Showing the whole floor. Move to follow yourself again.</p>
        : <button type="button" className="floor-btn" onClick={() => setOverview(true)}>Whole floor</button>)}
    </div>
  );
}
