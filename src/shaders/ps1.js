// PS1 vertex snapping. Injects a clip-space snap into a Three.js material's
// generated vertex shader via onBeforeCompile. Apply only to background props
// (palms, distant geometry) — beads/marble look wrong with the wobble.
//
// We omit the classic affine-UV warp: at our 0.8x render res it's barely
// visible, and the chunk-replacement is fragile across three.js versions.
// Vertex snap alone carries most of the signature.
import * as THREE from 'three';

const SNAP_RES = 160.0; // pixels across — lower = chunkier wobble

export function applyVertexSnap(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnapRes = { value: SNAP_RES };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uSnapRes;`)
      .replace('#include <project_vertex>', `
        #include <project_vertex>
        vec2 _snap = floor(gl_Position.xy / gl_Position.w * uSnapRes + 0.5) / uSnapRes;
        gl_Position.xy = _snap * gl_Position.w;
      `);
  };
  material.needsUpdate = true;
  return material;
}

// Walk a group/mesh tree and apply vertex snap to every material found.
export function applyVertexSnapTo(object3d) {
  object3d.traverse((o) => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) applyVertexSnap(m);
  });
}

// Quick-toggle for color quantization at the renderer level. Cheap version:
// run a final fullscreen pass that floor()s the color channels. We expose a
// flag instead of building a full EffectComposer to keep bundle size down.
export function makeQuantizePass(renderer, scene, camera) {
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: rt.texture }, uLevels: { value: 32.0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D tSrc;
        uniform float uLevels;
        void main() {
          vec4 c = texture2D(tSrc, vUv);
          c.rgb = floor(c.rgb * uLevels) / uLevels;
          gl_FragColor = c;
        }
      `,
    }),
  );
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  let enabled = false;
  function resize(w, h) { rt.setSize(w, h); }
  function render() {
    if (!enabled) {
      renderer.render(scene, camera);
      return;
    }
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, orthoCam);
  }
  return { resize, render, set enabled(v) { enabled = v; }, get enabled() { return enabled; } };
}
