import { expect, test } from '@playwright/test';

test('real 1-D forward/inverse behaves and lengths match', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/umd-basic.html');

  const out = await page.evaluate(async () => {
    const api = (window as any).DekzerKissfft;
    const N = 32;
    const fft = await api.createKissRealFft(N);

    const x = new Float32Array(N);
    x[0] = 1; // impulse
    const spec = fft.forward(x); // length: N + 2
    const rec = fft.inverse(spec);

    fft.dispose();
    await api.cleanupKissFft();

    return {
      specLen: spec.length,
      rec0: rec[0],
      maxTail: Math.max(...rec.slice(1).map(Math.abs)),
    };
  });

  expect(out.specLen).toBe(32 + 2);
  expect(out.rec0).toBeCloseTo(1, 6);
  expect(out.maxTail).toBeLessThan(1e-6);
});

test('N-D real FFT packed length matches formula and round-trips', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/umd-basic.html');

  const out = await page.evaluate(async () => {
    const api = (window as any).DekzerKissfft;
    const shape = [4, 4]; // size=16, last=4 → packed = size + 2*(size/last) = 16 + 2*4 = 24
    const fft = await api.createKissNdRealFft(shape);

    const size = shape.reduce((a: number, b: number) => a * b, 1);
    const x = new Float32Array(size);
    x[0] = 1;

    const spec = fft.forward(x);
    const rec = fft.inverse(spec);
    const maxTail = Math.max(...rec.slice(1).map(Math.abs));

    fft.dispose();
    await api.cleanupKissFft();

    return { specLen: spec.length, size, maxTail, rec0: rec[0] };
  });

  expect(out.specLen).toBe(24);
  expect(out.rec0).toBeCloseTo(1, 6);
  expect(out.maxTail).toBeLessThan(1e-6);
});
