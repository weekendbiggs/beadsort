// Rapier world. Async WASM init, accumulator-based fixed timestep decoupled
// from render. Static colliders for the table + walls + dish rims + per-dish
// triggers. Returns handles other modules (beads, sort detection) attach to.
import RAPIER from '@dimforge/rapier3d-compat';
import { TABLE, DISH, BEAD, dishPositions } from '../constants.js';

export const FIXED_DT = 1 / 60;

export async function initPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;

  const eventQueue = new RAPIER.EventQueue(true);

  // --- table top (cuboid, static) ---
  {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, TABLE.topY - TABLE.thickness / 2, 0));
    const desc = RAPIER.ColliderDesc
      .cuboid(TABLE.width / 2, TABLE.thickness / 2, TABLE.depth / 2)
      .setRestitution(0.18)
      .setFriction(0.45)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const c = world.createCollider(desc, body);
    c.userData = { kind: 'table' };
  }

  // --- perimeter walls (invisible, keep beads on the table) ---
  const wallH = 0.6;
  const wallT = 0.2;
  const wallY = TABLE.topY + wallH / 2;
  const walls = [
    { x: 0, z: -TABLE.depth / 2 - wallT / 2, sx: TABLE.width / 2 + wallT, sz: wallT / 2 }, // back
    { x: 0, z:  TABLE.depth / 2 + wallT / 2, sx: TABLE.width / 2 + wallT, sz: wallT / 2 }, // front
    { x: -TABLE.width / 2 - wallT / 2, z: 0, sx: wallT / 2, sz: TABLE.depth / 2 + wallT }, // left
    { x:  TABLE.width / 2 + wallT / 2, z: 0, sx: wallT / 2, sz: TABLE.depth / 2 + wallT }, // right
  ];
  for (const w of walls) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(w.x, wallY, w.z));
    const c = world.createCollider(
      RAPIER.ColliderDesc.cuboid(w.sx, wallH / 2, w.sz).setFriction(0.3).setRestitution(0.05),
      body,
    );
    c.userData = { kind: 'wall' };
  }

  // --- dishes ---
  // Each dish gets:
  //   * a ring of slim cuboid rim segments forming a (faceted) circular wall
  //   * a curved-ish floor approximated with a low cone (cheaper than trimesh)
  //   * a sensor cylinder just above the floor that flags beads as "in dish N"
  const dishes = [];
  const positions = dishPositions();
  for (let i = 0; i < DISH.count; i++) {
    const p = positions[i];
    const dishBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z));

    // Rim: 16 segments around the inner radius. Tall enough to keep beads in,
    // thin enough not to show as obvious facets behind the porcelain mesh.
    const segCount = 16;
    const segLen = (2 * Math.PI * DISH.innerRadius) / segCount * 0.55;
    const segThickness = 0.025;
    for (let s = 0; s < segCount; s++) {
      const a = (s / segCount) * Math.PI * 2;
      const x = Math.cos(a) * DISH.innerRadius;
      const z = Math.sin(a) * DISH.innerRadius;
      const desc = RAPIER.ColliderDesc
        .cuboid(segLen, DISH.rimHeight / 2, segThickness)
        .setTranslation(x, DISH.rimHeight / 2, z)
        .setRotation(quatFromAxisAngle(0, 1, 0, -a))
        .setFriction(0.2)
        .setRestitution(0.25)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const c = world.createCollider(desc, dishBody);
      c.userData = { kind: 'dish-rim', dish: i };
    }

    // Floor: a flat cylinder slightly below rim height (curved approximation
    // is hidden by the porcelain mesh; physics just needs "stuff lands here").
    {
      const desc = RAPIER.ColliderDesc
        .cylinder(0.02, DISH.innerRadius - 0.01)
        .setTranslation(0, 0.01, 0)
        .setFriction(0.4)
        .setRestitution(0.15)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const c = world.createCollider(desc, dishBody);
      c.userData = { kind: 'dish-floor', dish: i };
    }

    // Sensor for sort detection — wired up properly in M6, present now so the
    // event queue infrastructure is exercised end-to-end.
    {
      const desc = RAPIER.ColliderDesc
        .cylinder(DISH.rimHeight * 0.45, DISH.innerRadius - 0.04)
        .setTranslation(0, DISH.rimHeight * 0.45, 0)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const c = world.createCollider(desc, dishBody);
      c.userData = { kind: 'dish-sensor', dish: i };
      dishes.push({ index: i, sensorHandle: c.handle });
    }
  }

  return { RAPIER, world, eventQueue, dishes };
}

// Quaternion (x,y,z,w) from axis-angle.
function quatFromAxisAngle(ax, ay, az, angle) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(half) };
}

// Spawn a single dynamic bead (debug / generic helper). M4 uses an instanced
// pool but exercising one body here proves the pipeline.
export function spawnDebugBead(world, RAPIER, x, y, z) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(0.3)
      .setAngularDamping(0.5)
      .setCanSleep(true),
  );
  const c = world.createCollider(
    RAPIER.ColliderDesc
      .ball(BEAD.radius)
      .setDensity(2.4)
      .setFriction(0.25)
      .setRestitution(0.42)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body,
  );
  c.userData = { kind: 'bead', debug: true };
  return body;
}

// Accumulator-based stepper. Returns alpha for render interpolation.
export function makeStepper(world, eventQueue, onContact) {
  let acc = 0;
  return function step(frameDt) {
    acc += Math.min(frameDt, 0.1); // clamp to avoid spiral of death after tab away
    let steps = 0;
    while (acc >= FIXED_DT && steps < 4) {
      world.step(eventQueue);
      eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (started && onContact) onContact(world.getCollider(h1), world.getCollider(h2));
      });
      acc -= FIXED_DT;
      steps++;
    }
    return acc / FIXED_DT;
  };
}
