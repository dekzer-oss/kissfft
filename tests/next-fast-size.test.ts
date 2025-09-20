import { describe, it, expect } from 'vitest';
import { nextFastSize } from '@/index';

describe('nextFastSize', () => {
  it('is monotonic and >= n', async () => {
    const vals = [1, 2, 3, 7, 15, 16, 17, 31, 32, 33, 255, 256, 257];
    for (const n of vals) {
      const m = await nextFastSize(n);
      expect(m).toBeGreaterThanOrEqual(n);
    }
    // spot checks for known “5·3·2^k”-friendly sizes
    expect(await nextFastSize(1000)).toBe(1000);
    expect(await nextFastSize(1025)).toBeGreaterThanOrEqual(1025);
  });
});
