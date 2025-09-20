import { loadKissFft } from '@/loader';

/** Returns the next KISS-FFT-friendly size (factors of 2·3·5), n ≥ 1. */
export async function nextFastSize(n: number): Promise<number> {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`nextFastSize: invalid n=${n}`);
  const mod = await loadKissFft();
  return mod._kiss_fft_next_fast_size(n | 0);
}
