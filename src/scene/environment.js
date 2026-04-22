// Beach environment: skydome (gradient + clouds + sun), ocean shader, palms.
// Returns an `update(t, camera)` so main.js can drive the time-based shaders
// and cloud drift from the render loop.
import * as THREE from 'three';
import { buildSkydome } from './skydome.js';
import { buildOcean } from './ocean.js';
import { buildPalms } from './palms.js';

export function buildEnvironment(scene) {
  // ambient fog softens the seam between table and ocean
  scene.fog = new THREE.Fog(0x9adff5, 18, 60);

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

  const rim = new THREE.DirectionalLight(0xfff7e0, 0.45);
  rim.position.set(-2, 3, -5);
  scene.add(rim);

  const sky = buildSkydome();
  scene.add(sky.group);

  const ocean = buildOcean();
  scene.add(ocean.mesh);

  const palms = buildPalms();
  scene.add(palms.group);

  return {
    update(t, camera) {
      sky.update(t);
      ocean.update(t, camera);
    },
  };
}
