// Procedural ambient bed: filtered white-noise surf with a slow LFO on the
// lowpass cutoff, a quiet four-chord lo-fi loop on a triangle/sine pad, and
// occasional seagull blips. All built straight from WebAudio nodes — no
// samples, no extra deps.
//
// Ducking: a single duckGain sits in front of the ambient sum and can be
// briefly attenuated by playLevelComplete() in the main wiring. Exposed so
// future events can request the same dip.
import { getContext, getMasterGain } from './bus.js';

let started = false;
let duckGain = null;

export function startAmbient() {
  if (started) return;
  const ctx = getContext();
  if (!ctx) return;
  started = true;

  const out = ctx.createGain();
  out.gain.value = 0.4;
  duckGain = ctx.createGain();
  duckGain.gain.value = 1.0;
  out.connect(duckGain).connect(getMasterGain());

  startSurf(ctx, out);
  startLofiPad(ctx, out);
  startGulls(ctx, out);
}

export function duckAmbient(durationMs = 900, depth = 0.25) {
  if (!duckGain) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const g = duckGain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(depth, now + 0.06);
  g.linearRampToValueAtTime(1.0, now + durationMs / 1000);
}

// --- surf ---
function startSurf(ctx, dest) {
  // Pink-ish noise via a 2s buffer of filtered white noise, looped.
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.0;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.Q.value = 0.7;

  // LFO modulating cutoff, simulating the slow inhale/exhale of waves
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07; // ~14s period
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 350;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();

  const surfGain = ctx.createGain();
  surfGain.gain.value = 0.55;

  src.connect(lp).connect(surfGain).connect(dest);
  src.start();
}

// --- lo-fi chord pad ---
function startLofiPad(ctx, dest) {
  // i - V - vi - IV in C: C E G | G B D | A C E | F A C
  const chords = [
    [261.63, 329.63, 392.00],
    [392.00, 493.88, 587.33],
    [220.00, 261.63, 329.63],
    [349.23, 440.00, 523.25],
  ];
  const padGain = ctx.createGain();
  padGain.gain.value = 0.0;
  // a soft tape-warbly lowpass at the end
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1100;
  lp.Q.value = 0.5;
  padGain.connect(lp).connect(dest);

  // Held oscillators per voice, retuned every chord change
  const voices = chords[0].map(() => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    const g = ctx.createGain();
    g.gain.value = 0.18;
    o.connect(g).connect(padGain);
    o.start();
    return { o, g };
  });
  // A sine sub-bass voice on the chord root, an octave down
  const bass = ctx.createOscillator();
  bass.type = 'sine';
  const bassG = ctx.createGain();
  bassG.gain.value = 0.22;
  bass.connect(bassG).connect(padGain);
  bass.start();

  let chordIdx = 0;
  const beatSec = 2.4;
  function step() {
    const c = chords[chordIdx % chords.length];
    const t = ctx.currentTime;
    voices.forEach((v, i) => v.o.frequency.setTargetAtTime(c[i], t, 0.4));
    bass.frequency.setTargetAtTime(c[0] / 2, t, 0.5);
    chordIdx++;
  }
  step();
  setInterval(step, beatSec * 1000);

  // Slow fade-in so the pad doesn't pop on at level start
  padGain.gain.setTargetAtTime(0.18, ctx.currentTime + 1, 4);
}

// --- gulls ---
function startGulls(ctx, dest) {
  function blip() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(900 + Math.random() * 400, t);
    o.frequency.exponentialRampToValueAtTime(500 + Math.random() * 200, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.25);
  }
  function schedule() {
    blip();
    const next = 20000 + Math.random() * 20000; // 20-40s
    setTimeout(schedule, next);
  }
  setTimeout(schedule, 8000 + Math.random() * 8000);
}
