// tests/e2e/umd-basic.spec.ts
import { expect, test } from '@playwright/test';

type Plan = {
  forward(x: Float32Array): Float32Array;
  inverse(X: Float32Array): Float32Array;
  dispose(): void;
};
type UmdApi = {
  setKissFftAssetBase?(p: string): void;
  createKissFft(n: number): Promise<Plan>;
};

type EvalResult = {
  specLen: number;
  recLen: number;
  maxErr: number;
  specEnergy: number;
};

test('loads UMD and does a complex round-trip (implies WASM ran)', async ({ page }) => {
  await page.goto('/fixtures/umd-basic.html');

  // Wait until UMD global is actually initialized (avoid races)
  await page.waitForFunction(() => {
    const g = globalThis as unknown as { DekzerKissfft?: object; __umdLoaded?: boolean };
    return g.__umdLoaded === true || typeof g.DekzerKissfft === 'object';
  });

  const out = await page.evaluate<EvalResult>(async () => {
    const w = globalThis as unknown as { DekzerKissfft?: UmdApi };
    const api = w.DekzerKissfft;
    if (!api) throw new Error('UMD global missing');

    // Deterministic asset location for the test: siblings of the UMD bundle.
    // api.setKissFftAssetBase?.('/dist/');
    api.setKissFftAssetBase?.('/');

    const N = 16;
    const plan = await api.createKissFft(N);

    // Complex interleaved impulse at DC -> FFT -> IFFT
    const x = new Float32Array(2 * N);
    x[0] = 1;

    const X = plan.forward(x);
    const y = plan.inverse(X);

    // Numerics: tiny reconstruction error, non-zero spectrum energy
    let maxErr = 0;
    for (let i = 0; i < y.length; i++) {
      const e = Math.abs(y[i] - x[i]);
      if (e > maxErr) maxErr = e;
    }
    let specEnergy = 0;
    for (let i = 0; i < X.length; i++) specEnergy += Math.abs(X[i]);

    plan.dispose();

    return { specLen: X.length, recLen: y.length, maxErr, specEnergy };
  });

  // Structure + numerics prove the engine ran (and thus WASM executed).
  expect(out.specLen).toBe(2 * 16);
  expect(out.recLen).toBe(2 * 16);
  expect(out.specEnergy).toBeGreaterThan(0);
  expect(out.maxErr).toBeLessThan(1e-5);
});
