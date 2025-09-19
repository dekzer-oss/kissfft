import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Emscripten ES module factory (MODULARIZE + EXPORT_ES6)
import createModule from '../build/kissfft-wasm.js';
import type { KissFftWasmModule } from '@/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = resolve(__dirname, '../build/kissfft-wasm.wasm');
const wasmBinary = readFileSync(wasmPath);

export function loadKissFft(): Promise<KissFftWasmModule> {
  return createModule({
    wasmBinary,
    locateFile: (p: string) => (p.endsWith('.wasm') ? wasmPath : p),
  }) as unknown as Promise<KissFftWasmModule>;
}

export default loadKissFft;
