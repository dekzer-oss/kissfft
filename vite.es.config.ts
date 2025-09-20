// vite.es.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  assetsInclude: [/\.wasm$/],
  build: {
    lib: {
      entry: {
        browser: resolve(__dirname, 'src/loader.browser.ts'),
        preload: resolve(__dirname, 'src/preload.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `kissfft.${entryName}.esm.js`,
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      // Give all chunks deterministic, descriptive names
      output: {
        entryFileNames: 'kissfft.[name].esm.js',
        // map the two Emscripten modules to friendly runtime names
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'dekzer-kissfft-simd') return 'kissfft.runtime.simd.js';
          if (chunkInfo.name === 'dekzer-kissfft') return 'kissfft.runtime.scalar.js';
          return 'kissfft.runtime.[name].js';
        },
        // Tie specific files to those chunk names
        manualChunks(id) {
          if (id.endsWith('/build/web/dekzer-kissfft-simd.js')) return 'dekzer-kissfft-simd';
          if (id.endsWith('/build/web/dekzer-kissfft.js')) return 'dekzer-kissfft';
        },
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
