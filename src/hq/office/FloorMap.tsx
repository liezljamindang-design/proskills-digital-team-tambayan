import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { HQ } from "../config";
import { ENTRANCE, FLOOR, FURNITURE, RUGS, WALL_HEIGHT, WALLS, ZONES } from "../data/office";
import { useMovement } from "../hooks/useMovement";
import { useHq } from "../store";
import { Figure } from "./Actors";
import { celebrants, isBirthday } from "../birthday";
import { statusOf } from "../status";
import { slotFor, wallRect, zoneAt, type Box } from "./engine";
import { Furniture } from "./Furniture";
import { project, rectPoints } from "./iso";
import { Box as Cuboid, panelX, panelY, pt } from "./primitives";

const SLAB = 14;

/**
 * The isometric office. Furniture and glass are sorted back to front once;
 * you and everyone else are slotted into that order by where you stand.
 */
export function FloorMap() {
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
  useMovement({ svgRef, cameraRef, avatarRef, boxesRef, onSlot });

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
      <svg ref={svgRef} viewBox="-470 -100 1070 650" className="floor-svg" aria-hidden="true" focusable="false">
        <g ref={cameraRef}>
          <polygon className="slab-side slab-side-left" points={leftFace} />
          <polygon className="slab-side slab-side-right" points={rightFace} />
          <polygon className="slab-top" points={rectPoints(0, 0, W, D)} />
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
            const [kx, ky] = project(x + 0.42, y + h - 0.42);
            const [tx, ty] = project(x + 0.78, y + h - 0.3);
            return (
              <g key={zone.id} className={`zone zone-${zone.id}${selected === zone.id ? " is-selected" : ""}`}>
                <polygon className="zone-plate" points={rectPoints(x, y, w, h, 0, 0.1)} />
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
              <text className="plaque-text" transform={`matrix(0.894 0.447 0 1 ${signX} ${signY})`} textAnchor="middle">{HQ.name.length > 30 ? "Tambayan" : HQ.name}</text>
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
            {[[7.5, 10.5]].map(([a, b]) => (
              <g key={a}>
                <polygon className="window" points={panelY(0, a, b, 50, 74)} />
                <polyline className="window-bar" points={`${pt((a + b) / 2, 0, 50)} ${pt((a + b) / 2, 0, 74)}`} />
              </g>
            ))}
            {[[0.8, 3.4], [5.4, 8.6]].map(([a, b]) => (
              <g key={a}>
                <polygon className="window" points={panelX(0, a, b, 32, 70)} />
                <polyline className="window-bar" points={`${pt(0, (a + b) / 2, 32)} ${pt(0, (a + b) / 2, 70)}`} />
                <polyline className="window-bar" points={`${pt(0, a, 51)} ${pt(0, b, 51)}`} />
              </g>
            ))}
            <polygon className="frame" points={panelY(0, 12.4, 16, 30, 70)} />
            <polygon className="screen" points={panelY(0, 12.5, 15.9, 33, 67)} />
            {[60, 53, 46, 39].map((z, i) => <polygon key={z} className={i === 0 ? "screen-gold" : "screen-line"} points={panelY(0, 12.8, 12.8 + [2.2, 2.6, 1.8, 2.3][i], z, z + 2.8)} />)}
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
