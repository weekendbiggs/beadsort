import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: '/beadsort/',
  plugins: [glsl()],
  build: {
    target: 'esnext', // top-level await for Rapier WASM init
    sourcemap: false,
  },
  server: {
    host: true,
  },
});
