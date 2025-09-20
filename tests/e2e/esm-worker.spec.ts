import { test, expect } from '@playwright/test';

test.describe('ESM inside a Worker (module)', () => {
  test('worker imports ESM bundle and completes round-trip', async ({ page }) => {
    // Anchor origin
    await page.goto('/tests/e2e/fixtures/umd-basic.html');

    const ok = await page.evaluate(async () => {
      const modUrl  = new URL('/dist/kissfft.browser.esm.js', location.origin).href;
      const modAlt  = new URL('/dist/kissfft.esm.js',          location.origin).href;
      const wasmBase = new URL('/dist/',                       location.origin).href;

      const workerCode = `
        // Try both modules; normalize export shape; pin asset base.
        async function loadApi() {
          const candidates = ['${modUrl}', '${modAlt}'];
          let lastErr = null;
          for (const href of candidates) {
            try {
              const mod = await import(href);
              const api = mod.createKissFft ? mod : (mod.default ?? null);
              if (api && typeof api.createKissFft === 'function') {
                if (typeof api.setKissFftAssetBase === 'function') {
                  api.setKissFftAssetBase('${wasmBase}');
                }
                return api;
              }
            } catch (e) { lastErr = e; }
          }
          throw lastErr ?? new Error('createKissFft not found in ESM exports');
        }

        self.onmessage = async (e) => {
          try {
            const api = await loadApi();
            const N = (e.data && e.data.N) || 12;
            const plan = await api.createKissFft(N);
            const x = new Float32Array(2 * N); x[0] = 1;
            const X = plan.forward(x);
            const y = plan.inverse(X);
            plan.dispose();

            let energy = 0, maxErr = 0;
            for (let i = 0; i < X.length; i++) energy += Math.abs(X[i]);
            for (let i = 0; i < y.length; i++) maxErr = Math.max(maxErr, Math.abs(y[i] - x[i]));
            postMessage({ ok: true, specLen: X.length, recLen: y.length, energy, maxErr });
          } catch (err) {
            postMessage({ ok: false, error: String(err && err.message || err) });
          }
        };
      `;

      const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));
      const w = new Worker(url, { type: 'module' });

      const res = await new Promise<{ok:boolean;specLen?:number;recLen?:number;energy?:number;maxErr?:number;error?:string}>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 8000);
        w.onmessage = (ev) => { clearTimeout(t); resolve(ev.data); };
        w.onerror   = (ev) => { clearTimeout(t); reject(new Error('worker error: ' + ev.message)); };
        w.postMessage({ N: 12 });
      });

      URL.revokeObjectURL(url);
      w.terminate();

      if (!res.ok) throw new Error('worker reported error: ' + (res.error || 'unknown'));
      return res.specLen === 24 && res.recLen === 24 && res.energy! > 0 && res.maxErr! < 1e-5;
    });

    expect(ok).toBe(true);
  });
});
