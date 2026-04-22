// Maps physics contact events → SFX. Keeps audio policy out of the physics
// module and out of main.js. Volume scales with relative impact velocity so
// gentle settles are quiet and a sharp drop pops.
import { play } from './bus.js';
import { onContact } from '../physics/contact.js';
import { BEAD } from '../constants.js';

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
      case 'dish-floor': play('ding',  { volume: vol * 0.85, pitch }); break;
      case 'bead':       play('plink', { volume: vol * 0.7,  pitch: pitch * 1.1 }); break;
      // sensor enter is judged + sounded in sort.js callbacks
      default: break;
    }
  });
}

export function playPickup() { play('pickup', { volume: 0.6 }); }
export function playRelease() { play('fwip', { volume: 0.35 }); }
export function playCorrect() {
  play('ding', { volume: 0.9, pitch: 1.05 });
  setTimeout(() => play('correct', { volume: 0.5, pitch: 1.5 }), 30);
}
export function playWrong()   { play('ding', { volume: 0.7 }); play('wrong', { volume: 0.35, pitch: 0.9 }); }

// Cascade for pile respawn — 10-15 ticks over ~400ms.
export function playRespawnCascade(n = 12) {
  for (let i = 0; i < n; i++) {
    const delay = (i / n) * 380 + Math.random() * 30;
    setTimeout(() => play('tick', { volume: 0.4 + Math.random() * 0.2, pitch: 0.9 + Math.random() * 0.4 }), delay);
  }
}

export function playLevelComplete() {
  play('arpeggio_a', { volume: 0.7, pitch: 1.0 });
  setTimeout(() => play('arpeggio_b', { volume: 0.7, pitch: 1.25 }), 110);
  setTimeout(() => play('arpeggio_c', { volume: 0.8, pitch: 1.5 }), 230);
}

// Suppress unused-import warning for BEAD (kept for future per-bead-size scaling).
void BEAD;
