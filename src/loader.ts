import type { KissFftWasmModule } from './types';
import { isBrowser } from '@/common/env';
import { setKissFftInstance } from '@/kissfft';

let modulePromise: Promise<KissFftWasmModule> | undefined;

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    if (isBrowser()) {
      const browserEntry = './loader.' + 'browser' + '.js';
      const { loadKissFft: loadBrowser } = await import(/* @vite-ignore */ browserEntry);
      modulePromise = loadBrowser();
    } else {
      const nodeEntry = './loader.' + 'node' + '.js';
      const { loadKissFft: loadNode } = await import(/* @vite-ignore */ nodeEntry);
      modulePromise = loadNode();
    }

    modulePromise?.then((mod) => {
      setKissFftInstance(mod);
    });
  }
  return modulePromise!;
}
