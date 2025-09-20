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
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DekzerKissfft',             // keep global name stable
      formats: ['umd'],
      fileName: () => 'kissfft.umd.js',  // <-- match package.json `unpkg/jsdelivr`
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      external: [/^node:/],
    },
  },
});
