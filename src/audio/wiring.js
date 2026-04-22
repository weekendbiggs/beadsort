// Maps physics contact events → SFX. Keeps audio policy out of the physics
// module and out of main.js. Volume scales with relative impact velocity so
// gentle settles are quiet and a sharp drop pops.
import { play } from './bus.js';
import { bell, arpeggioMajor, softPop } from './synth.js';
import { duckAmbient } from './ambient.js';
import { onContact } from '../physics/contact.js';
import { BEAD, COLORS } from '../constants.js';

export function wireContactsToAudio() {
  onContact((a, b) => {
    // Identify the bead in either slot.
    let bead, other;
    if (a.kind === 'bead') { bead = a.bead; other = b; }
    else if (b.kind === 'bead') { bead = b.bead; other = a; }
    else return;
    if (!bead) return;

    // Sleeping beads emit nothing — guarantees a settled pile is silent.
    if (bead.body.isSleeping()) return;

    const v = bead.body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (speed < 0.25) return; // ignore micro-jitter
    const vol = Math.min(1, 0.15 + speed * 0.18);
    const pitch = 1 + Math.min(0.4, (speed - 1) * 0.05);

    switch (other.kind) {
      case 'table':      play('tick',  { volume: vol,        pitch }); break;
      case 'wall':       play('tick',  { volume: vol * 0.6,  pitch: pitch * 0.85 }); break;
      case 'dish-rim':
      case 'dish-floor': {
        // FM bell tied to dish index for a tonal "different bowls ring
        // different notes" effect. Adds character to a busy sort.
        const dishIdx = other.dish ?? 0;
        const note = 440 * Math.pow(2, (dishIdx * 2) / 12); // whole-step ladder
        bell(note, Math.min(0.45, vol * 0.6), 0.35);
        break;
      }
      case 'bead':       play('plink', { volume: vol * 0.7,  pitch: pitch * 1.1 }); break;
      // sensor enter is judged + sounded in sort.js callbacks
      default: break;
    }
  });
}

export function playPickup() { softPop(0.45); }
export function playRelease() { play('fwip', { volume: 0.3 }); }
export function playCorrect(dishIdx = 0) {
  const root = 440 * Math.pow(2, (dishIdx * 2) / 12);
  bell(root, 0.5, 0.55);
  setTimeout(() => bell(root * 1.5, 0.35, 0.5), 50);
}
export function playWrong(dishIdx = 0) {
  const root = 440 * Math.pow(2, (dishIdx * 2) / 12);
  bell(root, 0.4, 0.35);
  play('wrong', { volume: 0.25, pitch: 0.9 });
}

// Cascade for pile respawn — 10-15 ticks over ~400ms.
export function playRespawnCascade(n = 12) {
  for (let i = 0; i < n; i++) {
    const delay = (i / n) * 380 + Math.random() * 30;
    setTimeout(() => play('tick', { volume: 0.4 + Math.random() * 0.2, pitch: 0.9 + Math.random() * 0.4 }), delay);
  }
}

export function playLevelComplete() {
  duckAmbient(1100, 0.3);
  arpeggioMajor(523.25, 0.55); // C5 root
}

// Suppress unused-import warning for BEAD/COLORS (kept for future tuning).
void BEAD; void COLORS;
