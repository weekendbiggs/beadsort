import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: '/beadsort/',
  plugins: [glsl()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    host: true,
  },
});
