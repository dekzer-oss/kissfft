import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

// Same externals as ESM — but force single-chunk UMD.
const externalPredicate = (id: string) => {
  if (id.startsWith('node:')) return true;
  if (id === 'fs' || id === 'path' || id === 'url' || id === 'module') return true;
  if (id.includes('loader.node')) return true;
  return false;
};

export default defineConfig({
  plugins: [tsconfigPaths()],

  assetsInclude: ['**/*.wasm'],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'KissFFT',
      fileName: () => 'kissfft.umd.js',
      formats: ['umd'],
    },

    rollupOptions: {
      external: externalPredicate,
      onwarn(warning, defaultHandler) {
        const msg = String(warning?.message ?? '');
        if (msg.includes('Creating a browser bundle that depends on Node.js built-in modules')) return;
        if (warning.code === 'MISSING_GLOBAL_NAME') return;
        defaultHandler(warning);
      },
      output: {
        globals: {
          fs: 'fs',
          path: 'path',
          url: 'node_url',
          module: 'module',
          'node:fs/promises': 'promises',
          'node:path': 'path',
          'node:url': 'node_url',
          'node:module': 'module',
        },
        // ✅ UMD must be a single file: no code-splitting allowed.
        inlineDynamicImports: true,
      },
      treeshake: { moduleSideEffects: false },
    },

    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: false, // keep ESM output
  },
});
