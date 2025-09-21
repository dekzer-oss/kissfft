import { defineConfig } from 'vitest/config';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';

const wasmSrc = path.resolve(__dirname, 'build/kissfft-wasm.wasm');
const wasmDst = path.resolve(__dirname, 'dist/kissfft-wasm.wasm');
if (existsSync(wasmSrc)) copyFileSync(wasmSrc, wasmDst);

// Detect coverage mode from CLI or env
const isCoverage =
  process.argv.includes('--coverage') ||
  process.env.COVERAGE === '1' ||
  process.env.VITEST_COVERAGE === '1';

const browserInstances = isCoverage
  ? [{ browser: 'chromium' }]
  : [
      { browser: 'webkit' }, // { browser: 'firefox' },
      { browser: 'chromium' },
    ];

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'], // WASM-friendly timeouts
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 120_000,
    sequence: { concurrent: false },
    coverage: {
      enabled: isCoverage,
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/fft/*.ts'],
    },
    projects: [
      {
        extends: true,
        plugins: [viteTsConfigPaths()],
        resolve: {
          alias: { '@': path.resolve(__dirname, 'src') },
        },
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          isolate: false,
          include: ['tests/**/*.test.ts'],
          benchmark: { reporters: ['verbose'] },
        },
      },
      {
        extends: true,
        plugins: [viteTsConfigPaths()],
        resolve: {
          alias: { '@': path.resolve(__dirname, 'src') },
        },
        test: {
          name: 'browser',
          environment: 'browser',
          globals: true,
          include: ['tests/**/*.test.ts'],
          browser: {
            provider: 'playwright',
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: browserInstances,
          },
          benchmark: { reporters: ['verbose'] },
        },
      },
    ],
  },
});
