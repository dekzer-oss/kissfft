import type { KissFftWasmModule } from './types';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultNodeBuild = resolve(here, '../build/node');

let nodeAssetDirOverride: string | undefined;

/**
 * Optional: override where the Node glue/wasm live (e.g., custom deploy path).
 *
 * Example:
 *   setKissFftNodeAssetDir('/opt/app/shared/kissfft/node');
 *
 * You can also use the environment variable:
 *   DEKZER_KISSFFT_DIR=/abs/path/to/build/node
 */
export function setKissFftNodeAssetDir(dir: string) {
  nodeAssetDirOverride = dir;
}

function nodeAssetDir(): string {
  return process.env.DEKZER_KISSFFT_DIR || nodeAssetDirOverride || defaultNodeBuild;
}

async function loadVia(baseName: string): Promise<KissFftWasmModule> {
  const base = nodeAssetDir();
  const gluePath = resolve(base, `${baseName}.js`);
  const wasmPath = resolve(base, `${baseName}.wasm`);

  let wasmBinary: Buffer;
  try {
    wasmBinary = await readFile(wasmPath);
  } catch (err) {
    const where = `\nMissing wasm at: ${wasmPath}`;
    const hint = `\nHint: setKissFftNodeAssetDir('/abs/path/to/build/node') or export DEKZER_KISSFFT_DIR=/abs/path`;
    throw new Error(
      `dekzer-kissfft: failed to read wasm (${baseName})${where}${hint}\nOriginal: ${String(err)}`,
    );
  }

  const glueMod = await import(pathToFileURL(gluePath).href);
  const createModule = (glueMod.default ?? glueMod) as (
    opts: any,
  ) => Promise<KissFftWasmModule>;

  try {
    return await createModule({ wasmBinary });
  } catch (err) {
    const where = `\nTried glue=${gluePath}\n      wasm=${wasmPath}`;
    const hint = `\nHint: ensure files exist and match the build profile (SIMD vs scalar) or set DEKZER_KISSFFT_DIR.`;
    throw new Error(
      `dekzer-kissfft: failed to initialize (${baseName})${where}${hint}\nOriginal: ${String(err)}`,
    );
  }
}

export async function loadKissFft(): Promise<KissFftWasmModule> {
  try {
    return await loadVia('dekzer-kissfft-simd');
  } catch {
    return loadVia('dekzer-kissfft'); // scalar fallback
  }
}
