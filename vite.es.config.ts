import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'node:path';

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
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
});
