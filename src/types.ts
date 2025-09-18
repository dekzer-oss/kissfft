/**
 * Complete WebAssembly-compiled KISS FFT module interface.
 * Provides access to linear memory and all exported FFT entry points.
 *
 * Notes on data layout:
 * - Complex values are always interleaved Float32: [re0, im0, re1, im1, ...].
 * - 1-D real FFT uses the standard KISS "packed" spectrum (length N + 2 floats).
 * - N-D real FFT is Hermitian-packed along the LAST dimension:
 *     packedFloats(shape) = size + 2 * (size / lastDim)
 *   where size = ∏ shape[i] and lastDim = shape[shape.length - 1].
 */
export interface KissFftWasmModule {
  /** Raw views into the WebAssembly linear memory. */
  HEAPF32: Float32Array;
  HEAP32: Int32Array;

  /* ────────────────────────────
   * 1-D complex
   * ──────────────────────────── */

  /**
   * Allocates a complex FFT configuration.
   * C: kiss_fft_alloc(int nfft, int inverse_fft, void* mem, size_t* lenmem)
   * - Set mem = 0 and lenmem = 0 to let the library allocate.
   */
  _kiss_fft_alloc(nfft: number, inverse_fft: number, mem: number, lenmem: number): number;

  /**
   * Complex FFT / IFFT.
   * C: kiss_fft(cfg, const kiss_fft_cpx* fin, kiss_fft_cpx* fout)
   * - fin/fout are interleaved complex buffers [re, im, ...].
   */
  _kiss_fft(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * 1-D real (packed)
   * ──────────────────────────── */

  /**
   * Allocates a real FFT configuration (nfft must be even).
   * C: kiss_fftr_alloc(int nfft, int inverse_fft, void* mem, size_t* lenmem)
   */
  _kiss_fftr_alloc(
    nfft: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Real → Complex (packed) forward.
   * C: kiss_fftr(cfg, const kiss_fft_scalar* timedata, kiss_fft_cpx* freqdata)
   * - timedata: N real scalars
   * - freqdata: N/2+1 complex bins (interleaved re,im)
   */
  _kiss_fftr(cfg: number, timedata: number, freqdata: number): void;

  /**
   * Complex (packed) → Real inverse.
   * C: kiss_fftri(cfg, const kiss_fft_cpx* freqdata, kiss_fft_scalar* timedata)
   * - freqdata: N/2+1 complex bins
   * - timedata: N real scalars
   */
  _kiss_fftri(cfg: number, freqdata: number, timedata: number): void;

  /* ────────────────────────────
   * N-D complex
   * ──────────────────────────── */

  /**
   * Allocates an N-D complex FFT configuration.
   * C: kiss_fftnd_alloc(const int* dims, int ndims, int inverse_fft, void* mem, size_t* lenmem)
   * - dims points to an array of dimension sizes.
   */
  _kiss_fftnd_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * N-D complex FFT / IFFT.
   * C: kiss_fftnd(cfg, const kiss_fft_cpx* fin, kiss_fft_cpx* fout)
   */
  _kiss_fftnd(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * N-D real (packed on last dimension)
   * ──────────────────────────── */

  /**
   * Allocates an N-D real FFT configuration.
   * C: kiss_fftndr_alloc(const int* dims, int ndims, int inverse_fft, void* mem, size_t* lenmem)
   * - dims[0] (the real axis) must be even.
   */
  _kiss_fftndr_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Real → Complex (packed along last dimension) forward.
   * C: kiss_fftndr(cfg, const kiss_fft_scalar* timedata, kiss_fft_cpx* freqdata)
   */
  _kiss_fftndr(cfg: number, timedata: number, freqdata: number): void;

  /**
   * Complex (packed along last dimension) → Real inverse.
   * C: kiss_fftndri(cfg, const kiss_fft_cpx* freqdata, kiss_fft_scalar* timedata)
   */
  _kiss_fftndri(cfg: number, freqdata: number, timedata: number): void;

  /* ────────────────────────────
   * Memory & housekeeping
   * ──────────────────────────── */

  /** C: void* malloc(size_t size) */
  _malloc(size: number): number;

  /** C: void free(void* ptr) */
  _free(ptr: number): void;

  /** C: void kiss_fft_cleanup(void) */
  _kiss_fft_cleanup(): void;

  /** C: int kiss_fft_next_fast_size(int n) */
  _kiss_fft_next_fast_size(n: number): number;
}

/* ────────────────────────────
 * Public instance types
 * ──────────────────────────── */

/**
 * 1-D complex FFT instance.
 *
 * - Buffers use interleaved complex layout: `[re0, im0, re1, im1, …]`.
 * - `inverse()` **includes 1/N normalization** so `inverse(forward(x)) ≈ x`.
 * - Reuse the same instance for many calls to benefit from the cached plan.
 */
export interface KissFftInstance {
  /**
   * Complex → Complex forward transform.
   * @param input Interleaved complex input of length `2 * N`.
   * @returns Interleaved complex spectrum of length `2 * N`.
   * @throws If `input.length !== 2 * N`.
   * @example
   * const y = fft.forward(x); // x,y length = 2*N
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Complex → Complex inverse transform (includes `1/N` normalization).
   * @param input Interleaved complex spectrum of length `2 * N`.
   * @returns Interleaved complex output of length `2 * N`.
   * @throws If `input.length !== 2 * N`.
   * @example
   * const x2 = fft.inverse(y); // x2 ≈ original x
   */
  inverse(input: Float32Array): Float32Array;

  /**
   * Releases internal WASM buffers and decrements the plan’s refcount.
   * Safe to call multiple times; subsequent calls are no-ops.
   */
  dispose(): void;
}

/**
 * 1-D real FFT instance (Hermitian-packed spectrum).
 *
 * - Real input length is `N` (must be even).
 * - Packed complex spectrum length is `N + 2` floats
 *   (`N/2 + 1` complex bins × 2 floats/bin).
 * - `inverse()` **includes 1/N normalization**.
 */
export interface KissFftRealInstance {
  /**
   * Real → Complex (packed) forward transform.
   * @param input Real input of length `N` (even).
   * @returns Packed complex spectrum of length `N + 2`.
   * @throws If `input.length !== N`.
   * @example
   * const Y = rfft.forward(x); // x len N → Y len N+2 (packed)
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Complex (packed) → Real inverse transform (includes `1/N` normalization).
   * @param input Packed complex spectrum of length `N + 2`.
   * @returns Real output of length `N`.
   * @throws If `input.length !== N + 2`.
   * @example
   * const x2 = rfft.inverse(Y); // x2 len N
   */
  inverse(input: Float32Array): Float32Array;

  /** Frees internal buffers and cached resources (idempotent). */
  dispose(): void;
}

/**
 * N-D complex FFT instance.
 *
 * - `shape` is the original tensor shape; `size = ∏ shape[i]`.
 * - All complex buffers use interleaved layout and have length `2 * size`.
 * - `inverse()` **includes 1/size normalization**.
 * - Overloads allow you to provide an output buffer of the correct length
 *   to avoid allocations.
 */
export interface KissFftNdInstance {
  /** Original N-D shape. */
  readonly shape: number[];
  /** Total element count, `size = ∏ shape[i]`. */
  readonly size: number;

  /**
   * Complex N-D forward transform.
   * @param input Interleaved complex input of length `2 * size`.
   * @returns Interleaved complex spectrum of length `2 * size`.
   * @throws If `input.length !== 2 * size`.
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Complex N-D forward transform (into a preallocated buffer).
   * @param input Interleaved complex input of length `2 * size`.
   * @param out Interleaved complex output buffer of length `2 * size`.
   * @returns The same `out` buffer.
   * @throws If buffer lengths don’t match `2 * size`.
   */
  forward(input: Float32Array, out: Float32Array): Float32Array;

  /**
   * Complex N-D inverse transform (includes `1/size` normalization).
   * @param input Interleaved complex spectrum of length `2 * size`.
   * @returns Interleaved complex output of length `2 * size`.
   * @throws If `input.length !== 2 * size`.
   */
  inverse(input: Float32Array): Float32Array;

  /**
   * Complex N-D inverse transform (into a preallocated buffer).
   * @param input Interleaved complex spectrum of length `2 * size`.
   * @param out Interleaved complex output buffer of length `2 * size`.
   * @returns The same `out` buffer.
   * @throws If buffer lengths don’t match `2 * size`.
   */
  inverse(input: Float32Array, out: Float32Array): Float32Array;

  /** Frees internal buffers and decrements plan refcounts (idempotent). */
  dispose(): void;
}

/**
 * N-D real FFT instance (Hermitian-packed along the **last** dimension).
 *
 * - `shape = [d0, d1, …, d_{k-1}]` with `last = shape[k-1]` (**must be even**).
 * - Real domain tensor has `size = ∏ shape[i]` floats.
 * - Packed complex spectrum length (in floats) is:
 *   `packedFloats(shape) = size + 2 * (size / last)`.
 *   (There are `size/last` lines; each packs `last/2 + 1` complex bins.)
 * - `inverse()` **includes 1/size normalization**.
 * - Overloads accept an output buffer to avoid allocations.
 */
export interface KissFftNdRealInstance {
  /** Original N-D shape (last dimension even). */
  readonly shape: number[];
  /** Total real-domain elements, `size = ∏ shape[i]`. */
  readonly size: number;

  /**
   * Real N-D → Complex (packed) forward transform.
   * @param input Real input of length `size`.
   * @returns Packed complex spectrum of length `size + 2 * (size / last)`.
   * @throws If `input.length !== size`.
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Real N-D → Complex (packed) forward transform (pre-allocated output).
   * @param input Real input of length `size`.
   * @param out Packed complex output buffer of length `size + 2 * (size / last)`.
   * @returns The same `out` buffer.
   * @throws If lengths don’t match the required sizes.
   */
  forward(input: Float32Array, out: Float32Array): Float32Array;

  /**
   * Complex (packed) N-D → Real inverse transform (includes `1/size` normalization).
   * @param input Packed complex spectrum of length `size + 2 * (size / last)`.
   * @returns Real output of length `size`.
   * @throws If `input.length` doesn’t equal the packed length.
   */
  inverse(input: Float32Array): Float32Array;

  /**
   * Complex (packed) N-D → Real inverse transform (pre-allocated output).
   * @param input Packed complex spectrum of length `size + 2 * (size / last)`.
   * @param out Real output buffer of length `size`.
   * @returns The same `out` buffer.
   * @throws If lengths don’t match the required sizes.
   */
  inverse(input: Float32Array, out: Float32Array): Float32Array;

  /** Frees internal buffers and decrements plan refcounts (idempotent). */
  dispose(): void;
}
