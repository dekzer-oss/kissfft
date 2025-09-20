// src/loader.browser.ts
/**
 * Browser loader: lazy-imports the Emscripten glue so bundlers
 * don't try to parse Node-ish code inside it. We point the glue
 * at the correct .wasm via locateFile.
 */

import type { KissFftWasmModule } from './types';

interface EmscriptenInit {
  locateFile?: (path: string, prefix: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}

type ModuleFactory = (opts: EmscriptenInit) => Promise<KissFftWasmModule>;

export interface BrowserLoaderOptions {
  /** Force SIMD selection (skips feature detection elsewhere). */
  preferSimd?: boolean;
  /** Override .wasm URLs (absolute/relative URL strings). */
  wasmPaths?: {
    simd?: string | URL;
    scalar?: string | URL;
  };
}

/** Resolve to a string URL regardless of input type. */
function toUrlString(u: string | URL): string {
  return typeof u === 'string' ? u : u.toString();
}

/** Build-time glue locations (kept out of the bundle by @vite-ignore). */
const SIMDX_JS_URL = new URL('../build/dekzer-kissfft-simd.js', import.meta.url);
const SCALAR_JS_URL = new URL('../build/dekzer-kissfft.js', import.meta.url);

/** Default co-located .wasm next to the glue files. */
const SIMDX_WASM_URL = new URL('../build/dekzer-kissfft-simd.wasm', import.meta.url);
const SCALAR_WASM_URL = new URL('../build/dekzer-kissfft.wasm', import.meta.url);

/**
 * Loads the KISS FFT WASM module in browsers with strict typing.
 * Name matches internal imports: `import { loadKissFft } from '@/browser'`.
 */
export async function loadKissFft(
  opts?: BrowserLoaderOptions
): Promise<KissFftWasmModule> {
  const wantSimd = !!opts?.preferSimd;

  if (wantSimd) {
    // Dynamically import the Emscripten glue; prevent bundlers from touching it.
    const mod = (await import(/* @vite-ignore */ SIMDX_JS_URL.toString())) as {
      default: ModuleFactory;
    };
    const wasmUrl = opts?.wasmPaths?.simd ?? SIMDX_WASM_URL;
    return mod.default({
      locateFile: (path) =>
        path.endsWith('.wasm') ? toUrlString(wasmUrl) : path,
    });
  }

  const mod = (await import(/* @vite-ignore */ SCALAR_JS_URL.toString())) as {
    default: ModuleFactory;
  };
  const wasmUrl = opts?.wasmPaths?.scalar ?? SCALAR_WASM_URL;
  return mod.default({
    locateFile: (path) =>
      path.endsWith('.wasm') ? toUrlString(wasmUrl) : path,
  });
}

// Optional alias for compatibility with earlier naming
export const loadKissfftWasmBrowser = loadKissFft;
export type { KissFftWasmModule } from './types';
