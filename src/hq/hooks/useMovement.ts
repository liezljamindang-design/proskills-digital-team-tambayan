import { useEffect } from "react";
import { HQ } from "../config";
import { earnForMeeting } from "../economy";
import { ARCADE_SPOT, BALL_SPOT, BED_FEET, FURNITURE, SEATS, START, WORLD, type Seat, PLAYGROUND } from "../data/office";
import { myPosition, openMeeting, pickUpBall, react, reportMove, setAct, shoot } from "../net/session";
import { canStand, findPath, SPEED, zoneAt, zoneEntry, type Point } from "../office/engine";
import { rideInfo } from "../rides";
import { useHq } from "../store";

const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1], ArrowDown: [1, 1], s: [1, 1], S: [1, 1],
  ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1], ArrowRight: [1, -1], d: [1, -1], D: [1, -1],
};

/** What a click landed on. */
export type Hit = { kind: "self" } | { kind: "peer"; id: string } | { kind: "seat"; id: string } | { kind: "arcade" } | { kind: "pingpong" } | { kind: "pickle" } | { kind: "ball" } | { kind: "hoop" } | { kind: "gym"; id: string } | { kind: "slide" } | { kind: "floor"; point: Point } | null;

/** How the office is drawn. The walking rules are the same whether it is the flat drawing or the 3D scene. */
export interface WalkView {
  /** Receives clicks and the mouse wheel. */
  element: Element;
  pick(e: MouseEvent): Hit;
  /** Draws you at `pos`. Returns true once the camera has caught up, so the loop can rest. */
  render(pos: Point, moving: boolean, dt: number): boolean;
  /** Called when you have moved, for views that need to re-sort what is in front of what. */
  moved?(pos: Point): void;
  /** Your own chibi was poked. */
  poke(dizzy: boolean): void;
  /** Turns a keyboard direction to match the camera, for views that can rotate. */
  steer?(dx: number, dy: number): [number, number];
  /** The zoom or whole-floor setting changed. */
  refresh?(): void;
}

/**
 * Drives your own avatar. Each step is handed to the view to draw and reported
 * to the network layer so other people see you move.
 */
