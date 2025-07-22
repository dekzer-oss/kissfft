import { loadKissFft } from '@/loader';
import type { KissFftInstance } from '@/types';
import {
  toF32,
  isValidPointer,
  checkAllocation,
  safeMemoryAllocation,
  validateInputLength,
} from './utils';
import { planCache } from './cache';

export async function createKissFft(N: number, cache = true): Promise<KissFftInstance> {
  if (N <= 0 || !Number.isInteger(N)) {
    throw new Error(`Invalid FFT size: ${N}. Must be a positive integer.`);
  }

  const mod = await loadKissFft();
  const key = `c:${N}`;

  let pair = planCache.get(key);
  if (!pair) {
    const fwd = mod._kiss_fft_alloc(N, 0, 0, 0);
    const inv = mod._kiss_fft_alloc(N, 1, 0, 0);

    checkAllocation(fwd, 'forward plan');
    checkAllocation(inv, 'inverse plan');

    pair = { fwd, inv, refCount: 0 };
    if (cache) planCache.set(key, pair);
  }
  pair.refCount++;

  const inPtr = mod._malloc(N * 8);
  const outPtr = mod._malloc(N * 8);

  const allocations = [
    { ptr: inPtr, size: N * 8 },
    { ptr: outPtr, size: N * 8 },
  ];

  try {
    safeMemoryAllocation(mod, allocations);
  } catch (e) {
    if (isValidPointer(inPtr)) mod._free(inPtr);
    if (isValidPointer(outPtr)) mod._free(outPtr);
    pair.refCount--;
    throw e;
  }

  const inIdx = toF32(inPtr);
  const outIdx = toF32(outPtr);
  const invN = 1 / N;
  let disposed = false;

  return {
    forward(input) {
      if (disposed) throw new Error('FFT instance disposed');
      validateInputLength(input, 2 * N, 'forward');

      mod.HEAPF32.set(input, inIdx);
      mod._kiss_fft(pair!.fwd, inPtr, outPtr);
      return mod.HEAPF32.slice(outIdx, outIdx + 2 * N);
    },
    inverse(spec) {
      if (disposed) throw new Error('FFT instance disposed');
      validateInputLength(spec, 2 * N, 'inverse');

      mod.HEAPF32.set(spec, inIdx);
      mod._kiss_fft(pair!.inv, inPtr, outPtr);

      const out = new Float32Array(2 * N);
      for (let i = 0; i < 2 * N; i++) {
        out[i] = mod.HEAPF32[outIdx + i] * invN;
      }
      return out;
    },
    dispose() {
      if (disposed) return;
      disposed = true;

      pair!.refCount--;
      if (!cache || pair!.refCount === 0) {
        if (isValidPointer(pair!.fwd)) mod._free(pair!.fwd);
        if (isValidPointer(pair!.inv)) mod._free(pair!.inv);
        if (cache) planCache.delete(key);
      }

      if (isValidPointer(inPtr)) mod._free(inPtr);
      if (isValidPointer(outPtr)) mod._free(outPtr);
    },
  };
}
