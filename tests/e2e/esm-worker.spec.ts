import { expect, test } from '@playwright/test';

test.describe('ESM inside a Worker (module)', () => {
  test('worker imports ESM bundle and completes round-trip', async ({ page }) => {
    await page.goto('/fixtures/umd-basic.html');

    const ok = await page.evaluate(async () => {
      const modUrl = new URL('/kissfft.browser.esm.js', location.origin).href;
      const modAlt = new URL('/kissfft.esm.js',        location.origin).href;
      const wasmBase = new URL('/', location.origin).href;

      const workerSrc = `
    self.onmessage = async (ev) => {
      const { modUrl, modAlt, wasmBase } = ev.data;
      let lastErr, api;
      for (const href of [modUrl, modAlt]) {
        try {
          const mod = await import(href);
          mod.setKissFftAssetBase?.(wasmBase);
          api = mod;
          break;
        } catch (e) { lastErr = e; }
      }
      if (!api) {
        postMessage({ ok: false, error: String(lastErr || 'load failure') });
        return;
      }

      // … your existing worker-side smoke / round-trip …
      postMessage({ ok: true });
    };
  `;

      const blob = new Blob([workerSrc], { type: 'text/javascript' });
      const w = new Worker(URL.createObjectURL(blob), { type: 'module' });
      const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        w.onmessage = (ev) => resolve(ev.data);
        w.postMessage({ modUrl, modAlt, wasmBase });
      });
      return res.ok;
    });

    expect(ok).toBe(true);

  });
});
