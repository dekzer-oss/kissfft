// src/common/simd.ts

/**
 * Feature-probe for WebAssembly SIMD support.
 * Returns true if the engine can compile a minimal SIMD module.
 */
export async function isWasmSimdSupported(): Promise<boolean> {
  if (!('WebAssembly' in globalThis)) return false;

  // Minimal valid SIMD module.
  const simdModule = new Uint8Array([
    0x00, 0x61, 0x73, 0x6D, // \0asm
    0x01, 0x00, 0x00, 0x00, // version 1
    0x01, 0x08, 0x01, 0x60, 0x00, 0x00, // type: (func) -> ()
    0x03, 0x02, 0x01, 0x00,             // func: 1 func of type 0
    0x0A, 0x09, 0x01, 0x07, 0x00,       // code: 1 body (size 7)
    0xFD, 0x00,                         // v128.const i32x4(0,0,0,0)
    0x1A,                               // drop
    0x0B,                               // end
  ]);

  try {
    await WebAssembly.compile(simdModule);
    return true;
  } catch {
    return false;
  }
}
