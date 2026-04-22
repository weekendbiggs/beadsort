import * as THREE from 'three';
import { buildEnvironment } from './scene/environment.js';
import { buildTable } from './scene/table.js';
import { buildCamera, attachParallax, reframeForAspect } from './scene/camera.js';

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

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updateParallax(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
boot.remove();
frame();

// Expose for debugging in M3+.
if (import.meta.env.DEV) {
  window.__beadsort = { scene, camera, renderer, dishMeshes };
}
