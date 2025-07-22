import { createKissFft } from '@/index';
import { bench, describe } from 'vitest';

(async () => {
  const N = 1024;
  const fft = await createKissFft(N);
  const buf = new Float32Array(2 * N).map(() => Math.random() - 0.5);

  describe('KissFFT – forward transform throughput', () => {
    bench(`complex forward N=${N}`, () => {
      fft.forward(buf);
    });
  });
})();