export function useMovement(makeView: () => WalkView | null) {
  useEffect(() => {
    const view = makeView();
    if (!view) return;

    // Carry on from where you already are, so changing the view does not send you back to the entrance.
    const pos: Point = useHq.getState().joined ? { ...myPosition() } : { ...START };
    let path: Point[] = [];
    const held = new Set<string>();
    let zone = zoneAt(pos.x, pos.y), raf = 0, running = false, last = 0;
    function updateNearSeat() {
      let best: string | null = null, bestD = 1.0;
      for (const s of SEATS) { const d = Math.hypot(s.x - pos.x, s.y - pos.y); if (d < bestD) { bestD = d; best = s.furniture; } }
      if (best !== useHq.getState().nearSeat) useHq.setState({ nearSeat: best });
    }
    function updateSlot() {
      updateNearSeat();
      view!.moved?.(pos);
    }
    // Resting: sitting on the sofa or asleep on a bed. `restFrom` is where you were standing before.
    let pokes: number[] = [];
    let restFrom: Point | null = null, wasMoving = false, pendingSeat: string | null = null, pendingDo: (() => void) | null = null;
    const nearest = <T extends Point>(spots: T[]): T => {
      const taken = Object.values(useHq.getState().peers);
      const free = spots.filter((s) => !taken.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < 0.25));
      return (free.length ? free : spots).reduce((a, b) => (Math.hypot(a.x - pos.x, a.y - pos.y) <= Math.hypot(b.x - pos.x, b.y - pos.y) ? a : b));
    };
    function rest(pose: "sit" | "sleep", spots: (Point & Partial<Seat>)[]) {
      if (restFrom || !spots.length) return;
      const spot = nearest(spots);
      restFrom = { ...pos };
      pos.x = spot.x; pos.y = spot.y; path = [];
      updateSlot(); reportMove({ ...pos }); setAct({ pose, at: pose === "sit" ? { dx: spot.dx ?? 0, dy: spot.dy ?? -8 } : undefined, ride: undefined });
    }
    function getUp() {
      if (restFrom) { pos.x = restFrom.x; pos.y = restFrom.y; restFrom = null; updateSlot(); reportMove({ ...pos }); }
      const act = useHq.getState().me?.act;
      if (act?.pose || act?.gym || act?.band) setAct({ pose: undefined, at: undefined, gym: undefined, band: undefined });
    }
    const leaveOverview = () => { if (useHq.getState().overview) useHq.getState().setOverview(false); };

    /** Riding a bike or a car is quicker than walking. */
    const boost = () => rideInfo(useHq.getState().me?.act?.ride?.kind)?.speed ?? 1;
    function frame(now: number) {
      const dt = Math.min(0.12, (now - last) / 1000); // slow devices still walk at normal speed
      last = now;
      let moving = false, kx = 0, ky = 0;
      for (const k of held) { kx += KEY_DIRS[k][0]; ky += KEY_DIRS[k][1]; }
      if ((kx || ky) && view!.steer) [kx, ky] = view!.steer(kx, ky);
      if (kx || ky) {
        path = [];
        const len = Math.hypot(kx, ky), pace = SPEED * boost(), stepX = (kx / len) * pace * dt, stepY = (ky / len) * pace * dt;
        // Full step, then each axis alone, so the avatar slides along walls and furniture.
        if (canStand(pos.x + stepX, pos.y + stepY)) { pos.x += stepX; pos.y += stepY; moving = true; }
        else if (stepX && canStand(pos.x + stepX, pos.y)) { pos.x += stepX; moving = true; }
        else if (stepY && canStand(pos.x, pos.y + stepY)) { pos.y += stepY; moving = true; }
      } else if (path.length) {
        let budget = SPEED * boost() * dt;
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
          if (zone === "court" && me?.act?.ball) setAct({ ball: undefined });
          if (zone === "canteen" && z !== "canteen" && me?.act?.food) setAct({ food: undefined });
          if (z === "huddle") { openMeeting(HQ.meetingUrl); earnForMeeting(); }
          if (z === "focus") { openMeeting(HQ.classroomUrl); earnForMeeting(); }
          zone = z;
          useHq.getState().setMyZone(z);
          if (z) useHq.getState().selectZone(z);
        }
      }
      // Coming to a stop in the Sleeping Quarters puts you to bed.
      if (wasMoving && !moving && !held.size && !path.length && zone === "nap") rest("sleep", BED_FEET);
      // Arriving at a seat you clicked sits you down on it.
      if (wasMoving && !moving && !held.size && !path.length && pendingSeat) { const id = pendingSeat; pendingSeat = null; sitOn(id); }
      if (wasMoving && !moving && !held.size && !path.length && pendingDo) { const go = pendingDo; pendingDo = null; go(); }
      wasMoving = moving;

      const settled = view!.render(pos, moving, dt);
      if (moving || held.size || path.length || !settled) raf = requestAnimationFrame(frame);
      else running = false;
    }
    const seatsOf = (id: string) => SEATS.filter((s) => s.furniture === id);
    function sitOn(id: string) {
      const spots = seatsOf(id);
      if (spots.some((s) => Math.hypot(s.x - pos.x, s.y - pos.y) < 1.2)) rest("sit", spots);
    }
    /** Walks to the nearest place you can stand beside a seat, then sits. */
    function goSit(id: string) {
      const spots = seatsOf(id);
      if (!spots.length) return;
      const seat = spots.reduce((a, b) => (Math.hypot(a.x - pos.x, a.y - pos.y) <= Math.hypot(b.x - pos.x, b.y - pos.y) ? a : b));
      let stand: Point | null = null;
      for (const r of [0, 0.25, 0.45, 0.65, 0.9]) {
        for (let k = 0; k < 12 && !stand; k++) {
          const p = { x: seat.x + Math.cos((k * Math.PI) / 6) * r, y: seat.y + Math.sin((k * Math.PI) / 6) * r };
          if (canStand(p.x, p.y)) stand = p;
        }
        if (stand) break;
      }
      if (!stand) return;
      walkTo(stand);
      if (path.length) pendingSeat = id; else sitOn(id);
    }
    function kick() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    /** Walks to somewhere you can stand beside `target`, then does `then`. */
    function approach(target: Point, then: () => void) {
      let stand: Point | null = null;
      for (const r of [0, 0.3, 0.5, 0.75, 1, 1.3]) {
        for (let k = 0; k < 12 && !stand; k++) { const p = { x: target.x + Math.cos((k * Math.PI) / 6) * r, y: target.y + Math.sin((k * Math.PI) / 6) * r }; if (canStand(p.x, p.y)) stand = p; }
        if (stand) break;
      }
      if (!stand) return;
      walkTo(stand);
      if (path.length) pendingDo = then; else then();
    }
    /** Hop on a treadmill to run, or step up to the weights to lift. */
    function workout(id: string) {
      const f = FURNITURE.find((q) => q.id === id);
      if (!f) return;
      const run = f.kind === "treadmill", cx = f.x + f.w / 2;
      // Where you end up: on the belt, on the drum stool, behind the mic, or just in front of the stand or the weights.
      const spot = run ? { x: cx, y: f.y + 0.8 } : f.kind === "drums" ? { x: cx, y: f.y + 0.12 } : f.kind === "mic" ? { x: cx, y: f.y - 0.28 } : { x: cx, y: f.y + f.h + 0.3 };
      const act = run ? { gym: "run" as const } : f.kind === "weights" ? { gym: "lift" as const } : { band: f.kind === "drums" ? "drums" as const : f.kind === "mic" ? "mic" as const : f.id === "bass" ? "bass" as const : "guitar" as const };
      approach(run ? { x: spot.x, y: f.y + f.h + 0.25 } : spot, () => {
        restFrom = { ...pos }; pos.x = spot.x; pos.y = spot.y; path = [];
        updateSlot(); reportMove({ ...pos }); setAct({ gym: undefined, band: undefined, ride: undefined, ...act });
      });
    }
    /** Climb the ladder, whoosh down the slide and land in the ball pit. Everyone sees the slide. */
    let landing = 0;
    function slideDown() {
      approach(PLAYGROUND.ladder, () => {
        setAct({ slide: Date.now(), ride: undefined, pose: undefined, gym: undefined, band: undefined });
        window.clearTimeout(landing);
        landing = window.setTimeout(() => { pos.x = PLAYGROUND.land.x; pos.y = PLAYGROUND.land.y; path = []; updateSlot(); reportMove({ ...pos }); kick(); }, 1500);
      });
    }
    function walkTo(target: Point) { pendingSeat = null; pendingDo = null; leaveOverview(); getUp(); path = findPath(pos, target); kick(); }

    const blocked = () => { const s = useHq.getState(); return !s.joined || s.editingAvatar || s.helpOpen || s.gameOpen; };
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.key in KEY_DIRS) || e.metaKey || e.ctrlKey || e.altKey || blocked()) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      held.add(e.key); pendingSeat = null; pendingDo = null; leaveOverview(); getUp(); kick();
    }
    const onKeyUp = (e: KeyboardEvent) => { held.delete(e.key); };
    const onBlur = () => held.clear();

    function onClick(e: MouseEvent) {
      const hit = view!.pick(e);
      if (!hit) return;
      // Poking your own chibi makes it react. Poke it too many times and it gets dizzy.
      if (hit.kind === "self") {
        const now = performance.now();
        pokes = pokes.filter((t) => now - t < 3000); pokes.push(now);
        const dizzy = pokes.length >= 5;
        view!.poke(dizzy);
        const reactions = ["laugh", "wow", "shy", "love", "happy"] as const;
        react(dizzy ? "cry" : reactions[Math.floor(Math.random() * reactions.length)]);
        if (dizzy) { pokes = []; useHq.getState().showBubble(useHq.getState().me?.id ?? "", "Stop poking me! 😵", false); }
        return;
      }
      // Clicking a teammate opens their card: greet, message or challenge them.
      if (hit.kind === "peer") { useHq.getState().selectPeer(hit.id); return; }
      if (useHq.getState().selectedPeer) useHq.getState().selectPeer(null);
      // Clicking an arcade cabinet walks you into the Recreation Room, which opens the arcade.
      if (hit.kind === "arcade") { walkTo(ARCADE_SPOT); return; }
      if (hit.kind === "pingpong") { useHq.setState({ pongGame: "pong", pongMenu: true }); return; }
      if (hit.kind === "pickle") { useHq.setState({ pongGame: "pickle", pongMenu: true }); return; }
      if (hit.kind === "seat") { goSit(hit.id); return; }
      if (hit.kind === "gym") { workout(hit.id); return; }
      if (hit.kind === "slide") { slideDown(); return; }
      // Basketball: take a ball first, then tap a hoop to shoot from where you stand.
      if (hit.kind === "ball" || hit.kind === "hoop") {
        const st = useHq.getState();
        if (hit.kind === "hoop" && st.me?.act?.ball && st.myZone === "court") shoot(); else approach(BALL_SPOT, pickUpBall);
        return;
      }
      const f = hit.point;
      if (f.x < -0.6 || f.y < -0.6 || f.x > WORLD.width + 0.6 || f.y > WORLD.depth + 0.6) return;
      walkTo(f);
    }

    const unsubscribe = useHq.subscribe((s, prev) => {
      if (s.walkRequest && s.walkRequest !== prev.walkRequest) walkTo(zoneEntry(s.walkRequest.zone));
      if (s.overview !== prev.overview || s.zoom !== prev.zoom) { view.refresh?.(); kick(); }
      if (s.poseRequest && s.poseRequest !== prev.poseRequest) {
        if (s.poseRequest.pose === "sit") { const want = s.poseRequest.seat ?? "lounge-sofa"; if (/^(treadmill|weights|drums|guitar|bass|band-mic)/.test(want)) workout(want); else if (want === "ball") approach(BALL_SPOT, pickUpBall); else if (want === "slide") slideDown(); else goSit(want); } else { pendingSeat = null; getUp(); }
        kick();
      }
    });
    // Scrolling over the office zooms it. Ctrl/trackpad pinch arrives as a wheel event too.
    function onWheel(e: WheelEvent) {
      if (blocked()) return;
      e.preventDefault();
      useHq.getState().zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    }
    const target = view.element as HTMLElement;
    target.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlur);
    target.addEventListener("click", onClick as EventListener);

    updateSlot(); view.render(pos, false, 0); kick();
    return () => {
      cancelAnimationFrame(raf); unsubscribe(); target.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      target.removeEventListener("click", onClick as EventListener);
    };
  }, [makeView]);
}
