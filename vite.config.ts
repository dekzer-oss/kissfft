import { defineConfig } from 'vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';


export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      include: ['src'],
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
      fileName: (format) => `kissfft.${format}.js`,
    },
    rollupOptions: {
      external: [
        "node:url",
        "node:path",
      ],
    },
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true,

  },
});
