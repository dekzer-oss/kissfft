// tests/e2e/umd-basic.spec.ts
import { expect, test } from '@playwright/test';

test('loads UMD, fetches/instantiates WASM, does a complex round-trip', async ({ page }) => {
  const ctx = page.context();

  // 1) Context-wide network interception (catches worker, frames, etc.)
  const wasmUrls = new Set<string>();
  await ctx.route('**/*.wasm*', (route) => {
    wasmUrls.add(route.request().url());
    return route.continue();
  });
  ctx.on('request', (req) => {
    const u = req.url();
    if (u.includes('.wasm')) wasmUrls.add(u);
  });
  ctx.on('requestfinished', (req) => {
    const u = req.url();
    if (u.includes('.wasm')) wasmUrls.add(u);
  });

  // 2) Count WASM *instantiation* calls (works even if no visible fetch)
  await ctx.addInitScript(() => {
    // @ts-ignore
    (window as any).__wasmInstantiateSignals__ = 0;

    const wrap = <T extends (...a: any[]) => any>(fn: T): T =>
      ((...args: any[]) => {
        // @ts-ignore
        (window as any).__wasmInstantiateSignals__++;
        // @ts-ignore
        return (fn as any)(...args);
      }) as T;

    // If present, wrap both instantiate paths
    if (typeof WebAssembly === 'object') {
      if (typeof WebAssembly.instantiate === 'function') {
        // @ts-ignore
        WebAssembly.instantiate = wrap(WebAssembly.instantiate);
      }
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        // @ts-ignore
        WebAssembly.instantiateStreaming = wrap(WebAssembly.instantiateStreaming);
      }
    }
  });

  // 3) Navigate to the UMD fixture
  await page.goto('/tests/e2e/fixtures/umd-basic.html');

  // Wait until UMD global exists to avoid races
  await page.waitForFunction(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return w.__umdLoaded === true || typeof w.DekzerKissfft === 'object';
  });

  // 4) Do a real DSP round-trip through the UMD global
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).DekzerKissfft;

    // Optional but makes paths deterministic if multiple builds exist
    if (api && typeof api.setKissFftAssetBase === 'function') {
      // Prefer using dist assets alongside the UMD for this test
      api.setKissFftAssetBase('/dist/');
    }

    const N = 16;
    const plan = await api.createKissFft(N);

    // Complex interleaved impulse at DC
    const x = new Float32Array(2 * N);
    x[0] = 1;

    const X = plan.forward(x);
    const y = plan.inverse(X);

    // Numeric sanity
    let specEnergy = 0;
    for (let i = 0; i < X.length; i++) specEnergy += Math.abs(X[i]);

    let maxErr = 0;
    for (let i = 0; i < y.length; i++) {
      const e = Math.abs(y[i] - x[i]);
      if (e > maxErr) maxErr = e;
    }

    plan.dispose();

    // Performance API view of .wasm
    const perfWasmCount = performance
      .getEntriesByType('resource')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((e: any) => typeof e.name === 'string' && e.name.includes('.wasm'))
      .length;

    // @ts-ignore
    const instSignals = (window as any).__wasmInstantiateSignals__ ?? 0;

    return {
      specLen: X.length,
      recLen: y.length,
      specEnergy,
      maxErr,
      perfWasmCount,
      instSignals,
    };
  });

  // Structure + numerics prove actual compute happened
  expect(result.specLen).toBe(2 * 16);
  expect(result.recLen).toBe(2 * 16);
  expect(result.specEnergy).toBeGreaterThan(0);
  expect(result.maxErr).toBeLessThan(1e-5);

  // 5) WASM evidence: pass if ANY robust signal fired
  const anyWasmEvidence =
    wasmUrls.size > 0 ||
    result.perfWasmCount > 0 ||
    result.instSignals > 0;

  expect(anyWasmEvidence).toBe(true);
});
