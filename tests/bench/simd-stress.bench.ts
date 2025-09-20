// tests/bench/simd-stress.bench.ts
import { bench, describe, beforeAll, afterAll } from 'vitest';
import { type KissFftWasmModule, loadKissFft } from '../../src';

let wasm: KissFftWasmModule | null = null;

beforeAll(async () => {
  // If you add a { preferSimd: true } flag later, pass it here.
  wasm = await loadKissFft();

  // Warm up tiny path so link/JIT costs don’t pollute first sample.
  const cfg = wasm._kiss_fft_alloc(16, 0, 0, 0);
  const inPtr = wasm._malloc(16 * 2 * 4);
  const outPtr = wasm._malloc(16 * 2 * 4);
  wasm._kiss_fft(cfg, inPtr, outPtr);
  wasm._free(inPtr); wasm._free(outPtr); wasm._free(cfg);
});

type Case = {
  nfft: number;
  inverse: boolean;
  inputPtr: number;
  outputPtr: number;
  cfgPtr: number;
  run: () => void;
  free: () => void;
};

const cases = new Map<string, Case>();
const keyOf = (nfft: number, inverse: boolean) => `${nfft}:${inverse ? 1 : 0}`;

function ensureCase(nfft: number, inverse: boolean): Case {
  const key = keyOf(nfft, inverse);
  const existing = cases.get(key);
  if (existing) return existing;

  if (!wasm) throw new Error('WASM module not loaded yet');

  const complexElems = nfft * 2;            // interleaved [re, im, re, im...]
  const bytes = complexElems * 4;

  const cfgPtr = wasm._kiss_fft_alloc(nfft, inverse ? 1 : 0, 0, 0);
  const inputPtr = wasm._malloc(bytes);
  const outputPtr = wasm._malloc(bytes);

  const input = new Float32Array(wasm.HEAPF32.buffer, inputPtr, complexElems);

  // Pre-fill a sine into interleaved input ONCE.
  for (let i = 0; i < nfft; i++) {
    input[i * 2] = Math.sin((2 * Math.PI * i) / nfft); // re
    input[i * 2 + 1] = 0;                              // im
  }

  const BATCH = 16; // amortize JS→WASM boundary

  const run = () => {
    // wasm! is safe here; bench callbacks run after beforeAll.
    for (let t = 0; t < BATCH; t++) wasm!._kiss_fft(cfgPtr, inputPtr, outputPtr);
  };

  const free = () => {
    wasm!._free(inputPtr);
    wasm!._free(outputPtr);
    wasm!._free(cfgPtr);
  };

  const c: Case = { nfft, inverse, inputPtr, outputPtr, cfgPtr, run, free };
  cases.set(key, c);
  return c;
}

afterAll(() => {
  for (const c of cases.values()) c.free();
  cases.clear();
});

const SIZES = [128, 512, 2048, 8192, 32768];

describe('KissFFT kernel stress (complex, interleaved)', () => {
  for (const n of SIZES) {
    bench(`complex forward N=${n}`, () => ensureCase(n, false).run(), { time: 500 });
    bench(`complex inverse N=${n}`, () => ensureCase(n, true).run(),  { time: 500 });
  }
});
