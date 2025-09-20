import { describe, expect, it } from 'vitest';
import * as api from '../src';

describe('API parity', () => {
  it('exposes primary entrypoints', () => {
    for (const name of [
      'createKissFft',
      'createKissRealFft',
      'createKissNdFft',
      'createKissNdRealFft',
      'cleanupKissFft',
      'getCacheStats',
      'nextFastShape',
      'nextFastSize'
    ])
      expect(api).toHaveProperty(name);
  });
});
