/**
 * Real‑FFT smoke‑tests
 * ───────────────────────────────────────────────────────────
 * • Tiny, fast checks that catch regressions in the most
 *   common code paths.
 * • Keeps transform size small so the suite remains <5 ms.
 */

import { createKissRealFft } from '@/fft';

const N = 16;                 // micro‑size for smoke tests
const EPS = 1e-3;             // loose tolerance — just a canary

/** Helper: magnitude (size) of a single complex bin */
const mag = (re: number, im: number) => Math.hypot(re, im);

describe('real‑FFT ‑ smoke', () => {
  let fft: Awaited<ReturnType<typeof createKissRealFft>>;

  beforeAll(async () => {
    fft = await createKissRealFft(N);
  });

  afterAll(() => fft.dispose());

  const cases = [
    {
      name: 'DC 1.0',
      signal(dst: Float32Array) { dst.fill(1); },
      expectDC: 1,
    },
    {
      name: 'Impulse',
      signal(dst: Float32Array) { dst.fill(0); dst[0] = 1; },
      expectDC: 1 / N,
    },
    {
      name: 'Silence',
      signal(dst: Float32Array) { dst.fill(0); },
      expectDC: 0,
    },
    {
      name: '4‑bin sine',
      signal(dst: Float32Array) {
        for (let i = 0; i < N; i++) {
          dst[i] = Math.sin((2 * Math.PI * 4 * i) / N);
        }
      },
      expectDC: 0,
      peak: { bin: 4, min: 0.4 },
    },
    {
      name: 'Ramp',
      signal(dst: Float32Array) {
        for (let i = 0; i < N; i++) dst[i] = i / N;
      },
      expectDC: 0.46875,
    },
  ];

  cases.forEach(({ name, signal, expectDC, peak }) => {
    it(name, () => {
      const buf = new Float32Array(N);
      signal(buf);

      const spec = fft.forwardReal(buf);

      // DC check
      expect(spec[0] / N).toBeCloseTo(expectDC, 3);

      // Optional peak check
      if (peak) {
        const { bin, min } = peak;
        const re = spec[2 * bin] / N;
        const im = spec[2 * bin + 1] / N;
        expect(mag(re, im)).toBeGreaterThanOrEqual(min - EPS);
      }
    });
  });
});
