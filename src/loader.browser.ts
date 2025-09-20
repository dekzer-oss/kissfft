// Browser: try SIMD glue first, then scalar. No flags, no logs, just fallback.
import type { KissFftWasmModule } from './types';

async function loadVia(glueRel: string, wasmRel: string): Promise<KissFftWasmModule> {
  const glueUrl = new URL(glueRel, import.meta.url).href;
  const wasmUrl = new URL(wasmRel, import.meta.url).href;

  // Tell Emscripten where to fetch the wasm from.
  // @vite-ignore: glueUrl is computed at runtime on purpose.
  const createModule = (await import(/* @vite-ignore */ glueUrl)).default as
    (opts: any) => Promise<KissFftWasmModule>;

  return createModule({
    locateFile: (p: string) => (p.endsWith('.wasm') ? wasmUrl : p),
  });
}

export async function loadKissFft(): Promise<KissFftWasmModule> {
  // SIMD first
  try {
    return await loadVia(
      '../build/web/dekzer-kissfft-simd.js',
      '../build/web/dekzer-kissfft-simd.wasm',
    );
  } catch {
    // Scalar fallback
    return loadVia(
      '../build/web/dekzer-kissfft.js',
      '../build/web/dekzer-kissfft.wasm',
    );
  }
}
