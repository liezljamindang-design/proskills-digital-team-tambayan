/**
 * The Music Room's instruments, made with the browser's own sound generator (no audio files).
 * Everyone's clock is lined up on the same beat, so a drummer on one phone and a guitarist on
 * another are in time with each other.
 */
export type Instrument = "drums" | "guitar" | "bass" | "mic" | "piano";

const STEP = 60 / 96 / 4; // a sixteenth note at 96 beats a minute, in seconds
// C, G, A minor, F: one chord per bar. Notes as semitones above C.
const CHORDS = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
const TUNE = [12, 12, 14, 16, 14, 11, 12, 7, 9, 9, 12, 16, 14, 12, 9, 12];
const hz = (semitone: number, octave: number) => 261.63 * 2 ** (semitone / 12 + octave);

let ctx: AudioContext | null = null, out: GainNode | null = null, noise: AudioBuffer | null = null;
let timer = 0, nextStep = 0, active = new Set<Instrument>();

function tone(at: number, freq: number, type: OscillatorType, length: number, volume: number, cutoff?: number, vibrato = 0) {
  if (!ctx || !out) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, at);
  if (vibrato) { const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 5.5; depth.gain.value = vibrato; lfo.connect(depth).connect(osc.frequency); lfo.start(at); lfo.stop(at + length); }
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  if (cutoff) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; osc.connect(f).connect(gain); } else osc.connect(gain);
  gain.connect(out); osc.start(at); osc.stop(at + length + 0.02);
}
function hit(at: number, length: number, volume: number, highpass: number) {
  if (!ctx || !out || !noise) return;
  const src = ctx.createBufferSource(), gain = ctx.createGain(), f = ctx.createBiquadFilter();
  src.buffer = noise; f.type = "highpass"; f.frequency.value = highpass;
  gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(f).connect(gain).connect(out); src.start(at); src.stop(at + length + 0.02);
}
function kick(at: number) {
  if (!ctx || !out) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.frequency.setValueAtTime(150, at); osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  gain.gain.setValueAtTime(0.9, at); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  osc.connect(gain).connect(out); osc.start(at); osc.stop(at + 0.25);
}

function playStep(index: number, at: number) {
  const s = index % 16, chord = CHORDS[Math.floor(index / 16) % 4];
  if (active.has("drums")) {
    if (s === 0 || s === 8 || s === 10) kick(at);
    if (s === 4 || s === 12) hit(at, 0.16, 0.45, 1200);
    if (s % 2 === 0) hit(at, 0.04, 0.14, 7000);
  }
  if (active.has("bass") && (s === 0 || s === 6 || s === 8 || s === 14)) tone(at, hz(chord[0], -2), "sawtooth", 0.3, 0.38, 420);
  if (active.has("guitar") && (s === 0 || s === 4 || s === 6 || s === 10 || s === 12)) chord.forEach((n, i) => tone(at + i * 0.018, hz(n, 0), "sawtooth", 0.42, 0.11, 2200));
  if (active.has("piano") && s % 2 === 0) { const n = chord[(s / 2) % 3] + (s % 8 === 6 ? 12 : 0); tone(at, hz(n, 0), "triangle", 0.5, 0.22); tone(at, hz(n, 1), "sine", 0.35, 0.07); }
  if (active.has("mic") && s % 4 === 0) tone(at, hz(TUNE[Math.floor(index / 4) % 16], 0), "sine", STEP * 3.6, 0.2, 1800, 5);
}

function tick() {
  if (!ctx) return;
  const stepMs = STEP * 1000, now = Date.now();
  if (nextStep < Math.floor(now / stepMs)) nextStep = Math.ceil(now / stepMs); // fell behind (tab was asleep)
  while (nextStep * stepMs < now + 180) {
    playStep(nextStep, ctx.currentTime + Math.max(0, (nextStep * stepMs - now) / 1000));
    nextStep++;
  }
}

/** Says which instruments should be sounding right now. An empty list stops everything. */
export function setBand(instruments: Instrument[]) {
  active = new Set(instruments);
  if (!active.size) { window.clearInterval(timer); timer = 0; return; }
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor(); out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    void ctx.resume();
    if (!timer) { nextStep = 0; timer = window.setInterval(tick, 50); }
  } catch { /* no sound on this device */ }
}
