import * as THREE from 'three';
import { TABLE, DISH, BEAD, COLORS, dishPositions } from '../constants.js';
import { marbleTexture, porcelainTexture } from '../gen/textures.js';

// Returns { group, dishMeshes } where dishMeshes[i] holds refs for later milestones.
export function buildTable() {
  const group = new THREE.Group();

  const marble = marbleTexture(512);
  marble.repeat.set(1.5, 2.2);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE.width, TABLE.thickness, TABLE.depth),
    new THREE.MeshStandardMaterial({ map: marble, roughness: 0.35, metalness: 0.02, envMapIntensity: 0.4 })
  );
  slab.position.y = TABLE.topY - TABLE.thickness / 2;
  slab.receiveShadow = true;
  group.add(slab);

  // very subtle pedestal so the table doesn't float jarringly
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE.width * 0.7, 0.6, TABLE.depth * 0.7),
    new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.85 })
  );
  pedestal.position.y = TABLE.topY - TABLE.thickness - 0.3;
  group.add(pedestal);

  const porcelainMap = porcelainTexture(256);
  const dishMeshes = [];
  const positions = dishPositions();
  for (let i = 0; i < DISH.count; i++) {
    const dish = buildDish(porcelainMap, COLORS[i].hex);
    dish.group.position.set(positions[i].x, positions[i].y, positions[i].z);
    group.add(dish.group);
    dishMeshes.push({ ...dish, color: COLORS[i], pos: positions[i], index: i });
  }

  return { group, dishMeshes };
}

function buildDish(porcelainMap, accentHex) {
  const group = new THREE.Group();

  // Porcelain bowl via LatheGeometry. Profile traces from the rim down to the floor.
  const profile = [];
  const segments = 16;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // outer radius shrinks slightly as we go down, then a flat-ish floor
    const r = THREE.MathUtils.lerp(DISH.radius, DISH.radius * 0.55, Math.pow(t, 1.4));
    const y = THREE.MathUtils.lerp(DISH.rimHeight, -0.02, t);
    profile.push(new THREE.Vector2(r, y));
  }
  // close the floor toward the center
  profile.push(new THREE.Vector2(0, -0.04));
  const lathe = new THREE.LatheGeometry(profile, 28);
  const dish = new THREE.Mesh(
    lathe,
    new THREE.MeshPhysicalMaterial({
      map: porcelainMap,
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  dish.castShadow = true;
  dish.receiveShadow = true;
  group.add(dish);

  // Painted accent ring on the rim (a thin torus sitting just inside the rim top).
  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(DISH.radius - 0.025, 0.012, 8, 36),
    new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.5, metalness: 0.0, emissive: accentHex, emissiveIntensity: 0.05 })
  );
  accent.rotation.x = Math.PI / 2;
  accent.position.y = DISH.rimHeight - 0.005;
  group.add(accent);

  // Reference bead resting at the bottom (purely cosmetic, doesn't count toward sort).
  const refBead = new THREE.Mesh(
    new THREE.SphereGeometry(BEAD.radius, 14, 10),
    new THREE.MeshPhysicalMaterial({
      color: accentHex, transmission: 0.55, roughness: 0.1, clearcoat: 1.0, ior: 1.4, thickness: 0.1, attenuationColor: accentHex,
    })
  );
  refBead.position.y = -0.02 + BEAD.radius;
  refBead.userData.isReference = true;
  group.add(refBead);

  return { group, accent, refBead };
}
