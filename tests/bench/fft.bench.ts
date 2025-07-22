import { bench, describe, beforeAll, afterAll } from 'vitest';
import { createKissFft, cleanupKissFft } from '@/index';

const SIZES = [64, 256, 1024, 4096];
const plans = new Map<number, Awaited<ReturnType<typeof createKissFft>>>();
const inputs = new Map<number, Float32Array>();

beforeAll(async () => {
  for (const N of SIZES) {
    plans.set(N, await createKissFft(N));
    const buf = Float32Array.from({ length: 2 * N }, () => Math.random() - 0.5);
    inputs.set(N, buf);
  }
});

afterAll(() => {
  plans.forEach((p) => p.dispose());
  return cleanupKissFft();
});

for (const N of SIZES) {
  bench(`complex/forward/N=${N}`, () => {
    plans.get(N)!.forward(inputs.get(N)!);
  });
}
