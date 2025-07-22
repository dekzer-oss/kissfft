import { defineConfig } from 'vitest/config';
import viteTsConfigPaths from 'vite-tsconfig-paths'
import * as path from 'node:path';

export default defineConfig({
  plugins: [viteTsConfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    isolate: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    benchmark: {
      reporters: ['verbose'],
      outputJson: 'tests/__benchmarks__/benchmark-node.json'
    },
  },
});
