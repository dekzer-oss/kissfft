/**
 * 3‑D complex FFT tests
 * ───────────────────────────────────────────────────────────
 *  • Verifies round‑trip accuracy on a medium‑size 3‑D tensor
 *  • Shape chosen so size ≠ power‑of‑two (stress factor)
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createKissNdFft, cleanupKissFft } from '@/index';

/** Helper L2 norm */
const l2 = (a: Float32Array, b: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

/** Shape  =  2 × 3 × 5  (size = 30) */
const SHAPE = [2, 3, 5] as const;
const SIZE  = SHAPE[0] * SHAPE[1] * SHAPE[2];

/** Deterministic random complex tensor */
const randomTensor = () => {
  let s = 9001;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 0xffffffff) * 2 - 1;
  const buf = new Float32Array(2 * SIZE);
  for (let i = 0; i < buf.length; i++) buf[i] = r();
  return buf;
};

describe('3‑D FFT (complex)', () => {
  afterAll(() => cleanupKissFft());

  it('round‑trips 2×3×5 tensor ≤ 1e‑6 rel‑err', async () => {
    const fft = await createKissNdFft([...SHAPE]);
    const src = randomTensor();
    const spec = fft.forwardNd(src);
    const rec  = fft.inverseNd(spec);

    const err = l2(src, rec) / l2(src, new Float32Array(src.length));
    expect(err).toBeLessThan(1e-6);
    fft.dispose();
  });
});
