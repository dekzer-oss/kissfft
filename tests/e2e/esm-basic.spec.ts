import { test, expect } from '@playwright/test';

test.describe('ESM browser entry', () => {
  test('imports the ESM bundle and runs a complex round-trip', async ({ page }) => {
    // Anchor an origin so absolute URLs resolve
    await page.goto('/tests/e2e/fixtures/umd-basic.html');

    const out = await page.evaluate(async () => {
      // Try both distributions and normalize the export shape
      async function loadApi() {
        const candidates = [
          new URL('/dist/kissfft.browser.esm.js', location.origin).href,
          new URL('/dist/kissfft.esm.js',        location.origin).href,
        ];
        let lastErr: unknown = null;
        for (const href of candidates) {
          try {
            const mod = await import(/* @vite-ignore */ href);
            // Some builds export named, some default. Normalize.
            const api = (mod as any).createKissFft ? (mod as any)
              : (mod as any).default       ? (mod as any).default
                : null;
            if (api && typeof api.createKissFft === 'function') {
              // Keep WASM resolution deterministic in tests
              if (typeof api.setKissFftAssetBase === 'function') {
                api.setKissFftAssetBase('/dist/');
              }
              return api;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr ?? new Error('createKissFft not found in ESM exports');
      }

      const api = await loadApi();

      const N = 16;
      const plan = await api.createKissFft(N);

      const x = new Float32Array(2 * N);
      x[0] = 1;

      const X = plan.forward(x);
      const y = plan.inverse(X);
      plan.dispose();

      let energy = 0, maxErr = 0;
      for (let i = 0; i < X.length; i++) energy += Math.abs(X[i]);
      for (let i = 0; i < y.length; i++) maxErr = Math.max(maxErr, Math.abs(y[i] - x[i]));
      return { specLen: X.length, recLen: y.length, energy, maxErr };
    });

    expect(out.specLen).toBe(32);
    expect(out.recLen).toBe(32);
    expect(out.energy).toBeGreaterThan(0);
    expect(out.maxErr).toBeLessThan(1e-5);
  });
});
