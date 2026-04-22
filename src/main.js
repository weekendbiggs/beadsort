import * as THREE from 'three';
import { buildEnvironment } from './scene/environment.js';
import { buildTable } from './scene/table.js';
import { buildCamera, attachParallax, reframeForAspect } from './scene/camera.js';
import { initPhysics, makeStepper } from './physics/world.js';
import { onContact, dispatch } from './physics/contact.js';
import { createBeadPool } from './scene/beads.js';
import { attachInput } from './input/touch.js';
import { createSortTracker } from './sort.js';
import { initAudio, setMuted, isMuted } from './audio/bus.js';
import { PRESETS } from './audio/presets.js';
import { wireContactsToAudio, playPickup, playRelease, playCorrect, playWrong, playRespawnCascade, playLevelComplete } from './audio/wiring.js';
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
const env = buildEnvironment(scene);

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

// Sort tracker — wires dish sensors to per-bead "in dish N" state and fires
// level-complete when every spawned bead has settled in any dish.
let activeColors = COLORS.slice(0, 4);
let levelIdx = 0;

const sort = createSortTracker({
  dishMeshes, beadPool,
  onCorrect: () => { playCorrect(); if (navigator.vibrate) navigator.vibrate(12); },
  onWrong: () => { playWrong(); },
  onComplete: () => { playLevelComplete(); setTimeout(nextLevel, 900); },
});

function spawnLevel() {
  beadPool.clearAll();
  const n = Math.min(20 + levelIdx * 4, 60);
  const colorCount = Math.min(4 + Math.floor(levelIdx / 2), 6);
  activeColors = COLORS.slice(0, colorCount);
  beadPool.spawnPile(n, { colors: activeColors });
  sort.setSpawnedCount(n);
  playRespawnCascade(Math.min(n, 14));
}
function nextLevel() { levelIdx++; spawnLevel(); }
spawnLevel();

// Audio. Init in parallel with first frame; sounds will simply no-op until
// the buffer decode finishes and the user gestures (auto-resume in bus.js).
initAudio(PRESETS).then(() => {
  wireContactsToAudio();
  // Trigger the first cascade audibly once buffers are ready.
  playRespawnCascade(12);
});

// Input.
const updateHeld = attachInput({
  renderer, camera, beadPool,
  onPickup: () => playPickup(),
  onRelease: () => playRelease(),
});

// Mute toggle (UI button is in index.html).
const muteBtn = document.getElementById('mute');
muteBtn?.addEventListener('click', () => {
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? '×' : '♪';
});

// ---- Frame loop ----
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  updateHeld(dt);
  step(dt);
  sort.update();
  beadPool.syncInstances();
  updateParallax(dt);
  env.update(elapsed, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
boot.remove();
frame();

if (import.meta.env.DEV) {
  window.__beadsort = { scene, camera, renderer, dishMeshes, phys, beadPool };
}
