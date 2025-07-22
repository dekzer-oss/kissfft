import type { KissFftWasmModule } from './types';

let instance: KissFftWasmModule | undefined;

/**
 * Sets the initialized KissFFT WASM module.
 * Should be called exactly once after loadKissFft().
 */
export function setKissFftInstance(mod: KissFftWasmModule) {
  instance = mod;
}

/**
 * kissfft proxy — provides access to the initialized WASM module.
 * Throws a clear error if accessed before `loadKissFft()` is awaited.
 */
export const kissfft = new Proxy({} as KissFftWasmModule, {
  get(_, key) {
    if (!instance) {
      throw Object.assign(
        new Error('kissfft is not initialized. Did you forget to call and await loadKissFft()?'),
        { name: 'UninitializedWasmError' }
      );
    }

    return instance[key as keyof KissFftWasmModule];
  },
});
