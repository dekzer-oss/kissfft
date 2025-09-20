/**
 * Complex-FFT round-trip tests (stable & fast)
 * • Reuses one plan per N inside a sub-suite (beforeAll/afterAll)
 * • Runs sequentially in this file to avoid interleaved WASM work
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupKissFft, createKissFft, type KissFftInstance } from '@/index';

function relErr(a: Float32Array, b: Float32Array): number {
  let num = 0,
    den = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    num += d * d;
    den += a[i] * a[i];
  }
  return Math.sqrt(num / den);
}

// Deterministic PRNG (LCG) for reproducible buffers
function randomComplex(N: number, seed = 42): Float32Array {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff) * 2 - 1;
  const buf = new Float32Array(2 * N);
  for (let i = 0; i < buf.length; i++) buf[i] = rnd();
  return buf;
}

const SIZES = [4, 16, 256, 1024, 4096, 8192, 251]; // include a prime
const TOL = 1e-6;

describe.sequential('complex FFT – round-trip accuracy', () => {
  afterAll(() => cleanupKissFft());

  for (const N of SIZES) {
    describe(`N = ${N}`, () => {
      let fft: KissFftInstance;

      beforeAll(async () => {
        fft = await createKissFft(N);
      });
      afterAll(() => fft.dispose());

      it('impulse is lossless', () => {
        const impulse = new Float32Array(2 * N);
        impulse[0] = 1;
        const spec = fft.forward(impulse);
        const rec = fft.inverse(spec);
        expect(rec[0]).toBeCloseTo(1, 7);
        for (let i = 1; i < rec.length; i++) expect(Math.abs(rec[i])).toBeLessThan(1e-7);
      });

      it('random complex buffer ≤ 1e-6 rel-err', () => {
        const src = randomComplex(N, 1234 + N);
        const spec = fft.forward(src);
        const rec = fft.inverse(spec);
        expect(relErr(src, rec)).toBeLessThan(TOL);
      });
    });
  }
});
