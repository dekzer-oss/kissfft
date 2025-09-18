import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

const externalPredicate = (id: string) => {
  if (id.startsWith('node:')) return true;
  if (id === 'fs' || id === 'path' || id === 'url' || id === 'module') return true;
  return id.includes('loader.node');

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
      treeshake: {
        moduleSideEffects: false
      },
      output: {
        inlineDynamicImports: true,
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
        banner:
          `@dekzer/kissfft
Includes KISS FFT (c) 2003–2010 Mark Borgerding, BSD-3-Clause.
Wrapper (c) 2025 Maikel Eckelboom, MIT. See NOTICE and THIRD_PARTY_LICENSES.`,
      },
    },
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: false,
  },
});
