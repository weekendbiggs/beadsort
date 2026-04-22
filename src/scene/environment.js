import * as THREE from 'three';

// Placeholder environment for M2: cyan vertical gradient + warm directional sun
// + cool hemisphere fill. Real skydome/ocean/palms land in M8.
export function buildEnvironment(scene) {
  scene.background = makeGradientTexture('#74d4ee', '#bdeefb');
  scene.fog = new THREE.Fog(0x9adff5, 14, 40);

  const hemi = new THREE.HemisphereLight(0xbfe7ff, 0xf3e3b8, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3da, 1.55);
  sun.position.set(4, 8, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 25;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Faint rim light from behind so glass beads catch a highlight from the sun
  // direction.
  const rim = new THREE.DirectionalLight(0xfff7e0, 0.45);
  rim.position.set(-2, 3, -5);
  scene.add(rim);
}

function makeGradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  return t;
}
