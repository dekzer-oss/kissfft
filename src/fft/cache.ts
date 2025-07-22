import { isValidPointer } from './utils';

interface PlanPair {
  fwd: number;
  inv: number;
  refCount: number;
}

export const planCache = new Map<string, PlanPair>();

/**
 * Gets current cache statistics.
 * @returns Cache size and entry keys
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: planCache.size,
    entries: Array.from(planCache.keys()),
  };
}

/**
 * Cleans up all cached FFT plans.
 * @param mod - WASM module
 */
export function cleanupCache(mod: any): void {
  for (const [key, { fwd, inv }] of planCache.entries()) {
    try {
      if (isValidPointer(fwd)) mod._free(fwd);
      if (isValidPointer(inv)) mod._free(inv);
    } catch (error) {
      console.warn(`Error freeing plan cache ${key}:`, error);
    }
  }
  planCache.clear();
}
