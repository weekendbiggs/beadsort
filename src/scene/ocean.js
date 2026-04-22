// Ocean plane sitting beyond the table, filling the visible horizon. Caustic
// tile pattern via cell/Voronoi-ish noise, gentle sine vertex displacement,
// fresnel-driven foam highlights.
import * as THREE from 'three';

export function buildOcean() {
  const geo = new THREE.PlaneGeometry(120, 120, 64, 64);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime:       { value: 0 },
      uShallow:    { value: new THREE.Color(0x6fdcff) },
      uDeep:       { value: new THREE.Color(0x0a4f7a) },
      uFoam:       { value: new THREE.Color(0xffffff) },
      uCameraPos:  { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        // gentle, layered swell
        p.y += sin(p.x * 0.18 + uTime * 0.7) * 0.18
             + cos(p.z * 0.22 - uTime * 0.55) * 0.14
             + sin((p.x + p.z) * 0.05 + uTime * 0.3) * 0.10;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform float uTime;
      uniform vec3 uShallow, uDeep, uFoam, uCameraPos;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      // 2D hash
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      // Voronoi-style cell distance — produces the caustic 'cracked tile'
      // network of bright lines on cyan that the moodboard images show.
      float voronoiCells(vec2 uv) {
        vec2 g = floor(uv);
        vec2 f = fract(uv);
        float minDist = 1.0;
        float secondDist = 1.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 nb = vec2(float(i), float(j));
            vec2 cellPt = nb + hash2(g + nb);
            float d = length(cellPt - f);
            if (d < minDist) { secondDist = minDist; minDist = d; }
            else if (d < secondDist) secondDist = d;
          }
        }
        return secondDist - minDist; // narrow bright at edges
      }

      void main() {
        // two layers of cells drifting in opposite directions — that
        // shimmering caustic feel
        vec2 uvA = vWorldPos.xz * 0.55 + vec2(uTime * 0.04, uTime * 0.025);
        vec2 uvB = vWorldPos.xz * 0.85 + vec2(-uTime * 0.06, uTime * 0.05);
        float cellsA = voronoiCells(uvA);
        float cellsB = voronoiCells(uvB);
        float caustic = pow(1.0 - min(cellsA, cellsB), 4.0);
        caustic = clamp(caustic, 0.0, 1.0);

        // depth tint
        vec3 base = mix(uDeep, uShallow, 0.55 + 0.45 * sin(uTime * 0.4 + vWorldPos.x * 0.05));
        vec3 col = mix(base, uFoam, caustic * 0.85);

        // fresnel-ish edge sparkle
        vec3 v = normalize(uCameraPos - vWorldPos);
        float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
        col = mix(col, uFoam, fres * 0.25);

        gl_FragColor = vec4(col, 0.96);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -1.2; // sits below table top, far behind
  mesh.position.z = -25;

  return {
    mesh,
    update(t, camera) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uCameraPos.value.copy(camera.position);
    },
  };
}
