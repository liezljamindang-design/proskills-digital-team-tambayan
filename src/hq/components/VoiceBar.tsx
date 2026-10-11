import { joinVoice, leaveVoice, toggleDeaf, toggleMute } from "../net/voice";
import { useHq } from "../store";

/** Voice chat. You hear whoever is talking without doing anything; this bar is for talking yourself, and for silencing it. */
export function VoiceBar() {
  const voice = useHq((s) => s.voice);
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const others = Object.values(peers).filter((p) => p.act?.voice);
  const talkers = (
    <ul className="voice-list">
      {voice.on && <li className={me && voice.speaking.includes(me.id) ? "is-speaking" : ""}>You</li>}
      {others.map((p) => (
        <li key={p.id} className={voice.speaking.includes(p.id) ? "is-speaking" : ""} title={voice.links[p.id] ?? "connecting"}>
          🎙️ {p.name}{voice.links[p.id] === "connected" ? "" : voice.links[p.id] === "failed" ? " (can't connect)" : " (connecting…)"}
        </li>
      ))}
      {voice.on && others.length === 0 && <li className="voice-alone">Everyone in the office can hear you.</li>}
    </ul>
  );
  const hear = (others.length > 0 || voice.deaf) && (
    <button type="button" className={`emote voice-hear${voice.deaf ? " is-muted" : ""}`} aria-pressed={!voice.deaf} onClick={toggleDeaf}>
      <span aria-hidden="true">{voice.deaf ? "🔇" : "🔊"}</span> {voice.deaf ? "Voices off" : "Hearing voices"}
    </button>
  );

  if (!voice.on) {
    return (
      <div className="voice" role="group" aria-label="Voice chat">
        <button type="button" className="emote voice-join" onClick={() => void joinVoice()}>
          <span aria-hidden="true">🎙️</span> {others.length > 0 ? "Talk too" : "Talk on the mic"}
        </button>
        {hear}
        {others.length > 0 && talkers}
        {voice.error && <p className="field-error" role="alert">{voice.error}</p>}
      </div>
    );
  }
  return (
    <div className="voice is-on" role="group" aria-label="Voice chat">
      <button type="button" className={`emote voice-mic${voice.muted ? " is-muted" : ""}`} aria-pressed={!voice.muted} onClick={toggleMute}>
        <span aria-hidden="true">{voice.muted ? "🔇" : "🎙️"}</span> {voice.muted ? "Muted" : "Mic on"}
      </button>
      <button type="button" className="emote" onClick={leaveVoice}>Stop talking</button>
      {hear}
      {talkers}
    </div>
  );
}
