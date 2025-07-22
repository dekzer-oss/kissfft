import type { KissFftWasmModule } from './types';
import { isBrowser } from '@/common/env';
import { setKissFftInstance } from '@/kissfft';

let modulePromise: Promise<KissFftWasmModule> | undefined;

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    if (isBrowser()) {
      const { loadKissFft: loadBrowser } = await import('./loader.browser.js');
      modulePromise = loadBrowser();
    } else {
      const { loadKissFft: loadNode } = await import('./loader.node.js');
      modulePromise = loadNode();
    }

    modulePromise.then(mod => {
      setKissFftInstance(mod);
    });
  }

  return modulePromise;
}
