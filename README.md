# @dekzer/kissfft

Fast, tiny FFTs in JS via WebAssembly-compiled **KISS FFT**.
Supports **1-D** and **N-D**, **complex** and **real (Hermitian-packed)** transforms, in both Node and browsers.

- 🧠 Simple, allocation-free APIs with optional out-buffers
- ⚡️ WASM + SIMD (when available)
- 🧮 Parity with KISS FFT semantics (normalization on inverse)
- 📦 TypeScript types included

---

## Install

```bash
pnpm add @dekzer/kissfft
# or
npm i @dekzer/kissfft
# or
yarn add @dekzer/kissfft
```

ESM only. Node 18+ or any modern browser.

---

## Quick start

```ts
import {
  createKissFft, // 1-D complex
  createKissRealFft, // 1-D real (packed spectrum)
  createKissNdFft, // N-D complex
  createKissNdRealFft, // N-D real (packed along last dim)
  nextFastSize,
  cleanupKissFft,
} from '@dekzer/kissfft';

// 1-D complex
const N = 1024;
const fft = createKissFft(N);
const x = new Float32Array(2 * N); // [re0,im0,re1,im1,...]
const X = fft.forward(x); // length 2*N
const x2 = fft.inverse(X); // length 2*N ; includes 1/N
fft.dispose();

// 1-D real (packed)
const rfft = createKissRealFft(N); // N must be even
const xr = new Float32Array(N);
const Xp = rfft.forward(xr); // length N+2 (packed)
const xr2 = rfft.inverse(Xp); // length N     ; includes 1/N
rfft.dispose();

// Global cleanup (frees any cached WASM plans)
cleanupKissFft();
```

---

## Buffer sizes & packing (important)

### 1-D complex

- Input/output are **interleaved complex**: `[re0, im0, re1, im1, …]`
- Length is always **`2 * N`**
- `inverse()` includes **1/N** normalization

### 1-D real (packed)

- Real input length: **`N`** (**must be even**)
- Packed complex spectrum length: **`N + 2`** (i.e. `(N/2 + 1)` bins × 2 floats)
- `inverse()` includes **1/N** normalization

### N-D complex

- Real element count: **`size = ∏ shape[i]`**
- Complex buffers are interleaved; length is always **`2 * size`**
- `inverse()` includes **1/size** normalization

### N-D real (packed along last dimension)

- `shape = [d0, d1, …, d_{k-1}]`, **`last = shape[k-1]` must be even**
- Real element count: **`size = ∏ shape[i]`**
- Packed complex length (floats):
  **`packedFloats(shape) = size + 2 * (size / last)`**
- `inverse()` includes **1/size** normalization

Helper:

```ts
function packedFloats(shape: number[]) {
  const size = shape.reduce((a, b) => a * b, 1);
  const last = shape[shape.length - 1];
  return size + 2 * (size / last);
}
```

---

## API

```ts
createKissFft(N: number): KissFftInstance
createKissRealFft(N: number): KissFftRealInstance           // N must be even
createKissNdFft(shape: number[]): KissFftNdInstance
createKissNdRealFft(shape: number[]): KissFftNdRealInstance // last dim must be even

nextFastSize(n: number): number
cleanupKissFft(): void
```

### Instances

All instances share these guarantees:

- Methods validate buffer lengths and throw on mismatch.
- `inverse()` **includes the correct normalization** (`1/N` or `1/size`).
- `dispose()` is **idempotent**; calling it multiple times is safe.

#### `KissFftInstance` (1-D complex)

```ts
forward(input: Float32Array): Float32Array;                 // len 2*N
inverse(input: Float32Array): Float32Array;                 // len 2*N
dispose(): void;
```

#### `KissFftRealInstance` (1-D real, packed)

```ts
forward(input: Float32Array): Float32Array;                 // len N+2
forward(input: Float32Array, out: Float32Array): Float32Array;
inverse(input: Float32Array): Float32Array;                 // len N
inverse(input: Float32Array, out: Float32Array): Float32Array;
dispose(): void;
```

#### `KissFftNdInstance` (N-D complex)

```ts
readonly shape: number[];
readonly size: number;
forward(input: Float32Array): Float32Array;                 // len 2*size
forward(input: Float32Array, out: Float32Array): Float32Array;
inverse(input: Float32Array): Float32Array;                 // len 2*size
inverse(input: Float32Array, out: Float32Array): Float32Array;
dispose(): void;
```

