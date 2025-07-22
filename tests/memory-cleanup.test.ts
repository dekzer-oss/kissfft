/**
 * Memory‑management & plan‑cache robustness
 * ───────────────────────────────────────────────────────────
 *  • Ensures `dispose()` frees native resources
 *  • Confirms plan‑cache ref‑counting works (cached vs non‑cached)
 *  • Validates `cleanupKissFft()` resets global state
 */

import { describe, it, expect } from 'vitest';
import {
  createKissFft,
  createKissRealFft,
  cleanupKissFft,
  type KissFftInstance,
  type KissFftRealInstance,
} from '@/index';
import { getCacheStats } from '@/fft';

/** Generate deterministic random complex buffer */
const randComplex = (N: number, seed = 1): Float32Array => {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff) * 2 - 1;
  const buf = new Float32Array(2 * N);
  for (let i = 0; i < 2 * N; i++) buf[i] = r();
  return buf;
};

/** Generate deterministic random real buffer */
const randReal = (N: number, seed = 1): Float32Array => {
  let s = seed >>> 0;
  const r = () => ((s = (s * 22695477 + 1) >>> 0) / 0xffffffff) * 2 - 1;
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = r();
  return buf;
};

describe('plan‑cache & dispose', () => {
  it('properly disposes and allows recreation (uncached)', async () => {
    const N = 64;
    let fft = await createKissFft(N,false);

    const in1 = randComplex(N, 111);
    const out1 = fft.forward(in1);
    fft.dispose();

    fft = await createKissFft(N,false);
    const in2 = randComplex(N, 111);
    const out2 = fft.forward(in2);
    expect(out2).toEqual(out1);
    fft.dispose();
  });

  it('ref‑counts cached plans', async () => {
    const N = 32;
    const fftA = await createKissFft(N, true);
    const fftB = await createKissFft(N, true);
    const { size: withTwo } = getCacheStats();

    fftA.dispose();
    expect(getCacheStats().size).toBe(withTwo);

    fftB.dispose();
    expect(getCacheStats().size).toBe(0);
  });
});

describe('cleanupKissFft()', () => {
  it('frees all cached resources in one call', async () => {
    const sizes = [16, 32, 64];
    const inst: Array<KissFftInstance | KissFftRealInstance> = [];
    for (const N of sizes) {
      inst.push(await createKissFft(N));
      inst.push(await createKissRealFft(N));
    }
    expect(getCacheStats().size).toBeGreaterThanOrEqual(sizes.length * 2);

    await cleanupKissFft();
    expect(getCacheStats().size).toBe(0);

    inst.forEach((fft) => {
      expect(() => (fft as any).forward(randComplex((fft as any).N || 16))).toThrow();
    });
  });
});
