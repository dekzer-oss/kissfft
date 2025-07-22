import { loadKissFft } from '@/wasm-loader';
import type { KissFftRealInstance } from '@/types';
import {
  BYTES_F32,
  toF32,
  isValidPointer,
  checkAllocation,
  safeMemoryAllocation,
  validateInputLength,
} from './utils';
import { planCache } from './cache';

export async function createKissRealFft(
  N: number,
  cache = true,
): Promise<KissFftRealInstance> {
  if (N <= 0 || !Number.isInteger(N)) {
    throw new Error(`Invalid real FFT size: ${N}. Must be a positive integer.`);
  }

  if (N % 2 !== 0) {
    throw new Error(
      `Real FFT with odd length ${N} is not supported. Requires even lengths.`,
    );
  }

  const mod = await loadKissFft();
  const key = `r:${N}`;

  let pair = planCache.get(key);
  if (!pair) {
    const fwd = mod._kiss_fftr_alloc(N, 0, 0, 0);
    const inv = mod._kiss_fftr_alloc(N, 1, 0, 0);

    checkAllocation(fwd, 'forward real plan');
    checkAllocation(inv, 'inverse real plan');

    pair = { fwd, inv, refCount: 0 };
    if (cache) planCache.set(key, pair);
  }
  pair.refCount++;

  const inPtr = mod._malloc(N * BYTES_F32);
  const outPtr = mod._malloc((N + 2) * BYTES_F32);

  const allocations = [
    { ptr: inPtr, size: N * BYTES_F32 },
    { ptr: outPtr, size: (N + 2) * BYTES_F32 },
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
    forwardReal(input) {
      if (disposed) throw new Error('Real FFT instance disposed');
      validateInputLength(input, N, 'forwardReal');

      mod.HEAPF32.set(input, inIdx);
      mod._kiss_fftr(pair!.fwd, inPtr, outPtr);
      return mod.HEAPF32.slice(outIdx, outIdx + N + 2);
    },
    inverseReal(hspec) {
      if (disposed) throw new Error('Real FFT instance disposed');
      validateInputLength(hspec, N + 2, 'inverseReal');

      mod.HEAPF32.set(hspec, inIdx);
      mod._kiss_fftri(pair!.inv, inPtr, outPtr);

      const out = new Float32Array(N);
      for (let i = 0; i < N; i++) out[i] = mod.HEAPF32[outIdx + i] * invN;
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
