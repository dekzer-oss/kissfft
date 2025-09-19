import { defineConfig } from 'vite';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      entryRoot: 'src',
      outDir: 'dist/types',
      tsconfigPath: 'tsconfig.json',
      rollupTypes: true,
      // keep paths literal to match your exports:
      staticImport: true,
    }),
  ],
  build: {
    lib: {
      // For browser ES bundle, DO NOT include loader.node.
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'loader.browser': path.resolve(__dirname, 'src/loader.browser.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // no special externals for browser build
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
