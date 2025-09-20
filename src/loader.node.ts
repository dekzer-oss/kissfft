/**
 * Node loader: keeps node:* imports, reads WASM from dist/ by default.
 */
import { readFile as nodeReadFile } from 'node:fs/promises';
import createSimdModuleUntyped from '../build/kissfft-wasm-simd.js';
import createScalarModuleUntyped from '../build/kissfft-wasm.js';
import type { KissFftWasmModule } from './types';

interface EmscriptenInit {
  locateFile?: (path: string, prefix: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}
type ModuleFactory = (opts: EmscriptenInit) => Promise<KissFftWasmModule>;
const createSimdModule = createSimdModuleUntyped as ModuleFactory;
const createScalarModule = createScalarModuleUntyped as ModuleFactory;

export interface NodeLoaderOptions {
  /** Force SIMD selection (skips feature detection). */
  preferSimd?: boolean;
  /** Override WASM file locations (absolute fs path or file: URL). */
  wasmPaths?: {
    simd?: string | URL;
    scalar?: string | URL;
  };
  /** Custom reader for testing/sandboxed FS. Defaults to fs.promises.readFile. */
  readFile?: (path: string | URL) => Promise<Uint8Array>;
}

/**
 * Loads the KISS FFT WASM module in Node with strict typing.
 * Name matches internal imports: `import { loadKissFft } from '@/loader'`.
 */
export async function loadKissFft(
  opts?: NodeLoaderOptions
): Promise<KissFftWasmModule> {
  const wantSimd = !!opts?.preferSimd;
  const readFile = opts?.readFile ?? (p => nodeReadFile(p) as unknown as Promise<Uint8Array>);

  if (wantSimd) {
    const wasmUrl = opts?.wasmPaths?.simd ?? new URL('./kissfft-wasm-simd.wasm', import.meta.url);
    const wasm = await readFile(wasmUrl);
    return createSimdModule({ wasmBinary: wasm });
  }

  const wasmUrl = opts?.wasmPaths?.scalar ?? new URL('./kissfft-wasm.wasm', import.meta.url);
  const wasm = await readFile(wasmUrl);
  return createScalarModule({ wasmBinary: wasm });
}

// Optional alias for compatibility with earlier naming
export const loadKissfftWasmNode = loadKissFft;
export type { KissFftWasmModule } from './types';
