import { loadKissFft } from '@/loader';
import type { KissFftNdRealInstance } from '@/types';
import { planCache } from './cache';
import { isValidPointer, mallocF32, safeMemoryAllocation, toF32, validateInputLength } from './utils';

/** Warn once for very large N-D transforms */
const WARN_ND_THRESHOLD = 1_000_000; // elements
const warnedLargeNd = new Set<string>();

/** Product of dims */
function product(dims: number[]): number {
  return dims.reduce((p, c) => p * c, 1);
}

/**
 * Number of Float32 values in the packed complex spectrum of an
 * N-D real FFT, packed along the last dimension.
 *
 * For shape [..., L], total real samples = size.
 * Packed complex output has (L/2 + 1) complex bins along last dim.
 * Float count = 2 * (size / L) * (L/2 + 1) = size + 2 * (size / L).
 */
function packedSpectrumFloats(shape: number[]): number {
  const size = product(shape);
  const last = shape[shape.length - 1];
  return size + 2 * (size / last);
}

/** Validate shape array */
function validateShape(shape: number[]): void {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('Shape must be a non-empty array');
  }
  for (let i = 0; i < shape.length; i++) {
    const d = shape[i];
    if (!Number.isInteger(d) || d <= 0) {
      throw new Error(`Invalid dimension at index ${i}: ${d}. Must be positive integer.`);
    }
  }
}

/** Create a unique plan cache key for N-D real */
function cacheKey(shape: number[]): string {
  return `ndr:${shape.join('x')}`;
}

export async function createKissNdRealFft(
  shape: number[],
  cache = true,
): Promise<KissFftNdRealInstance> {
  validateShape(shape);

  const mod = await loadKissFft();
  const size = product(shape);
  const nd = shape.length;
  const key = cacheKey(shape);

  if (size >= WARN_ND_THRESHOLD) {
    if (!warnedLargeNd.has(key)) {
      warnedLargeNd.add(key);
      console.warn(
        `Large N-D real FFT requested: ${shape.join('x')} = ${size} points. This may be slow and memory-heavy`,
      );
    }
  }

  // Acquire or create plans
  let pair = planCache.get(key) as
    | { fwd: number; inv: number; refCount: number }
    | undefined;

  if (!pair) {
    // Allocate dims buffer (nd * int32)
    const dimsPtr = mod._malloc(nd * 4);
    if (!isValidPointer(dimsPtr)) {
      throw new Error('Failed to allocate dimensions buffer');
    }

    try {
      // Write dims
      for (let i = 0; i < nd; i++) mod.HEAP32[(dimsPtr >>> 2) + i] = shape[i];

      // Create forward & inverse N-D real plans
      const fwd = mod._kiss_fftndr_alloc(dimsPtr, nd, 0, 0, 0);
      const inv = mod._kiss_fftndr_alloc(dimsPtr, nd, 1, 0, 0);
      if (!isValidPointer(fwd))
        throw new Error('Failed to allocate nd-real forward plan');
      if (!isValidPointer(inv))
        throw new Error('Failed to allocate nd-real inverse plan');

      pair = { fwd, inv, refCount: 0 };
      if (cache) planCache.set(key, pair);
    } finally {
      mod._free(dimsPtr);
    }
  }
  pair.refCount++;

  // Buffer sizes (Float32 element counts)
  const packedLen = packedSpectrumFloats(shape);

  // Allocate input / output buffers
  const inAlloc = mallocF32(mod, size, 'ndr:in');
  const outAlloc = mallocF32(mod, packedLen, 'ndr:out'); // packed spectrum size
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

    forward(input: Float32Array, out?: Float32Array): Float32Array {
      ensureNotDisposed();
      validateInputLength(input, size, 'nd-real forward (real input)');

      // Write real input
      mod.HEAPF32.set(input, inIdx);

      // Compute real → complex (packed) into outPtr
      mod._kiss_fftndr(pair!.fwd, inPtr, outPtr);

      // Read packed result
      if (out) {
        if (out.length !== packedLen) {
          throw new Error(
            `nd-real forward: out buffer length ${out.length} != packed length ${packedLen}`,
          );
        }
        out.set(mod.HEAPF32.subarray(outIdx, outIdx + packedLen));
        return out;
      }

      // Copy out a fresh packed array
      const view = mod.HEAPF32.subarray(outIdx, outIdx + packedLen);
      return view.slice();
    },

    inverse(input: Float32Array, out?: Float32Array): Float32Array {
      ensureNotDisposed();
      if (input.length !== packedLen) {
        throw new Error(
          `nd-real inverse: expected packed spectrum length ${packedLen}, got ${input.length}`,
        );
      }

      // For inverse, the WASM API is complex(packed) → real.
      // We'll reuse outPtr as the input spectrum buffer (same size).
      // Copy the packed spectrum into outPtr:
      mod.HEAPF32.set(input, outIdx);

      // Allocate a temporary real buffer for the inverse result.
      // We can reuse inPtr for the output (size floats).
      mod._kiss_fftndri(pair!.inv, outPtr, inPtr);

      // Normalize by 1/size
      const realView = mod.HEAPF32.subarray(inIdx, inIdx + size);
      if (out) {
        if (out.length !== size) {
          throw new Error(`nd-real inverse: out buffer length ${out.length} != ${size}`);
        }
        for (let i = 0; i < size; i++) out[i] = realView[i] * invSize;
        return out;
      }

      const result = new Float32Array(size);
      for (let i = 0; i < size; i++) result[i] = realView[i] * invSize;
      return result;
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      // Free data buffers
      if (isValidPointer(inPtr)) mod._free(inPtr);
      if (isValidPointer(outPtr)) mod._free(outPtr);

      // Decrement plan refs & maybe free the plans
      pair!.refCount--;
      if (!cache || pair!.refCount === 0) {
        if (isValidPointer(pair!.fwd)) mod._free(pair!.fwd);
        if (isValidPointer(pair!.inv)) mod._free(pair!.inv);
        if (cache) planCache.delete(key);
      }
    },
  };

  return api;
}
