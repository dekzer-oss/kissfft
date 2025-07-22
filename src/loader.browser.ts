import createKissFftModule from '../build/kissfft-wasm.js';
import wasmUrl from '../build/kissfft-wasm.wasm?url';
import type { KissFftWasmModule } from './types';

let modulePromise: Promise<KissFftWasmModule> | undefined;

export function loadKissFft(): Promise<KissFftWasmModule> {
  if (!modulePromise) {
    modulePromise = createKissFftModule({
      locateFile: (file:string) => (file.endsWith('.wasm') ? wasmUrl : file),
    }) as Promise<KissFftWasmModule>;
  }
  return modulePromise;
}
