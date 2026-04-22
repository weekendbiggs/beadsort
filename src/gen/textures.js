// Procedural textures drawn into 2D canvases at boot. Zero binary assets.
import * as THREE from 'three';

function noise2D(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Marble: cream base, soft gray veins via layered sine + warped noise.
export function marbleTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const rand = noise2D(0xbead01);

  // value-noise lattice
  const N = 64;
  const lattice = new Float32Array(N * N);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const sample = (x, y) => {
    x = (x + N) % N; y = (y + N) % N;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = lattice[yi * N + xi];
    const b = lattice[yi * N + ((xi + 1) % N)];
    const cc = lattice[((yi + 1) % N) * N + xi];
    const d = lattice[((yi + 1) % N) * N + ((xi + 1) % N)];
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy;
  };
  const fbm = (x, y) => {
    let v = 0, amp = 0.5, freq = 1;
    for (let o = 0; o < 5; o++) { v += amp * sample(x * freq, y * freq); amp *= 0.5; freq *= 2; }
    return v;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 8, v = y / size * 8;
      // warped sine vein pattern
      const warp = fbm(u, v);
      const vein = Math.abs(Math.sin((u + warp * 1.6) * 1.4 + warp * 3.0));
      const vein2 = Math.abs(Math.sin((v * 0.6 - warp * 1.2) * 2.1));
      const veinMask = Math.pow(1 - Math.min(1, Math.min(vein, vein2) * 6.5), 2.5);
      const grime = fbm(u * 2, v * 2) * 0.08;
      const base = 240 + (fbm(u, v) - 0.5) * 14 - grime * 80;
      const r = base - veinMask * 28;
      const g = base - veinMask * 26;
      const b = base - veinMask * 22;
      const idx = (y * size + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Porcelain: very near-white with a faint blue undertone and a subtle radial sheen.
export function porcelainTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.6, '#f5f8fb');
  grad.addColorStop(1, '#e6ecf2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // subtle speckle
  const img = ctx.getImageData(0, 0, size, size);
  const rand = noise2D(0xb01);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 6;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
