import { useEffect, useRef, useState } from "react";
import { setAct } from "../net/session";
import { useHq } from "../store";
import { Dialog } from "./Dialog";

/** What's in the fridge and the pantry. */
const INGREDIENTS: { id: string; emoji: string; label: string; where: "fridge" | "pantry" }[] = [
  { id: "chicken", emoji: "🍗", label: "Manok", where: "fridge" }, { id: "pork", emoji: "🥓", label: "Baboy", where: "fridge" },
  { id: "fish", emoji: "🐟", label: "Isda", where: "fridge" }, { id: "egg", emoji: "🥚", label: "Itlog", where: "fridge" },
  { id: "tomato", emoji: "🍅", label: "Kamatis", where: "fridge" }, { id: "kangkong", emoji: "🥬", label: "Kangkong", where: "fridge" },
  { id: "carrot", emoji: "🥕", label: "Carrots", where: "fridge" }, { id: "eggplant", emoji: "🍆", label: "Talong", where: "fridge" },
  { id: "milk", emoji: "🥛", label: "Gatas", where: "fridge" }, { id: "mango", emoji: "🥭", label: "Mangga", where: "fridge" },
  { id: "banana", emoji: "🍌", label: "Saging", where: "fridge" }, { id: "ice", emoji: "🧊", label: "Yelo", where: "fridge" },
  { id: "rice", emoji: "🍚", label: "Kanin", where: "pantry" }, { id: "noodles", emoji: "🍝", label: "Bihon", where: "pantry" },
  { id: "garlic", emoji: "🧄", label: "Bawang", where: "pantry" }, { id: "onion", emoji: "🧅", label: "Sibuyas", where: "pantry" },
  { id: "ginger", emoji: "🫚", label: "Luya", where: "pantry" }, { id: "soy", emoji: "🫙", label: "Toyo", where: "pantry" },
  { id: "vinegar", emoji: "🍶", label: "Suka", where: "pantry" }, { id: "sampalok", emoji: "🍋", label: "Sampalok", where: "pantry" },
];
const byId = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

/** What you can make. The dish with the most of its ingredients in the pan wins. */
const RECIPES: { needs: string[]; emoji: string; name: string }[] = [
  { needs: ["chicken", "soy", "vinegar", "garlic"], emoji: "🍛", name: "Chicken adobo" },
  { needs: ["pork", "sampalok", "tomato", "kangkong"], emoji: "🍲", name: "Sinigang na baboy" },
  { needs: ["chicken", "ginger", "onion"], emoji: "🍲", name: "Tinola" },
  { needs: ["noodles", "carrot", "soy"], emoji: "🍜", name: "Pancit bihon" },
  { needs: ["rice", "garlic", "egg"], emoji: "🍳", name: "Sinangag at itlog" },
  { needs: ["eggplant", "egg"], emoji: "🥚", name: "Tortang talong" },
  { needs: ["fish", "vinegar"], emoji: "🐟", name: "Paksiw na isda" },
  { needs: ["fish"], emoji: "🐟", name: "Pritong isda" },
  { needs: ["ice", "milk", "banana"], emoji: "🍧", name: "Halo-halo" },
  { needs: ["mango", "milk"], emoji: "🥭", name: "Mango shake" },
];
function cook(pan: string[]) {
  let best: (typeof RECIPES)[number] | null = null, score = 0;
  for (const r of RECIPES) {
    const have = r.needs.filter((n) => pan.includes(n)).length;
    if (have === r.needs.length && have > score) { best = r; score = have; }
  }
  return best ?? { emoji: "🥘", name: "Lutong bahay special" };
}

/**
 * The canteen kitchen, Toca-style: open the fridge, drag ingredients into the kawali (or tap them),
 * turn on the stove, and eat what you made. Your chibi then eats it in the office.
 */
