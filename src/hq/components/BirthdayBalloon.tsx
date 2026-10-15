import { useMemo, useState } from "react";
import { everyoneToCelebrate, type Celebrant } from "../birthday";
import { say } from "../net/session";
import { PersonFace } from "../office/Chibi";
import { PUBLIC, useHq } from "../store";

/**
 * A big hot air balloon floats over the office on someone's birthday, carrying a banner with their
 * name and photo, with confetti and little balloons drifting up. Everyone can send a greeting.
 * Closing it only hides it on this device, for this visit.
 */
export function BirthdayBalloon() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const away = useHq((s) => s.away);
  const lines = useHq((s) => s.threads[PUBLIC] ?? []);
  const joined = useHq((s) => s.joined);
  const [hidden, setHidden] = useState(false);
  const party = useMemo(() => (joined ? everyoneToCelebrate(me, peers, away, lines) : []), [joined, me, peers, away, lines]);
  const [greeted, setGreeted] = useState<string[]>([]);
  if (!party.length) return null;
  const names = party.map((c) => c.name.split(" ")[0]).join(" & ");
  return (
    <>
      {!hidden && (
        <div className="bday-sky" aria-live="polite">
          <div className="bday-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
          <div className="bday-floaters" aria-hidden="true">{["🎈", "🎈", "🎉", "🎈", "🎂", "🎈", "🎁", "🎈"].map((e, i) => <span key={i} style={{ ["--i" as string]: i }}>{e}</span>)}</div>
          <div className="bday-balloon">
            <svg className="bday-envelope" viewBox="0 0 120 140" aria-hidden="true">
              <defs>
                <clipPath id="bday-env"><path d="M60 4 C 18 4 2 38 4 62 C 6 88 36 108 46 118 L 74 118 C 84 108 114 88 116 62 C 118 38 102 4 60 4 Z" /></clipPath>
              </defs>
              <g clipPath="url(#bday-env)">
                {["#ff4fa3", "#ffd43b", "#4dabf7", "#51cf66", "#ff922b", "#cc5de8"].map((c, i) => <rect key={c} x={i * 20} y={0} width={20} height={140} fill={c} />)}
                <path d="M0 58 Q 60 74 120 58 L 120 70 Q 60 86 0 70 Z" fill="#fff" opacity="0.9" />
              </g>
              <path d="M46 118 L 52 130 M74 118 L 68 130" stroke="#7a4a1e" strokeWidth="1.6" />
            </svg>
            <div className="bday-basket">
              <div className="bday-faces">{party.slice(0, 3).map((c) => <Face key={c.key} c={c} />)}</div>
            </div>
            <div className="bday-banner">
              <strong>Happy Birthday,</strong>
              <span>{names}! 🎂</span>
            </div>
          </div>
          <div className="bday-card">
            <p>🎉 Today we celebrate <b>{party.map((c) => c.name).join(" and ")}</b>!</p>
            <div className="room-actions">
              {party.filter((c) => c.key !== me?.id).map((c) => (
                <button key={c.key} type="button" className="btn-primary" disabled={greeted.includes(c.key)}
                  onClick={() => { say(`Happy birthday, ${c.name}! 🎂🎉🎈`); setGreeted((g) => [...g, c.key]); }}>
                  {greeted.includes(c.key) ? "Greeted ✓" : `🎁 Greet ${c.name.split(" ")[0]}`}
                </button>
              ))}
              <button type="button" className="btn-secondary" onClick={() => setHidden(true)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {hidden && <button type="button" className="bday-reopen" onClick={() => setHidden(false)} aria-label="Show the birthday balloon">🎈</button>}
    </>
  );
}

function Face({ c }: { c: Celebrant }) {
  if (c.look || c.photo) return <PersonFace look={c.look ?? { skin: "#f3cfb4", hair: "#4a342a", outfit: "#3b5bdb", style: "short", accessory: "none", bottoms: "pants", fit: "basic" }} photo={c.photo} size={46} />;
  return <span className="bday-noface">🎂</span>;
}
