import { loadKissFft } from '@/loader';
import type { KissFftNdInstance } from '@/types';
import {
  toF32,
  isValidPointer,
  checkAllocation,
  safeMemoryAllocation,
  validateInputLength,
} from './utils';
import { planCache } from './cache';

export async function createKissNdFft(
  shape: number[],
  cache = true,
): Promise<KissFftNdInstance> {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('Shape must be a non-empty array');
  }

  for (let i = 0; i < shape.length; i++) {
    if (shape[i] <= 0 || !Number.isInteger(shape[i])) {
      throw new Error(
        `Invalid dimension at index ${i}: ${shape[i]}. Must be positive integer.`,
      );
    }
  }

  const mod = await loadKissFft();
  const size = shape.reduce((p, c) => p * c, 1);
  const nd = shape.length;
  const key = `nd:${shape.join('x')}`;

  if (size > 1000000) {
    console.warn(`Large N-D FFT requested (${size} elements).`);
  }

  let pair = planCache.get(key);
  if (!pair) {
    const dimsPtr = mod._malloc(nd * 4);
    if (!isValidPointer(dimsPtr)) {
      throw new Error('Failed to allocate dimensions buffer');
    }

    try {
      for (let i = 0; i < nd; i++) mod.HEAP32[(dimsPtr >>> 2) + i] = shape[i];

      const fwd = mod._kiss_fftnd_alloc(dimsPtr, nd, 0, 0, 0);
      const inv = mod._kiss_fftnd_alloc(dimsPtr, nd, 1, 0, 0);

      checkAllocation(fwd, 'nd forward plan');
      checkAllocation(inv, 'nd inverse plan');

      pair = { fwd, inv, refCount: 0 };
      if (cache) planCache.set(key, pair);
    } finally {
      mod._free(dimsPtr);
    }
  }
  pair.refCount++;

  const inPtr = mod._malloc(size * 8);
  const outPtr = mod._malloc(size * 8);

  const allocations = [
    { ptr: inPtr, size: size * 8 },
    { ptr: outPtr, size: size * 8 },
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
  const invSize = 1 / size;
  let disposed = false;

  return {
    forwardNd(buf) {
      if (disposed) throw new Error('N-D FFT instance disposed');
      validateInputLength(buf, 2 * size, 'nd forward');

      mod.HEAPF32.set(buf, inIdx);
      mod._kiss_fftnd(pair!.fwd, inPtr, outPtr);
      return mod.HEAPF32.slice(outIdx, outIdx + 2 * size);
    },
    inverseNd(buf) {
      if (disposed) throw new Error('N-D FFT instance disposed');
      validateInputLength(buf, 2 * size, 'nd inverse');

      mod.HEAPF32.set(buf, inIdx);
      mod._kiss_fftnd(pair!.inv, inPtr, outPtr);

      const out = mod.HEAPF32.subarray(outIdx, outIdx + 2 * size);
      for (let i = 0; i < 2 * size; i++) out[i] *= invSize;
      return out.slice();
    },
    get shape() {
      return [...shape];
    },
    get size() {
      return size;
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
