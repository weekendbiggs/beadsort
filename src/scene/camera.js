import * as THREE from 'three';
import { TABLE } from '../constants.js';

// Fixed framing. Above and slightly behind the player side, tilted ~70° from
// horizontal (so ~20° from straight down). Narrow FOV to keep bead sizes
// consistent. No user camera control.
export function buildCamera() {
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  // Distance chosen so the table fills the lower ~60% of a portrait canvas.
  // Portrait aspect 9:16 is the design target; we re-frame in resize() if wider.
  const tilt = THREE.MathUtils.degToRad(70); // from horizontal
  const dist = 11;
  cam.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist);
  cam.lookAt(0, 0, -TABLE.depth * 0.05);
  return cam;
}

// Subtle device-tilt parallax on mobile. Max ±2° drift.
export function attachParallax(cam) {
  const base = cam.position.clone();
  let bx = 0, by = 0; // smoothed offsets in radians
  let tx = 0, ty = 0;

  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    tx = THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * THREE.MathUtils.degToRad(2);
    ty = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1) * THREE.MathUtils.degToRad(1.2);
  });

  return function update(dt) {
    bx += (tx - bx) * Math.min(1, dt * 4);
    by += (ty - by) * Math.min(1, dt * 4);
    const r = base.length();
    cam.position.x = base.x + Math.sin(bx) * r * 0.04;
    cam.position.y = base.y + Math.sin(by) * r * 0.02;
    cam.lookAt(0, 0, -TABLE.depth * 0.05);
  };
}

// Re-frame on resize so the table stays visible regardless of aspect.
export function reframeForAspect(cam, w, h) {
  cam.aspect = w / h;
  // For very wide windows (desktop landscape), pull camera back a touch so
  // the dish row doesn't crowd the top.
  if (cam.aspect > 1) {
    cam.position.setLength(13);
  } else {
    cam.position.setLength(11);
  }
  cam.updateProjectionMatrix();
}
