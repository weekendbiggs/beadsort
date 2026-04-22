// Sort detection. Watches dish sensor intersections via the contact dispatcher
// and tracks each bead's current dish. When a bead enters a dish, fires
// onCorrect/onWrong. When all spawned beads are inside any dish for a settled
// duration, fires onComplete (level done).
import { COLORS, DISH } from './constants.js';
import { onContact } from './physics/contact.js';

const SETTLE_DELAY = 0.6; // seconds — beads must rest in dish before counting as "in"

export function createSortTracker({ dishMeshes, beadPool, onCorrect, onWrong, onComplete }) {
  // Map sensor handle → dish index, derived from collider.userData.
  // Dish-rim accent meshes for visual pulse feedback.
  const accentByDish = new Map();
  for (const d of dishMeshes) accentByDish.set(d.index, d.accent);

  // Per-bead state: enter timestamp, last dish, settled flag.
  const beadState = new WeakMap(); // bead -> { dish, since }

  let totalSpawned = 0;
  let levelArmed = false;

  function setSpawnedCount(n) {
    totalSpawned = n;
    levelArmed = n > 0;
  }

  onContact((a, b, c1, c2) => {
    // Identify (sensor, bead) pairs. Both directions possible.
    let sensorSide, beadSide;
    if (a.kind === 'dish-sensor' && b.kind === 'bead') { sensorSide = a; beadSide = b; }
    else if (b.kind === 'dish-sensor' && a.kind === 'bead') { sensorSide = b; beadSide = a; }
    else return;

    const bead = beadSide.bead;
    if (!bead) return;
    const dish = sensorSide.dish;
    beadState.set(bead, { dish, since: performance.now() / 1000, settled: false });
    bead.dishIndex = dish;
  });

  // Per-frame check: which beads have been in their dish long enough to count.
  function update() {
    if (!levelArmed) return;
    const now = performance.now() / 1000;
    let inDishCount = 0;

    for (const bead of beadPool.beads) {
      const s = beadState.get(bead);
      if (!s) continue;
      // Did the bead leave its dish? (The sensor only fires on enter; we infer
      // exit from horizontal distance to the dish center.)
      const dishMesh = dishMeshes[s.dish];
      const t = bead.body.translation();
      const dx = t.x - dishMesh.pos.x;
      const dz = t.z - dishMesh.pos.z;
      const horiz2 = dx * dx + dz * dz;
      const inside = horiz2 < (DISH.innerRadius - 0.02) * (DISH.innerRadius - 0.02)
                   && t.y < dishMesh.pos.y + DISH.rimHeight + 0.05
                   && t.y > dishMesh.pos.y - 0.1;
      if (!inside) {
        beadState.delete(bead);
        bead.dishIndex = null;
        continue;
      }
      if (!s.settled && now - s.since > SETTLE_DELAY) {
        s.settled = true;
        const correct = COLORS[s.dish].name === bead.colorName;
        // pulse the dish rim
        pulseAccent(accentByDish.get(s.dish), correct ? 0x9bf07a : 0xff8fb1);
        if (correct) onCorrect?.(bead, s.dish);
        else onWrong?.(bead, s.dish);
      }
      if (s.settled) inDishCount++;
    }

    if (inDishCount >= totalSpawned && totalSpawned > 0) {
      levelArmed = false;
      onComplete?.();
    }
  }

  return { update, setSpawnedCount };
}

const pulseTimers = new WeakMap();

function pulseAccent(accent, hex) {
  if (!accent) return;
  const m = accent.material;
  m.emissive.setHex(hex);
  m.emissiveIntensity = 0.95;
  const start = performance.now();
  const dur = 380;
  cancelAnimationFrame(pulseTimers.get(accent));
  function tick() {
    const t = (performance.now() - start) / dur;
    if (t >= 1) {
      m.emissiveIntensity = 0.05;
      m.emissive.setHex(accent.userData.baseHex || hex);
      return;
    }
    m.emissiveIntensity = 0.95 * (1 - t);
    pulseTimers.set(accent, requestAnimationFrame(tick));
  }
  pulseTimers.set(accent, requestAnimationFrame(tick));
}
