// Pointer-driven bead pickup, drag, and release with velocity carryover.
//
// Held beads switch to KinematicPositionBased so they follow the cursor along
// a horizontal "holding plane" while still shoving other beads aside. We
// sample position deltas to recover a velocity for the moment of release;
// release swaps the body back to Dynamic and applies that velocity (scaled
// 0.7x per the README so users can't rocket-flick beads off the table).
//
// Multi-touch capped at 2 simultaneous beads. Light haptic on pickup where
// supported.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TABLE, BEAD } from '../constants.js';

const HOLDING_PLANE_Y = TABLE.topY + 0.55;
const PICKUP_RADIUS = BEAD.radius * 2.4; // generous tap target
const MAX_HELD = 2;
const RELEASE_VEL_SCALE = 0.7;
const VEL_SAMPLE_HALFLIFE = 0.05; // s — short EMA so a flick reads recent motion

export function attachInput({ renderer, camera, beadPool, onPickup, onRelease }) {
  const dom = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeAtHold = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOLDING_PLANE_Y);
  const tmpHit = new THREE.Vector3();

  // pointerId → { bead, target: Vec3, vel: Vec3, lastPos: Vec3, lastT: number }
  const held = new Map();

  function updateNDC(ev) {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function raycastToHoldingPlane(out) {
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(planeAtHold, out);
  }

  function pickBead() {
    raycaster.setFromCamera(ndc, camera);
    let best = null, bestDist = Infinity;
    // Iterate every bucket's InstancedMesh. raycast() returns hits with
    // instanceId; we map back to the bead via bucket.slots.
    for (const sn of Object.keys(beadPool.buckets)) {
      const bk = beadPool.buckets[sn];
      for (const cn of Object.keys(bk)) {
        const bucket = bk[cn];
        if (bucket.mesh.count === 0) continue;
        const hits = raycaster.intersectObject(bucket.mesh, false);
        for (const h of hits) {
          if (h.instanceId == null) continue;
          const bead = bucket.slots[h.instanceId];
          if (!bead) continue;
          // skip already-held
          let alreadyHeld = false;
          for (const v of held.values()) if (v.bead === bead) { alreadyHeld = true; break; }
          if (alreadyHeld) continue;
          if (h.distance < bestDist) { bestDist = h.distance; best = bead; }
        }
      }
    }
    return best;
  }

  function onPointerDown(ev) {
    if (held.size >= MAX_HELD) return;
    updateNDC(ev);
    const bead = pickBead();
    if (!bead) return;
    if (!raycastToHoldingPlane(tmpHit)) return;
    dom.setPointerCapture(ev.pointerId);

    bead.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    bead.body.setNextKinematicTranslation({ x: tmpHit.x, y: HOLDING_PLANE_Y, z: tmpHit.z });

    held.set(ev.pointerId, {
      bead,
      target: tmpHit.clone().setY(HOLDING_PLANE_Y),
      vel: new THREE.Vector3(),
      lastPos: tmpHit.clone().setY(HOLDING_PLANE_Y),
      lastT: performance.now() / 1000,
    });

    if (navigator.vibrate) navigator.vibrate(8);
    onPickup?.(bead);
  }

  function onPointerMove(ev) {
    const h = held.get(ev.pointerId);
    if (!h) return;
    updateNDC(ev);
    if (!raycastToHoldingPlane(tmpHit)) return;
    h.target.set(tmpHit.x, HOLDING_PLANE_Y, tmpHit.z);
  }

  function onPointerUp(ev) {
    const h = held.get(ev.pointerId);
    if (!h) return;
    held.delete(ev.pointerId);
    try { dom.releasePointerCapture(ev.pointerId); } catch {}

    h.bead.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    h.bead.body.setLinvel(
      { x: h.vel.x * RELEASE_VEL_SCALE, y: 0, z: h.vel.z * RELEASE_VEL_SCALE },
      true,
    );
    onRelease?.(h.bead);
  }

  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerup', onPointerUp);
  dom.addEventListener('pointercancel', onPointerUp);

  // Step held beads each frame: smooth position toward target (40-60ms lag),
  // sample velocity for release. Called from the main render loop.
  return function updateHeld(dt) {
    if (held.size === 0) return;
    const now = performance.now() / 1000;
    const smooth = 1 - Math.exp(-dt / 0.05); // ~50ms perceptual smoothing
    for (const h of held.values()) {
      const t = h.bead.body.translation();
      const cur = new THREE.Vector3(t.x, t.y, t.z);
      const next = cur.clone().lerp(h.target, smooth);
      h.bead.body.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });

      // EMA velocity from observed delta.
      const dtSample = Math.max(1e-3, now - h.lastT);
      const inst = next.clone().sub(h.lastPos).divideScalar(dtSample);
      const a = 1 - Math.exp(-dtSample / VEL_SAMPLE_HALFLIFE);
      h.vel.lerp(inst, a);
      h.lastPos.copy(next);
      h.lastT = now;
    }
  };
}
