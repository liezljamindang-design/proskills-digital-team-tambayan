import { useEffect, type RefObject } from "react";
import { HQ } from "../config";
import { ARCADE_SPOT, BED_FEET, FLOOR, SOFA_SEATS, START } from "../data/office";
import { openMeeting, reportMove, setAct, updateMyProfile } from "../net/session";
import { WORK_STATUSES } from "../status";
import { canStand, findPath, sceneToFloor, slotFor, SPEED, zoneAt, zoneEntry, type Box, type Point } from "../office/engine";
import { project } from "../office/iso";
import { useHq } from "../store";

const CENTRE = { x: 65, y: 225 };
const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1], ArrowDown: [1, 1], s: [1, 1], S: [1, 1],
  ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1], ArrowRight: [1, -1], d: [1, -1], D: [1, -1],
};

interface Options {
  svgRef: RefObject<SVGSVGElement | null>;
  cameraRef: RefObject<SVGGElement | null>;
  avatarRef: RefObject<SVGGElement | null>;
  boxesRef: RefObject<Box[]>;
  onSlot: (slot: number) => void;
}

/**
 * Drives your own avatar and the camera. Positions are written straight to the
 * SVG each frame, so walking never re-renders React, and each step is reported
 * to the network layer so other people see you move.
 */
export function useMovement({ svgRef, cameraRef, avatarRef, boxesRef, onSlot }: Options) {
  useEffect(() => {
    const svg = svgRef.current, camera = cameraRef.current, avatar = avatarRef.current;
    if (!svg || !camera || !avatar) return;

    const pos: Point = { ...START };
    let path: Point[] = [];
    const held = new Set<string>();
    let zone = zoneAt(pos.x, pos.y), slot = -1, raf = 0, running = false, last = 0;
    const mobile = window.matchMedia("(max-width: 900px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cam = { x: CENTRE.x, y: CENTRE.y, z: 1 };

    function cameraGoal() {
      if (useHq.getState().overview) return { x: CENTRE.x, y: CENTRE.y, z: 1 };
      const [sx, sy] = project(pos.x, pos.y);
      if (mobile.matches) return { x: sx, y: sy - 14, z: 2.1 };
      // The floor is large, so the camera stays close and follows you. "Whole floor" zooms back out.
      return { x: sx, y: sy - 20, z: 1.55 };
    }
    function updateSlot() {
      const next = slotFor(pos, boxesRef.current);
      if (next !== slot) { slot = next; onSlot(next); }
    }
    function draw() {
      const [sx, sy] = project(pos.x, pos.y);
      avatar!.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      camera!.setAttribute("transform", `translate(${CENTRE.x} ${CENTRE.y}) scale(${cam.z.toFixed(4)}) translate(${(-cam.x).toFixed(2)} ${(-cam.y).toFixed(2)})`);
    }
    // Resting: sitting on the sofa or asleep on a bed. `restFrom` is where you were standing before.
    let restFrom: Point | null = null, wasMoving = false;
    const nearest = (spots: Point[]) => {
      const taken = Object.values(useHq.getState().peers);
      const free = spots.filter((s) => !taken.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < 0.25));
      return (free.length ? free : spots).reduce((a, b) => (Math.hypot(a.x - pos.x, a.y - pos.y) <= Math.hypot(b.x - pos.x, b.y - pos.y) ? a : b));
    };
    function rest(pose: "sit" | "sleep", spots: Point[]) {
      if (restFrom || !spots.length) return;
      const spot = nearest(spots);
      restFrom = { ...pos };
      pos.x = spot.x; pos.y = spot.y; path = [];
      updateSlot(); reportMove({ ...pos }); setAct({ pose });
    }
    function getUp() {
      if (restFrom) { pos.x = restFrom.x; pos.y = restFrom.y; restFrom = null; updateSlot(); reportMove({ ...pos }); }
      if (useHq.getState().me?.act?.pose) setAct({ pose: undefined });
    }
    const leaveOverview = () => { if (useHq.getState().overview) useHq.getState().setOverview(false); };

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false, kx = 0, ky = 0;
      for (const k of held) { kx += KEY_DIRS[k][0]; ky += KEY_DIRS[k][1]; }
      if (kx || ky) {
        path = [];
        const len = Math.hypot(kx, ky), stepX = (kx / len) * SPEED * dt, stepY = (ky / len) * SPEED * dt;
        // Full step, then each axis alone, so the avatar slides along walls and furniture.
        if (canStand(pos.x + stepX, pos.y + stepY)) { pos.x += stepX; pos.y += stepY; moving = true; }
        else if (stepX && canStand(pos.x + stepX, pos.y)) { pos.x += stepX; moving = true; }
        else if (stepY && canStand(pos.x, pos.y + stepY)) { pos.y += stepY; moving = true; }
      } else if (path.length) {
        let budget = SPEED * dt;
        while (budget > 0 && path.length) {
          const t = path[0], d = Math.hypot(t.x - pos.x, t.y - pos.y);
          if (d <= budget) { pos.x = t.x; pos.y = t.y; budget -= d; path.shift(); }
          else { pos.x += ((t.x - pos.x) / d) * budget; pos.y += ((t.y - pos.y) / d) * budget; budget = 0; }
        }
        moving = true;
      }
      if (moving) {
        updateSlot();
        reportMove({ x: +pos.x.toFixed(3), y: +pos.y.toFixed(3) });
        const z = zoneAt(pos.x, pos.y);
        if (z !== zone) {
          // Walking into the Recreation Room opens the arcade; walking out closes it.
          if (z === "game") useHq.getState().setGameOpen(true);
          else if (zone === "game") useHq.getState().setGameOpen(false);
          // Work statuses belong to the Work Room, so they are dropped on the way out.
          const me = useHq.getState().me;
          if (zone === "focus" && me?.status && WORK_STATUSES.includes(me.status)) updateMyProfile({ ...me, status: undefined });
          if (z === "huddle") openMeeting(HQ.meetingUrl);
          zone = z;
          useHq.getState().setMyZone(z);
          if (z) useHq.getState().selectZone(z);
        }
      }
      avatar!.classList.toggle("is-walking", moving);
      // Coming to a stop in the Sleeping Quarters puts you to bed.
      if (wasMoving && !moving && !held.size && !path.length && zone === "nap") rest("sleep", BED_FEET);
      wasMoving = moving;

      const goal = cameraGoal(), k = reduce.matches ? 1 : 1 - Math.exp(-dt * 3.2);
      cam.x += (goal.x - cam.x) * k; cam.y += (goal.y - cam.y) * k; cam.z += (goal.z - cam.z) * k;
      const settled = Math.abs(goal.x - cam.x) < 0.2 && Math.abs(goal.y - cam.y) < 0.2 && Math.abs(goal.z - cam.z) < 0.002;
      draw();
      if (moving || held.size || path.length || !settled) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function kick() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function walkTo(target: Point) { leaveOverview(); getUp(); path = findPath(pos, target); kick(); }

    const blocked = () => { const s = useHq.getState(); return !s.joined || s.editingAvatar || s.helpOpen || s.gameOpen; };
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.key in KEY_DIRS) || e.metaKey || e.ctrlKey || e.altKey || blocked()) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      held.add(e.key); leaveOverview(); getUp(); kick();
    }
    const onKeyUp = (e: KeyboardEvent) => { held.delete(e.key); };
    const onBlur = () => held.clear();

    function onClick(e: MouseEvent) {
      const target = e.target as Element;
      // Clicking a person opens a private chat with them.
      const person = target.closest<SVGGElement>("[data-peer]");
      if (person?.dataset.peer) { useHq.getState().openThread(person.dataset.peer); return; }
      // Clicking an arcade cabinet walks you into the Recreation Room, which opens the arcade.
      if (target.closest("[data-open='game']")) { walkTo(ARCADE_SPOT); return; }
      const ctm = camera!.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const f = sceneToFloor(p.x, p.y);
      if (f.x < -0.6 || f.y < -0.6 || f.x > FLOOR.width + 0.6 || f.y > FLOOR.depth + 0.6) return;
      walkTo(f);
    }

    const unsubscribe = useHq.subscribe((s, prev) => {
      if (s.walkRequest && s.walkRequest !== prev.walkRequest) walkTo(zoneEntry(s.walkRequest.zone));
      if (s.overview !== prev.overview) kick();
      if (s.poseRequest && s.poseRequest !== prev.poseRequest) {
        if (s.poseRequest.pose === "sit") rest("sit", SOFA_SEATS); else getUp();
        kick();
      }
    });
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlur);
    svg.addEventListener("click", onClick); mobile.addEventListener("change", kick);

    Object.assign(cam, cameraGoal()); updateSlot(); draw();
    return () => {
      cancelAnimationFrame(raf); unsubscribe();
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      svg.removeEventListener("click", onClick); mobile.removeEventListener("change", kick);
    };
  }, [svgRef, cameraRef, avatarRef, boxesRef, onSlot]);
}
