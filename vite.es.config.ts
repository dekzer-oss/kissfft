// vite.es.config.ts (trim to browser-only)
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  assetsInclude: [/\.wasm$/],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/loader.browser.ts'),
      formats: ['es'],
      fileName: () => 'browser.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      // single entry → no split chunks
      output: {
        entryFileNames: 'browser.js',
      },
    },
  },
});
