/**
 * Complex-FFT smoke (fast canaries)
 * • Single plan per suite; tiny data; deterministic checks
 */
import { createKissFft } from '@/fft';

const N = 32;
const REL_ERR = 1e-6;

const randomComplex = (() => {
  let s = 1337 >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff) * 2 - 1;
  return () => {
    const buf = new Float32Array(2 * N);
    for (let i = 0; i < buf.length; i++) buf[i] = rand();
    return buf;
  };
})();

describe('complex-FFT – smoke', () => {
  let fft: Awaited<ReturnType<typeof createKissFft>>;

  beforeAll(async () => {
    fft = await createKissFft(N);
  });
  afterAll(() => fft.dispose());

  it('impulse is lossless', () => {
    const src = new Float32Array(2 * N);
    src[0] = 1;
    const spec = fft.forward(src);
    const rec = fft.inverse(spec);
    expect(rec[0]).toBeCloseTo(1, 7);
    for (let i = 1; i < rec.length; i++) expect(Math.abs(rec[i])).toBeLessThan(1e-7);
  });

  it('random complex input ≤ 1e-6 rel-err', () => {
    const input = randomComplex();
    const spectrum = fft.forward(input);
    const recovered = fft.inverse(spectrum);

    let num = 0,
      den = 0;
    for (let i = 0; i < input.length; i++) {
      const d = input[i] - recovered[i];
      num += d * d;
      den += input[i] * input[i];
    }
    expect(Math.sqrt(num / den)).toBeLessThan(REL_ERR);
  });
});
