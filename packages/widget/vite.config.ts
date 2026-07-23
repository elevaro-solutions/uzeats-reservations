import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(rootDir, 'dist/widget.iife.js');
const webPublicPath = join(rootDir, '../../apps/web/public/widget.js');

function copyWidgetToWeb(): Plugin {
  return {
    name: 'copy-widget-to-web',
    closeBundle() {
      mkdirSync(dirname(webPublicPath), { recursive: true });
      copyFileSync(bundlePath, webPublicPath);
      console.log('Copied widget to apps/web/public/widget.js');
    },
  };
}

export default defineConfig({
  plugins: [copyWidgetToWeb()],
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
