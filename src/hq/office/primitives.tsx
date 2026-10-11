import { project } from "./iso";

export const pt = (x: number, y: number, z = 0) => project(x, y, z).join(",");

export type Material = "desk" | "dark" | "soft" | "gold" | "pot" | "wall" | "shade" | "green" | "trunk";

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bottom and top heights in screen pixels. */
  z0?: number;
  z1: number;
  m: Material;
}

/** An isometric cuboid: the top face and the two faces turned toward the viewer. */
export function Box({ x, y, w, h, z0 = 0, z1, m }: BoxProps) {
  const x1 = x + w;
  const y1 = y + h;
  return (
    <g className={`m-${m}`}>
      <polygon className="f-l" points={`${pt(x, y1, z1)} ${pt(x1, y1, z1)} ${pt(x1, y1, z0)} ${pt(x, y1, z0)}`} />
      <polygon className="f-r" points={`${pt(x1, y, z1)} ${pt(x1, y1, z1)} ${pt(x1, y1, z0)} ${pt(x1, y, z0)}`} />
      <polygon className="f-t" points={`${pt(x, y, z1)} ${pt(x1, y, z1)} ${pt(x1, y1, z1)} ${pt(x, y1, z1)}`} />
    </g>
  );
}

/** Points for an upright panel on a plane of constant y, spanning x and z. */
export const panelY = (y: number, xa: number, xb: number, za: number, zb: number) =>
  `${pt(xa, y, za)} ${pt(xb, y, za)} ${pt(xb, y, zb)} ${pt(xa, y, zb)}`;

/** Points for an upright panel on a plane of constant x, spanning y and z. */
export const panelX = (x: number, ya: number, yb: number, za: number, zb: number) =>
  `${pt(x, ya, za)} ${pt(x, yb, za)} ${pt(x, yb, zb)} ${pt(x, ya, zb)}`;
