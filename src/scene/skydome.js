// Inverted-sphere skydome: vertical gradient from deep cyan at zenith to warm
// haze at horizon, with a slow UV-scrolling cloud strip painted on a second
// inverted dome just inside it. Sun disc + faint bloom is a third additive
// billboard hung in the sky.
import * as THREE from 'three';
import { cloudStripTexture } from '../gen/clouds.js';

export function buildSkydome() {
  const group = new THREE.Group();

  // Gradient sky via custom shader on an inside-out sphere. Keeps it cheap
  // (no fragment noise per pixel beyond a tiny dither).
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith:  { value: new THREE.Color(0x1a8fd4) }, // sega blue at top
        horizon: { value: new THREE.Color(0xc9eef9) }, // pale haze
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying vec3 vWorldPos;
        uniform vec3 zenith;
        uniform vec3 horizon;
        // tiny ordered dither to mask gradient banding
        float dither(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) / 64.0;
        }
        void main() {
          float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
          // soften toward horizon
          float t = pow(h, 0.7);
          vec3 col = mix(horizon, zenith, t);
          col += vec3(dither(gl_FragCoord.xy)) - 0.005;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  group.add(sky);

  // Cloud band: a second back-side sphere a touch smaller, with the cloud
  // texture mapped and slowly scrolling.
  const cloudTex = cloudStripTexture();
  cloudTex.repeat.set(2, 1);
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(78, 32, 16, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.45),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.BackSide }),
  );
  group.add(clouds);

  // Sun disc: an additive sprite far away. Adds a focal warm point.
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = 128;
  const sctx = sunCanvas.getContext('2d');
  const sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, 'rgba(255,250,220,1)');
  sg.addColorStop(0.25, 'rgba(255,236,170,0.85)');
  sg.addColorStop(0.6, 'rgba(255,200,140,0.25)');
  sg.addColorStop(1, 'rgba(255,200,140,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 128, 128);
  const sunTex = new THREE.CanvasTexture(sunCanvas);
  sunTex.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sun.scale.set(8, 8, 1);
  sun.position.set(-15, 14, -55);
  group.add(sun);

  return {
    group,
    update(t) {
      // slow east-to-west drift
      cloudTex.offset.x = (t * 0.005) % 1;
    },
  };
}
