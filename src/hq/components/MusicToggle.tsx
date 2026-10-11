import { useEffect, useRef, useState } from "react";
import { setAct } from "../net/session";

/**
 * Stations from SomaFM: listener-supported internet radio with no adverts.
 * Each is a live stream, so everyone tuned to the same station hears the same thing.
 */
const STATIONS = [
  { id: "groovesalad", name: "Groove Salad", about: "Chilled beats and ambient grooves" },
  { id: "fluid", name: "Fluid", about: "Instrumental hip-hop and lo-fi" },
  { id: "lush", name: "Lush", about: "Mellow, mostly female vocals" },
  { id: "indiepop", name: "Indie Pop Rocks!", about: "New and classic indie pop" },
  { id: "poptron", name: "PopTron", about: "Electropop and indie dance" },
  { id: "u80s", name: "Underground 80s", about: "Synthpop and new wave" },
  { id: "seventies", name: "Left Coast 70s", about: "Mellow 70s album rock" },
  { id: "bossa", name: "Bossa Beyond", about: "Bossa nova and samba" },
  { id: "secretagent", name: "Secret Agent", about: "Lounge and spy-movie cool" },
  { id: "beatblender", name: "Beat Blender", about: "Deep house and downtempo" },
  { id: "reggae", name: "Heavyweight Reggae", about: "Reggae, ska and rocksteady" },
  { id: "dronezone", name: "Drone Zone", about: "Ambient, good for focus" },
] as const;
const AMBIENT = "ambient";
const streamUrl = (id: string) => `https://ice1.somafm.com/${id}-128-mp3`;
const ambient = () => import("../audio/ambient");

let player: HTMLAudioElement | null = null;

/** The Music menu: office ambience or an ad-free radio station. Always off until someone turns it on. */
export function MusicToggle() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.6);
  const boxRef = useRef<HTMLDivElement>(null);

  function stopAll() {
    player?.pause();
    if (player) player.removeAttribute("src");
    void ambient().then((m) => m.stopAmbient()).catch(() => undefined);
  }
  useEffect(() => () => { stopAll(); }, []);

  // Close the menu when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", onDown); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  async function play(id: string) {
    setError("");
    stopAll();
    if (current === id) { setCurrent(null); setAct({ radio: undefined }); return; }
    if (id === AMBIENT) {
      const ok = await ambient().then((m) => m.startAmbient()).catch(() => false);
      setCurrent(ok ? AMBIENT : null);
      setAct({ radio: undefined });
      if (!ok) setError("Sound isn't available in this browser.");
      return;
    }
    const station = STATIONS.find((s) => s.id === id)!;
    player ??= new Audio();
    player.volume = volume;
    player.src = streamUrl(id);
    setLoading(true); setCurrent(id);
    try {
      await player.play();
      setAct({ radio: station.name });
    } catch {
      setCurrent(null); setAct({ radio: undefined });
      setError(`${station.name} isn't answering right now. Try another station.`);
    } finally { setLoading(false); }
  }

  const playing = current !== null;
  const label = current === AMBIENT ? "Office ambience" : STATIONS.find((s) => s.id === current)?.name;

  return (
    <div className="music" ref={boxRef}>
      <button type="button" className={`text-btn music-btn${playing ? " is-on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
        aria-label={playing ? `Music: ${label}. Open the music menu` : "Open the music menu"}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6.5" cy="18" r="2.5" fill="currentColor" /><circle cx="16.5" cy="16" r="2.5" fill="currentColor" /></svg>
        <span className="music-label">{playing ? label : "Music"}</span>
      </button>
      {open && (
        <div className="music-menu" role="group" aria-label="Music">
          <p className="eyebrow">Music · no ads</p>
          {error && <p className="field-error" role="alert">{error}</p>}
          <ul>
            {[{ id: AMBIENT, name: "Office ambience", about: "Soft generated background sound" }, ...STATIONS].map((s) => (
              <li key={s.id}>
                <button type="button" className="station" aria-pressed={current === s.id} onClick={() => void play(s.id)}>
                  <span className="station-icon" aria-hidden="true">{current === s.id ? (loading ? "…" : "■") : "▶"}</span>
                  <span className="station-id"><strong>{s.name}</strong><span>{s.about}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <label className="volume">
            <span>Volume</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (player) player.volume = v; }} />
          </label>
          <p className="music-credit">Radio by <a href="https://somafm.com" target="_blank" rel="noopener noreferrer">SomaFM</a>, listener-supported and commercial-free.</p>
        </div>
      )}
    </div>
  );
}
