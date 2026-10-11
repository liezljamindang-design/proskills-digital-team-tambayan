import { joinVoice, leaveVoice, toggleMute } from "../net/voice";
import { useHq } from "../store";

/** Voice chat controls: join with your microphone, mute, leave, and see who is in and who is talking. */
export function VoiceBar() {
  const voice = useHq((s) => s.voice);
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const others = Object.values(peers).filter((p) => p.act?.voice);

  if (!voice.on) {
    return (
      <div className="voice">
        <button type="button" className="emote voice-join" onClick={() => void joinVoice()}>
          <span aria-hidden="true">🎙️</span> Join voice{others.length > 0 ? ` (${others.length} talking)` : ""}
        </button>
        {voice.error && <p className="field-error" role="alert">{voice.error}</p>}
      </div>
    );
  }
  return (
    <div className="voice is-on" role="group" aria-label="Voice chat">
      <button type="button" className={`emote voice-mic${voice.muted ? " is-muted" : ""}`} aria-pressed={!voice.muted} onClick={toggleMute}>
        <span aria-hidden="true">{voice.muted ? "🔇" : "🎙️"}</span> {voice.muted ? "Muted" : "Mic on"}
      </button>
      <button type="button" className="emote" onClick={leaveVoice}>Leave voice</button>
      <ul className="voice-list">
        <li className={me && voice.speaking.includes(me.id) ? "is-speaking" : ""}>You</li>
        {others.map((p) => (
          <li key={p.id} className={voice.speaking.includes(p.id) ? "is-speaking" : ""} title={voice.links[p.id] ?? "connecting"}>
            {p.name}{voice.links[p.id] === "connected" ? "" : voice.links[p.id] === "failed" ? " (can't connect)" : " (connecting…)"}
          </li>
        ))}
        {others.length === 0 && <li className="voice-alone">Nobody else has joined voice yet.</li>}
      </ul>
    </div>
  );
}
