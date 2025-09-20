// vite.umd.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  assetsInclude: [/\.wasm$/], // allow UMD build to emit referenced WASM
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // <- correct absolute path
      name: 'DekzerKissfft',
      formats: ['umd'],
      fileName: () => 'dekzer-kissfft.umd.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      // UMD is browser-only; keep node:* out
      external: [/^node:/],
      output: {
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.wasm')) return 'assets/[name][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
