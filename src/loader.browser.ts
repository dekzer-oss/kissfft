/**
 * Browser loader: picks SIMD when available, otherwise scalar.
 * Emits both WASM assets into dist/ via Vite ?url and wires locateFile.
 */
import simdWasmUrl from '../build/kissfft-wasm-simd.wasm?url';
import scalarWasmUrl from '../build/kissfft-wasm.wasm?url';

import createSimdModuleUntyped from '../build/kissfft-wasm-simd.js';
import createScalarModuleUntyped from '../build/kissfft-wasm.js';

import { isWasmSimdSupported } from './common/simd';
import type { KissFftWasmModule } from './types';

interface EmscriptenInit {
  locateFile?: (path: string, prefix: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}
type ModuleFactory = (opts: EmscriptenInit) => Promise<KissFftWasmModule>;
const createSimdModule = createSimdModuleUntyped as ModuleFactory;
const createScalarModule = createScalarModuleUntyped as ModuleFactory;

export interface BrowserLoaderOptions {
  /** Force SIMD selection (skips feature detection). */
  preferSimd?: boolean;
  /** Override asset URLs if hosting WASM elsewhere. */
  wasmUrls?: {
    simd?: string;
    scalar?: string;
  };
}

/**
 * Loads the KISS FFT WASM module for browsers with strict typing.
 * Exported name matches internal imports: `import { loadKissFft } from '@/loader'`.
 */
export async function loadKissFft(
  opts?: BrowserLoaderOptions
): Promise<KissFftWasmModule> {
  const useSimd = typeof opts?.preferSimd === 'boolean'
    ? opts.preferSimd
    : await isWasmSimdSupported();

  if (useSimd) {
    const url = opts?.wasmUrls?.simd ?? simdWasmUrl;
    return createSimdModule({
      locateFile: (path, prefix) => (path.endsWith('.wasm') ? url : prefix + path),
    });
  }

  const url = opts?.wasmUrls?.scalar ?? scalarWasmUrl;
  return createScalarModule({
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? url : prefix + path),
  });
}

// Optional alias for power users who saw earlier naming
export const loadKissfftWasm = loadKissFft;
export type { KissFftWasmModule } from './types';
