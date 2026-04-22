// Tiny WebAudio synth voices for sounds where sfxr presets fall short of the
// "porcelain bell" target. Used for dish dings + the level-complete arpeggio.
import { getContext, getMasterGain } from './bus.js';

// FM bell: a sine carrier modulated by a higher sine, fast decay envelope.
// freq in Hz; vol 0..1.
export function bell(freq = 880, vol = 0.5, decay = 0.45) {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const env = ctx.createGain();

  car.type = 'sine';
  mod.type = 'sine';
  car.frequency.value = freq;
  mod.frequency.value = freq * 2.7; // inharmonic for a metallic ring
  modGain.gain.value = freq * 1.4;

  mod.connect(modGain).connect(car.frequency);
  car.connect(env).connect(getMasterGain());

  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  car.start(t);
  mod.start(t);
  car.stop(t + decay + 0.05);
  mod.stop(t + decay + 0.05);
}

// Pleasant 3-note major arpeggio: root, major-third, fifth.
// Uses bell() for each note so it sits in the same family as dish dings.
export function arpeggioMajor(root = 523.25, vol = 0.55) {
  bell(root, vol, 0.5);
  setTimeout(() => bell(root * 1.25, vol, 0.5), 110);  // major 3rd
  setTimeout(() => bell(root * 1.5,  vol * 1.1, 0.7), 230); // perfect 5th
}

// Soft pop/chuff for pickup. Filtered noise burst.
export function softPop(vol = 0.5) {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(lp).connect(g).connect(getMasterGain());
  src.start(t);
}
