import { FLOOR } from "../data/office";
import { canStand } from "../office/engine";
import { DEFAULT_LOOK, HAIRS, OUTFITS, SKINS } from "../office/Chibi";
import { useHq } from "../store";

/**
 * A pretend crowd, for checking how the office copes with a full house.
 * Preview mode only (never on the live site): add ?crowd=100 to the address.
 */
export function startCrowd(count: number) {
  const pick = <T,>(list: readonly T[], i: number) => list[i % list.length];
  const spot = () => { for (let k = 0; k < 40; k++) { const x = 0.5 + Math.random() * (FLOOR.width - 1), y = 0.5 + Math.random() * (FLOOR.depth - 1); if (canStand(x, y)) return { x, y }; } return { x: 17, y: 20 }; };
  const walkers: { id: string; x: number; y: number; tx: number; ty: number }[] = [];
  for (let i = 0; i < count; i++) {
    const at = spot(), id = `crowd-${i}`;
    useHq.getState().upsertPeer({ id, name: `Member ${i + 1}`, role: "Team member", batch: (i % 13) + 1, batches: [(i % 13) + 1], look: { ...DEFAULT_LOOK, skin: pick(SKINS, i), hair: pick(HAIRS, i * 3), outfit: pick(OUTFITS, i * 5), fit: pick(["basic", "nerd", "funk", "cool", "sporty", "formal", "hoodie"] as const, i) }, ...at });
    walkers.push({ id, ...at, tx: at.x, ty: at.y });
  }
  // About a third of them are on the move at any moment, like a real office.
  window.setInterval(() => {
    for (const w of walkers) {
      if (Math.hypot(w.tx - w.x, w.ty - w.y) < 0.1) { if (Math.random() < 0.02) { const next = spot(); w.tx = next.x; w.ty = next.y; } continue; }
      const d = Math.hypot(w.tx - w.x, w.ty - w.y), step = Math.min(d, 0.36);
      w.x += ((w.tx - w.x) / d) * step; w.y += ((w.ty - w.y) / d) * step;
      useHq.getState().movePeer(w.id, w.x, w.y);
    }
  }, 150);
}