#### `KissFftNdRealInstance` (N-D real, packed along last dim)

```ts
readonly shape: number[];
readonly size: number;
forward(input: Float32Array): Float32Array;                 // len size + 2*(size/last)
forward(input: Float32Array, out: Float32Array): Float32Array;
inverse(input: Float32Array): Float32Array;                 // len size
inverse(input: Float32Array, out: Float32Array): Float32Array;
dispose(): void;
```

---

## FFT basics (for newcomers)

If you’re new to FFTs, this section is for you. It covers **when to use `forward` vs `inverse`**, and **when to pick real vs complex, 1-D vs N-D**.

### Forward vs Inverse (what do they do?)

- **`forward`**: converts your data from the **time/space domain** to the **frequency domain** (a “spectrum”).
  Use this to **analyze frequencies** or to do **frequency-domain processing** (filtering, convolution, correlation).
- **`inverse`**: converts a spectrum **back** to time/space domain.
  Use this after you’ve modified a spectrum and want the **processed signal/image** back.

> In this library, all `inverse()` methods already include the correct normalization (`1/N` for 1-D, `1/size` for N-D). No extra scaling needed.

### Real vs Complex: which should I use?

Most raw signals (audio samples, grayscale pixels) are **real-valued**. When your **inputs are real**, prefer **real FFT** — it’s faster and uses less memory via **Hermitian packing**.

- **Real 1-D**: `createKissRealFft(N)`

  - Input length: `N` (**must be even**)
  - Output (packed): `N + 2` floats

- **Real N-D**: `createKissNdRealFft(shape)`

  - `last = shape[shape.length - 1]` **must be even**
  - Output (packed floats): `size + 2 * (size / last)`

Use **complex FFT** when:

- Your data is already **complex** (e.g., I/Q radio signals, analytic signals).
- You want to avoid the **even-length constraint** (1-D) or **even last dimension** (N-D real).
- You’re doing operations that **break Hermitian symmetry** and you plan to **stay complex** (not go back to real).

### 1-D vs N-D: how to choose?

- **1-D**: audio buffers, single time series.

  - Real: `createKissRealFft(N)`
  - Complex: `createKissFft(N)`

- **N-D**: images (2-D), volumes (3-D), tensors (k-D).

  - Real: `createKissNdRealFft([H, W])`, `createKissNdRealFft([D, H, W])`, …
  - Complex: `createKissNdFft(shape)`

> N-D real is **packed along the last dimension** only.

### Quick decision table

| Task / Data                                | Use this API                  | Notes                                                    |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------- |
| Audio spectrum / EQ on mono PCM            | `createKissRealFft(N)`        | N **must be even**; spectrum length is `N+2`             |
| Stereo PCM per-channel                     | `createKissRealFft(N)` twice  | One plan per channel or reuse the same plan sequentially |
| 2-D image blur/sharpen (grayscale)         | `createKissNdRealFft([H, W])` | `W` **must be even** (pad if needed)                     |
| 2-D image ops with odd width you can’t pad | `createKissNdFft([H, W])`     | Treat image as complex (imag=0)                          |
| I/Q (complex) DSP stream                   | `createKissFft(N)`            | Inputs/outputs are interleaved complex                   |
| 3-D correlation / convolution              | `createKissNdFft([D, H, W])`  | Forward → multiply (with conj) → inverse                 |

### What is “packed” (Hermitian) output?

Real inputs have symmetric spectra. To save space, we only store **DC..Nyquist** along the **last axis**:

- **1-D real**: packed length `N + 2` floats = `(N/2 + 1)` complex bins × 2.
- **N-D real**: packed floats
  `packedFloats(shape) = size + 2 * (size / last)`.

You can modify the packed spectrum safely in this form and call `inverse()` to get real output back. (DC and Nyquist bins have zero imaginary parts by symmetry—handled for you.)

### Typical workflows

**Analyze frequencies (audio, 1-D real):**

```ts
const rfft = createKissRealFft(N);
const Xp = rfft.forward(signal); // packed spectrum (N+2)
const mags = new Float32Array((N >> 1) + 1);
for (let k = 0; k < mags.length; k++) {
  const re = Xp[2 * k],
    im = Xp[2 * k + 1];
  mags[k] = Math.hypot(re, im);
}
rfft.dispose();
```

