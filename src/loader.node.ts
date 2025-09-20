import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isWasmSimdSupported } from './common/simd';
import type { KissFftWasmModule } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadKissFft(): Promise<KissFftWasmModule> {
  const useSimd = await isWasmSimdSupported();
  const base = useSimd ? 'kissfft-wasm-simd' : 'kissfft-wasm';
  const wasmPath = resolve(__dirname, `../build/${base}.wasm`);
  const jsPath   = resolve(__dirname, `../build/${base}.js`);

  const wasmBinary = await readFile(wasmPath);
  const { default: createModule } = await import(pathToFileURL(jsPath).href);
  return (createModule as any)({ wasmBinary }) as Promise<KissFftWasmModule>;
}
