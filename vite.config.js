import { defineConfig } from 'vite';

export default defineConfig({
  base: '/beadsort/',
  build: {
    target: 'esnext', // top-level await for Rapier WASM init
    sourcemap: false,
  },
  server: {
    host: true,
  },
});
