/**
 * Input-validation & cache invariants
 * • Adds explicit cache size assertions so suites self-police resource usage
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanupKissFft,
  createKissFft,
  createKissNdFft,
  createKissRealFft,
} from '@/index';
import { getCacheStats, handleOddLengthRealFft } from '@/fft';

afterAll(() => cleanupKissFft());

describe('API – invalid scalar sizes', () => {
  it('rejects non-positive or non-integer N', async () => {
    await expect(createKissFft(0)).rejects.toThrow(/invalid fft size/i);
    await expect(createKissFft(-8)).rejects.toThrow(/invalid fft size/i);
    await expect(createKissFft(2.3)).rejects.toThrow(/invalid fft size/i);
  });

  it('real-FFT forbids odd lengths', async () => {
    await expect(createKissRealFft(157)).rejects.toThrow(/not supported/i);
  });
});

describe('API – invalid ND shapes', () => {
  it('rejects empty shape array', async () => {
    await expect(createKissNdFft([], false)).rejects.toThrow(/non-empty array/i);
  });

  it('rejects negative or zero dims', async () => {
    await expect(createKissNdFft([4, -1], false)).rejects.toThrow(/invalid dimension/i);
  });
});

describe('handleOddLengthRealFft()', () => {
  it('pads to even length and unpads back', () => {
    const input = new Float32Array([1, 2, 3]);
    const { paddedData, originalLength, unpadData } = handleOddLengthRealFft(input);

    expect(originalLength).toBe(3);
    expect(paddedData.length).toBe(4);
    expect(paddedData[3]).toBe(0);

    const dummy = new Float32Array([10, 11, 12, 99]);
    const unpadded = unpadData(dummy);
    expect(unpadded.length).toBe(3);
    expect(unpadded[2]).toBe(12);
  });
});

describe('plan cache – stats & reset', () => {
  beforeAll(() => getCacheStats());

  it('reflects plan creation and cleanup', async () => {
    const base = getCacheStats().size;

    const fft = await createKissFft(16);
    expect(getCacheStats().size).toBe(base + 1);

    fft.dispose();
    await cleanupKissFft();
    expect(getCacheStats().size).toBe(0);
  });

  it('logs a warning once for very large ND transforms', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fft = await createKissNdFft([100, 100, 101]); // 1,010,000 elems
    expect(warn).toHaveBeenCalledTimes(1);
    fft.dispose();
    warn.mockRestore();
  });
});
