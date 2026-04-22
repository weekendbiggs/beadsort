import * as THREE from 'three';

const app = document.getElementById('app');
const boot = document.getElementById('boot');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4ec3ee);
scene.fog = new THREE.Fog(0x4ec3ee, 8, 30);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 4, 5);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xbfe7ff, 0xf3e3b8, 1.0));
const sun = new THREE.DirectionalLight(0xfff3da, 1.4);
sun.position.set(3, 6, 2);
scene.add(sun);

// M1 placeholder: a glassy spinning cube — replaced in M2.
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transmission: 0.6, roughness: 0.15, clearcoat: 1, ior: 1.4 })
);
scene.add(cube);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta();
  cube.rotation.x += dt * 0.6;
  cube.rotation.y += dt * 0.9;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
boot.remove();
frame();
