import { defineConfig } from 'vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';


export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      include: ['src', 'src/loader.node.ts', 'src/loader.browser.ts'],
      tsconfigPath: './tsconfig.json',
      insertTypesEntry: true,
      copyDtsFiles: true,
      outDir: 'dist/types',
    })
  ],
  assetsInclude: ['**/*.wasm'],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'KissFFT',
      fileName: 'kissfft-wasm.js',
    },
    rollupOptions: {
      external: [
        'node:url',
        'node:path',
        'node:fs/promises',
        './src/loader.node.ts',
        './src/loader.browser.ts',
      ],
    },
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true,

  },
});
