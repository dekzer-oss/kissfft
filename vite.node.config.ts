import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: false, // keeps ../build next to dist
    lib: {
      entry: 'src/loader.node.ts',
      formats: ['es'],
      fileName: () => 'loader.node.js',
    },
    rollupOptions: {
      external: ['node:fs', 'node:path', 'node:url', '../build/kissfft-wasm.js'],
      output: { interop: 'auto' },
    },
  },
});
