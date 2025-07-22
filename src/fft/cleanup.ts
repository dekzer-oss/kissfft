import { loadKissFft } from '@/wasm-loader';
import { planCache, cleanupCache } from './cache';

/**
 * Cleans up all cached FFT plans and releases WASM resources.
 * @returns Promise when cleanup completes
 */
export async function cleanupKissFft(): Promise<void> {
  try {
    const mod = await loadKissFft();
    cleanupCache(mod);

    if (mod._kiss_fft_cleanup && typeof mod._kiss_fft_cleanup === 'function') {
      mod._kiss_fft_cleanup();
    }
  } catch (error) {
    console.error('Error during KissFFT cleanup:', error);
    planCache.clear();
  }
}

/**
 * Handles odd-length real FFTs by padding to even length.
 * @param data - Input data
 * @returns Padded data and unpadding function
 */
export function handleOddLengthRealFft(data: Float32Array): {
  paddedData: Float32Array;
  originalLength: number;
  unpadData: (result: Float32Array) => Float32Array;
} {
  const originalLength = data.length;

  if (originalLength % 2 === 0) {
    return {
      paddedData: data,
      originalLength,
      unpadData: (result) => result,
    };
  }

  const paddedData = new Float32Array(originalLength + 1);
  paddedData.set(data);
  paddedData[originalLength] = 0;

  return {
    paddedData,
    originalLength,
    unpadData: (result) => result.slice(0, originalLength),
  };
}
