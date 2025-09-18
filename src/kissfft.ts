import type { KissFftWasmModule } from './types';

let instance: KissFftWasmModule | undefined;

/**
 * Sets the initialized KissFFT WASM module.
 * Should be called exactly once after loadKissFft().
 */
export function setKissFftInstance(mod: KissFftWasmModule) {
  instance = mod;
}
