import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'TableveraWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    outDir: 'dist',
    cssCodeSplit: false,
  },
});
