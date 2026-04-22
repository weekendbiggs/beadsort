import { defineConfig } from 'vite';

export default defineConfig({
  base: '/beadsort/',
  build: {
    target: 'esnext', // top-level await for Rapier WASM init
    sourcemap: true,
  },
  server: {
    host: true,
  },
});
