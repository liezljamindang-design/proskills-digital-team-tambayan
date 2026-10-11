/**
 * Ambient background music, generated in the browser with the Web Audio API.
 * There is no audio file: four soft chords are synthesized and looped, so the
 * music adds nothing to the download and has no licensing to manage.
 * Nothing plays until the visitor presses the music button.
 */

// Dmaj9, Bm9, Gmaj9, A6/9. Frequencies in hertz.
const CHORDS = [
  [146.83, 220.0, 277.18, 329.63, 369.99],
  [123.47, 185.0, 220.0, 277.18, 293.66],
  [98.0, 146.83, 185.0, 220.0, 246.94],
  [110.0, 164.81, 185.0, 246.94, 277.18],
];
const CHORD_SECONDS = 9; // how often a new chord begins
const VOICE_SECONDS = 13; // each chord rings past the next one, so they overlap
const VOLUME = 0.14;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | undefined;
let nextTime = 0;
let step = 0;

function playChord(at: number, freqs: number[]) {
  if (!ctx || !master) return;
  for (const f of freqs) {
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(0, at);
    voice.gain.linearRampToValueAtTime(0.16, at + 3.5); // slow swell in
    voice.gain.setValueAtTime(0.16, at + CHORD_SECONDS - 1);
    voice.gain.linearRampToValueAtTime(0, at + VOICE_SECONDS); // slow fade out
    voice.connect(master);
    // Two slightly detuned oscillators per note give a warm, wide pad.
    for (const [type, detune, level] of [["sine", 0, 1], ["triangle", 7, 0.35]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      osc.detune.value = detune;
      g.gain.value = level;
      osc.connect(g).connect(voice);
      osc.start(at);
      osc.stop(at + VOICE_SECONDS + 0.2);
    }
  }
}

function schedule() {
  if (!ctx) return;
  // Queue chords a little ahead of the clock so timing stays steady.
  while (nextTime < ctx.currentTime + 1.5) {
    playChord(nextTime, CHORDS[step % CHORDS.length]);
    step++;
    nextTime += CHORD_SECONDS;
  }
}

function onVisibility() {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else void ctx.resume();
}

/** Starts the music. Must be called from a click or tap, which browsers require before audio can play. */
export async function startAmbient(): Promise<boolean> {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  try {
    ctx = new Ctor();
    await ctx.resume();

    master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 1.5);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;

    // A quiet echo adds a sense of space.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;

    master.connect(filter);
    filter.connect(ctx.destination);
    filter.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(ctx.destination);

    nextTime = ctx.currentTime + 0.1;
    step = 0;
    schedule();
    timer = window.setInterval(schedule, 500);
    document.addEventListener("visibilitychange", onVisibility);
    return true;
  } catch {
    stopAmbient();
    return false;
  }
}

/** Fades the music out and releases the audio device. */
export function stopAmbient() {
  window.clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisibility);
  const closing = ctx;
  if (closing && master) {
    try {
      master.gain.cancelScheduledValues(closing.currentTime);
      master.gain.setValueAtTime(master.gain.value, closing.currentTime);
      master.gain.linearRampToValueAtTime(0, closing.currentTime + 0.6);
    } catch {
      /* context already closed */
    }
    window.setTimeout(() => void closing.close().catch(() => {}), 800);
  }
  ctx = null;
  master = null;
}
