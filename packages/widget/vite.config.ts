import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ReserveTableWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    outDir: 'dist',
    cssCodeSplit: false,
  },
});
