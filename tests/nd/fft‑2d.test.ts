/**
 * 2‑D complex FFT tests
 * ───────────────────────────────────────────────────────────
 *  • Validates forward and inverse for common 2‑D shapes
 *  • Uses tiny deterministic arrays → fast CI safety net
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createKissNdFft, cleanupKissFft } from '@/index';

/** Reference 2×2 DFT (computed via NumPy) */
const ref2x2 = {
  input: new Float32Array([
    1, 0, 2, 0, // row 0: 1+0j, 2+0j
    3, 0, 4, 0, // row 1: 3+0j, 4+0j
  ]),
  output: new Float32Array([
    10, 0,  -2, 0,
    -4, 0,   0, 0,
  ]),
};

/** Simple helper: L2‑norm */
const l2 = (a: Float32Array, b: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

describe('2‑D FFT (complex)', () => {
  afterAll(() => cleanupKissFft());

  it('matches NumPy reference for 2×2', async () => {
    const fft = await createKissNdFft([2, 2]);
    const spec = fft.forward(ref2x2.input);
    expect(l2(spec, ref2x2.output)).toBeLessThan(1e-6);
    fft.dispose();
  });

  it('round‑trips a 4×4 random matrix', async () => {
    const shape = [4, 4];
    const size = 16;
    const rnd = new Float32Array(size * 2).map(() => Math.random() - 0.5);

    const fft = await createKissNdFft(shape);
    const spec = fft.forward(rnd);
    const rec  = fft.inverse(spec);

    const err = l2(rnd, rec) / l2(rnd, new Float32Array(rnd.length));
    expect(err).toBeLessThan(1e-6);
    fft.dispose();
  });
});
