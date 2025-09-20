// tests/setup-kissfft.ts
import { beforeAll } from 'vitest';
import { createKissFft, loadKissFft } from '@/index';

beforeAll(async () => {
  // Ensure glue is imported and WASM is ready.
  await loadKissFft();

  // Deterministic micro warm-up to pay first-run costs up front (JIT, mem growth).
  const WARM_N = 16;
  const fft = await createKissFft(WARM_N);
  const zeros = new Float32Array(2 * WARM_N); // [0,0,...]
  // forward + inverse once (cheap, isolates first-run overhead)
  const spec = fft.forward(zeros);
  fft.inverse(spec);
  fft.dispose();
});
