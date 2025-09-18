// src/fft/ndFft.ts
import { loadKissFft } from '@/loader';
import type { KissFftNdInstance } from '@/types';
import {
  checkAllocation,
  isValidPointer,
  mallocBytes,
  mallocF32,
  safeMemoryAllocation,
  toF32,
  validateInputLength,
} from './utils';
import { planCache } from './cache';

// Warn once per shape for huge transforms.
const WARN_ND_THRESHOLD = 1_000_000; // 1M elements
const warnedLargeNd = new Set<string>();

export async function createKissNdFft(
  shape: number[],
  cache = true,
): Promise<KissFftNdInstance> {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('Shape must be a non-empty array');
  }
  for (let i = 0; i < shape.length; i++) {
    const d = shape[i] | 0;
    if (d <= 0)
      throw new Error(
        `Invalid dimension at index ${i}: ${shape[i]}. Must be positive integer.`,
      );
    shape[i] = d;
  }

  const mod = await loadKissFft();
  const size = shape.reduce((p, c) => p * c, 1) | 0;
  const nd = shape.length | 0;
  const key = `nd:${shape.join('x')}`;

  if (size >= WARN_ND_THRESHOLD && !warnedLargeNd.has(key)) {
    warnedLargeNd.add(key);
    console.warn(
      `Large N-D FFT requested: ${key} = ${size} points. This may be slow and memory-heavy`,
    );
  }

  let pair = planCache.get(key);
  if (!pair) {
    const dims = mallocBytes(mod, nd * 4, 'dims'); // 4 bytes per i32
    try {
      const base = dims.ptr >>> 2; // to HEAP32 index
      for (let i = 0; i < nd; i++) mod.HEAP32[base + i] = shape[i];

      const fwd = mod._kiss_fftnd_alloc(dims.ptr, nd, 0, 0, 0);
      const inv = mod._kiss_fftnd_alloc(dims.ptr, nd, 1, 0, 0);
      checkAllocation(fwd, 'nd forward plan');
      checkAllocation(inv, 'nd inverse plan');

      pair = { fwd, inv, refCount: 0 };
      if (cache) planCache.set(key, pair);
    } finally {
      if (isValidPointer(dims.ptr)) mod._free(dims.ptr);
    }
  }
  pair!.refCount++;

  // Complex interleaved: 2*size float32s each
  const inAlloc = mallocF32(mod, size * 2, 'nd:in');
  const outAlloc = mallocF32(mod, size * 2, 'nd:out');

  // If any failed, frees the ones that succeeded and throws once.
  safeMemoryAllocation(mod, [inAlloc, outAlloc], 'ndFft:init');

  const inPtr = inAlloc.ptr;
  const outPtr = outAlloc.ptr;
  const inIdx = toF32(inPtr);
  const outIdx = toF32(outPtr);

  const invSize = 1 / size;
  let disposed = false;

  return {
    forward(buf: Float32Array, out?: Float32Array): Float32Array {
      if (disposed) throw new Error('N-D FFT instance disposed');
      validateInputLength(buf, 2 * size, 'nd forward');
      mod.HEAPF32.set(buf, inIdx);
      mod._kiss_fftnd(pair!.fwd, inPtr, outPtr);

      const view = mod.HEAPF32.subarray(outIdx, outIdx + 2 * size);
      if (out) {
        validateInputLength(out, 2 * size, 'nd forward (out)');
        out.set(view);
        return out;
      }
      return view.slice();
    },

    inverse(buf: Float32Array, out?: Float32Array): Float32Array {
      if (disposed) throw new Error('N-D FFT instance disposed');
      validateInputLength(buf, 2 * size, 'nd inverse');
      mod.HEAPF32.set(buf, inIdx);
      mod._kiss_fftnd(pair!.inv, inPtr, outPtr);

      const view = mod.HEAPF32.subarray(outIdx, outIdx + 2 * size);
      if (out) {
        validateInputLength(out, 2 * size, 'nd inverse (out)');
        for (let i = 0; i < 2 * size; i++) out[i] = view[i] * invSize;
        return out;
      }
      const copy = new Float32Array(2 * size);
      for (let i = 0; i < copy.length; i++) copy[i] = view[i] * invSize;
      return copy;
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
