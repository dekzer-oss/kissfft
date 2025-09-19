import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      // UMD is browser-targeted: only build the public index
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'KissFFT',
      fileName: 'kissfft',
      formats: ['umd'],
    },
    rollupOptions: {
      // Keep it minimal: do not mark node built-ins external here.
      // The alias below prevents UMD from ever touching the Node loader.
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  resolve: {
    alias: [
      // Make sure the UMD bundle only pulls in the browser loader
      {
        find: path.resolve(__dirname, 'src/loader.ts'),
        replacement: path.resolve(__dirname, 'src/loader.browser.ts'),
      },
    ],
  },
});
