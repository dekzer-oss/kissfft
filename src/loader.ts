// Tiny router that imports the right env loader at runtime.
import type { KissFftWasmModule } from './types';

const isNode =
  typeof process !== 'undefined' &&
  !!(process.versions && process.versions.node) &&
  // guard against edge runtimes that define process
  typeof window === 'undefined';

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (isNode) {
    const { loadKissFft } = await import('./loader.node.js');
    return loadKissFft();
  }
  const { loadKissFft } = await import('./loader.browser.js');
  return loadKissFft();
}
