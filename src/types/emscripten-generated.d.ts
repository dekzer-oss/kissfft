import type { KissFftWasmModule } from "./types";

export interface EmscriptenInitOptions {
  locateFile?: (path: string) => string;
  wasmBinary?: ArrayBuffer;
}

export type CreateModule = (opts?: EmscriptenInitOptions) => Promise<KissFftWasmModule>;

// Declarations for the generated glue files
declare module "../build/web/dekzer-kissfft.js" {
  const createModule: CreateModule;
  export default createModule;
}
declare module "../build/web/dekzer-kissfft-simd.js" {
  const createModule: CreateModule;
  export default createModule;
}

declare module "../build/node/dekzer-kissfft.js" {
  const createModule: CreateModule;
  export default createModule;
}
declare module "../build/node/dekzer-kissfft-simd.js" {
  const createModule: CreateModule;
  export default createModule;
}