**Filter in frequency domain (image, 2-D real):**

```ts
const fft = createKissNdRealFft([H, W]); // W must be even
const spec = fft.forward(image); // packed along last dim
// ... zero / scale bins in `spec` as needed ...
const out = fft.inverse(spec); // filtered image (H*W)
fft.dispose();
```

**Convolution / correlation (N-D complex):**

```ts
const fft = createKissNdFft(shape);
const FA = fft.forward(A);
const FB = fft.forward(B);
// multiply with conjugate if correlation
for (let i = 0; i < FA.length; i += 2) {
  const ar = FA[i],
    ai = FA[i + 1]; // conj(FA)
  const br = FB[i],
    bi = FB[i + 1];
  C[i] = ar * br + ai * bi;
  C[i + 1] = -ar * bi + ai * br;
}
const result = fft.inverse(C);
fft.dispose();
```

**Pro tips to avoid surprises**

- **Pad to even** (`N` for 1-D real, `last` for N-D real) or use complex FFTs.
- **Window** signals (Hann/Hamming) before `forward()` to reduce spectral leakage.
- **Zero-pad** to increase spectral grid resolution (doesn’t add new info).
- **Reuse plans and out-buffers** for real-time performance.
- **Don’t rescale** after `inverse()` — it already includes normalization.

---

## Real-world examples

### 1) Audio spectrum (1-D real) with zero-padding and magnitude in dB

```ts
import { createKissRealFft, nextFastSize } from '@dekzer/kissfft';

// mono PCM frame (Float32) – any length
function spectrumDb(frame: Float32Array, sampleRate: number) {
  // Pad to a fast length
  const N = nextFastSize(frame.length | 0);
  const x = new Float32Array(N);
  x.set(frame, 0);

  const rfft = createKissRealFft(N);
  const Xp = rfft.forward(x); // length N+2 (packed)

  const bins = (N >> 1) + 1;
  const mags = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const re = Xp[2 * k + 0];
    const im = Xp[2 * k + 1];
    const mag = Math.hypot(re, im);
    // power → dBFS (add a tiny epsilon)
    mags[k] = 20 * Math.log10(mag / (N / 2 + 1) + 1e-12);
  }

  rfft.dispose();
  return { mags, binHz: sampleRate / N };
}
```

**Notes**

- We use `nextFastSize()` to get a friendly length for KISS FFT.
- Packed bins go from DC to Nyquist: `k = 0 … N/2` (inclusive), hence `(N/2+1)` bins.

---

### 2) 2-D image low-pass filtering (N-D real)

```ts
import { createKissNdRealFft } from '@dekzer/kissfft';

// grayscale image H×W (W must be even; pad or crop if necessary)
function lowPass2D(img: Float32Array, H: number, W: number, cutoffRatio: number) {
  if (W % 2) throw new Error('Width must be even for ND real FFT');

  const shape = [H, W];
  const size = H * W;
  const fft = createKissNdRealFft(shape);

  // forward (packed along last dim)
  const spec = fft.forward(img); // length = size + 2 * (size / W)

  // zero out high frequencies in-place:
  // keep frequencies where |u|/W < cutoffRatio and |v|/H < cutoffRatio
  const lines = size / W; // number of rows
  const half = (W >> 1) + 1; // bins along last dim in packed form
  const cx = cutoffRatio * half; // cutoff in packed bins
  const cy = cutoffRatio * (H / 2);

  for (let row = 0; row < lines; row++) {
    // vertical distance from DC
    const v = row % H;
    const dv = Math.min(v, H - v); // wrap-around distance
    for (let k = 0; k < half; k++) {
      const du = k; // 0..half-1 maps to |u| in packed axis
      const keep = du <= cx && dv <= cy;
      if (!keep) {
        const base = 2 * (row * half + k);
        spec[base + 0] = 0;
        spec[base + 1] = 0;
      }
    }
  }

  // inverse → filtered image
  const out = fft.inverse(spec); // length = size
  fft.dispose();
  return out;
}
```

**Notes**

- The packed layout collapses conjugate symmetry along the **last** dimension (`W`), so we filter in that coordinate system.
- If your source width is odd, pad a column before transforming (or use complex ND).

---

### 3) 3-D correlation / convolution via frequency domain (N-D complex)

