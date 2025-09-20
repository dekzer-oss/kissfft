import { loadKissFft } from '@/loader';
import { cleanupCache, planCache} from './cache';
import type { KissFftWasmModule } from '@/types';

type KissFftWasmModuleWithCleanup = KissFftWasmModule & {
  _kiss_fft_cleanup: () => void;
};

function hasWasmCleanup(mod: KissFftWasmModule): mod is KissFftWasmModuleWithCleanup {
  return (
    typeof (mod as unknown as Record<string, unknown>)['_kiss_fft_cleanup'] === 'function'
  );
}

/**
 * Frees all cached FFT plans and invokes the WASM-side cleanup if exported.
 * Always clears the TS-side cache even if WASM is unavailable.
 */
export async function cleanupKissFft(): Promise<void> {
  try {
    const mod = await loadKissFft();
    cleanupCache(mod);
    if (hasWasmCleanup(mod)) {
      mod._kiss_fft_cleanup();
    }
  } finally {
    // Ensure TS-side cache is cleared even if anything threw above.
    planCache.clear();
  }
}

export {getCacheStats} from './cache';
