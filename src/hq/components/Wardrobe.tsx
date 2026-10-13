import { useEffect, useRef, useState } from "react";
import { onSale, saveLook, SHOP } from "../economy";
import { ACCESSORIES, DEFAULT_LOOK, FITS, HAIRS, OUTFITS, randomLook, SKINS, STYLES } from "../office/Chibi";
import { useHq } from "../store";
import type { Look } from "../types";
import { Chibi3DPreview } from "./Chibi3DPreview";
import { Dialog } from "./Dialog";

/** One thing on a shelf: what it shows, and what wearing it changes. */
interface Item { key: string; label: string; swatch?: string; emoji?: string; patch: Partial<Look>; locked?: number }
type Shelf = "Hair" | "Outfit" | "Extras" | "Skin" | "Shop";
const SHELVES: { id: Shelf; icon: string }[] = [{ id: "Hair", icon: "💇" }, { id: "Outfit", icon: "👕" }, { id: "Extras", icon: "🕶️" }, { id: "Skin", icon: "🎨" }, { id: "Shop", icon: "🛍️" }];
const FIT_ICON: Record<string, string> = { basic: "👕", nerd: "🤓", funk: "🕺", cool: "😎", sporty: "🏃", formal: "👔", hoodie: "🧥", punk: "🎸", royal: "👑" };
const HAIR_ICON: Record<string, string> = { short: "✂️", swept: "💨", bob: "💁", "long-straight": "🧖", "long-wavy": "🌊", bun: "🍡", ponytail: "🎀", pigtails: "🎎" };
const ACC_ICON: Record<string, string> = { none: "🚫", glasses: "👓", headset: "🎧", headphones: "🎶", bow: "🎀", clip: "📎" };

/**
 * The wardrobe: a dress-up screen. Drag anything from the shelves onto your chibi, or just tap it,
 * and it changes straight away. Shop items can be tried on before buying.
 */
