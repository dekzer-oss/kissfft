// tests/e2e/wasm-load.spec.ts
import { expect, type Page, test } from '@playwright/test';

// Tiny helper to install WebAssembly instrumentation before any script runs.
async function installWasmCounters(page: Page) {
  await page.addInitScript(() => {
    (globalThis as any).__wasmCounters = {
      instantiate: 0,
      instantiateStreaming: 0,
      moduleConstruct: 0,
    };

    // Patch instantiate
    const _inst = WebAssembly.instantiate;
    Object.defineProperty(WebAssembly, 'instantiate', {
      value: async function (...args: any[]) {
        (globalThis as any).__wasmCounters.instantiate++;
        return _inst.apply(this, args as any);
      },
      configurable: true,
      writable: true,
    });

    // Patch instantiateStreaming (if present)
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      const _instStr = WebAssembly.instantiateStreaming;
      Object.defineProperty(WebAssembly, 'instantiateStreaming', {
        value: async function (...args: any[]) {
          (globalThis as any).__wasmCounters.instantiateStreaming++;
          return _instStr.apply(this, args as any);
        },
        configurable: true,
        writable: true,
      });
    }

    // Patch Module constructor via Proxy so both compile paths are observed
    const _Module = WebAssembly.Module;
    // Some engines lock down name/length on constructors; use a Proxy to trap construct.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebAssembly.Module = new Proxy(_Module, {
      construct(target, args, newTarget) {
        (globalThis as any).__wasmCounters.moduleConstruct++;
        // Ensure correct 'new' semantics
        return Reflect.construct(target as any, args, newTarget);
      },
    });
  });
}

async function readWasmCounters(page: Page) {
  return await page.evaluate(() => (globalThis as any).__wasmCounters);
}

test.describe('WASM actually executes', () => {
  test('UMD → real FFT round-trip implies WebAssembly executed', async ({ page }) => {
    await installWasmCounters(page);

    // Anchor an origin and load the UMD fixture served by Vite preview
    await page.goto('/fixtures/umd-basic.html'); // fixture is present in dist/public structure

    // Wait until the UMD global is ready (pattern used in your working specs)
    await page.waitForFunction(
      () => typeof (globalThis as any).DekzerKissfft === 'object',
    );

    const ok = await page.evaluate(async () => {
      const api = (globalThis as any).DekzerKissfft as {
        setKissFftAssetBase?(p: string): void;
        createKissFft(n: number): Promise<{
          forward(x: Float32Array): Float32Array;
          inverse(X: Float32Array): Float32Array;
          dispose(): void;
        }>;
      };
      if (!api) throw new Error('UMD global missing');

      // Deterministic asset base under vite preview (dist is served at root)
      api.setKissFftAssetBase?.('/');

      const N = 16;
      const plan = await api.createKissFft(N); // current public API
      const x = new Float32Array(2 * N);
      x[0] = 1; // impulse
      const X = plan.forward(x);
      const y = plan.inverse(X);
      plan.dispose();

      // Minimal numerics just to ensure "work happened"
      const energy = X.reduce((s, v) => s + Math.abs(v), 0);
      let maxErr = 0;
      for (let i = 0; i < y.length; i++) maxErr = Math.max(maxErr, Math.abs(y[i] - x[i]));
      return { specLen: X.length, recLen: y.length, energy, maxErr };
    });

    const c = await readWasmCounters(page);
    const totalWasmCalls = c.instantiate + c.instantiateStreaming + c.moduleConstruct;

    // Assertions: API worked, and WebAssembly was touched at least once.
    expect(ok.specLen).toBe(32);
    expect(ok.recLen).toBe(32);
    expect(ok.energy).toBeGreaterThan(0);
    expect(ok.maxErr).toBeLessThan(1e-5);

    expect(totalWasmCalls).toBeGreaterThan(0);
    // Upper bound is intentionally loose; engines/loaders vary. Keep it implementation-agnostic.
    expect(totalWasmCalls).toBeLessThanOrEqual(6);
  });

  test('ESM → real FFT round-trip implies WebAssembly executed', async ({ page }) => {
    await installWasmCounters(page);

    // Any HTML that anchors origin is fine; reuse the UMD fixture page
    await page.goto('/fixtures/umd-basic.html');

    const out = await page.evaluate(async () => {
      const candidates = [
        new URL('/kissfft.browser.esm.js', location.origin).href,
        new URL('/kissfft.esm.js', location.origin).href,
      ];
      // Normalize export shape and pin base to "/"
      let api: any = null,
        lastErr: unknown = null;
      for (const href of candidates) {
        try {
          const mod: any = await import(/* @vite-ignore */ href);
          api = mod?.createKissFft ? mod : (mod?.default ?? null);
          if (api?.setKissFftAssetBase) api.setKissFftAssetBase('/');
          if (api?.createKissFft) break;
          api = null;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!api) throw lastErr ?? new Error('ESM API not found');

      const N = 16;
      const plan = await api.createKissFft(N); // current public API
      const x = new Float32Array(2 * N);
      x[0] = 1;
      const X = plan.forward(x);
      const y = plan.inverse(X);
      plan.dispose();

      const energy = X.reduce((s: number, v: number) => s + Math.abs(v), 0);
      let maxErr = 0;
      for (let i = 0; i < y.length; i++) maxErr = Math.max(maxErr, Math.abs(y[i] - x[i]));
      return { specLen: X.length, recLen: y.length, energy, maxErr };
    });

    const c = await readWasmCounters(page);
    const totalWasmCalls = c.instantiate + c.instantiateStreaming + c.moduleConstruct;

    expect(out.specLen).toBe(32);
    expect(out.recLen).toBe(32);
    expect(out.energy).toBeGreaterThan(0);
    expect(out.maxErr).toBeLessThan(1e-5);

    expect(totalWasmCalls).toBeGreaterThan(0);
    expect(totalWasmCalls).toBeLessThanOrEqual(6);
  });
});
