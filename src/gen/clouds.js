// Procedural puffy-cloud texture: scatter overlapping soft white blobs on
// transparent canvas. Returned as a tileable RepeatWrapping CanvasTexture so
// we can scroll its UVs across the inside of the skydome.
import * as THREE from 'three';

export function cloudStripTexture(w = 1024, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  function blob(cx, cy, r, alpha) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.5})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scatter ~22 cloud clusters across the strip, each made of 5-8 blobs.
  let seed = 0xc10b1d;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 22; i++) {
    const cx = rand() * w;
    const cy = h * (0.25 + rand() * 0.5);
    const baseR = 30 + rand() * 70;
    const blobs = 5 + Math.floor(rand() * 4);
    for (let b = 0; b < blobs; b++) {
      const ox = (rand() - 0.5) * baseR * 1.6;
      const oy = (rand() - 0.5) * baseR * 0.6;
      blob(cx + ox, cy + oy, baseR * (0.6 + rand() * 0.7), 0.55 + rand() * 0.25);
    }
    // wrap horizontally
    if (cx < baseR * 1.5) blob(cx + w, cy, baseR, 0.65);
    if (cx > w - baseR * 1.5) blob(cx - w, cy, baseR, 0.65);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Pixelated palm-frond stamp on a tiny canvas. The low-res look is the point.
export function palmFrondTexture(size = 32) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  // simple frond shape: a tapered ellipse with chunky rim
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5;
      const v = y / size; // 0 = base, 1 = tip
      const taper = 1 - v;
      const inside = Math.abs(u) < taper * 0.42 + 0.04;
      if (inside) {
        // two greens: darker rim, brighter core
        const core = Math.abs(u) < taper * 0.22 + 0.02;
        ctx.fillStyle = core ? '#4daa4a' : '#2f7a3a';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
