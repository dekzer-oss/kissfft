import type { KissFftWasmModule } from './types';

export const isBrowser = () =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof navigator !== 'undefined';


let modulePromise: Promise<KissFftWasmModule> | undefined;

/**
 * Loads kissfft-wasm based on runtime environment (Node or browser).
 */
export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    if (isBrowser()) {
      const { loadKissFft: loadBrowser } = await import('./loader.browser.js');
      modulePromise = loadBrowser();
    } else {
      const { loadKissFft: loadNode } = await import('./loader.node.js');
      modulePromise = loadNode();
    }
  }

  return modulePromise;
}
