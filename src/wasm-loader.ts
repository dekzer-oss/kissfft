import type { KissFftWasmModule } from './types';

/** Singleton so we never instantiate the WASM twice. */
let modulePromise: Promise<KissFftWasmModule>;

/**
 * Loads the kissfft-wasm module.
 * @returns Promise that resolves to the KissFftWasmModule instance.
 * This function ensures that the module is loaded only once,
 * even if called multiple times.
 */
export function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    const spec = new URL('../build/kissfft-wasm.js', import.meta.url).href;
    modulePromise = import(spec).then(({ default: factory }: any) => {
      if (typeof factory !== 'function') {
        throw new Error('kissfft-wasm: default export is not a factory');
      }
      return factory() as Promise<KissFftWasmModule>;
    });
  }
  return modulePromise;
}
