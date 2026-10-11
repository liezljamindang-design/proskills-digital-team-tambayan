import { useHq } from "../store";

const COLORS = ["#ff4fa3", "#ffd43b", "#35c9ff", "#3dff7c", "#b197fc", "#ff922b"];

/** Party mode: disco lights, a mirror ball and confetti over the office while anyone has the party switched on. */
export function Party() {
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const hosts = [...(me?.act?.party ? ["You"] : []), ...Object.values(peers).filter((p) => p.act?.party).map((p) => p.name)];
  if (hosts.length === 0) return null;
  return (
    <div className="party-layer" aria-hidden="true">
      <div className="party-lights" />
      <div className="disco">
        <span className="disco-string" />
        <span className="disco-ball" />
      </div>
      {Array.from({ length: 36 }, (_, i) => (
        <i key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${-(i * 0.37) % 5}s`, animationDuration: `${4 + (i % 5) * 0.6}s` }} />
      ))}
      <p className="party-banner">🎉 Party mode! Started by {hosts.join(", ")}</p>
    </div>
  );
}
