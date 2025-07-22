/**
 * N‑D **real** FFT tests
 * ───────────────────────────────────────────────────────────
 *  • Forward + inverse accuracy for 2‑D and 3‑D real tensors
 *  • Ensures shape/size getters and output lengths are correct
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createKissNdRealFft, cleanupKissFft } from '@/index';

/** Helper to compute relative L2 error */
const relL2 = (a: Float32Array, b: Float32Array) => {
  let num = 0,
    den = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    num += d * d;
    den += a[i] * a[i];
  }
  return Math.sqrt(num / den);
};

/** Generate deterministic pseudo‑random real tensor */
const randomReal = (N: number, seed = 2025): Float32Array => {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 0xffffffff) * 2 - 1;
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = r();
  return buf;
};

/** Test shapes */
const SHAPES = [
  [4, 4],      // 2‑D 16 samples
  [2, 3, 4],   // 3‑D 24 samples
] as const;

const TOL = 1e-6;

describe('N‑D real FFT – forward + inverse', () => {
  afterAll(() => cleanupKissFft());

  SHAPES.forEach((shape) => {
    const size = shape.reduce((p, c) => p * c, 1);

    it(`${shape.join('×')} round‑trip ≤ 1e‑6`, async () => {
      const fft = await createKissNdRealFft([...shape]);
      expect(fft.shape).toEqual(shape);
      expect(fft.size).toBe(size);

      const src = randomReal(size, 777 + size);

      const spec = fft.forward(src);
      expect(spec.length).toBe(2 * size);

      const rec = fft.inverse(spec);
      expect(rec.length).toBe(size);
      expect(relL2(src, rec)).toBeLessThan(TOL);
      fft.dispose();
    });
  });
});
