import createSimd from '../build/kissfft-wasm-simd.js';
import simdWasmUrl from '../build/kissfft-wasm-simd.wasm?url';
import createScalar from '../build/kissfft-wasm.js';
import scalarWasmUrl from '../build/kissfft-wasm.wasm?url';
import { isWasmSimdSupported } from './common/simd';
import type { KissFftWasmModule } from './types';
import type { CreateModule } from './types/emscripten-generated';

let modulePromise: Promise<KissFftWasmModule> | undefined;

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    const useSimd = await isWasmSimdSupported();
    const factory: CreateModule = useSimd ? createSimd : createScalar;
    const wasmUrl = useSimd ? simdWasmUrl : scalarWasmUrl;

    modulePromise = factory({
      locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : file),
    }).then((mod) => {
      // Defensive: fail early if instantiation didn't complete
      if (!mod.HEAPF32 || typeof mod._kiss_fft_next_fast_size !== 'function') {
        throw new Error('kissfft wasm not initialized or missing exports');
      }
      return mod;
    });
  }
  return modulePromise;
}
