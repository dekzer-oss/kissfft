import type { KissFftWasmModule } from './types';

const isNode =
  typeof process !== 'undefined' &&
  !!(process.versions && process.versions.node) &&
  typeof window === 'undefined';

export async function loadKissFft(): Promise<KissFftWasmModule> {
  const target = isNode ? './loader.' + 'node.js' : './loader.' + 'browser.js';

  const mod = (await import(/* @vite-ignore */ target)) as {
    loadKissFft: () => Promise<KissFftWasmModule>;
  };
  return mod.loadKissFft();
}
