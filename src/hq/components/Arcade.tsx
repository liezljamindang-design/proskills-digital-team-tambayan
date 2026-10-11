import { useEffect, useMemo, useState } from "react";
import { say, updateMyProfile } from "../net/session";
import { ChibiFull, ChibiPortrait } from "../office/Chibi";
import { zoneAt } from "../office/engine";
import { useHq } from "../store";

const ICONS = ["🎯", "☕", "🎮", "🏓", "💡", "🚀", "🎧", "🦉"];
const shuffle = () => [...ICONS, ...ICONS].map((icon, i) => ({ id: i, icon, r: Math.random() })).sort((a, b) => a.r - b.r);

/**
 * The arcade: what the Recreation Room looks like from the inside. It opens
 * when you walk in, shows everyone else who is in the room, and holds the
 * Memory Match cabinet. Chat stays open in the side panel.
 */
export function Arcade() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const bubbles = useHq((s) => s.bubbles);
  const openThread = useHq((s) => s.openThread);
  const leave = () => useHq.getState().walkToZone("lobby");
  const [cards, setCards] = useState(shuffle);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const won = found.size === ICONS.length;

  // Two cards face up: keep them if they match, otherwise turn them back after a moment.
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((i) => cards[i]);
    if (a.icon === b.icon) { setFound((f) => new Set(f).add(a.icon)); setOpen([]); return; }
    const timer = window.setTimeout(() => setOpen([]), 800);
    return () => window.clearTimeout(timer);
  }, [open, cards]);

  // Record a new personal best once, when the last pair is found.
  useEffect(() => {
    if (!won || !me) return;
    if (me.best === undefined || moves < me.best) {
      updateMyProfile({ ...me, best: moves });
      say(`I finished Memory Match in ${moves} moves! 🎉`);
    }
    // Only when the game is won; `me` and `moves` are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "Escape" && !(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || found.has(cards[i].icon)) return;
    if (open.length === 1) setMoves((m) => m + 1);
    setOpen((o) => [...o, i]);
  }
  function restart() { setCards(shuffle()); setOpen([]); setFound(new Set()); setMoves(0); }

  const inside = Object.values(peers).filter((p) => zoneAt(p.x, p.y) === "game").sort((a, b) => a.name.localeCompare(b.name));
  const board = useMemo(
    () => [...(me ? [{ ...me, you: true }] : []), ...Object.values(peers).map((p) => ({ ...p, you: false }))]
      .filter((p) => p.best !== undefined).sort((a, b) => a.best! - b.best!),
    [me, peers],
  );

  return (
    <section className="arcade-room" aria-labelledby="arcade-title">
      <header className="arcade-top">
        <h2 id="arcade-title" className="arcade-marquee">Arcade</h2>
        <button type="button" className="arcade-btn" onClick={leave}>Leave arcade</button>
      </header>

      <div className="arcade-floor">
        <p className="arcade-label">In the room · {inside.length + 1}</p>
        <ul className="arcade-players">
          {me && (
            <li>
              {bubbles[me.id] && <span className="arcade-say">{bubbles[me.id].text}</span>}
              <ChibiFull look={me.look} size={78} />
              <span className="arcade-name is-you">You</span>
            </li>
          )}
          {inside.map((p) => (
            <li key={p.id}>
              {bubbles[p.id] && !bubbles[p.id].private && <span className="arcade-say">{bubbles[p.id].text}</span>}
              <button type="button" className="arcade-player" onClick={() => openThread(p.id)} aria-label={`Chat privately with ${p.name}`}>
                <ChibiFull look={p.look} size={78} />
              </button>
              <span className="arcade-name">{p.name}</span>
            </li>
          ))}
        </ul>
        {inside.length === 0 && <p className="arcade-hint">Nobody else is in here yet. Teammates who walk in appear beside you.</p>}
      </div>

      <div className="arcade-body">
        <div className="cabinet">
          <p className="arcade-label">Cabinet 01</p>
          <h3 className="cabinet-title">Memory Match</h3>
          <p className="game-status" role="status">
            {won ? `Done in ${moves} moves!` : `Find the eight pairs. Moves: ${moves}`}
          </p>
          <div className="cards" role="group" aria-label="Memory cards">
            {cards.map((c, i) => {
              const up = open.includes(i) || found.has(c.icon);
              return (
                <button key={c.id} type="button" className={`card${up ? " is-up" : ""}${found.has(c.icon) ? " is-found" : ""}`} onClick={() => flip(i)}
                  aria-label={up ? `Card ${i + 1}: ${c.icon}` : `Card ${i + 1}, face down`} disabled={found.has(c.icon)}>
                  <span aria-hidden="true">{up ? c.icon : "?"}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="arcade-btn" onClick={restart}>{won ? "Play again" : "Shuffle and restart"}</button>
        </div>

        <div className="arcade-board">
          <p className="arcade-label">High scores</p>
          {board.length === 0 ? (
            <p className="arcade-hint">No scores yet. Finish a game to set the first one.</p>
          ) : (
            <ol className="scores">
              {board.map((p, i) => (
                <li key={p.id}>
                  <span className="score-rank">{i + 1}</span>
                  <ChibiPortrait look={p.look} size={32} />
                  <span className="score-name">{p.name}{p.you ? " (you)" : ""}</span>
                  <span className="score-value">{p.best} moves</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
