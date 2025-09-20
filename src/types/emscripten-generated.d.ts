import type { KissFftWasmModule } from "./types";

export interface EmscriptenInitOptions {
  locateFile?: (path: string) => string;
  wasmBinary?: ArrayBuffer;
}

export type CreateModule = (opts?: EmscriptenInitOptions) => Promise<KissFftWasmModule>;

// Declarations for the generated glue files
declare module "../build/kissfft-wasm.js" {
  const createModule: CreateModule;
  export default createModule;
}
declare module "../build/kissfft-wasm-simd.js" {
  const createModule: CreateModule;
  export default createModule;
}
