import type { KissFftWasmModule } from './types';
import { isBrowser } from '@/common/env';
import { setKissFftInstance } from '@/kissfft';

let modulePromise: Promise<KissFftWasmModule> | undefined;

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    const target = isBrowser() ? './loader.browser' : './loader.node';
    const { loadKissFft: loadImpl } = await import(/* @vite-ignore */ target);
    modulePromise = loadImpl();
    modulePromise!.then(setKissFftInstance);
  }
  return modulePromise!;
}
