// Procedural low-poly palm trees. Twisty cylinder trunk + a fan of triangle
// fronds with the pixelated leaf canvas texture. Two trees flank the view.
import * as THREE from 'three';
import { palmFrondTexture } from '../gen/clouds.js';
import { applyVertexSnap } from '../shaders/ps1.js';

export function buildPalms() {
  const group = new THREE.Group();
  const tex = palmFrondTexture(32);

  function tree(x, z, scale = 1, twist = 0.4) {
    const t = new THREE.Group();

    // trunk: low-poly tapered cylinder, slight bend via lathe
    const trunkSegments = 9;
    const profile = [];
    const trunkH = 4.5 * scale;
    for (let i = 0; i <= trunkSegments; i++) {
      const u = i / trunkSegments;
      const r = THREE.MathUtils.lerp(0.16 * scale, 0.08 * scale, u);
      profile.push(new THREE.Vector2(r, u * trunkH));
    }
    const trunkGeo = new THREE.LatheGeometry(profile, 6);
    // bend the trunk by twisting positions
    const pos = trunkGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const bend = Math.sin(y / trunkH * Math.PI) * twist * scale;
      pos.setX(i, pos.getX(i) + bend);
    }
    pos.needsUpdate = true;
    trunkGeo.computeVertexNormals();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85, flatShading: true });
    applyVertexSnap(trunkMat);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = false;
    t.add(trunk);

    // fronds: 7 triangle planes radiating from the trunk top, each a
    // textured plane drooping outward
    const frondCount = 7;
    for (let i = 0; i < frondCount; i++) {
      const a = (i / frondCount) * Math.PI * 2;
      const fmat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      applyVertexSnap(fmat);
      const f = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0 * scale, 0.7 * scale, 1, 1),
        fmat,
      );
      f.position.set(
        Math.cos(a) * 0.9 * scale + Math.sin(trunkH / trunkH * Math.PI) * twist * scale,
        trunkH - 0.05,
        Math.sin(a) * 0.9 * scale,
      );
      f.rotation.y = -a + Math.PI / 2;
      f.rotation.z = -0.35; // droop
      t.add(f);
    }

    t.position.set(x, 0, z);
    return t;
  }

  group.add(tree(-7, -8, 1.2, 0.4));
  group.add(tree(8.5, -10, 1.0, -0.5));
  group.add(tree(-12, -16, 0.8, 0.6));

  return { group };
}
