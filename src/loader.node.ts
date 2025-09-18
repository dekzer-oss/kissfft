import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.join(__dirname, '../build/kissfft-wasm.wasm');
const jsPath = '../build/kissfft-wasm.js';

export async function loadKissFft() {
  const wasmBinary = await readFile(wasmPath);
  const { default: createModule } = await import(jsPath) ;
  return await createModule({
    wasmBinary
  });
}
