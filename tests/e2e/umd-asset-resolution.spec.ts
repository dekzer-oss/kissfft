// tests/e2e/umd-asset-resolution.spec.ts
import { test, expect } from '@playwright/test';

test.describe('UMD asset resolution (no overrides)', () => {
  test('loads from default build paths and runs a complex round-trip', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/umd-basic.html');
    await page.waitForFunction(() => typeof (globalThis as any).DekzerKissfft === 'object');

    const out = await page.evaluate(async () => {
      const api = (globalThis as any).DekzerKissfft;
      const N = 16;
      const fft = await api.createKissFft(N);
      const spec = fft.forward(new Float32Array(2 * N));
      const rec = fft.inverse(spec);
      fft.dispose();
      return { specLen: spec.length, recLen: rec.length };
    });

    expect(out.specLen).toBe(32);
    expect(out.recLen).toBe(32);
  });

  test('works when the document is under a deep subpath', async ({ page }) => {
    // Use a real file so the page has a proper origin & lifecycle
    await page.goto('/tests/e2e/fixtures/umd-deep.html');
    await page.waitForFunction(() => typeof (globalThis as any).DekzerKissfft === 'object');

    const ok = await page.evaluate(async () => {
      const api = (globalThis as any).DekzerKissfft;
      const fft = await api.createKissFft(8);
      const spec = fft.forward(new Float32Array(16));
      const rec = fft.inverse(spec);
      fft.dispose();
      return spec.length === 16 && rec.length === 16;
    });

    expect(ok).toBe(true);
  });
});
