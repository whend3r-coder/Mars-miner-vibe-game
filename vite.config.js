import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
  },
});
