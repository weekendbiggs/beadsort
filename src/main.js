import * as THREE from 'three';
import { buildEnvironment } from './scene/environment.js';
import { buildTable } from './scene/table.js';
import { buildCamera, attachParallax, reframeForAspect } from './scene/camera.js';
import { initPhysics, makeStepper } from './physics/world.js';
import { onContact, dispatch } from './physics/contact.js';
import { createBeadPool } from './scene/beads.js';
import { COLORS } from './constants.js';

const app = document.getElementById('app');
const boot = document.getElementById('boot');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
buildEnvironment(scene);

const { group: tableGroup, dishMeshes } = buildTable();
scene.add(tableGroup);

const camera = buildCamera();
const updateParallax = attachParallax(camera);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  reframeForAspect(camera, w, h);
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// ---- Physics + bead pool ----
const phys = await initPhysics();
const step = makeStepper(phys.world, phys.eventQueue, dispatch);
const beadPool = createBeadPool(scene, phys.world);

// Initial pile: 20 beads, 4 colors. Cascade visually because spawnPile staggers Y.
beadPool.spawnPile(20, { colors: COLORS.slice(0, 4) });

// Contact-event sanity hook (audio bus replaces this in M7).
onContact((a, b) => {
  // no-op for now; M7 will route to audio bus
  void a; void b;
});

// Debug button — respawns a fresh pile. Removed in M5+.
const debugBtn = document.createElement('button');
debugBtn.textContent = 'respawn';
debugBtn.style.cssText = 'position:fixed;bottom:env(safe-area-inset-bottom,12px);left:50%;transform:translateX(-50%);z-index:10;padding:10px 18px;font:12px ui-monospace,monospace;background:rgba(0,0,0,0.35);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;';
debugBtn.addEventListener('click', () => {
  beadPool.clearAll();
  beadPool.spawnPile(20, { colors: COLORS.slice(0, 4) });
});
document.body.appendChild(debugBtn);

// ---- Frame loop ----
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  step(dt);
  beadPool.syncInstances();
  updateParallax(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
boot.remove();
frame();

if (import.meta.env.DEV) {
  window.__beadsort = { scene, camera, renderer, dishMeshes, phys, beadPool };
}
