# @dekzer/kissfft

Fast, tiny FFTs in JS via WebAssembly-compiled **KISS FFT**.  
Works in Node and modern browsers; supports **1‑D / N‑D**, **complex** and **real (Hermitian‑packed)** transforms.

- 🧠 Simple APIs with optional out-buffers
- ⚡️ WASM + SIMD when available
- 🧮 KISS FFT semantics (inverse includes normalization)
- 🧩 TypeScript types included
- 🌐 Script‑tag demo via UMD (unpkg/jsDelivr)

---

## Install

```bash
pnpm add @dekzer/kissfft
# or:
npm i @dekzer/kissfft
yarn add @dekzer/kissfft
```

> ESM‑only. Node 18+ or any modern browser.

---

## Quick start

```ts
import {
  createKissFft,         // 1-D complex
  createKissRealFft,     // 1-D real (packed spectrum)
  createKissNdFft,       // N-D complex
  createKissNdRealFft,   // N-D real (packed along last dim)
  nextFastSize,
  cleanupKissFft,
} from '@dekzer/kissfft';

// 1-D complex
const N = 1024;
const fft = await createKissFft(N);
const x  = new Float32Array(2 * N);   // [re0,im0,re1,im1,...]
const X  = fft.forward(x);            // len 2*N
const x2 = fft.inverse(X);            // len 2*N ; includes 1/N
fft.dispose();

// 1-D real (packed)
const rfft = await createKissRealFft(N); // N must be even
const xr   = new Float32Array(N);
const Xp   = rfft.forward(xr);           // len N+2 (packed)
const xr2  = rfft.inverse(Xp);           // len N    ; includes 1/N
rfft.dispose();

// Global cleanup (frees any cached WASM plans)
cleanupKissFft();
```

---

## Buffer sizes (cheat sheet)

- **1‑D complex**: interleaved `[re, im, …]` → **len = 2·N**.  
  `inverse()` scales by **1/N**.
- **1‑D real (packed)**: input **len = N (even)** → spectrum **len = N+2**.  
  `inverse()` scales by **1/N**.
- **N‑D complex**: `size = ∏ shape[i]` → interleaved **len = 2·size**.  
  `inverse()` scales by **1/size**.
- **N‑D real (packed along last dim)**: `last = shape[k‑1] (even)` →  
  packed floats **= `size + 2·(size/last)`**; `inverse()` scales by **1/size**.

---

## API surface

**Factories (async):**
```ts
await createKissFft(N)                 // 1-D complex
await createKissRealFft(N)             // 1-D real (N even)
await createKissNdFft(shape)           // N-D complex
await createKissNdRealFft(shape)       // N-D real (last dim even)
```

**Helpers (sync):**
```ts
const fast = nextFastSize(n);          // next KISS-friendly size (2·3·5 factors)
cleanupKissFft();                      // free all cached WASM plans
```

**Instances (sync methods):**
```ts
forward(input[, out?]): Float32Array
inverse(input[, out?]): Float32Array
dispose(): void
```

---

## CDN / script tag (UMD)

For quick demos or CodePen/JSFiddle:

```html
<script src="https://unpkg.com/@dekzer/kissfft/dist/kissfft.umd.js"></script>
<script>
  const { createKissFft } = window.DekzerKissfft;
  (async () => {
    const fft = await createKissFft(1024);
    const x = new Float32Array(2048);
    const X = fft.forward(x);
    console.log('bins:', X.length);
    fft.dispose();
  })();
</script>
```

> jsDelivr also works:  
> `https://cdn.jsdelivr.net/npm/@dekzer/kissfft/dist/kissfft.umd.js`

---

## Tips

- Prefer **real FFT** for real inputs (smaller/faster via Hermitian packing).
- Pad to **even N** (1‑D real) or **even last dim** (N‑D real), or use complex FFT.
- Reuse **plans** and **out‑buffers** in loops to avoid GC pressure.
- Use `nextFastSize(n)` to pick friendlier sizes for real‑time workloads.

---

## License

- Wrapper/bindings: MIT © 2025 Maikel Eckelboom  
- Includes **KISS FFT** (BSD‑3‑Clause) — see `THIRD_PARTY_LICENSES/` and `NOTICE`.