export function Kitchen() {
  const open = useHq((s) => s.kitchenOpen);
  const [fridge, setFridge] = useState(false);
  const [pan, setPan] = useState<string[]>([]);
  const [stage, setStage] = useState<"prep" | "cooking" | "done">("prep");
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const panRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setFridge(false); setPan([]); setStage("prep"); } }, [open]);
  useEffect(() => {
    if (stage !== "cooking") return;
    const t = window.setTimeout(() => setStage("done"), 3200);
    return () => window.clearTimeout(t);
  }, [stage]);
  const close = () => useHq.setState({ kitchenOpen: false });
  const add = (id: string) => { if (stage === "prep") setPan((p) => (p.length >= 6 ? p : [...p, id])); };
  const dish = cook(pan);

  function startDrag(id: string, e: React.PointerEvent) {
    const sx = e.clientX, sy = e.clientY; let moved = false;
    const inside = (x: number, y: number) => { const r = panRef.current?.getBoundingClientRect(); return Boolean(r && x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 20 && y <= r.bottom + 20); };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      moved = true; setDrag({ id, x: ev.clientX, y: ev.clientY }); setOver(inside(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if (!moved || inside(ev.clientX, ev.clientY)) add(id); // a plain tap drops it in too
      setDrag(null); setOver(false);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  const item = (i: (typeof INGREDIENTS)[number]) => (
    <button key={i.id} type="button" className="kt-item" aria-label={`Add ${i.label}`} onPointerDown={(e) => startDrag(i.id, e)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); add(i.id); } }}>
      <span aria-hidden="true">{i.emoji}</span><small>{i.label}</small>
    </button>
  );

  return (
    <Dialog open={open} onClose={close} labelledBy="kitchen-title">
      <div className="kitchen">
        <header className="wd-head"><div><p className="eyebrow">Canteen kitchen</p><h2 id="kitchen-title">Luto tayo! 🍳</h2></div><button type="button" className="room-card-close" style={{ position: "static" }} aria-label="Close the kitchen" onClick={close}>×</button></header>
        <div className="kt-body">
          <div className="kt-storage">
            <button type="button" className={`kt-fridge${fridge ? " is-open" : ""}`} onClick={() => setFridge((f) => !f)} aria-expanded={fridge}>
              <span className="kt-door" aria-hidden="true"><span className="kt-handle" /></span>
              <span className="kt-door-label">{fridge ? "Close the fridge" : "Tap to open the fridge"}</span>
            </button>
            {fridge && <div className="kt-shelf kt-cold">{INGREDIENTS.filter((i) => i.where === "fridge").map(item)}</div>}
            <p className="kt-shelf-title">Pantry</p>
            <div className="kt-shelf">{INGREDIENTS.filter((i) => i.where === "pantry").map(item)}</div>
          </div>
          <div className="kt-stove">
            <div ref={panRef} className={`kt-pan${over ? " is-over" : ""}${stage === "cooking" ? " is-cooking" : ""}`}>
              {stage === "done"
                ? <span className="kt-dish" aria-live="polite">{dish.emoji}</span>
                : pan.length ? pan.map((id, n) => <span key={n} className="kt-in" style={{ ["--n" as string]: n }}>{byId[id].emoji}</span>) : <span className="kt-empty">Drag ingredients here</span>}
              {stage === "cooking" && <span className="kt-steam" aria-hidden="true">💨 💨</span>}
            </div>
            <div className={`kt-flame${stage === "cooking" ? " is-on" : ""}`} aria-hidden="true">🔥🔥🔥</div>
            {stage === "prep" && (
              <div className="room-actions">
                <button type="button" className="btn-primary" disabled={!pan.length} onClick={() => setStage("cooking")}>🔥 Lutuin! (Cook)</button>
                {pan.length > 0 && <button type="button" className="btn-secondary" onClick={() => setPan([])}>🗑️ Start over</button>}
              </div>
            )}
            {stage === "cooking" && <p className="kt-status">Tsssss… cooking! 👩‍🍳</p>}
            {stage === "done" && (
              <>
                <p className="kt-status">✨ You made <strong>{dish.name}</strong>!</p>
                <div className="room-actions">
                  <button type="button" className="btn-primary" onClick={() => { setAct({ food: dish.emoji }); close(); }}>😋 Kainin! (Eat)</button>
                  <button type="button" className="btn-secondary" onClick={() => { setPan([]); setStage("prep"); }}>Cook again</button>
                </div>
              </>
            )}
            <p className="kt-tip">Try: manok + toyo + suka + bawang, or kanin + bawang + itlog.</p>
          </div>
        </div>
      </div>
      {drag && <div className="wd-ghost kt-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{byId[drag.id].emoji}</div>}
    </Dialog>
  );
}
