/**
 * Complete WebAssembly-compiled KISS FFT module interface.
 * Provides access to memory and all available FFT functions.
 */
export interface KissFftWasmModule {
  /** The raw Float32 heap view into the WebAssembly linear memory. */
  HEAPF32: Float32Array;

  /** The raw Int32 heap view into the WebAssembly linear memory. */
  HEAP32: Int32Array;

  /* ────────────────────────────
   * 1-D complex
   * ──────────────────────────── */
  _kiss_fft_alloc(nfft: number, inverse_fft: number, mem: number, lenmem: number): number;
  _kiss_fft(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * 1-D real
   * ──────────────────────────── */
  _kiss_fftr_alloc(nfft: number, inverse_fft: number, mem: number, lenmem: number): number;
  _kiss_fftr(cfg: number, timedata: number, freqdata: number): void;   // real → complex (packed)
  _kiss_fftri(cfg: number, freqdata: number, timedata: number): void;  // complex (packed) → real

  /* ────────────────────────────
   * N-D complex
   * ──────────────────────────── */
  _kiss_fftnd_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;
  _kiss_fftnd(cfg: number, fin: number, fout: number): void;

  /* ────────────────────────────
   * N-D real  (packed along last dim)
   * ──────────────────────────── */
  _kiss_fftndr_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /** real → complex (packed along last dimension) */
  _kiss_fftndr(cfg: number, fin: number, fout: number): void;

  /** complex (packed along last dimension) → real */
  _kiss_fftndri(cfg: number, freqdata: number, timedata: number): void;

  /* ────────────────────────────
   * Memory & housekeeping
   * ──────────────────────────── */
  _malloc(size: number): number;
  _free(ptr: number): void;
  _kiss_fft_cleanup(): void;
  _kiss_fft_next_fast_size(n: number): number;
}

/* ────────────────────────────
 * Public instance types
 * ──────────────────────────── */

export interface KissFftInstance {
  /** Complex → Complex forward (input & output len = 2 * N). */
  forward(input: Float32Array): Float32Array;
  /** Complex → Complex inverse (input & output len = 2 * N). */
  inverse(input: Float32Array): Float32Array;
  /** Releases all resources associated with this instance. */
  dispose(): void;
}

export interface KissFftRealInstance {
  /** Real → Complex (packed). Output len = N + 2. */
  forward(input: Float32Array): Float32Array;
  /** Complex (packed) → Real. Output len = N. */
  inverse(input: Float32Array): Float32Array;
  dispose(): void;
}

export interface KissFftNdInstance {
  /** Original N-D shape and total element count (product of dims). */
  readonly shape: number[];
  readonly size: number;
  /** Complex N-D forward (interleaved [re, im]); len = 2 * size. */
  forward(input: Float32Array): Float32Array;
  /** Optional out-buffer overload (must be length 2 * size). */
  forward(input: Float32Array, out: Float32Array): Float32Array;
  /** Complex N-D inverse with 1/size normalization; len = 2 * size. */
  inverse(input: Float32Array): Float32Array;
  /** Optional out-buffer overload (must be length 2 * size). */
  inverse(input: Float32Array, out: Float32Array): Float32Array;
  dispose(): void;
}

/**
 * N-D real FFT instance (Hermitian-packed along last dimension)
 * – Forward returns/Inverse accepts a packed complex spectrum:
 *   packedFloats(shape) = size + 2 * (size / lastDim)
 * where size = ∏ shape[i], lastDim = shape[shape.length-1].
 */
export interface KissFftNdRealInstance {
  readonly shape: number[];
  readonly size: number;

  /** Real → Complex (packed). Output len = packedFloats(shape). */
  forward(input: Float32Array): Float32Array;
  /** Optional out-buffer overload (len = packedFloats(shape)). */
  forward(input: Float32Array, out: Float32Array): Float32Array;

  /** Complex (packed) → Real. Output len = size. */
  inverse(input: Float32Array): Float32Array;
  /** Optional out-buffer overload (len = size). */
  inverse(input: Float32Array, out: Float32Array): Float32Array;

  dispose(): void;
}
