import { loadKissFft } from '@/loader';
import type { KissFftNdRealInstance } from '@/types';
import { BYTES_F32, checkAllocation, isValidPointer, safeMemoryAllocation, toF32, validateInputLength } from './utils';
import { planCache } from './cache';

/**
 * Creates an N‑dimensional **real** FFT instance.
 *
 * @param shape Array of positive integer dimension sizes
 * @param cache Reuse FFT plans of identical shape (default = true)
 */
export async function createKissNdRealFft(
  shape: number[],
  cache = true,
): Promise<KissFftNdRealInstance> {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('Shape must be a non‑empty array');
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

  let cached = planCache.get(key) as
    | { fwd: number; inv: number; refCount: number }
    | undefined;

  let fwdCfg = cached?.fwd ?? 0;
  let invCfg = cached?.inv ?? 0;

  if (!fwdCfg) {
    const dimsPtr = mod._malloc(nd * 4);
    if (!isValidPointer(dimsPtr)) throw new Error('Failed to allocate dimensions buffer');
    try {
      for (let i = 0; i < nd; i++) mod.HEAP32[(dimsPtr >>> 2) + i] = shape[i];
      fwdCfg = mod._kiss_fftndr_alloc(dimsPtr, nd, 0 /* forward */, 0, 0);
      checkAllocation(fwdCfg, 'ndr forward plan');
      if (cache) {
        planCache.set(key, { fwd: fwdCfg, inv: 0 as any, refCount: 0 });
        cached = planCache.get(key) as any;
      }
    } finally {
      mod._free(dimsPtr);
    }
  }

  cached!.refCount++;

  const ensureInvPlan = () => {
    if (invCfg) return;
    if (cached!.inv) {
      invCfg = cached!.inv;
      return;
    }
    const dimsPtr = mod._malloc(nd * 4);
    if (!isValidPointer(dimsPtr)) throw new Error('Failed to allocate dimensions buffer');
    try {
      for (let i = 0; i < nd; i++) mod.HEAP32[(dimsPtr >>> 2) + i] = shape[i];
      invCfg = mod._kiss_fftndr_alloc(dimsPtr, nd, 1, 0, 0);
      checkAllocation(invCfg, 'ndr inverse plan');
      if (cache) cached!.inv = invCfg;
    } finally {
      mod._free(dimsPtr);
    }
  };

  const inPtr = mod._malloc(size * BYTES_F32);
  const outPtr = mod._malloc(size * 2 * BYTES_F32);

  safeMemoryAllocation(mod, [
    { ptr: inPtr, size: size * BYTES_F32 },
    { ptr: outPtr, size: size * 2 * BYTES_F32 },
  ]);

  const inIdx = toF32(inPtr);
  const outIdx = toF32(outPtr);
  let disposed = false;

  return {
    /** Forward real → complex */
    forward(buf) {
      if (disposed) throw new Error('N‑D real FFT instance disposed');
      validateInputLength(buf, size, 'nd real forward');

      mod.HEAPF32.set(buf, inIdx);
      mod._kiss_fftndr(fwdCfg!, inPtr, outPtr);
      return mod.HEAPF32.slice(outIdx, outIdx + 2 * size);
    },

    /** Inverse complex → real (with 1/size scaling) */
    inverse(buf) {
      if (disposed) throw new Error('N‑D real FFT instance disposed');
      validateInputLength(buf, 2 * size, 'nd real inverse');

      ensureInvPlan();
      mod.HEAPF32.set(buf, outIdx);
      mod._kiss_fftndri(invCfg!, outPtr, inPtr);

      const out = new Float32Array(size);
      const invSize = 1 / size;
      for (let i = 0; i < size; i++) out[i] = mod.HEAPF32[inIdx + i] * invSize;
      return out;
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

      cached!.refCount--;
      if (!cache || cached!.refCount === 0) {
        if (isValidPointer(fwdCfg)) mod._free(fwdCfg);
        if (isValidPointer(invCfg)) mod._free(invCfg);
        if (cache) planCache.delete(key);
      }

      if (isValidPointer(inPtr)) mod._free(inPtr);
      if (isValidPointer(outPtr)) mod._free(outPtr);
    },
  };
}
