/**
 * Real-FFT smoke (fast canaries)
 * - One plan per suite; tiny signals; deterministic checks
 */
import { createKissRealFft } from '@/fft';

const N = 16;
const EPS = 1e-3;
const mag = (re: number, im: number) => Math.hypot(re, im);

type RealCase = {
  readonly name: string;
  readonly signal: (dst: Float32Array) => void;
  readonly expectDC: number; // expected DC magnitude after /N scaling
  readonly peak?: { readonly bin: number; readonly min: number }; // optional spectral peak check
};

const cases = [
  {
    name: 'DC 1.0',
    signal(dst) {
      dst.fill(1);
    },
    expectDC: 1,
  },
  {
    name: 'Impulse',
    signal(dst) {
      dst.fill(0);
      dst[0] = 1;
    },
    expectDC: 1 / N,
  },
  {
    name: 'Silence',
    signal(dst) {
      dst.fill(0);
    },
    expectDC: 0,
  },
  {
    name: '4-bin sine',
    signal(dst) {
      for (let i = 0; i < N; i++) dst[i] = Math.sin((2 * Math.PI * 4 * i) / N);
    },
    expectDC: 0,
    peak: { bin: 4, min: 0.4 },
  },
  {
    name: 'Ramp',
    signal(dst) {
      for (let i = 0; i < N; i++) dst[i] = i / N;
    }, // mean of 0..(N-1) divided by N → (N-1)/2 / N
    expectDC: (N - 1) / (2 * N),
  },
] as const satisfies ReadonlyArray<RealCase>;

describe('real-FFT - smoke', () => {
  let fft: Awaited<ReturnType<typeof createKissRealFft>>;

  beforeAll(async () => {
    fft = await createKissRealFft(N);
  });
  afterAll(() => fft.dispose());

  for (const c of cases) {
    it(c.name, () => {
      const buf = new Float32Array(N);
      c.signal(buf);

      const spec = fft.forward(buf);

      // DC lives at bin 0, scale by N to compare to time-domain average
      expect(spec[0] / N).toBeCloseTo(c.expectDC, 3);
    });
  }
});
