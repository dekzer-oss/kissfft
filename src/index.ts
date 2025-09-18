// export { loadKissFft as loadKissFftBrowser } from './loader.browser';
// export { loadKissFft as loadKissFftNode } from './loader.node';

export {
  createKissFft,
  createKissRealFft,
  createKissNdFft,
  createKissNdRealFft,
  cleanupKissFft,
  getCacheStats,
  nextFastShape,
  nextFastSize,
} from './fft';

export type {
  KissFftWasmModule,
  KissFftNdInstance,
  KissFftNdRealInstance,
  KissFftInstance,
  KissFftRealInstance,
} from './types';

export { loadKissFft } from './loader';
export { isWasmSimdSupported } from './common/simd';
