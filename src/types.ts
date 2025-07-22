/**
 * Complete WebAssembly-compiled KISS FFT module interface.
 * Provides access to memory and all available FFT functions.
 */
export interface KissFftWasmModule {
  /**
   * The raw Float32 heap view into the WebAssembly linear memory.
   */
  HEAPF32: Float32Array;

  /**
   * The raw Int32 heap view into the WebAssembly linear memory.
   */
  HEAP32: Int32Array;

  /**
   * Allocates a complex FFT configuration object.
   * @param nfft - Number of FFT bins
   * @param inverse_fft - 0 for forward transform, 1 for inverse
   * @param mem - Memory block pointer (0 for allocation)
   * @param lenmem - Memory block size (0 for allocation)
   * @returns Pointer to an FFT config object
   */
  _kiss_fft_alloc(nfft: number, inverse_fft: number, mem: number, lenmem: number): number;

  /**
   * Performs a complex-to-complex FFT or inverse FFT.
   * @param cfg - Pointer to FFT config
   * @param fin - Input buffer pointer (interleaved real/imag)
   * @param fout - Output buffer pointer (interleaved real/imag)
   */
  _kiss_fft(cfg: number, fin: number, fout: number): void;

  /* ───────────────────────────────────────────────────────
   * 1-D real
   * ─────────────────────────────────────────────────────── */

  /**
   * Allocates a real FFT configuration object.
   * @param nfft - Number of FFT bins
   * @param inverse_fft - 0 for forward real FFT, 1 for inverse
   * @param mem - Memory block pointer (0 for allocation)
   * @param lenmem - Memory block size (0 for allocation)
   * @returns Pointer to a real FFT config object
   */
  _kiss_fftr_alloc(
    nfft: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Performs a real-to-complex FFT.
   * @param cfg - Pointer to FFT config
   * @param timedata - Real input samples pointer
   * @param freqdata - Output complex spectrum pointer
   */
  _kiss_fftr(cfg: number, timedata: number, freqdata: number): void;

  /**
   * Performs a complex-to-real inverse FFT.
   * @param cfg - Pointer to FFT config
   * @param freqdata - Input complex spectrum pointer
   * @param timedata - Output real samples pointer
   */
  _kiss_fftri(cfg: number, freqdata: number, timedata: number): void;

  /* ───────────────────────────────────────────────────────
   * N-D complex
   * ─────────────────────────────────────────────────────── */

  /**
   * Allocates an n-dimensional complex FFT configuration.
   * @param dims - Pointer to dimension sizes array
   * @param ndims - Number of dimensions
   * @param inverse_fft - 0 for forward, 1 for inverse
   * @param mem - Memory block pointer (0 for allocation)
   * @param lenmem - Memory block size (0 for allocation)
   * @returns Pointer to n-dimensional FFT config
   */
  _kiss_fftnd_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Performs an n-dimensional complex FFT.
   * @param cfg - Pointer to n-dimensional FFT config
   * @param fin - Input complex data pointer
   * @param fout - Output complex data pointer
   */
  _kiss_fftnd(cfg: number, fin: number, fout: number): void;

  /**
   * Allocates an n-dimensional real FFT configuration.
   * @param dims - Pointer to dimension sizes array
   * @param ndims - Number of dimensions
   * @param inverse_fft - 0 for forward, 1 for inverse
   * @param mem - Memory block pointer (0 for allocation)
   * @param lenmem - Memory block size (0 for allocation)
   * @returns Pointer to n-dimensional real FFT config
   */
  _kiss_fftndr_alloc(
    dims: number,
    ndims: number,
    inverse_fft: number,
    mem: number,
    lenmem: number,
  ): number;

  /**
   * Performs an n-dimensional real **forward** FFT.
   * @param cfg - Pointer to n-dimensional real FFT config
   * @param fin - Input real data pointer
   * @param fout - Output complex data pointer
   */
  _kiss_fftndr(cfg: number, fin: number, fout: number): void;

  /**
   * Performs an n-dimensional real **inverse** FFT (complex → real).
   * _This complements `_kiss_fftndr` and is newly exported for parity._
   * @param cfg - Pointer to n-dimensional real FFT config
   * @param freqdata - Input complex spectrum pointer
   * @param timedata - Output real samples pointer
   */
  _kiss_fftndri(cfg: number, freqdata: number, timedata: number): void;

  /**
   * Allocates memory inside the WebAssembly module.
   * @param size - Size in bytes to allocate
   * @returns Pointer to allocated memory block
   */
  _malloc(size: number): number;

  /**
   * Frees a previously allocated memory block.
   * @param ptr - Pointer to memory block to free
   */
  _free(ptr: number): void;

  /**
   * Cleans up all internal resources used by the KISS FFT module.
   * Should be called when the module is no longer needed.
   */
  _kiss_fft_cleanup(): void;
}

export interface KissFftRealInstance {
  /**
   * Computes forward FFT of real-valued input.
   * @param input - Real input array (length = N)
   * @returns Complex spectrum (length = N + 2)
   */
  forwardReal(input: Float32Array): Float32Array;

  /**
   * Computes inverse FFT of complex spectrum to real output.
   * @param input - Complex spectrum (length = N + 2)
   * @returns Real output array (length = N)
   */
  inverseReal(input: Float32Array): Float32Array;

  /**
   * Releases all resources associated with this instance.
   */
  dispose(): void;
}

export interface KissFftNdInstance {
  /** Shape of the N-dimensional data. */
  readonly shape: number[];
  /** Total number of elements in the N-dimensional data. */
  readonly size: number;

  /**
   * Computes forward FFT of N-dimensional complex input.
   * @param input - Complex input (length = 2 × size)
   * @returns Complex spectrum (length = 2 × size)
   */
  forwardNd(input: Float32Array): Float32Array;

  /**
   * Computes inverse FFT of N-dimensional complex spectrum.
   * @param input - Complex spectrum (length = 2 × size)
   * @returns Complex output (length = 2 × size)
   */
  inverseNd(input: Float32Array): Float32Array;

  /** Releases all resources associated with this instance. */
  dispose(): void;
}

export interface KissFftNdRealInstance {
  /** Shape of the N-dimensional data. */
  readonly shape: number[];
  /** Total number of elements in the N-dimensional data. */
  readonly size: number;

  /**
   * Computes forward real FFT for N-dimensional data.
   * @param input - Real input array (length = size)
   * @returns Full complex spectrum (length = 2 × size)
   */
  forwardNdReal(input: Float32Array): Float32Array;

  /**
   * Computes the inverse complex-to-real FFT, returning the original
   * real-domain tensor (up to numerical error).
   * Scaling matches the 1-D API: **no. 1/size normalization** is applied.
   * @param input - Full complex spectrum (interleaved, length = 2 × size)
   * @returns Real output tensor (length = size)
   */
  inverseNdReal(input: Float32Array): Float32Array;

  /** Releases all resources associated with this instance. */
  dispose(): void;
}

export interface KissFftInstance {
  /**
   * Computes forward FFT of complex input.
   * @param input - Complex input (length = 2 × N)
   * @returns Complex spectrum (length = 2 × N)
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Computes inverse FFT of complex spectrum.
   * @param input - Complex spectrum (length = 2 × N)
   * @returns Complex output (length = 2 × N)
   */
  inverse(input: Float32Array): Float32Array;

  /** Releases all resources associated with this instance. */
  dispose(): void;
}
