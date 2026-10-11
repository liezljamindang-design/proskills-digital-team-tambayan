import { useHq } from "../store";
import { onRtc, sendRtc, setAct } from "./session";

/**
 * Voice chat. Everyone in the office hears whoever has their microphone on, without
 * having to join first; "Join voice" is only for talking. Each speaker is connected
 * directly to each listener (browser to browser), so the audio never passes through
 * our servers. Fine for a few people talking at once; a big broadcast would need a media server.
 */
const ICE: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
interface Link { pc: RTCPeerConnection; audio: HTMLAudioElement; meter?: AnalyserNode; pending: RTCIceCandidateInit[]; shape: string }
let mic: MediaStream | null = null;
const links = new Map<string, Link>();
let audioCtx: AudioContext | null = null, myMeter: AnalyserNode | null = null, watch = 0, unsubscribe: (() => void) | null = null;

const patch = (change: Partial<ReturnType<typeof useHq.getState>["voice"]>) => useHq.setState((s) => ({ voice: { ...s.voice, ...change } }));
const setLink = (id: string, state: "connecting" | "connected" | "failed" | null) => useHq.setState((s) => {
  const next = { ...s.voice.links };
  if (state) next[id] = state; else delete next[id];
  return { voice: { ...s.voice, links: next } };
});

function meterFor(stream: MediaStream): AnalyserNode | undefined {
  try {
    audioCtx ??= new AudioContext();
    const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    return analyser;
  } catch { return undefined; }
}
const loud = (a: AnalyserNode | null | undefined) => {
  if (!a) return false;
  const data = new Uint8Array(a.fftSize); a.getByteTimeDomainData(data);
  let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
  return peak > 12;
};

/** What a connection carries: whether I am talking and whether they are. It is rebuilt when either changes. */
const shapeWith = (id: string) => `${mic ? 1 : 0}${useHq.getState().peers[id]?.act?.voice ? 1 : 0}`;
// Browsers hold back sound until you have touched the page, so every voice is nudged again on the first tap or key.
function unlock() { for (const link of links.values()) void link.audio.play().catch(() => undefined); void audioCtx?.resume().catch(() => undefined); }

function open(id: string, initiator: boolean): Link {
  const pc = new RTCPeerConnection(ICE);
  const audio = new Audio(); audio.autoplay = true; audio.muted = useHq.getState().voice.deaf;
  const link: Link = { pc, audio, pending: [], shape: shapeWith(id) };
  links.set(id, link); setLink(id, "connecting");
  if (mic) mic.getTracks().forEach((track) => pc.addTrack(track, mic!));
  else if (initiator) pc.addTransceiver("audio", { direction: "recvonly" }); // listening only
  pc.onicecandidate = (e) => { if (e.candidate) sendRtc(id, { t: "ice", d: e.candidate.toJSON() }); };
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; void audio.play().catch(() => undefined); link.meter = meterFor(e.streams[0]); };
  pc.onconnectionstatechange = () => {
    if (links.get(id) !== link) return;
    if (pc.connectionState === "connected") setLink(id, "connected");
    else if (pc.connectionState === "failed") setLink(id, "failed");
  };
  if (initiator) void pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => sendRtc(id, { t: "offer", d: pc.localDescription?.toJSON() }));
  return link;
}
function close(id: string) {
  const link = links.get(id);
  if (!link) return;
  link.pc.close(); link.audio.srcObject = null; links.delete(id); setLink(id, null);
}

/**
 * Keeps a connection with everyone I should hear or who should hear me: that is, every pair
 * where at least one side has their microphone on. The person with the smaller id makes the call.
 */
function reconcile() {
  const s = useHq.getState(), me = s.me;
  if (!me || !listening) return;
  const wanted = new Set(Object.values(s.peers).filter((p) => p.act?.voice || mic).map((p) => p.id));
  for (const id of [...links.keys()]) if (!wanted.has(id)) close(id);
  for (const id of wanted) {
    const link = links.get(id);
    if (me.id < id && (!link || link.shape !== shapeWith(id))) { close(id); open(id, true); }
  }
}

async function signal(from: string, msg: { t: "offer" | "answer" | "ice"; d: unknown }) {
  if (!listening) return;
  try {
    if (msg.t === "offer") {
      close(from);
      const link = open(from, false);
      await link.pc.setRemoteDescription(msg.d as RTCSessionDescriptionInit);
      const answer = await link.pc.createAnswer();
      await link.pc.setLocalDescription(answer);
      sendRtc(from, { t: "answer", d: link.pc.localDescription?.toJSON() });
      for (const c of link.pending.splice(0)) await link.pc.addIceCandidate(c);
    } else if (msg.t === "answer") {
      const link = links.get(from);
      if (!link) return;
      await link.pc.setRemoteDescription(msg.d as RTCSessionDescriptionInit);
      for (const c of link.pending.splice(0)) await link.pc.addIceCandidate(c);
    } else {
      const link = links.get(from);
      if (!link) return;
      if (link.pc.remoteDescription) await link.pc.addIceCandidate(msg.d as RTCIceCandidateInit); else link.pending.push(msg.d as RTCIceCandidateInit);
    }
  } catch { setLink(from, "failed"); }
}

let listening = false;
/** Starts hearing whoever is talking. Called as soon as you walk in; no microphone is used. */
export function startListening() {
  if (listening) return;
  listening = true;
  onRtc((from, msg) => void signal(from, msg));
  unsubscribe = useHq.subscribe((s, prev) => { if (s.peers !== prev.peers) reconcile(); });
  window.addEventListener("pointerdown", unlock); window.addEventListener("keydown", unlock);
  // Who is talking, checked a few times a second.
  watch = window.setInterval(() => {
    const me = useHq.getState().me, talking: string[] = [];
    if (me && mic && !useHq.getState().voice.muted && loud(myMeter)) talking.push(me.id);
    for (const [id, link] of links) if (loud(link.meter)) talking.push(id);
    const before = useHq.getState().voice.speaking;
    if (before.length !== talking.length || before.some((id, i) => id !== talking[i])) patch({ speaking: talking });
  }, 220);
  reconcile();
}
/** Stops everything: used when you leave the office or another device takes over. */
export function stopListening() {
  leaveVoice();
  listening = false;
  window.clearInterval(watch); unsubscribe?.(); unsubscribe = null; onRtc(null);
  window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock);
  for (const id of [...links.keys()]) close(id);
  patch({ links: {}, speaking: [] });
}
/** Silences or restores everyone else's voice on this device. */
export function toggleDeaf() {
  const deaf = !useHq.getState().voice.deaf;
  for (const link of links.values()) link.audio.muted = deaf;
  patch({ deaf });
}

export async function joinVoice(): Promise<void> {
  if (mic) return;
  patch({ error: "" });
  try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    patch({ error: name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser's address bar, then try again." : name === "NotFoundError" ? "No microphone was found on this device." : "The microphone couldn't be started." });
    return;
  }
  myMeter = meterFor(mic) ?? null;
  startListening();
  patch({ on: true, muted: false });
  setAct({ voice: true });
  reconcile();
}

/** Turns my microphone off. I keep hearing everyone else. */
export function leaveVoice() {
  if (!mic) return;
  mic.getTracks().forEach((t) => t.stop()); mic = null; myMeter = null;
  patch({ on: false, muted: false });
  if (useHq.getState().me?.act?.voice) setAct({ voice: undefined });
  reconcile();
}

export function toggleMute() {
  if (!mic) return;
  const muted = !useHq.getState().voice.muted;
  mic.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  patch({ muted });
}
