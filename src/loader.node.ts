// Node: try SIMD glue first, then scalar. We inject wasmBinary directly.
import type { KissFftWasmModule } from './types';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nodeBuild = resolve(here, '../build/node');

async function loadVia(baseName: string): Promise<KissFftWasmModule> {
  const gluePath = resolve(nodeBuild, `${baseName}.js`);
  const wasmPath = resolve(nodeBuild, `${baseName}.wasm`);
  const wasmBinary = await readFile(wasmPath);

  const glueMod = await import(pathToFileURL(gluePath).href);
  const createModule = (glueMod.default ?? glueMod) as (opts: any) => Promise<KissFftWasmModule>;

  return createModule({ wasmBinary });
}

export async function loadKissFft(): Promise<KissFftWasmModule> {
  try {
    return await loadVia('dekzer-kissfft-simd');
  } catch {
    return loadVia('dekzer-kissfft');
  }
}
