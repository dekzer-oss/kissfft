import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      // UMD is browser-targeted → force browser loader
      { find: '@/loader', replacement: '/src/loader.browser.ts' },
    ],
  },
  build: {
    emptyOutDir: false,   // keep dist/ artifacts from earlier steps
    lib: {
      entry: 'src/index.ts',
      formats: ['umd'],
      name: 'kissfft',
      fileName: () => 'kissfft.umd.js',
    },
    rollupOptions: {
      external: [/^node:/], // belt-and-suspenders
      output: { globals: {} },
    },
  },
});
