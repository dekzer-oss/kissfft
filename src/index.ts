// src/index.ts
export {
  createKissFft,
  createKissRealFft,
  createKissNdFft,
  createKissNdRealFft,
  cleanupKissFft,
  getCacheStats,
  nextFastSize,
  nextFastShape,
} from './fft';

export type {
  KissFftWasmModule,
  KissFftInstance,
  KissFftRealInstance,
  KissFftNdInstance,
  KissFftNdRealInstance,
} from './types';

// IMPORTANT: do NOT export loader.browser / loader.node here.
// Keep them as subpath entrypoints only (see package.json "exports").
