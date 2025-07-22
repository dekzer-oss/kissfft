/**
 * Bytes per `Float32` value.
 */
export const BYTES_F32 = 4;

/**
 * Converts a pointer to a `Float32Array` index.
 * @param ptr - The pointer to convert.
 * @returns The index in the `HEAPF32` view.
 */
export function toF32(ptr: number): number {
  return ptr >>> 2;
}

/**
 * Checks if a WebAssembly pointer is valid (non-zero).
 * @param ptr - The pointer to check.
 * @returns `true` if valid, `false` otherwise.
 */
export function isValidPointer(ptr: number): boolean {
  return ptr !== 0 && ptr !== null && ptr !== undefined;
}

/**
 * Validates a memory allocation.
 * @param ptr  - Pointer to validate.
 * @param name - Allocation name (for error reporting).
 * @returns The same pointer if valid.
 * @throws If allocation failed.
 */
export function checkAllocation(ptr: number, name: string): number {
  if (!isValidPointer(ptr)) {
    throw new Error(`Memory allocation failed for ${name}`);
  }
  return ptr;
}

/**
 * Safely validates multiple allocations and frees any that succeeded
 * if a later one failed.
 * @param mod         - WASM module.
 * @param allocations - Allocation records (`{ptr,size}`).
 * @throws If _any_ allocation failed.
 */
export function safeMemoryAllocation(
  mod: any,
  allocations: { ptr: number; size: number }[],
): void {
  for (const alloc of allocations) {
    if (!isValidPointer(alloc.ptr)) {
      for (const prev of allocations) {
        if (isValidPointer(prev.ptr) && prev.ptr !== alloc.ptr) {
          mod._free(prev.ptr);
        }
      }
      throw new Error(`Memory allocation failed for ${alloc.size} bytes`);
    }
  }
}

/**
 * Validates that the given `input.length` matches `expected`.
 * @param input     - Input array-like.
 * @param expected  - Expected length.
 * @param operation - Name of the operation (for error reporting).
 * @throws If the lengths differ.
 */
export function validateInputLength(
  input: ArrayLike<number>,
  expected: number,
  operation: string,
): void {
  if (input.length !== expected) {
    throw new Error(`${operation}: wrong length`);
  }
}
