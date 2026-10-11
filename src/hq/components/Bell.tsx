import { useEffect, useRef, useState } from "react";
import { disablePush, enablePush, pushStatus, type PushScope } from "../net/push";

/** The bell in the top bar: turn phone and desktop notifications on or off for this device. */
export function Bell() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PushScope | "off">("off");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => { void pushStatus().then(setState); }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  async function choose(next: PushScope | "off") {
    setBusy(true); setNote("");
    if (next === "off") { await disablePush(); setState("off"); setNote("Notifications are off on this device."); }
    else { const problem = await enablePush(next); if (problem) setNote(problem); else { setState(next); setNote("Done. You'll be notified on this device."); } }
    setBusy(false);
  }
  const options: { id: PushScope | "off"; label: string; about: string }[] = [
    { id: "direct", label: "Private and my batch", about: "Messages sent to you, and your batch room" },
    { id: "all", label: "Everything", about: "Also every message in the Everyone room" },
    { id: "off", label: "Off", about: "No notifications on this device" },
  ];
  return (
    <div className="music bell" ref={boxRef}>
      <button type="button" className={`icon-btn${state !== "off" ? " is-on" : ""}`} aria-expanded={open} aria-label={state === "off" ? "Notifications are off. Open notification settings" : "Notifications are on. Open notification settings"} title="Notifications" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" fill={state !== "off" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="music-menu bell-menu" role="group" aria-label="Notifications">
          <p className="eyebrow">Notify me on this device</p>
          <ul>
            {options.map((o) => (
              <li key={o.id}>
                <button type="button" className="station" aria-pressed={state === o.id} disabled={busy} onClick={() => void choose(o.id)}>
                  <span className="station-icon" aria-hidden="true">{state === o.id ? "✓" : ""}</span>
                  <span className="station-id"><strong>{o.label}</strong><span>{o.about}</span></span>
                </button>
              </li>
            ))}
          </ul>
          {note && <p className="dj-note" role="status">{note}</p>}
          <p className="music-credit">Works with the app closed. Turn it on separately on each phone or computer. On iPhone, install the app to the Home Screen first.</p>
        </div>
      )}
    </div>
  );
}
