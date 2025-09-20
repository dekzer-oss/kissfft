// vite.node.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Treat this bundle as SSR (Node), not browser.
export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    ssr: true,                 // <- critical: stop "browser external" stubs
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
      // Keep Emscripten node glue as runtime deps; don't parse them.
      external: (id) =>
        id.startsWith('node:') ||
        id === 'fs' || id === 'path' || id === 'module' || id === 'url' ||
        id.includes('/build/node/dekzer-kissfft'),
      output: {
        entryFileNames: 'node.js',
        // Single-file output; prevents any helper chunks.
        inlineDynamicImports: true,
      },
    },
  },
});
