import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

// Treat Node-only modules as externals in browser bundles.
const externalPredicate = (id: string) => {
  if (id.startsWith('node:')) return true;
  if (id === 'fs' || id === 'path' || id === 'url' || id === 'module') return true;
  // Keep the Node-only loader out of browser bundles if referenced.
  if (id.includes('loader.node')) return true;
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
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'KissFFT',
      fileName: (format) => `kissfft.${format}.js`, // -> dist/kissfft.es.js
      formats: ['es'],
    },

    rollupOptions: {
      external: externalPredicate,
      onwarn(warning, defaultHandler) {
        const msg = String(warning?.message ?? '');
        // Silence the browser+Node built-ins note — we intentionally externalize them.
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
        // ESM build can code-split freely.
        inlineDynamicImports: false,
      },
      treeshake: { moduleSideEffects: false },
    },

    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true, // wipe once (before ESM)
  },
});
