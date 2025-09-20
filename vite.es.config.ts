// vite.es.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  assetsInclude: [/\.wasm$/], // ensure WASM files referenced via import.meta.url are emitted
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        browser: resolve(__dirname, 'src/loader.browser.ts'),
      },
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: false, // multiple builds share dist/
    sourcemap: true,
    target: 'es2020',
    treeshake: true,
    minify: 'esbuild',
    rollupOptions: {
      external: [/^node:/], // never bundle node:* in ES/browser builds
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'index') return 'index.js';
          if (chunk.name === 'browser') return 'browser.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (asset) => {
          // keep wasm names predictable; everything else can be hashed
          if (asset.name?.endsWith('.wasm')) return 'assets/[name][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