export function Wardrobe() {
  const open = useHq((s) => s.wardrobeOpen);
  const me = useHq((s) => s.me);
  const [look, setLook] = useState<Look>(me?.look ?? DEFAULT_LOOK);
  const [shelf, setShelf] = useState<Shelf>("Outfit");
  const [drag, setDrag] = useState<{ item: Item; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const [pop, setPop] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && me) { setLook(me.look); setShelf("Outfit"); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return null;
  const owned = me.owned ?? [];
  const close = () => useHq.setState({ wardrobeOpen: false });
  const wear = (item: Item) => { setLook((l) => ({ ...l, ...item.patch })); setPop((n) => n + 1); };

  const shelves: Record<Shelf, { title: string; items: Item[] }[]> = {
    Hair: [
      { title: "Style", items: STYLES.map((s) => ({ key: `style-${s.id}`, label: s.label, emoji: HAIR_ICON[s.id] ?? "💇", patch: { style: s.id } })) },
      { title: "Colour", items: HAIRS.map((c) => ({ key: `hair-${c}`, label: "Hair colour", swatch: c, patch: { hair: c } })) },
    ],
    Outfit: [
      { title: "Style", items: FITS.map((f) => ({ key: `fit-${f.id}`, label: f.label, emoji: FIT_ICON[f.id] ?? "👕", patch: { fit: f.id } })) },
      { title: "Colour", items: OUTFITS.map((c) => ({ key: `outfit-${c}`, label: "Outfit colour", swatch: c, patch: { outfit: c } })) },
      { title: "Bottoms", items: [{ key: "pants", label: "Pants", emoji: "👖", patch: { bottoms: "pants" } }, { key: "skirt", label: "Skirt", emoji: "👗", patch: { bottoms: "skirt" } }] },
    ],
    Extras: [{ title: "Accessory", items: ACCESSORIES.map((a) => ({ key: `acc-${a.id}`, label: a.label, emoji: ACC_ICON[a.id] ?? "✨", patch: { accessory: a.id } })) }],
    Skin: [{ title: "Skin tone", items: SKINS.map((c) => ({ key: `skin-${c}`, label: "Skin tone", swatch: c, patch: { skin: c } })) }],
    Shop: (["hat", "pet", "fx"] as const).map((kind) => ({
      title: kind === "hat" ? "Hats" : kind === "pet" ? "Pets" : "Special skins",
      items: [
        { key: `${kind}-none`, label: "None", emoji: "🚫", patch: { [kind]: undefined } as Partial<Look> },
        ...SHOP.filter((i) => i.kind === kind && (owned.includes(i.id) || onSale(i))).map((i) => ({ key: `${kind}-${i.id}`, label: i.name, emoji: i.emoji, patch: { [kind]: i.id } as Partial<Look>, locked: owned.includes(i.id) ? undefined : i.price })),
      ],
    })),
  };
  const wearing = (item: Item) => Object.entries(item.patch).every(([k, v]) => (look as unknown as Record<string, unknown>)[k] === v);
  const trying = SHOP.filter((i) => look[i.kind] === i.id && !owned.includes(i.id));

  // Dragging: the item follows the finger or mouse, and is put on when it is let go over the chibi.
  function startDrag(item: Item, e: React.PointerEvent) {
    const sx = e.clientX, sy = e.clientY; let moved = false;
    const inside = (x: number, y: number) => { const r = stageRef.current?.getBoundingClientRect(); return Boolean(r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom); };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      moved = true; setDrag({ item, x: ev.clientX, y: ev.clientY }); setOver(inside(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if (!moved || inside(ev.clientX, ev.clientY)) wear(item); // a plain tap puts it on too
      setDrag(null); setOver(false);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  const face = (item: Item) => (item.swatch ? <span className="wd-swatch" style={{ background: item.swatch }} /> : <span className="wd-emoji" aria-hidden="true">{item.emoji}</span>);

  return (
    <Dialog open={open} onClose={close} labelledBy="wardrobe-title">
      <div className="wardrobe">
        <header className="wd-head">
          <div><p className="eyebrow">Wardrobe</p><h2 id="wardrobe-title">Dress up your chibi</h2></div>
          <button type="button" className="btn-secondary" onClick={() => { setLook((l) => ({ ...randomLook(), hat: l.hat, pet: l.pet, fx: l.fx, voice: l.voice })); setPop((n) => n + 1); }}>🎲 Surprise me</button>
        </header>
        <div className="wd-body">
          <div ref={stageRef} className={`wd-stage${over ? " is-over" : ""}`}>
            <div key={pop} className="wd-pop"><Chibi3DPreview look={look} size={260} /></div>
            <p className="wd-hint">{drag ? "Drop it on me!" : "Drag clothes onto me, or tap them. Drag me to spin."}</p>
          </div>
          <div className="wd-closet">
            <div className="wd-tabs" role="tablist" aria-label="Shelves">
              {SHELVES.map((s) => <button key={s.id} type="button" role="tab" aria-selected={shelf === s.id} onClick={() => setShelf(s.id)}><span aria-hidden="true">{s.icon}</span> {s.id}</button>)}
            </div>
            <div className="wd-shelves">
              {shelves[shelf].map((group) => (
                <section key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="wd-row">
                    {group.items.map((item) => (
                      <button key={item.key} type="button" className={`wd-item${wearing(item) ? " is-on" : ""}${item.locked ? " is-locked" : ""}`} aria-pressed={wearing(item)} aria-label={`${group.title}: ${item.label}${item.locked ? `, ${item.locked} coins, try it on` : ""}`}
                        onPointerDown={(e) => startDrag(item, e)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wear(item); } }}>
                        {face(item)}
                        {!item.swatch && <span className="wd-label">{item.label}</span>}
                        {item.locked && <span className="wd-price">🔒 {item.locked}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        {trying.length > 0 && <p className="wd-try">Trying on: {trying.map((i) => i.name).join(", ")}. These are not yours yet, so they come off when you save. <button type="button" className="text-btn" onClick={() => { close(); useHq.getState().setShopOpen(true); }}>Open the shop</button></p>}
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => { saveLook(look); close(); }}>Save my look</button>
        </div>
      </div>
      {drag && <div className="wd-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{face(drag.item)}</div>}
    </Dialog>
  );
}
