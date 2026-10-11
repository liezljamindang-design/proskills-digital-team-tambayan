import { useState } from "react";
import { setAct } from "../net/session";
import { RIDE_COLORS, RIDES, rideInfo } from "../rides";
import { useHq } from "../store";
import { Dialog } from "./Dialog";

const saved = () => { try { return JSON.parse(localStorage.getItem("playground.ride") ?? "null") as { kind: string; color: string; name?: string } | null; } catch { return null; } };

/** The garage: pick a bike or a car, a colour, and a name for the frame or number plate. */
export function Garage() {
  const open = useHq((s) => s.garageOpen);
  const riding = useHq((s) => s.me?.act?.ride);
  const [kind, setKind] = useState(() => saved()?.kind ?? "bmx");
  const [color, setColor] = useState(() => saved()?.color ?? RIDE_COLORS[0]);
  const [name, setName] = useState(() => saved()?.name ?? "");
  const close = () => useHq.setState({ garageOpen: false });
  const go = () => {
    const ride = { kind, color, name: name.trim().slice(0, 14) || undefined };
    try { localStorage.setItem("playground.ride", JSON.stringify(ride)); } catch { /* private mode */ }
    setAct({ ride, pose: undefined, at: undefined, gym: undefined, band: undefined });
    close();
  };
  return (
    <Dialog open={open} onClose={close} labelledBy="garage-title">
      <div className="garage">
        <p className="eyebrow">Garage</p>
        <h2 id="garage-title">Pick your ride</h2>
        {(["Bikes", "Cars"] as const).map((group) => (
          <fieldset key={group} className="field">
            <legend>{group === "Bikes" ? "🚲 Bikes" : "🚗 Cars"}</legend>
            <div className="chips">
              {RIDES.filter((r) => r.group === group).map((r) => (
                <button key={r.id} type="button" className="service-chip ride-chip" aria-pressed={kind === r.id} onClick={() => setKind(r.id)}><strong>{r.label}</strong><small>{r.make}</small></button>
              ))}
            </div>
          </fieldset>
        ))}
        <fieldset className="field">
          <legend>Colour</legend>
          <div className="swatches">
            {RIDE_COLORS.map((c) => <button key={c} type="button" className="swatch" aria-pressed={color === c} aria-label={`Colour ${c}`} style={{ background: c }} onClick={() => setColor(c)} />)}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="ride-name">Name on the {rideInfo(kind)?.group === "Cars" ? "number plate and doors" : "frame"} (optional)</label>
          <input id="ride-name" type="text" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LIEZL 01" />
        </div>
        <p className="muted">Riding is faster than walking. You hop off by yourself when you sit, sleep or play something. The makes are made up for fun.</p>
        <div className="dialog-actions">
          {riding && <button type="button" className="btn-secondary" onClick={() => { setAct({ ride: undefined }); close(); }}>Get off</button>}
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="button" className="btn-primary" onClick={go}>{riding ? "Switch ride" : "Ride"}</button>
        </div>
      </div>
    </Dialog>
  );
}
