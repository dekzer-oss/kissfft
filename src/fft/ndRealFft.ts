import { loadKissFft } from '@/loader';
import type { KissFftNdRealInstance } from '@/types';
import {
  BYTES_F32,
  checkAllocation,
  isValidPointer,
  safeMemoryAllocation,
  toF32,
  validateInputLength,
} from './utils';
import { planCache } from './cache';

function packedSpectrumFloats(shape: readonly number[]): number {
  const last = shape[shape.length - 1] | 0;
  const size = shape.reduce((p, c) => (p * c) | 0, 1);
  // Hermitian packing along the last dim: (last/2+1) complex bins per line
  // => floats = 2 * (size/last) * (last/2 + 1) == size + 2*(size/last)
  return (size + 2 * (size / last)) | 0;
}

/**
 * Creates an N-dimensional **real** FFT instance.
 *
 * @param shape Array of positive integer dimension sizes
 * @param cache Reuse FFT plans of identical shape (default = true)
 */
export async function createKissNdRealFft(
  shape: number[],
  cache = true,
): Promise<KissFftNdRealInstance> {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('Shape must be a non-empty array');
  }
  shape.forEach((d, i) => {
    if (d <= 0 || !Number.isInteger(d)) {
      throw new Error(`Invalid dimension at index ${i}: ${d}. Must be positive integer.`);
    }
  });

  const mod = await loadKissFft();
  const size = shape.reduce((p, c) => p * c, 1);
  const nd = shape.length;
  const key = `ndr:${shape.join('x')}`;

  // acquire or create plans
  let pair = planCache.get(key) as
    | { fwd: number; inv: number; refCount: number }
    | undefined;

  if (!pair) {
    const dimsPtr = mod._malloc(nd * 4);
    if (!isValidPointer(dimsPtr)) throw new Error('Failed to allocate dimensions buffer');
    try {
      for (let i = 0; i < nd; i++) mod.HEAP32[(dimsPtr >>> 2) + i] = shape[i];

      const fwd = mod._kiss_fftndr_alloc(dimsPtr, nd, 0, 0, 0);
      const inv = mod._kiss_fftndr_alloc(dimsPtr, nd, 1, 0, 0);
      checkAllocation(fwd, 'ndr forward plan');
      checkAllocation(inv, 'ndr inverse plan');

      pair = { fwd, inv, refCount: 0 };
      if (cache) planCache.set(key, pair);
    } finally {
      mod._free(dimsPtr);
    }
  }
  pair!.refCount++;

  // buffer sizes (Float32 element counts)
  const packedLen = packedSpectrumFloats(shape);

  // allocate working buffers
  const inAlloc = { ptr: mod._malloc(size * BYTES_F32), size: size * BYTES_F32 };
  const outAlloc = {
    ptr: mod._malloc(packedLen * BYTES_F32),
    size: packedLen * BYTES_F32,
  };
  safeMemoryAllocation(mod, [inAlloc, outAlloc], 'ndRealFft:init');

  const inPtr = inAlloc.ptr;
  const outPtr = outAlloc.ptr;
  const inIdx = toF32(inPtr);
  const outIdx = toF32(outPtr);

  const invSize = 1 / size;
  let disposed = false;

  function ensureNotDisposed() {
    if (disposed) throw new Error('N-D real FFT instance disposed');
  }

  const api: KissFftNdRealInstance = {
    get shape() {
      return [...shape];
    },
    get size() {
      return size;
    },

    // Real -> Complex (Hermitian-packed) : returns `packedLen` floats
    forward(input: Float32Array, out?: Float32Array): Float32Array {
      ensureNotDisposed();
      validateInputLength(input, size, 'nd-real forward (real input)');
      mod.HEAPF32.set(input, inIdx);

      // compute into packed output
      mod._kiss_fftndr(pair!.fwd, inPtr, outPtr);

      const view = mod.HEAPF32.subarray(outIdx, outIdx + packedLen);
      if (out) {
        validateInputLength(out, packedLen, 'nd-real forward (out)');
        out.set(view);
        return out;
      }
      return view.slice();
    },

    /**
     * Complex (packed along last dimension) → Real.
     * `input.length` must equal `packedLen(shape) = size + 2 * (size / lastDim)`.
     * Returns real time-domain samples of length `size`. Output is normalized by 1/size.
     */
    inverse(input: Float32Array, out?: Float32Array): Float32Array {
      ensureNotDisposed();
      validateInputLength(input, packedLen, 'nd-real inverse (packed spectrum)');

      // Write the packed spectrum into the PACKED region (outIdx),
      // compute the real output into the REAL region (inIdx).
      mod.HEAPF32.set(input, outIdx);
      mod._kiss_fftndri(
        pair!.inv,  // inverse ND real plan
        outPtr,     // freqdata: PACKED buffer (packedLen floats)
        inPtr,      // timedata: REAL buffer (size floats)
      );

      // Read back and normalize.
      const view = mod.HEAPF32.subarray(inIdx, inIdx + size);
      if (out) {
        validateInputLength(out, size, 'nd-real inverse (out)');
        for (let i = 0; i < size; i++) out[i] = view[i] * invSize;
        return out;
      }
      const real = new Float32Array(size);
      for (let i = 0; i < size; i++) real[i] = view[i] * invSize;
      return real;
    },

    dispose(): void {
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

  return api;
}
