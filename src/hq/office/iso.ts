/** Isometric projection: one floor unit is a 64 x 32 diamond on screen. */
const TILE_W = 64;
const TILE_H = 32;

export function project(x: number, y: number, z = 0): [number, number] {
  return [((x - y) * TILE_W) / 2, ((x + y) * TILE_H) / 2 - z];
}

/** SVG points string for a floor rectangle, optionally raised by z and inset on each side. */
export function rectPoints(x: number, y: number, w: number, h: number, z = 0, inset = 0): string {
  const x0 = x + inset;
  const y0 = y + inset;
  const x1 = x + w - inset;
  const y1 = y + h - inset;
  return [project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]
    .map((p) => p.join(","))
    .join(" ");
}
