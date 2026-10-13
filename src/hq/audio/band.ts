/**
 * The Music Room's instruments, made with the browser's own sound generator (no audio files).
 * Everyone's clock is lined up on the same beat, so a drummer on one phone and a guitarist on
 * another are in time with each other.
 */
export type Instrument = "drums" | "guitar" | "bass" | "piano" | "voice-girl" | "voice-boy";

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

/** Vowel formants (Hz) for the sung syllables. */
const VOWELS = { a: [800, 1150, 2900], e: [400, 2000, 2600], i: [300, 2300, 3000], o: [450, 800, 2830], u: [330, 700, 2500] } as const;
type Vowel = keyof typeof VOWELS;
/** What the singers sing: "la la li la, lu la na na…" */
const LYRIC: { c: "l" | "n" | "d"; v: Vowel }[] = [
  { c: "l", v: "a" }, { c: "l", v: "a" }, { c: "l", v: "i" }, { c: "l", v: "a" }, { c: "l", v: "u" }, { c: "l", v: "a" }, { c: "n", v: "a" }, { c: "n", v: "a" },
  { c: "d", v: "u" }, { c: "d", v: "u" }, { c: "l", v: "e" }, { c: "l", v: "a" }, { c: "n", v: "o" }, { c: "l", v: "a" }, { c: "l", v: "i" }, { c: "l", v: "a" },
];
/**
 * A sung syllable: a buzzing voice shaped by three vowel filters (how real vowels are made),
 * with a little scoop up into the note, vibrato, and a quick consonant at the start.
 * Girls get higher, brighter formants; both are pitched up a touch to sound cute.
 */
function sing(at: number, freq: number, syl: { c: "l" | "n" | "d"; v: Vowel }, who: "girl" | "boy") {
  if (!ctx || !out) return;
  const len = STEP * 3.7, shift = who === "girl" ? 1.22 : 1.08;
  const src = ctx.createOscillator(), src2 = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain();
  src.type = "sawtooth"; src2.type = "triangle";
  src.frequency.setValueAtTime(freq * 0.94, at); src.frequency.exponentialRampToValueAtTime(freq, at + 0.07);
  src2.frequency.setValueAtTime(freq * 0.94, at); src2.frequency.exponentialRampToValueAtTime(freq, at + 0.07);
  lfo.frequency.value = who === "girl" ? 6.2 : 5.4; depth.gain.value = freq * 0.018;
  lfo.connect(depth); depth.connect(src.frequency); depth.connect(src2.frequency);
  const pre = ctx.createGain(); pre.gain.value = 0.6; src.connect(pre); src2.connect(pre);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(syl.c === "d" ? 0.5 : 0.35, at + 0.03);
  env.gain.exponentialRampToValueAtTime(0.3, at + len * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, at + len);
  const gains = [1, 0.5, 0.18];
  VOWELS[syl.v].forEach((f, i) => {
    const bp = ctx!.createBiquadFilter(), g = ctx!.createGain();
    bp.type = "bandpass"; bp.Q.value = i === 0 ? 6 : 9;
    // The consonant: "l" and "n" start darker and open into the vowel.
    const start = syl.c === "d" ? f * shift : f * shift * (i === 0 ? 0.45 : 0.75);
    bp.frequency.setValueAtTime(start, at); bp.frequency.linearRampToValueAtTime(f * shift, at + 0.06);
    g.gain.value = gains[i] * 1.6;
    pre.connect(bp).connect(g).connect(env);
  });
  env.connect(out);
  for (const o of [src, src2, lfo]) { o.start(at); o.stop(at + len + 0.05); }
}

/** Sings a short phrase once, to hear what a voice sounds like (the profile screen's "Hear it"). */
export function previewVoice(who: "girl" | "boy") {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor(); out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
    }
    void ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < 8; i++) sing(t0 + i * STEP * 4, hz(TUNE[i], who === "girl" ? 0 : -1), LYRIC[i], who);
  } catch { /* no sound on this device */ }
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
  // The singers: a cute "la la la" voice following the tune. Girls sing an octave up.
  if (s % 4 === 0) {
    const n = Math.floor(index / 4), note = TUNE[n % 16], syl = LYRIC[n % LYRIC.length];
    if (active.has("voice-girl")) sing(at, hz(note, 0), syl, "girl");
    if (active.has("voice-boy")) sing(at, hz(note, -1), syl, "boy");
  }
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
    }
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    void ctx.resume();
    if (!timer) { nextStep = 0; timer = window.setInterval(tick, 50); }
  } catch { /* no sound on this device */ }
}