```ts
import { createKissNdFft } from '@dekzer/kissfft';

// Correlate A with B in 3D: Xcorr = ifft( conj(fft(A)) * fft(B) )
function correlate3D(
  A: Float32Array, // complex interleaved len 2 * size
  B: Float32Array, // complex interleaved len 2 * size
  shape: [number, number, number],
) {
  const size = shape[0] * shape[1] * shape[2];
  if (A.length !== 2 * size || B.length !== 2 * size) {
    throw new Error('Expected interleaved length = 2 * size');
  }
  const fft = createKissNdFft(shape);

  const FA = fft.forward(A);
  const FB = fft.forward(B);

  // C = conj(FA) * FB  (elementwise complex multiply)
  const C = new Float32Array(2 * size);
  for (let i = 0; i < 2 * size; i += 2) {
    const are = FA[i + 0],
      aim = FA[i + 1];
    const bre = FB[i + 0],
      bim = FB[i + 1];
    C[i + 0] = are * bre + aim * bim; // (a - i b) * (c + i d) real
    C[i + 1] = -are * bim + aim * bre; // imag
  }

  // inverse (includes 1/size normalization)
  const xcorr = fft.inverse(C);
  fft.dispose();
  return xcorr; // complex, length 2 * size
}
```

---

### 4) Streaming / allocation-free loops with out-buffers

```ts
import { createKissRealFft } from '@dekzer/kissfft';

// Reuse plan + out-buffers for a real-time stream
const N = 2048;
const rfft = createKissRealFft(N);
const packedLen = N + 2;

// Preallocate output to avoid GC pressure
const X = new Float32Array(packedLen);
const temp = new Float32Array(N); // for inverse if you need it later

export function processFrame(input: Float32Array) {
  if (input.length !== N) throw new Error('frame size mismatch');
  // forward into X (out-buffer overload)
  rfft.forward(input, X);
  // ... do frequency-domain work in-place on X ...
  // inverse into temp
  rfft.inverse(X, temp);
}

// later
rfft.dispose();
```

---

## Parity with KISS FFT (WASM exports)

Internally, the WASM module provides the canonical KISS FFT C interfaces:

- 1-D complex:

  - `_kiss_fft_alloc(nfft, inverse_fft, mem, lenmem)`
  - `_kiss_fft(cfg, fin, fout)`

- 1-D real:

  - `_kiss_fftr_alloc(nfft, inverse_fft, mem, lenmem)`
  - `_kiss_fftr(cfg, timedata, freqdata)` // real → complex (packed)
  - `_kiss_fftri(cfg, freqdata, timedata)` // complex (packed) → real

- N-D complex:

  - `_kiss_fftnd_alloc(dimsPtr, ndims, inverse_fft, mem, lenmem)`
  - `_kiss_fftnd(cfg, fin, fout)`

- N-D real (packed along last dimension):

  - `_kiss_fftndr_alloc(dimsPtr, ndims, inverse_fft, mem, lenmem)`
  - `_kiss_fftndr(cfg, fin, fout)` // real → complex (packed)
  - `_kiss_fftndri(cfg, freqdata, timedata)` // complex (packed) → real

- Housekeeping:

  - `_kiss_fft_next_fast_size(n)`
  - `_kiss_fft_cleanup()`
  - `_malloc(size)`, `_free(ptr)`

You never call these directly—the factory functions above wrap them with safe typed arrays and buffer-size checks.

---

## Performance tips

- **Reuse plans**: keep an instance and call it many times (per size/shape).
- **Preallocate out-buffers** for zero-GC loops (see streaming example).
- **Choose friendly sizes** with `nextFastSize()` (especially for real-time).
- **Pad to even** for real transforms (1-D `N`, or N-D `last` dim).
- **Call `dispose()`** on instances you’re done with; also use `cleanupKissFft()` when you want to flush all cached plans.

---

## Testing & benches

```bash
pnpm test
pnpm bench
```

---

## License

This wrapper/bindings code is MIT © 2025 Maikel Eckelboom.

This package includes KISS FFT (https://github.com/mborgerding/kissfft),
licensed under the BSD 3-Clause. See
`THIRD_PARTY_LICENSES/KISSFFT-BSD-3-Clause.txt` and the top-level `NOTICE`
for details. This project is not affiliated with or endorsed by KISS FFT.
