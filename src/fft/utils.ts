// src/fft/utils.ts

/** Size of a 32-bit float in bytes */
export const BYTES_F32 = Float32Array.BYTES_PER_ELEMENT;

/** Emscripten "nonnull" pointer check (0 == null) */
export function isValidPointer(ptr: number | undefined): boolean {
  return typeof ptr === 'number' && (ptr | 0) !== 0;
}

/** Convert a byte pointer to an index in HEAPF32 */
export function toF32(ptr: number): number {
  // Float32Array element is 4 bytes → shift right by 2
  return ptr >>> 2;
}

/** Throw a clear error if a malloc/new plan failed */
export function checkAllocation(ptr: number, what: string): void {
  if (!isValidPointer(ptr)) {
    throw new Error(`Failed to allocate ${what}`);
  }
}

/**
 * Validate a Float32Array length for a given call site.
 * Keeps error messages crisp and consistent across modules.
 */
export function validateInputLength(
  arr: Float32Array,
  expected: number,
  label: string,
): void {
  if (!(arr instanceof Float32Array)) {
    throw new Error(`${label}: expected Float32Array input`);
  }
  if (arr.length !== expected) {
    throw new Error(`${label}: expected length ${expected}, got ${arr.length}`);
  }
}

/**
 * Pads odd-length real signals by +1 sample (zero) for real-FFT plans that require even N.
 * Even lengths are returned as-is. Provides an unpad helper (copy) back to the original length.
 */
export function handleOddLengthRealFft(data: Float32Array): {
  paddedData: Float32Array;
  originalLength: number;
  unpadData: (result: Float32Array) => Float32Array;
} {
  const originalLength = data.length | 0;

  // Even: identity.
  if ((originalLength & 1) === 0) {
    return {
      paddedData: data,
      originalLength,
      unpadData: (x: Float32Array) => x,
    };
  }

  // Odd: pad by one with a zero.
  const paddedData = new Float32Array(originalLength + 1);
  paddedData.set(data);
  paddedData[originalLength] = 0;

  return {
    paddedData,
    originalLength,
    unpadData: (out: Float32Array) => out.slice(0, originalLength),
  };
}

/**
 * Maps each ND dimension through `nextFastSize` to get FFT-friendly sizes.
 * Accepts an injected `nextFastSize` to keep this util pure/sync.
 */
export function nextFastShape(
  shape: readonly number[],
  nextFastSize: (n: number) => number | Promise<number>,
): number[] | Promise<number[]> {
  if (!Array.isArray(shape) || shape.length === 0) {
    throw new Error('nextFastShape: shape must be a non-empty array');
  }

  // Support both sync and async nextFastSize without forcing async.
  const maybePromises = shape.map((dim, i) => {
    const d = dim | 0;
    if (d <= 0) throw new Error(`nextFastShape: invalid dim at index ${i}: ${d}`);
    return nextFastSize(d);
  });

  const hasPromise = maybePromises.some((v) => v instanceof Promise);
  if (!hasPromise) {
    return maybePromises as number[];
  }
  return Promise.all(maybePromises as Promise<number>[]);
}

// ----- in src/fft/utils.ts -----
// keep your other exports above (BYTES_F32, isValidPointer, toF32, checkAllocation, etc.)

/** Metadata describing one attempted allocation. */
export interface AllocationSpec {
  /** Non-zero pointer returned by _malloc / plan alloc. */
  ptr: number;
  /** Optional size in BYTES, for diagnostics only. */
  size?: number;
  /** Optional human label (e.g., "dims", "input", "output"). */
  label?: string;
}

/**
 * Ensure all allocations succeeded.
 * If any failed, free all valid ones (best-effort) and throw once with context.
 */
export function safeMemoryAllocation(
  mod: {
    _free: (ptr: number) => void;
  },
  allocations: ReadonlyArray<AllocationSpec>,
  context?: string, // ← new optional parameter
): void {
  const failed = allocations.find((a) => !isValidPointer(a.ptr));
  if (!failed) return;

  // Best-effort cleanup of those that did succeed
  for (const a of allocations) {
    if (isValidPointer(a.ptr)) {
      try {
        mod._free(a.ptr);
      } catch {
        /* ignore */
      }
    }
  }

  // Nice, compact diagnostics
  const details = allocations
    .map((a) => {
      const tag = a.label ? `${a.label}:` : '';
      const ok = isValidPointer(a.ptr) ? 'ok' : 'FAIL';
      const sz = a.size ? ` ${a.size}B` : '';
      return `${tag}${ok}${sz}`;
    })
    .join(', ');

  throw new Error(
    `WASM memory allocation failed${context ? ` in ${context}` : ''} — ${details}`,
  );
}

/** Allocate raw bytes. Does not throw; pair with `safeMemoryAllocation`. */
export function mallocBytes(
  mod: { _malloc: (n: number) => number },
  bytes: number,
  label?: string,
): AllocationSpec {
  const ptr = mod._malloc(bytes | 0);
  return { ptr, size: bytes | 0, label };
}

/** Allocate Float32 storage (`len` elements). Does not throw; use `safeMemoryAllocation`. */
export function mallocF32(
  mod: { _malloc: (n: number) => number },
  len: number,
  label?: string,
): AllocationSpec {
  const bytes = (len | 0) * BYTES_F32;
  const ptr = mod._malloc(bytes);
  return { ptr, size: bytes, label };
}
