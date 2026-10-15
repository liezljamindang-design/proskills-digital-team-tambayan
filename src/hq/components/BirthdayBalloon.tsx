import { useEffect, useMemo, useState } from "react";
import { announcement, BALLOON, everyoneToCelebrate, todayKey, type Celebrant } from "../birthday";
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
  // Birthdays announce themselves: an admin's app posts the announcement once, for anyone whose
  // saved birthday is today, so it lands in chat and in everyone's notifications.
  const isAdmin = Boolean(me?.admin);
  useEffect(() => {
    if (!joined || !isAdmin) return;
    const timer = window.setTimeout(() => {
      const s = useHq.getState(), said = (s.threads[PUBLIC] ?? []).filter((l) => l.text.startsWith(BALLOON) && new Date(parseInt(l.id.split("-")[0], 36)).toDateString() === new Date().toDateString()).map((l) => l.text);
      const people = [...(s.me ? [s.me] : []), ...Object.values(s.peers), ...Object.values(s.away)];
      for (const p of people) {
        if (p.birthday !== todayKey()) continue;
        const name = p.firstName ? `${p.name} (${p.firstName})` : p.name;
        if (said.some((t) => t.includes(p.name))) continue;
        say(announcement(name)); said.push(announcement(name));
      }
    }, 15000); // after saved chat has loaded, so it is not posted twice
    return () => window.clearTimeout(timer);
  }, [joined, isAdmin]);
  if (!party.length) return null;
  return (
    <>
      {!hidden && (
        <div className="bday-sky" aria-live="polite">
          <div className="bday-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
          <div className="bday-floaters" aria-hidden="true">{["🎈", "🎈", "🎉", "🎈", "🎂", "🎈", "🎁", "🎈"].map((e, i) => <span key={i} style={{ ["--i" as string]: i }}>{e}</span>)}</div>
          {party.slice(0, 3).map((c, i) => (
            <div key={c.key} className="bday-flight" style={{ ["--i" as string]: i }}>
              <div className="bday-banner-tow">
                <span className="bday-rope" aria-hidden="true" />
                <div className="bday-flag">
                  <Face c={c} />
                  <span>Happy birthday {c.name}! 🎂</span>
                </div>
              </div>
              <svg className="bday-plane" viewBox="0 0 120 60" aria-hidden="true">
                <path d="M8 30 Q 10 22 22 21 L 92 19 Q 112 20 116 30 Q 112 40 92 41 L 22 39 Q 10 38 8 30 Z" fill="#ffffff" stroke="#1c7ed6" strokeWidth="2.5" />
                <path d="M50 21 L 70 2 L 80 2 L 68 21 Z M50 39 L 70 58 L 80 58 L 68 39 Z" fill="#ff4fa3" stroke="#c2255c" strokeWidth="1.5" />
                <path d="M14 23 L 6 8 L 16 8 L 26 21 Z" fill="#ffd43b" stroke="#e8a900" strokeWidth="1.5" />
                {[0, 1, 2, 3].map((k) => <circle key={k} cx={42 + k * 12} cy={28} r={3.2} fill="#4dabf7" />)}
                <circle cx="116" cy="30" r="3" fill="#868e96" /><rect className="bday-prop" x="115" y="16" width="3" height="28" rx="1.5" fill="#495057" />
              </svg>
            </div>
          ))}
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
