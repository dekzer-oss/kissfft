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
  /** Raw Float32 heap view into the WebAssembly linear memory. */
  HEAPF32: Float32Array;

  /** Raw Int32 heap view into the WebAssembly linear memory. */
  HEAP32: Int32Array;

  /* ────────────────────────────
   * 1-D complex
   * ──────────────────────────── */

  /**
   * Allocate a complex FFT configuration.
   * @param nfft Number of FFT bins
   * @param inverse_fft 0 for forward, 1 for inverse
   * @param mem Memory block pointer (0 to allocate internally)
   * @param lenmem Size of provided memory block (0 if mem=0)
   * @returns Pointer to FFT config
   */
  _kiss_fft_alloc(nfft: number, inverse_fft: number, mem: number, lenmem: number): number;

  /**
   * Perform complex→complex FFT or IFFT.
   * @param cfg Pointer to config returned by _kiss_fft_alloc
   * @param fin Pointer to input complex buffer (interleaved)
   * @param fout Pointer to output complex buffer (interleaved)
   */
  _kiss_fft(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * 1-D real (packed)
   * ──────────────────────────── */

  /**
   * Allocate a real FFT configuration.
   * @param nfft Number of FFT bins
   * @param inverse_fft 0 for forward (real→complex), 1 for inverse
   * @param mem Memory block pointer (0 to allocate internally)
   * @param lenmem Size of provided memory block (0 if mem=0)
   * @returns Pointer to real FFT config
   */
  _kiss_fftr_alloc(
    nfft: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Real→Complex (packed) forward FFT.
   * @param cfg Pointer to config from _kiss_fftr_alloc (inverse_fft=0)
   * @param timedata Pointer to real input samples (length N floats)
   * @param freqdata Pointer to packed complex spectrum (length N + 2 floats)
   */
  _kiss_fftr(cfg: number, timedata: number, freqdata: number): void;

  /**
   * Complex (packed)→Real inverse FFT.
   * @param cfg Pointer to config from _kiss_fftr_alloc (inverse_fft=1)
   * @param freqdata Pointer to packed complex spectrum (length N + 2 floats)
   * @param timedata Pointer to real output samples (length N floats)
   */
  _kiss_fftri(cfg: number, freqdata: number, timedata: number): void;

  /* ────────────────────────────
   * N-D complex
   * ──────────────────────────── */

  /**
   * Allocate an N-D complex FFT configuration.
   * @param dims Pointer to Int32 array of dimension sizes
   * @param ndims Number of dimensions
   * @param inverse_fft 0 for forward, 1 for inverse
   * @param mem Memory block pointer (0 to allocate internally)
   * @param lenmem Size of provided memory block (0 if mem=0)
   * @returns Pointer to N-D complex FFT config
   */
  _kiss_fftnd_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * N-D complex→complex transform (forward or inverse).
   * @param cfg Pointer to config from _kiss_fftnd_alloc
   * @param fin Pointer to input complex buffer (interleaved)
   * @param fout Pointer to output complex buffer (interleaved)
   */
  _kiss_fftnd(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * N-D real (Hermitian-packed along last dim)
   * ──────────────────────────── */

  /**
   * Allocate an N-D real FFT configuration.
   * @param dims Pointer to Int32 array of dimension sizes
   * @param ndims Number of dimensions
   * @param inverse_fft 0 for forward (real→complex), 1 for inverse
   * @param mem Memory block pointer (0 to allocate internally)
   * @param lenmem Size of provided memory block (0 if mem=0)
   * @returns Pointer to N-D real FFT config
   */
  _kiss_fftndr_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * N-D real→complex FORWARD transform (packed along last dim).
   * @param cfg Pointer to config from _kiss_fftndr_alloc (inverse_fft=0)
   * @param realdata Pointer to real input buffer (length = size floats)
   * @param freqdata Pointer to packed complex spectrum
   *                 (length = size + 2 * (size / lastDim) floats)
   */
  _kiss_fftndr(cfg: number, realdata: number, freqdata: number): void;

  /**
   * N-D complex (packed along last dim)→real INVERSE transform.
   * @param cfg Pointer to config from _kiss_fftndr_alloc (inverse_fft=1)
   * @param freqdata Pointer to packed complex spectrum
   *                 (length = size + 2 * (size / lastDim) floats)
   * @param timedata Pointer to real output buffer (length = size floats)
   */
  _kiss_fftndri(cfg: number, freqdata: number, timedata: number): void;

  /* ────────────────────────────
   * Memory & housekeeping
   * ──────────────────────────── */

  /**
   * Allocate a raw block of linear memory.
   * @param size Size in bytes
   * @returns Pointer to newly allocated block
   */
  _malloc(size: number): number;

  /**
   * Free a previously allocated memory block.
   * @param ptr Pointer returned by _malloc or an alloc function
   */
  _free(ptr: number): void;

  /**
   * Free all internal tables cached by KISS FFT.
   * (Does not free your own _malloc() blocks.)
   */
  _kiss_fft_cleanup(): void;

  /**
   * Return the next "fast" FFT size ≥ n (good small factors).
   * @param n Requested length
   * @returns Next fast size
   */
  _kiss_fft_next_fast_size(n: number): number;
}

/* ────────────────────────────
 * Public instance types
 * ──────────────────────────── */

/**
 * 1-D complex FFT instance.
 * Input and output are complex interleaved Float32 arrays (length = 2 * N).
 */
export interface KissFftInstance {
  /** Complex → Complex forward (output length = 2 * N). */
  forward(input: Float32Array): Float32Array;

  /** Complex → Complex inverse (output length = 2 * N). */
  inverse(input: Float32Array): Float32Array;

  /** Release all resources associated with this instance. */
  dispose(): void;
}

/**
 * 1-D real FFT instance (KISS packed spectrum).
 * Forward returns, and inverse accepts, a packed complex spectrum
 * of length N + 2 Float32 values.
 */
export interface KissFftRealInstance {
  /** Real → Complex (packed). Output length = N + 2. */
  forward(input: Float32Array): Float32Array;

  /** Complex (packed) → Real. Output length = N. */
  inverse(input: Float32Array): Float32Array;

  /** Release all resources associated with this instance. */
  dispose(): void;
}

/**
 * N-D complex FFT instance.
 * Input and output are complex interleaved arrays (length = 2 * size),
 * where size = ∏ shape[i].
 */
export interface KissFftNdInstance {
  /** Original N-D shape. */
  readonly shape: number[];

  /** Total element count (product of dims). */
  readonly size: number;

  /** Complex N-D forward; output length = 2 * size. */
  forward(input: Float32Array): Float32Array;

  /** Optional out-buffer overload (must be length 2 * size). */
  forward(input: Float32Array, out: Float32Array): Float32Array;

  /** Complex N-D inverse with 1/size normalization; output length = 2 * size. */
  inverse(input: Float32Array): Float32Array;

  /** Optional out-buffer overload (must be length 2 * size). */
  inverse(input: Float32Array, out: Float32Array): Float32Array;

  /** Free WASM buffers and decrement plan refcounts. Idempotent. */
  dispose(): void;
}

/**
 * N-D real FFT instance (Hermitian-packed along last dimension).
 *
 * Forward returns, and inverse accepts, a packed complex spectrum of
 * length: packedFloats(shape) = size + 2 * (size / lastDim),
 * where size = ∏ shape[i] and lastDim = shape[shape.length - 1].
 */
export interface KissFftNdRealInstance {
  /** Original N-D shape. */
  readonly shape: number[];

  /** Total real elements = ∏ shape[i]. */
  readonly size: number;

  /** Real → Complex (packed). Output length = packedFloats(shape). */
  forward(input: Float32Array): Float32Array;

  /** Optional out-buffer overload (length = packedFloats(shape)). */
  forward(input: Float32Array, out: Float32Array): Float32Array;

  /** Complex (packed) → Real (includes 1/size normalization). Output length = size. */
  inverse(input: Float32Array): Float32Array;

  /** Optional out-buffer overload (length = size). */
  inverse(input: Float32Array, out: Float32Array): Float32Array;

  /** Free WASM buffers and decrement plan refcounts. Idempotent. */
  dispose(): void;
}
