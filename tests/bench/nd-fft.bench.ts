import { bench, describe } from 'vitest';
import { createKissFft, createKissRealFft } from '@/index';

const COMPLEX_SIZES = [64, 256, 1024, 4096] as const;
const REAL_SIZES    = [64, 256, 1024, 4096] as const;

describe('KissFFT – complex forward throughput', async () => {
  for (const N of COMPLEX_SIZES) {
    const fft  = await createKissFft(N);
    const data = new Float32Array(2 * N).map(() => Math.random() - 0.5);

    bench(`complex forward N=${N}`, () => {
      fft.forward(data);
    });
  }
});

describe('KissFFT – real forward throughput', async () => {
  for (const N of REAL_SIZES) {
    const fft  = await createKissRealFft(N);
    const data = new Float32Array(N).map(() => Math.random() - 0.5);

    bench(`real forward N=${N}`, () => {
      fft.forward(data);
    });
  }
});
