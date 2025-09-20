// vite.node.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Node bundle is ESM; the loader reads WASM from ../build via fs (no asset handling needed)
  build: {
    lib: {
      entry: resolve(__dirname, 'src/loader.node.ts'),
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'node18',
    treeshake: true,
    minify: 'esbuild',
    rollupOptions: {
      // leave node:* alone; Vite might still create a tiny browser-external shim chunk, harmless in Node
      external: [/^node:/],
      output: {
        entryFileNames: () => 'node.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
