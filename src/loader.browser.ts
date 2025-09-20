import { isWasmSimdSupported } from './common/simd';
import type { KissFftWasmModule } from './types';

// Allow overriding where the .wasm is hosted (CDN, asset pipeline)
let assetBaseOverride: string | undefined;
let simdProbePromise: Promise<boolean> | null = null;

export function setKissFftAssetBase(baseUrl: string) {
  assetBaseOverride = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

// Declare the glue files as a **closed set** the bundler can analyze.
const GLUE = {
  simd: '../build/web/dekzer-kissfft-simd.js',
  scalar: '../build/web/dekzer-kissfft.js',
} as const;

type Create = (opts: {
  locateFile?: (p: string) => string;
  wasmBinary?: ArrayBuffer;
}) => Promise<KissFftWasmModule>;

const glueImports = import.meta.glob<{
  default: Create;
}>(['../build/web/dekzer-kissfft-simd.js', '../build/web/dekzer-kissfft.js']);

function resolve(kind: keyof typeof GLUE) {
  const wasmName = kind === 'simd' ? 'dekzer-kissfft-simd.wasm' : 'dekzer-kissfft.wasm';
  const glueKey = GLUE[kind];

  const wasmUrl = assetBaseOverride
    ? `${assetBaseOverride}${wasmName}`
    : new URL(`../build/web/${wasmName}`, import.meta.url).href;

  return { glueKey, wasmUrl };
}

export async function loadKissFft(): Promise<KissFftWasmModule> {
  if (!simdProbePromise) simdProbePromise = isWasmSimdSupported();
  const simd = await simdProbePromise;

  const kind: keyof typeof GLUE = simd ? 'simd' : 'scalar';
  const { glueKey, wasmUrl } = resolve(kind);

  const importFn = glueImports[glueKey];
  if (!importFn) throw new Error(`dekzer-kissfft: missing glue entry "${glueKey}"`);

  const { default: createModule } = await importFn();
  return createModule({
    locateFile: (p) => (p.endsWith('.wasm') ? wasmUrl : p),
  });
}

// Warm the HTTP cache (SPA routing feels instant)
export async function preloadKissFft(opts?: {
  prefer?: 'auto' | 'simd' | 'scalar';
  signal?: AbortSignal;
}): Promise<void> {
  const prefer = opts?.prefer ?? 'auto';

  let simd: boolean = false;
  if (prefer === 'auto') {
    if (!simdProbePromise) simdProbePromise = isWasmSimdSupported();
    simd = await simdProbePromise;
  } else {
    simd = prefer === 'simd';
  }

  const kind: keyof typeof GLUE = simd ? 'simd' : 'scalar';
  const { glueKey, wasmUrl } = resolve(kind);

  // Preload the glue module
  const glueUrl = new URL(glueKey, import.meta.url).href;
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = glueUrl;
    document.head.appendChild(link);

    // Hint the browser that a WASM fetch is coming
    const w = document.createElement('link');
    w.rel = 'preload';
    w.as = 'fetch';
    // type attr isn’t standardized for fetch, but harmless—and some CDNs key on it:
    w.setAttribute('type', 'application/wasm');
    w.href = wasmUrl;
    document.head.appendChild(w);
  }

  // Warm the WASM response cache (works in workers too)
  try {
    await fetch(wasmUrl, { signal: opts?.signal });
  } catch {
    /* ignore */
  }
}
