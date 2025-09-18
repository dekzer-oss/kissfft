import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { KissFftWasmModule } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadKissFft(): Promise<KissFftWasmModule> {
  const wasmPath = resolve(__dirname, '../build/kissfft-wasm.wasm');
  const jsPath   = resolve(__dirname, '../build/kissfft-wasm.js');

  const wasmBinary = await readFile(wasmPath);
  const { default: createModule } = await import(pathToFileURL(jsPath).href);

  const mod: KissFftWasmModule = await createModule({ wasmBinary });
  return mod;
}
