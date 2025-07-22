import { defineConfig } from 'vitest/config';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';
import { copyFileSync } from 'fs';
import { existsSync } from 'node:fs';

const wasmSrc = path.resolve(__dirname, 'build/kissfft-wasm.wasm');
const wasmDst = path.resolve(__dirname, 'dist/kissfft-wasm.wasm');

if (existsSync(wasmSrc)) {
  copyFileSync(wasmSrc, wasmDst);
}

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [viteTsConfigPaths()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
        },
        test: {
          globals: true,
          isolate: false,
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          benchmark: {
            reporters: ['verbose'],
          },
        },
      },
      {
        plugins: [viteTsConfigPaths()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
        },
        test: {
          globals: true,
          name: 'browser',
          environment: 'browser',
          include: ['tests/**/*.test.ts'],
          browser: {
            provider: 'playwright',
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              { browser: 'webkit' },
            ],
          },
          benchmark: {
            reporters: ['verbose'],
          },
        },
      },
    ],
  },
});
