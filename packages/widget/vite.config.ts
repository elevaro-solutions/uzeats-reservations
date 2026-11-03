import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const webPublicPath = join(rootDir, '../../apps/web/public/widget.js');

/**
 * Copy the IIFE bundle into the diner web public folder.
 * Writes from the in-memory chunk (not dist/) so a concurrent turbo
 * `widget build` + `vite build --watch` cannot ENOENT the source mid-copy.
 */
function copyWidgetToWeb(): Plugin {
  return {
    name: 'copy-widget-to-web',
    writeBundle(_options, bundle) {
      const chunk = Object.values(bundle).find(
        (item) => item.type === 'chunk' && item.fileName === 'widget.iife.js',
      );
      if (!chunk || chunk.type !== 'chunk') {
        console.warn('[copy-widget-to-web] skip: widget.iife.js chunk missing from bundle');
        return;
      }
      mkdirSync(dirname(webPublicPath), { recursive: true });
      writeFileSync(webPublicPath, chunk.code, 'utf8');
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
