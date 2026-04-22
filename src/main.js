import * as THREE from 'three';
import { buildEnvironment } from './scene/environment.js';
import { buildTable } from './scene/table.js';
import { buildCamera, attachParallax, reframeForAspect } from './scene/camera.js';
import { initPhysics, makeStepper, spawnDebugBead } from './physics/world.js';
import { onContact, dispatch } from './physics/contact.js';
import { BEAD, COLORS } from './constants.js';

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

// ---- Physics (async) ----
const phys = await initPhysics();
const step = makeStepper(phys.world, phys.eventQueue, dispatch);

// Debug visual: a Set of three meshes synced to dynamic bodies. M4 replaces
// this with InstancedMesh; for now one Mesh per debug bead is fine.
const debugBeads = []; // {body, mesh, color}
const debugBeadGeo = new THREE.SphereGeometry(BEAD.radius, 18, 12);

function dropDebugBead() {
  const x = (Math.random() - 0.5) * 2.0;
  const z = (Math.random() - 0.5) * 2.0 + 0.5;
  const y = 1.6 + Math.random() * 0.4;
  const body = spawnDebugBead(phys.world, phys.RAPIER, x, y, z);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const mat = new THREE.MeshPhysicalMaterial({
    color: color.hex, transmission: 0.55, roughness: 0.1, clearcoat: 1.0, ior: 1.4,
    thickness: 0.1, attenuationColor: color.hex, attenuationDistance: 0.3,
  });
  const mesh = new THREE.Mesh(debugBeadGeo, mat);
  mesh.castShadow = true;
  scene.add(mesh);
  debugBeads.push({ body, mesh });
}

// Contact-event sanity check (visible in DevTools during M3).
let contactCount = 0;
onContact((a, b) => {
  if (a.kind === 'bead' || b.kind === 'bead') contactCount++;
});

// Tiny debug UI button — removed in M5 once tap-to-pickup is in.
const debugBtn = document.createElement('button');
debugBtn.textContent = '+ bead';
debugBtn.style.cssText = 'position:fixed;bottom:env(safe-area-inset-bottom,12px);left:50%;transform:translateX(-50%);z-index:10;padding:10px 18px;font:12px ui-monospace,monospace;background:rgba(0,0,0,0.35);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;';
debugBtn.addEventListener('click', dropDebugBead);
document.body.appendChild(debugBtn);

// ---- Frame loop ----
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  step(dt);
  // sync render transforms from physics
  for (const b of debugBeads) {
    const t = b.body.translation();
    const r = b.body.rotation();
    b.mesh.position.set(t.x, t.y, t.z);
    b.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }
  updateParallax(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
boot.remove();
frame();

if (import.meta.env.DEV) {
  window.__beadsort = { scene, camera, renderer, dishMeshes, phys, debugBeads, contactCount: () => contactCount };
}
