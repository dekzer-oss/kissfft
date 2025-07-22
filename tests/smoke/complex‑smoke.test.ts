/**
 * Complex‑FFT smoke tests
 * ───────────────────────────────────────────────────────────
 * • Micro‑size round‑trip checks (N = 32) to catch regressions fast.
 * • These run <10 ms, so they can be part of every `git commit‑‑hook`.
 */

import { createKissFft } from '@/fft';

const N = 32;
const REL_ERR = 1e-6;

/** Generate a reproducible random complex buffer */
const randomComplex = (() => {
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
  return () => {
    const buf = new Float32Array(2 * N);
    for (let i = 0; i < 2 * N; i++) buf[i] = rand();
    return buf;
  };
})();

describe('complex‑FFT – smoke', () => {
  let fft: Awaited<ReturnType<typeof createKissFft>>;

  beforeAll(async () => {
    fft = await createKissFft(N);
  });

  afterAll(() => fft.dispose());

  it('round‑trips an impulse exactly', () => {
    const src = new Float32Array(2 * N);
    src[0] = 1;

    const spec = fft.forward(src);
    const rec  = fft.inverse(spec);

    expect(rec[0]).toBeCloseTo(1, 7);
    for (let i = 1; i < 2 * N; i++) {
      expect(Math.abs(rec[i])).toBeLessThan(1e-7);
    }
  });

  it('round‑trips random complex input (≤1 e‑6 relative error)', () => {
    const input     = randomComplex();
    const spectrum  = fft.forward(input);
    const recovered = fft.inverse(spectrum);

    let num = 0, denom = 0;
    for (let i = 0; i < input.length; i++) {
      const d = input[i] - recovered[i];
      num   += d * d;
      denom += input[i] * input[i];
    }
    const relErr = Math.sqrt(num / denom);
    expect(relErr).toBeLessThan(REL_ERR);
  });
});
