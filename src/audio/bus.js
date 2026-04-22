// Audio bus. WebAudio + jsfxr.
//
// SFX are generated once at boot from sfxr presets (or raw param JSON) into
// AudioBuffers, then played via BufferSourceNode with per-call playbackRate
// jitter for natural variation. Voice pool capped, per-frame throttling
// collapses spammy contact events into a single louder play.
import { sfxr } from 'jsfxr';

const MAX_VOICES = 16;
const PITCH_JITTER = 0.08; // ±8%
const FRAME_THROTTLE = 6;  // >6 of same event/frame collapses to one

let ctx = null;
let masterGain = null;
let muted = false;
const buffers = new Map();      // name -> AudioBuffer
const liveSources = new Set();  // active BufferSourceNodes for voice cap
const frameCounts = new Map();  // name -> count this frame
let frameResetScheduled = false;

export async function initAudio(presets) {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.55;
  masterGain.connect(ctx.destination);

  // jsfxr presets and raw JSON both supported. presets is a plain map.
  await Promise.all(Object.entries(presets).map(async ([name, src]) => {
    const sound = typeof src === 'string' ? src : src;
    // sfxr.toWave accepts a preset name OR a sound JSON object.
    const wave = sfxr.toWave(sound);
    const arr = dataURIToArrayBuffer(wave.dataURI);
    const buf = await ctx.decodeAudioData(arr);
    buffers.set(name, buf);
  }));

  // iOS/Safari requires a user gesture to start audio. Resume on first input.
  const resume = () => { if (ctx.state !== 'running') ctx.resume(); cleanup(); };
  const cleanup = () => {
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
  };
  window.addEventListener('pointerdown', resume, { once: false });
  window.addEventListener('keydown', resume, { once: false });
}

export function setMuted(m) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.55;
}
export function isMuted() { return muted; }

export function setMasterVolume(v) {
  if (masterGain && !muted) masterGain.gain.value = v;
}

// Play an SFX. opts.volume in [0,1]; opts.pitch defaults 1 with ±8% jitter.
export function play(name, opts = {}) {
  if (!ctx || muted) return;
  const buf = buffers.get(name);
  if (!buf) return;

  // Per-frame throttle: collapse beyond FRAME_THROTTLE same-name events.
  const seen = (frameCounts.get(name) || 0) + 1;
  frameCounts.set(name, seen);
  if (!frameResetScheduled) {
    frameResetScheduled = true;
    requestAnimationFrame(() => { frameCounts.clear(); frameResetScheduled = false; });
  }
  if (seen > FRAME_THROTTLE) return;
  const merged = seen === FRAME_THROTTLE; // last one merged louder + spread
  const volBoost = merged ? 1.4 : 1.0;
  const extraPitchSpread = merged ? 0.12 : 0;

  // Voice cap: drop oldest if over.
  if (liveSources.size >= MAX_VOICES) {
    const oldest = liveSources.values().next().value;
    try { oldest.stop(); } catch {}
    liveSources.delete(oldest);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const baseRate = opts.pitch ?? 1;
  const jitter = (Math.random() * 2 - 1) * (PITCH_JITTER + extraPitchSpread);
  src.playbackRate.value = Math.max(0.4, baseRate * (1 + jitter));

  const g = ctx.createGain();
  g.gain.value = (opts.volume ?? 1) * volBoost;
  src.connect(g).connect(masterGain);

  src.start();
  liveSources.add(src);
  src.onended = () => liveSources.delete(src);
}

// For ducking the ambient bed during a level-complete chime in M10.
export function getMasterGain() { return masterGain; }
export function getContext() { return ctx; }

function dataURIToArrayBuffer(dataURI) {
  const base64 = dataURI.split(',')[1];
  const bin = atob(base64);
  const len = bin.length;
  const buf = new ArrayBuffer(len);
  const view = new Uint8Array(buf);
  for (let i = 0; i < len; i++) view[i] = bin.charCodeAt(i);
  return buf;
}
