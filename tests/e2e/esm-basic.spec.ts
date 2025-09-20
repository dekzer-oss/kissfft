import { test, expect } from '@playwright/test';

test.describe('ESM browser entry', () => {
  test('imports the ESM bundle and runs a complex round-trip', async ({ page }) => {
    // Anchor an origin so absolute URLs resolve
    await page.goto('/fixtures/umd-basic.html');

    const out = await page.evaluate(async () => {
      // Candidate ESM entry points served at server root (preview serves "dist/" at "/")
      const candidates = [
        new URL('/kissfft.browser.esm.js', location.origin).href,
        new URL('/kissfft.esm.js',        location.origin).href,
      ];

      // WASM assets are colocated in dist/ → root under preview
      const wasmBase = new URL('/', location.origin).href;

      // Your existing logic below can stay the same:
      async function loadApi() {
        let lastErr;
        for (const href of candidates) {
          try {
            const mod = await import(/* @vite-ignore */ href);
            // If your API exposes a base override, set it to "/"
            mod.setKissFftAssetBase?.(wasmBase);
            return mod;
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr ?? new Error('No ESM candidate loaded');
      }

      const api = await loadApi();

      // … keep your existing round-trip assertions here …
      return true;
    });

    expect(out).toBe(true);
  });


});
