import { invitePong, poke, POKES } from "../net/session";
import { ChibiPortrait } from "../office/Chibi";
import { useHq } from "../store";
import { displayName } from "../types";

/** Opens when you click a teammate on the floor: greet them, message them, or challenge them. */
export function PeerCard() {
  const id = useHq((s) => s.selectedPeer);
  const peer = useHq((s) => (id ? s.peers[id] : undefined));
  const busy = useHq((s) => Boolean(s.pong));
  const close = () => useHq.getState().selectPeer(null);
  if (!id || !peer) return null;
  return (
    <div className="peer-card" role="region" aria-label={`Actions for ${peer.name}`}>
      <header>
        <ChibiPortrait look={peer.look} size={36} />
        <strong>{displayName(peer)}</strong>
        <button type="button" className="icon-btn" onClick={close} aria-label="Close">✕</button>
      </header>
      <div className="room-actions">
        {Object.entries(POKES).map(([kind, p]) => (
          <button key={kind} type="button" className="service-chip" onClick={() => { poke(kind, id); close(); }}>{p.emoji} {p.label}</button>
        ))}
      </div>
      <div className="room-actions">
        <button type="button" className="btn-secondary" onClick={() => { useHq.getState().openThread(id); close(); }}>Message</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { invitePong(id); close(); }}>🏓 Ping-pong</button>
      </div>
    </div>
  );
}
