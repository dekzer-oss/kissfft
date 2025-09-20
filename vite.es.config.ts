import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      // Force all "@/loader" imports to the browser loader in this build
      { find: '@/loader', replacement: '/src/loader.browser.ts' },
    ],
  },
  build: {
    // leave default emptyOutDir=true here (first pass cleans dist/)
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      name: 'kissfft',
      fileName: () => 'kissfft.es.js',
    },
    rollupOptions: {
      input: {
        index: 'src/index.ts',
        'loader.browser': 'src/loader.browser.ts',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'index') return 'kissfft.es.js';
          if (chunk.name === 'loader.browser') return 'loader.browser.js';
          return '[name].js';
        },
      },
      external: [/^node:/], // never pull node:* into browser bundles
    },
  },
});
