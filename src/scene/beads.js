// Bead pool. One InstancedMesh per (shape, color) pair. Physics bodies live in
// a parallel array; the render loop syncs instance matrices from Rapier each
// frame. Dynamically grows shape/color combos lazily.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BEAD, COLORS } from '../constants.js';
import { beadShapes } from '../gen/geometry.js';

const MAX_PER_BUCKET = 64; // cap per (shape,color) instance batch

export function createBeadPool(scene, world) {
  const shapes = beadShapes();
  const shapeNames = Object.keys(shapes);

  // Shared materials per color — one MeshPhysicalMaterial per color reused
  // across every shape variant. Glassy: transmission + clearcoat + mild tint.
  const materials = {};
  for (const c of COLORS) {
    materials[c.name] = new THREE.MeshPhysicalMaterial({
      color: c.hex,
      transmission: 0.55,
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      ior: 1.42,
      thickness: 0.12,
      attenuationColor: c.hex,
      attenuationDistance: 0.4,
      envMapIntensity: 1.1,
    });
  }

  // buckets[shape][color] = { mesh: InstancedMesh, count, free: number[], slots: { idx -> bead } }
  const buckets = {};
  for (const sn of shapeNames) {
    buckets[sn] = {};
    for (const c of COLORS) {
      const mesh = new THREE.InstancedMesh(shapes[sn], materials[c.name], MAX_PER_BUCKET);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
      buckets[sn][c.name] = { mesh, count: 0, free: [], slots: new Array(MAX_PER_BUCKET).fill(null) };
    }
  }

  // bead = { body, shapeName, colorName, instanceIdx, sleeping, dishIndex|null }
  const beads = [];
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);

  function spawnBead({ x, y, z, color, shape }) {
    const bk = buckets[shape][color.name];
    if (bk.count >= MAX_PER_BUCKET && bk.free.length === 0) return null;
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.32)
        .setAngularDamping(0.55)
        .setCcdEnabled(false)
        .setCanSleep(true),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.ball(BEAD.radius)
        .setDensity(2.4)
        .setFriction(0.28)
        .setRestitution(0.42)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    const idx = bk.free.length ? bk.free.pop() : bk.count++;
    bk.mesh.count = Math.max(bk.mesh.count, idx + 1);

    const bead = {
      body,
      collider,
      shapeName: shape,
      colorName: color.name,
      colorHex: color.hex,
      instanceIdx: idx,
      bucket: bk,
      dishIndex: null,
    };
    bk.slots[idx] = bead;
    collider.userData = { kind: 'bead', bead };
    beads.push(bead);
    return bead;
  }

  function despawnBead(bead) {
    world.removeRigidBody(bead.body);
    bead.bucket.slots[bead.instanceIdx] = null;
    bead.bucket.free.push(bead.instanceIdx);
    // Hide the instance by zero-scaling its matrix.
    _m.compose(_v.set(0, -1000, 0), _q.identity(), new THREE.Vector3(0, 0, 0));
    bead.bucket.mesh.setMatrixAt(bead.instanceIdx, _m);
    bead.bucket.mesh.instanceMatrix.needsUpdate = true;
    const i = beads.indexOf(bead);
    if (i >= 0) beads.splice(i, 1);
  }

  function syncInstances() {
    // mark which buckets need an instanceMatrix upload
    const dirty = new Set();
    for (const b of beads) {
      const t = b.body.translation();
      const r = b.body.rotation();
      _v.set(t.x, t.y, t.z);
      _q.set(r.x, r.y, r.z, r.w);
      _m.compose(_v, _q, _s);
      b.bucket.mesh.setMatrixAt(b.instanceIdx, _m);
      dirty.add(b.bucket.mesh);
    }
    for (const m of dirty) m.instanceMatrix.needsUpdate = true;
  }

  // Spawn a pile of N beads from the bottom 2/3 of the table, dropped from
  // above the spawn area with small random offsets so they cascade.
  function spawnPile(n, options = {}) {
    const colors = options.colors || COLORS.slice(0, 4);
    const shapeChoices = options.shapes || shapeNames;
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 2 * (2.0 - BEAD.spawnXMargin);
      const z = THREE.MathUtils.lerp(BEAD.spawnZMin, BEAD.spawnZMax, Math.random());
      const y = THREE.MathUtils.lerp(BEAD.spawnYMin, BEAD.spawnYMax, Math.random()) + i * 0.012;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapeChoices[Math.floor(Math.random() * shapeChoices.length)];
      const b = spawnBead({ x, y, z, color, shape });
      if (b) out.push(b);
    }
    return out;
  }

  function clearAll() {
    while (beads.length) despawnBead(beads[beads.length - 1]);
  }

  return { spawnBead, spawnPile, despawnBead, syncInstances, clearAll, beads, buckets, materials };
}
