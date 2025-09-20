import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      // Force "@/loader" to the Node loader for this build
      { find: '@/loader', replacement: '/src/loader.node.ts' },
    ],
  },
  build: {
    ssr: true,              // keep node:* imports as-is
    emptyOutDir: false,     // do NOT delete dist/ from previous pass
    lib: {
      entry: 'src/loader.node.ts',
      formats: ['es'],
      name: 'kissfft_loader_node',
      fileName: () => 'loader.node.js',
    },
    rollupOptions: {
      external: [/^node:/],
      output: { inlineDynamicImports: true },
    },
  },
});
