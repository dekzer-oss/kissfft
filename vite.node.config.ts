import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  assetsInclude: [/\.wasm$/],
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/loader.node.ts'),
      formats: ['es'],
      fileName: () => 'node.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'node18',
    minify: 'esbuild',
    rollupOptions: {
      external: (id) =>
        id.startsWith('node:') ||
        id === 'fs' || id === 'path' || id === 'module' || id === 'url' ||
        id.includes('/build/node/dekzer-kissfft'),
      output: {
        entryFileNames: 'node.js',
        inlineDynamicImports: true,
      },
    },
  },
});
