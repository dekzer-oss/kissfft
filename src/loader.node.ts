/**
 * Node loader: always reads WASM from ../build.
 * Normalizes Buffer/Uint8Array → ArrayBuffer for Emscripten.
 */

import { readFile as nodeReadFile } from 'node:fs/promises';
import createSimdModuleUntyped from '../build/node/dekzer-kissfft-simd.js';
import createScalarModuleUntyped from '../build/node/dekzer-kissfft.js';

import type { KissFftWasmModule } from './types';

interface EmscriptenInit {
  locateFile?: (path: string, prefix: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}

type ModuleFactory = (opts: EmscriptenInit) => Promise<KissFftWasmModule>;
const createSimdModule = createSimdModuleUntyped as ModuleFactory;
const createScalarModule = createScalarModuleUntyped as ModuleFactory;

export interface NodeLoaderOptions {
  /** Force SIMD selection (skips feature detection). */
  preferSimd?: boolean;
  /** Optional absolute fs path or file: URL to the WASM file. */
  wasmPaths?: {
    simd?: string | URL;
    scalar?: string | URL;
  };
  /** Custom reader for tests/sandbox. Defaults to fs.promises.readFile. */
  readFile?: (path: string | URL) => Promise<Uint8Array>;
}

type Flavor = 'scalar' | 'simd';
const FILENAME: Record<Flavor, string> = {
  scalar: 'dekzer-kissfft.wasm',
  simd: 'dekzer-kissfft-simd.wasm',
};

function defaultUrl(flavor: Flavor): URL {
  return new URL(`../build/node/${FILENAME[flavor]}`, import.meta.url);
}

function toArrayBuffer(view: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (view instanceof ArrayBuffer) return view;
  const { buffer, byteOffset, byteLength } = view;
  return buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer;
}

async function readBytes(
  readFile: (p: string | URL) => Promise<Uint8Array>,
  flavor: Flavor,
  override?: string | URL,
): Promise<ArrayBuffer> {
  const target = override ?? defaultUrl(flavor);
  try {
    const bytes = await readFile(target);
    return toArrayBuffer(bytes);
  } catch (e: any) {
    const where = target instanceof URL ? target.href : String(target);
    if (e?.code === 'ENOENT') {
      throw new Error(
        `KISS FFT WASM not found at ${where}. Build the WASM first (e.g., pnpm run build:wasm:both).`,
      );
    }
    throw e;
  }
}

async function loadFlavor(
  flavor: Flavor,
  opts?: NodeLoaderOptions,
): Promise<KissFftWasmModule> {
  const readFile =
    opts?.readFile ?? ((p) => nodeReadFile(p) as unknown as Promise<Uint8Array>);
  const wasmBinary = await readBytes(readFile, flavor, opts?.wasmPaths?.[flavor]);
  return (flavor === 'simd' ? createSimdModule : createScalarModule)({ wasmBinary });
}

/** Public entry: scalar by default for rock-solid Node; opt-in SIMD via preferSimd. */
export async function loadKissFft(opts?: NodeLoaderOptions): Promise<KissFftWasmModule> {
  return opts?.preferSimd ? loadFlavor('simd', opts) : loadFlavor('scalar', opts);
}

export type { KissFftWasmModule } from './types';
