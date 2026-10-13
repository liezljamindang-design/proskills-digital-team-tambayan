import { skyLabel, useSky } from "../sky";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { classOngoing, HQ } from "../config";
import { BALL_SPOT, COURT, DANCE_FLOOR, ENTRANCE, FLOOR, FURNITURE, PICKLE, PLAYGROUND, RUGS, WORLD, WALL_HEIGHT, WALLS, ZONES } from "../data/office";
import { useMovement, type WalkView } from "../hooks/useMovement";
import { useHq } from "../store";
import { Figure } from "./Actors";
import { celebrants, isBirthday } from "../birthday";
import { statusOf } from "../status";
import { sceneToFloor, slotFor, wallRect, zoneAt, type Box } from "./engine";
import { Furniture } from "./Furniture";
import { project, rectPoints } from "./iso";
import { Box as Cuboid, panelX, panelY, pt } from "./primitives";

const SLAB = 14;
/** A repeatable scatter, so the ball pit looks the same for everyone. */
const rnd = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };

/**
 * The isometric office. Furniture and glass are sorted back to front once;
 * you and everyone else are slotted into that order by where you stand.
 */
export function FloorMap() {
  const sky = useSky();
  const selected = useHq((s) => s.selectedZone);
  const overview = useHq((s) => s.overview);
  const setOverview = useHq((s) => s.setOverview);
  const zoom = useHq((s) => s.zoom);
  const zoomBy = useHq((s) => s.zoomBy);
  const me = useHq((s) => s.me);
  const myZone = useHq((s) => s.myZone);
  const peers = useHq((s) => s.peers);
  const bubbles = useHq((s) => s.bubbles);
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef<SVGGElement>(null);
  const avatarRef = useRef<SVGGElement>(null);
  const { width: W, depth: D } = FLOOR;

  const { nodes, boxes } = useMemo(() => {
    const layers: { depth: number; box: Box; node: ReactNode }[] = [];
    for (const item of FURNITURE) {
      const depth = item.x + item.w / 2 + item.y + item.h / 2;
      layers.push({ depth, box: { ...item, depth }, node: <Furniture key={item.id} item={item} /> });
    }
    for (const wall of WALLS) {
      const depth = wall.at + (wall.from + wall.to) / 2;
      const rect = wallRect(wall);
      const points = wall.axis === "x" ? panelX(wall.at, wall.from, wall.to, 0, wall.height) : panelY(wall.at, wall.from, wall.to, 0, wall.height);
      const node = wall.solid
        ? <g key={wall.id} className="partition"><Cuboid x={rect.x - 0.02} y={rect.y - 0.02} w={rect.w + 0.04} h={rect.h + 0.04} z1={wall.height} m="wall" /></g>
        : <polygon key={wall.id} className="glass" points={points} />;
      layers.push({ depth, box: { ...rect, depth }, node });
    }
    layers.sort((a, b) => a.depth - b.depth);
    return { nodes: layers.map((l) => l.node), boxes: layers.map((l) => l.box) };
  }, []);

  const [slot, setSlot] = useState(nodes.length);
  const onSlot = useCallback((next: number) => setSlot(next), []);
  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;
  const makeView = useCallback((): WalkView | null => {
    const svg = svgRef.current, camera = cameraRef.current, avatar = avatarRef.current;
    if (!svg || !camera || !avatar) return null;
    const CENTRE = { x: 190, y: 415 };
    const mobile = window.matchMedia("(max-width: 900px)"), reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cam = { x: CENTRE.x, y: CENTRE.y, z: 1 };
    let slotNow = -1, first = true;
    // Dragging (mouse or one finger) slides the view to look around; two fingers pinch to zoom. Walking brings the camera back to you.
    const off = { x: 0, y: 0 }, fingers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; moved: boolean } | null = null, swallowAt = 0, pinch = 0;
    const spread = () => { const [p, q] = [...fingers.values()]; return Math.hypot(p.x - q.x, p.y - q.y); };
    const place = () => camera.setAttribute("transform", `translate(${CENTRE.x} ${CENTRE.y}) scale(${cam.z.toFixed(4)}) translate(${(-cam.x).toFixed(2)} ${(-cam.y).toFixed(2)})`);
    const onDown = (e: PointerEvent) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) { pinch = spread(); if (drag) drag.moved = true; } else drag = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size >= 2) { const d = spread(); if (pinch > 0 && Math.abs(d - pinch) > 4) { useHq.getState().zoomBy(d / pinch); pinch = d; } return; }
      if (!drag || useHq.getState().overview) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true; drag.x = e.clientX; drag.y = e.clientY;
      const scale = camera.getScreenCTM()?.a || 1, mx = dx / scale, my = dy / scale;
      const nx = Math.min(700, Math.max(-700, off.x - mx)), ny = Math.min(450, Math.max(-450, off.y - my));
      cam.x += nx - off.x; cam.y += ny - off.y; off.x = nx; off.y = ny;
      place();
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (drag?.moved || pinch) swallowAt = performance.now();
      if (fingers.size < 2) pinch = 0;
      if (!fingers.size) drag = null; else if (drag) drag.moved = true;
    };
    // The office is rebuilt when the view changes, so the old listeners are dropped first.
    const w = window as unknown as { __flatDrag?: () => void };
    w.__flatDrag?.();
    svg.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    w.__flatDrag = () => { svg.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
    const goal = (pos: { x: number; y: number }) => {
      if (useHq.getState().overview) return { x: CENTRE.x, y: CENTRE.y, z: 1 };
      const [sx, sy] = project(pos.x, pos.y), zoom = useHq.getState().zoom;
      // The floor is large, so the camera stays close and follows you. "Whole floor" zooms back out.
      return mobile.matches ? { x: sx + off.x, y: sy - 14 + off.y, z: 3.6 * zoom } : { x: sx + off.x, y: sy - 20 + off.y, z: 2.7 * zoom };
    };
    return {
      element: svg,
      pick(e) {
        if (performance.now() - swallowAt < 400) return null;
        const target = e.target as Element;
        if (target.closest(".avatar")) return { kind: "self" };
        const person = target.closest<SVGGElement>("[data-peer]");
        if (person?.dataset.peer) return { kind: "peer", id: person.dataset.peer };
        if (target.closest("[data-open='game']")) return { kind: "arcade" };
        if (target.closest("[data-pingpong]")) return { kind: "pingpong" };
        if (target.closest("[data-pickle]")) return { kind: "pickle" };
        if (target.closest("[data-ball]")) return { kind: "ball" };
        if (target.closest("[data-hoop]")) return { kind: "hoop" };
        if (target.closest("[data-slide]")) return { kind: "slide" };
        const gym = target.closest<SVGGElement>("[data-gym]");
        if (gym?.dataset.gym) return { kind: "gym", id: gym.dataset.gym };
        const seat = target.closest<SVGGElement>("[data-seat]");
        if (seat?.dataset.seat) return { kind: "seat", id: seat.dataset.seat };
        const ctm = camera.getScreenCTM();
        if (!ctm) return null;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { kind: "floor", point: sceneToFloor(p.x, p.y) };
      },
      render(pos, moving, dt) {
        if (moving) { off.x = 0; off.y = 0; }
        const g = goal(pos), k = first || reduce.matches ? 1 : 1 - Math.exp(-dt * 3.2);
        first = false;
        cam.x += (g.x - cam.x) * k; cam.y += (g.y - cam.y) * k; cam.z += (g.z - cam.z) * k;
        const [sx, sy] = project(pos.x, pos.y);
        avatar.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
        avatar.classList.toggle("is-walking", moving);
        place();
        return Math.abs(g.x - cam.x) < 0.2 && Math.abs(g.y - cam.y) < 0.2 && Math.abs(g.z - cam.z) < 0.002;
      },
      moved(pos) { const next = slotFor(pos, boxesRef.current); if (next !== slotNow) { slotNow = next; onSlot(next); } },
      poke(dizzy) {
        avatar.classList.remove("is-boing", "is-dizzy");
        void avatar.getBoundingClientRect(); // restart the animation
        avatar.classList.add(dizzy ? "is-dizzy" : "is-boing");
      },
    };
  }, [onSlot]);
  useMovement(makeView);

  // Everyone on the floor, grouped by where they fall in the draw order.
  const actorsAt = new Map<number, ReactNode[]>();
  const place = (at: number, node: ReactNode) => actorsAt.set(at, [...(actorsAt.get(at) ?? []), node]);
  // One flat, keyed list, so React moves an existing element when someone changes slot instead of rebuilding it.
  const sceneChildren = (): ReactNode[] => {
    const out: ReactNode[] = [];
    nodes.forEach((node, i) => { out.push(...(actorsAt.get(i) ?? []), node); });
    out.push(...(actorsAt.get(nodes.length) ?? []));
    return out;
  };
  Object.values(peers)
    .sort((a, b) => a.x + a.y - (b.x + b.y))
    .forEach((p) => {
      const [sx, sy] = project(p.x, p.y);
      place(slotFor(p, boxes), (
        <g key={p.id} className="peer" data-peer={p.id} style={{ transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)` }}>
          <rect className="agent-hit" x={-18} y={-66} width={36} height={74} />
          <Figure look={p.look} name={p.name} bubble={bubbles[p.id]} status={statusOf(p, zoneAt(p.x, p.y))} act={p.act} party={isBirthday(p)} />
        </g>
      ));
    });
  place(slot, (
    <g key="me" ref={avatarRef} className="avatar">
      {me && <Figure look={me.look} name="You" bubble={bubbles[me.id]} status={statusOf(me, myZone)} act={me.act} party={isBirthday(me)} self />}
    </g>
  ));

  const leftFace = `${pt(0, D)} ${pt(W, D)} ${pt(W, D, -SLAB)} ${pt(0, D, -SLAB)}`;
  const rightFace = `${pt(W, 0)} ${pt(W, D)} ${pt(W, D, -SLAB)} ${pt(W, 0, -SLAB)}`;
  const [signX, signY] = project(3.25, 0, 50);
  const party = celebrants(me, peers);
  const partyNames = party.map((c) => c.name).join(" & ");

  return (
    <div className="floor">
      <p className="sky-badge" aria-label="Time in the Philippines">{skyLabel(sky)}</p>
      <svg ref={svgRef} viewBox="-730 -100 1840 1030" className="floor-svg" aria-hidden="true" focusable="false">
        <g ref={cameraRef}>
          <polygon className="slab-side slab-side-left" points={leftFace} />
          <polygon className="slab-side slab-side-right" points={rightFace} />
          <polygon className="lawn" points={`${pt(0, D, -SLAB)} ${pt(W, D, -SLAB)} ${pt(W, 0, -SLAB)} ${pt(WORLD.width, 0, -SLAB)} ${pt(WORLD.width, WORLD.depth, -SLAB)} ${pt(0, WORLD.depth, -SLAB)}`} />
          <polygon className="slab-top" points={rectPoints(0, 0, W, D)} />
          {/* The playground on the front lawn: a ball pit and a slide (tap it to go down). */}
          <g className="playground">
            {(() => {
              const P = PLAYGROUND, G = -SLAB, top = G + P.height * 36, s = P.slide, pit = P.pit;
              const dots = Array.from({ length: 90 }, (_, n) => ({ x: pit.x + 0.25 + rnd(n * 2 + 1) * (pit.w - 0.5), y: pit.y + 0.25 + rnd(n * 2 + 2) * (pit.h - 0.5), c: n % 6 }));
              return (
                <>
                  <polygon className="pit-rim" points={rectPoints(pit.x, pit.y, pit.w, pit.h, G + 6)} />
                  <polygon className="pit-fill" points={rectPoints(pit.x, pit.y, pit.w, pit.h, G + 5, 0.18)} />
                  {dots.map((d, i) => { const [cx, cy] = project(d.x, d.y, G + 7); return <circle key={i} className={`pit-ball pit-ball-${d.c}`} cx={cx} cy={cy} r={2.6} />; })}
                  <g className="slide-set" data-slide="1">
                    {[[s.x, s.y], [s.x + 1.1, s.y], [s.x, s.y + 1.1], [s.x + 1.1, s.y + 1.1]].map(([px, py]) => <polyline key={`${px}-${py}`} className="slide-post" points={`${pt(px + 0.05, py + 0.05, G)} ${pt(px + 0.05, py + 0.05, top + 20)}`} />)}
                    <polygon className="slide-deck" points={rectPoints(s.x, s.y, 1.2, s.h, top)} />
                    <polygon className="slide-chute" points={`${pt(s.x + 1.2, P.top.y - 0.3, top)} ${pt(s.x + 1.2, P.top.y + 0.3, top)} ${pt(pit.x + 0.5, P.top.y + 0.3, G + 5)} ${pt(pit.x + 0.5, P.top.y - 0.3, G + 5)}`} />
                    <polygon className="slide-roof" points={`${pt(s.x + 0.6, s.y + 0.6, top + 40)} ${pt(s.x - 0.1, s.y + 1.3, top + 20)} ${pt(s.x + 1.3, s.y + 1.3, top + 20)}`} />
                  </g>
                </>
              );
            })()}
          </g>
          <g className="marble">
            {Array.from({ length: W / 2 - 1 }, (_, i) => (i + 1) * 2).map((x) => <polyline key={`x${x}`} className="tile-line" points={`${pt(x, 0)} ${pt(x, D)}`} />)}
            {Array.from({ length: D / 2 - 1 }, (_, i) => (i + 1) * 2).map((y) => <polyline key={`y${y}`} className="tile-line" points={`${pt(0, y)} ${pt(W, y)}`} />)}
          </g>

          <polygon className="wall wall-right" points={panelY(0, 0, W, 0, WALL_HEIGHT)} />
          <polygon className="wall wall-left" points={panelX(0, 0, D, 0, WALL_HEIGHT)} />
          {/* Three bright stripes run along both walls */}
          {(["stripe-a", "stripe-b", "stripe-c"] as const).map((c, i) => (
            <polyline key={c} className={`stripe ${c}`} points={`${pt(0, D, 8 + i * 4)} ${pt(0, 0, 8 + i * 4)} ${pt(W, 0, 8 + i * 4)}`} />
          ))}
          <polyline className="wall-cap" points={`${pt(0, D, WALL_HEIGHT)} ${pt(0, 0, WALL_HEIGHT)} ${pt(W, 0, WALL_HEIGHT)}`} />

          <polyline className="entrance" points={`${pt(ENTRANCE.from, D)} ${pt(ENTRANCE.to, D)}`} />

          {ZONES.map((zone) => {
            const { x, y, w, h } = zone.rect;
            const zz = zone.id === "play" ? -SLAB : 0; // the playground is outside, on the lawn
            const [kx, ky] = project(x + 0.42, y + h - 0.42, zz);
            const [tx, ty] = project(x + 0.78, y + h - 0.3, zz);
            return (
              <g key={zone.id} className={`zone zone-${zone.id}${selected === zone.id ? " is-selected" : ""}`}>
                <polygon className="zone-plate" points={rectPoints(x, y, w, h, zz, 0.1)} />
                <text className="zone-name" transform={`matrix(0.894 0.447 -0.894 0.447 ${tx} ${ty})`}>{zone.name}</text>
                <circle className="zone-key" cx={kx} cy={ky} r={8.5} />
                <text className="zone-key-text" x={kx} y={ky + 3.4} textAnchor="middle">{zone.key}</text>
              </g>
            );
          })}

          {/* Room floors: wood planks in the lounge, deck boards outside, tiles in the café */}
          <g className="floors">
            {Array.from({ length: 11 }, (_, i) => 0.5 + i * 0.5).map((x) => <polyline key={`lp${x}`} className="plank" points={`${pt(x, 5.1)} ${pt(x, 9.1)}`} />)}
            {Array.from({ length: 8 }, (_, i) => 5.5 + i * 0.5).map((y) => <polyline key={`dk${y}`} className="plank plank-deck" points={`${pt(12.1, y)} ${pt(17.9, y)}`} />)}
            {Array.from({ length: 9 * 6 }, (_, i) => ({ cx: i % 9, cy: Math.floor(i / 9) })).filter((c) => (c.cx + c.cy) % 2 === 0).map((c) => (
              <polygon key={`ck${c.cx}-${c.cy}`} className="check" points={rectPoints(11.6 + c.cx * 0.7, c.cy * 0.68 + 0.08, 0.7, 0.68)} />
            ))}
            {[10.4, 11.4, 12.4, 13.4].map((y) => <polyline key={`ng${y}`} className="neon-line" points={`${pt(0.1, y)} ${pt(5.9, y)}`} />)}
            {[1, 2, 3, 4, 5].map((x) => <polyline key={`nx${x}`} className="neon-line" points={`${pt(x, 9.9)} ${pt(x, 13.9)}`} />)}
            <ellipse className="plaza" cx={project(9, 7.85)[0]} cy={project(9, 7.85)[1]} rx={62} ry={31} />
            <ellipse className="plaza-ring" cx={project(9, 7.85)[0]} cy={project(9, 7.85)[1]} rx={50} ry={25} />
          </g>

          <g className="rugs">
            {Array.from({ length: 30 }, (_, k) => { const i = k % 6, j = Math.floor(k / 6), d = DANCE_FLOOR; return <polygon key={k} className="dance-tile" fill={["#ff4fa3", "#35c9ff", "#ffd43b", "#7ee08f"][(i * 3 + j * 5) % 4]} points={rectPoints(d.x + (d.w / 6) * i, d.y + (d.h / 5) * j, d.w / 6, d.h / 5, 0, 0.03)} />; })}
            <polygon className="screen" points={panelY(7.08, 27.4, 33.1, 18, 70)} />
            {(() => { const [wx, wy] = project((ENTRANCE.from + ENTRANCE.to) / 2 - 0.2, D - 2.4); return (
              <g className="welcome-mat" transform={`matrix(0.894 0.447 -0.894 0.447 ${wx} ${wy})`} textAnchor="middle">
                <text className="welcome-small" y={-13}>Welcome to</text>
                <text className="welcome-big">{HQ.name}</text>
              </g>
            ); })()}
            <polygon className="court" points={rectPoints(COURT.x, COURT.y, COURT.w, COURT.h, 0, 0)} />
            <polyline className="court-line" points={`${pt(COURT.x + COURT.w / 2, COURT.y)} ${pt(COURT.x + COURT.w / 2, COURT.y + COURT.h)}`} />
            <polygon className="court-line" points={rectPoints(COURT.x + COURT.w / 2 - 0.8, COURT.y + COURT.h / 2 - 0.8, 1.6, 1.6, 0, 0)} />
            <g className="seat" data-pickle="">
              <polygon className="pickle-out" points={rectPoints(PICKLE.x - 0.3, PICKLE.y - 0.3, PICKLE.w + 0.6, PICKLE.h + 0.6, 0, 0)} />
              <polygon className="pickle-court" points={rectPoints(PICKLE.x, PICKLE.y, PICKLE.w, PICKLE.h, 0, 0)} />
              <polygon className="pickle-kitchen" points={rectPoints(PICKLE.x, PICKLE.y + PICKLE.h / 2 - 0.7, PICKLE.w, 1.4, 0, 0)} />
              <polyline className="court-line" points={`${pt(PICKLE.x - 0.1, PICKLE.y + PICKLE.h / 2, 14)} ${pt(PICKLE.x + PICKLE.w + 0.1, PICKLE.y + PICKLE.h / 2, 14)}`} />
            </g>
            <g className="seat" data-ball="">{[[0, 0], [0.32, 0.1], [0.12, 0.32]].map(([bx, by]) => { const [cx, cy] = project(BALL_SPOT.x + bx, BALL_SPOT.y + by, 4); return <circle key={bx} cx={cx} cy={cy} r={4.2} fill="#ff922b" stroke="#b85c00" strokeWidth={0.8} />; })}</g>
            {RUGS.map((r) => (
              <g key={r.id}>
                <polygon className="rug" points={rectPoints(r.x, r.y, r.w, r.h)} />
                <polygon className="rug-edge" points={rectPoints(r.x, r.y, r.w, r.h, 0, 0.12)} />
              </g>
            ))}
          </g>

          {/* Wall pieces: the name sign, the café menu, lounge art and the game scoreboard */}
          <g className="displays">
            <polygon className="plaque" points={panelY(0, 0.4, 6.1, 36, 68)} />
            {party.length > 0 ? (
              <g transform={`matrix(0.894 0.447 0 1 ${signX} ${signY})`} textAnchor="middle">
                <text className="plaque-text plaque-party" y={-9}>Happy Birthday</text>
                <text className="plaque-text plaque-name" y={9}>{partyNames.length > 20 ? `${partyNames.slice(0, 19)}…` : partyNames}!</text>
              </g>
            ) : (
              <g transform={`matrix(0.894 0.447 0 1 ${signX} ${signY})`} textAnchor="middle">
                <text className="plaque-text" y={-9}>{HQ.classTitle}</text>
                <text className="plaque-text plaque-sub" y={2}>Monday to Friday</text>
                <text className="plaque-text plaque-sub" y={11}>{HQ.classSchedule} - {classOngoing() ? "Class Ongoing" : "No Class Ongoing"}</text>
              </g>
            )}
            {party.length > 0 && (
              <g className="party">
                {/* Bunting along both walls, and balloons either side of the banner */}
                {Array.from({ length: 40 }, (_, i) => {
                  // Flags down the left wall, then along the back wall.
                  const at = (d: number, z: number) => (i < 17 ? pt(0, 13.7 - i * 0.8 - d, z) : pt(0.2 + (i - 17) * 0.8 + d, 0, z));
                  return <polygon key={i} className={`flag flag-${i % 3}`} points={`${at(0, 78)} ${at(0.5, 78)} ${at(0.25, 68)}`} />;
                })}
                {[0.4, 6.1, 11.4, 16.6, 17.6].map((x, i) => {
                  const [bx, by] = project(x, 0, 56 + (i % 2) * 6);
                  return (
                    <g key={x} className={`balloon flag-${i % 3}`}>
                      <path d={`M${bx} ${by + 8} q2 8 -1 16`} fill="none" stroke="var(--ink-2)" strokeWidth={0.5} />
                      <ellipse cx={bx} cy={by} rx={6} ry={8} />
                    </g>
                  );
                })}
              </g>
            )}
            {/* Windows with a sky view, the café menu, lounge art and the arcade scoreboard */}
            <polygon className="plaque" points={panelY(0, 7.3, 10.7, 42, 72)} />
            {(() => { const [cx, cy] = project(9, 0, 57); return (
              <g transform={`matrix(0.894 0.447 0 1 ${cx} ${cy})`} textAnchor="middle">
                <text className="plaque-text" y={-3}>Tara Collab!</text>
                <text className="plaque-text plaque-sub" y={9}>Open sa lahat</text>
              </g>
            ); })()}
            {[[0.8, 3.4], [5.4, 8.6]].map(([a, b]) => (
              <g key={a}>
                <polygon className="window" points={panelX(0, a, b, 32, 70)} />
                <polyline className="window-bar" points={`${pt(0, (a + b) / 2, 32)} ${pt(0, (a + b) / 2, 70)}`} />
                <polyline className="window-bar" points={`${pt(0, a, 51)} ${pt(0, b, 51)}`} />
              </g>
            ))}
            <polygon className="frame" points={panelY(0, 12.4, 16, 30, 70)} />
            <polygon className="chalkboard" points={panelY(0, 12.5, 15.9, 33, 67)} />
            {(() => { const [cx, cy] = project(14.2, 0, 50); return (
              <g transform={`matrix(0.894 0.447 0 1 ${cx} ${cy})`} textAnchor="middle">
                <text className="chalk-text" y={-3}>☕ Libreng kape</text>
                <text className="chalk-text chalk-gold" y={9}>ni Arnold!</text>
              </g>
            ); })()}
            <polygon className="frame" points={panelX(0, 10.4, 13.4, 28, 70)} />
            <polygon className="screen" points={panelX(0, 10.5, 13.3, 31, 67)} />
            {[0, 1, 2, 3, 4].map((i) => <polygon key={i} className={i % 2 ? "screen-alert" : "screen-gold"} points={panelX(0, 12.8 - i * 0.5, 13.15 - i * 0.5, 35, 41 + [20, 12, 24, 9, 16][i])} />)}
            <polygon className="display-hit" data-open="game" points={panelX(0, 10.4, 13.4, 28, 70)} />
          </g>

          <g className="scene">
            {sceneChildren()}
          </g>
        </g>
      </svg>
      <div className="view-controls">
        <button type="button" className="floor-btn view-3d-btn" onClick={() => useHq.getState().setView3d(true)}>Switch to 3D view</button>
      </div>
      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1.2)} disabled={!overview && zoom >= 2.2} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.2)} disabled={!overview && zoom <= 0.5} aria-label="Zoom out">−</button>
      </div>
      {overview ? (
        <p className="floor-note">Showing the whole floor. Move to follow yourself again.</p>
      ) : (
        <button type="button" className="floor-btn" onClick={() => setOverview(true)}>Whole floor</button>
      )}
    </div>
  );
}
