import { createKissFft } from '@/index';
import { bench, describe } from 'vitest';

const sizes = [64, 256, 1024, 4096];

describe('KissFFT – complex forward throughput', () => {
  for (const N of sizes) {
    let fft: Awaited<ReturnType<typeof createKissFft>>;
    let buf: Float32Array;

    bench(`complex forward N=${N}`, async () => {
      if (!fft) {
        fft = await createKissFft(N);
        buf = new Float32Array(2 * N).map(() => Math.random() - 0.5);
      }

      fft.forward(buf);
    });
  }
});
