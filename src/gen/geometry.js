// Procedural bead shape variants. All inscribed in a sphere of BEAD.radius for
// physics consistency (physics is always a sphere collider; only the visual
// mesh varies).
import * as THREE from 'three';
import { BEAD } from '../constants.js';

export function beadShapes() {
  const r = BEAD.radius;
  return {
    round:  new THREE.SphereGeometry(r, 14, 10),
    barrel: new THREE.CylinderGeometry(r * 0.78, r * 0.78, r * 1.6, 12, 1),
    bicone: makeBicone(r, 12),
    cube:   new THREE.BoxGeometry(r * 1.25, r * 1.25, r * 1.25),
    disc:   new THREE.CylinderGeometry(r, r, r * 0.5, 14, 1),
  };
}

function makeBicone(r, segments) {
  const g = new THREE.ConeGeometry(r * 0.95, r, segments, 1);
  const top = g.clone();
  // mirror to make a double-cone
  const m = new THREE.Matrix4().makeScale(1, -1, 1);
  top.applyMatrix4(m);
  return THREE.BufferGeometryUtils
    ? THREE.BufferGeometryUtils.mergeGeometries([g, top])
    : mergeManually(g, top);
}

function mergeManually(a, b) {
  // tiny inline merge to avoid pulling BufferGeometryUtils when not exposed
  const out = new THREE.BufferGeometry();
  const pa = a.attributes.position.array;
  const pb = b.attributes.position.array;
  const na = a.attributes.normal.array;
  const nb = b.attributes.normal.array;
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa, 0); pos.set(pb, pa.length);
  const nrm = new Float32Array(na.length + nb.length);
  nrm.set(na, 0); nrm.set(nb, na.length);
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal',   new THREE.BufferAttribute(nrm, 3));
  return out;
}
