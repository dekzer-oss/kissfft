// tests/bench/fft.bench.ts
import { bench, beforeAll, afterAll } from 'vitest';
import { createKissFft, cleanupKissFft } from '@/fft';

const SIZES = [64, 256, 1024, 4096] as const;
type Plan = Awaited<ReturnType<typeof createKissFft>>;

const plans = new Map<number, Plan>();
const inputs = new Map<number, Float32Array>();

// Cheap, deterministic RNG (xorshift32)
function seededBuf(len: number, seed = 0xC0FFEE) {
  const out = new Float32Array(len);
  let s = seed | 0;
  for (let i = 0; i < len; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;            // xorshift32
    out[i] = ((s >>> 0) / 0xffffffff) - 0.5;             // [-0.5, 0.5)
  }
  return out;
}

beforeAll(async () => {
  for (const N of SIZES) {
    plans.set(N, await createKissFft(N));
    inputs.set(N, seededBuf(2 * N, 0xC0FFEE ^ N));       // per-size deterministic input
  }
});

afterAll(async () => {
  plans.forEach((p) => p.dispose());
  await cleanupKissFft();
});

for (const N of SIZES) {
  const name = `complex/forward/N=${N}`;
  const opts =
    N === 64
      ? { baseline: true as const, warmupTime: 150, time: 750 }
      : { warmupTime: 150, time: 750 };

  bench(name, () => {
    plans.get(N)!.forward(inputs.get(N)!);
  }, opts);
}
