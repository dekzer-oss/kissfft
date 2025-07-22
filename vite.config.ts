import { defineConfig } from 'vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'KissFFT',
      fileName: (format) => `kissfft.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true,
  },
});
