// vite.es.config.ts (patch)
import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

const external = (id: string) => {
  // Leave Node built-ins external
  if (id.startsWith('node:')) return true;
  if (id === 'fs' || id === 'path' || id === 'url' || id === 'module') return true;
  // ❌ DO NOT do: if (id.includes('loader.node')) return true;
  // That turns your entry '/abs/.../src/loader.node.ts' into an external.
  return false;
};

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      include: ['src', 'src/loader.node.ts', 'src/loader.browser.ts'],
      tsconfigPath: './tsconfig.json',
      insertTypesEntry: true,
      copyDtsFiles: true,
      outDir: 'dist/types',
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  build: {
    lib: {
      // explicit multi-entry so loaders get stable names
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'loader.browser': path.resolve(__dirname, 'src/loader.browser.ts'),
        'loader.node': path.resolve(__dirname, 'src/loader.node.ts'),
      },
      formats: ['es'],
      name: 'KissFFT',
    },
    rollupOptions: {
      external,
      onwarn(w, def) {
        const msg = String(w?.message ?? '');
        if (msg.includes('Creating a browser bundle that depends on Node.js built-in modules')) return;
        if (w.code === 'MISSING_GLOBAL_NAME') return;
        def(w);
      },
      output: {
        entryFileNames(chunk) {
          if (chunk.name === 'index') return 'kissfft.es.js';
          if (chunk.name === 'loader.browser') return 'loader.browser.js';
          if (chunk.name === 'loader.node') return 'loader.node.js';
          return 'chunks/[name]-[hash].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        inlineDynamicImports: false,
      },
      treeshake: { moduleSideEffects: false },
    },
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true,
  },
});
