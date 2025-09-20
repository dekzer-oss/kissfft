// emcripten/build.mjs
// Build KISS FFT WASM (scalar/SIMD) from a single JSON config.
// Usage:
//   node emcripten/build.mjs --both              // default: perf
//   node emcripten/build.mjs --simd
//   node emcripten/build.mjs --scalar
//   node emcripten/build.mjs --both --profile=size  // size-optimized variant
//
// Env:
//   EMCC=/path/to/emcc    (optional; defaults to 'emcc')

import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const EMCC = process.env.EMCC || 'emcc';
const args = process.argv.slice(2);

// what to build
const WANT_SIMD   = args.includes('--simd');
const WANT_SCALAR = args.includes('--scalar');
const WANT_BOTH   = args.includes('--both') || (!WANT_SIMD && !WANT_SCALAR);

// profile: perf (default) or size
const PROFILE = (() => {
  const flag = args.find(a => a.startsWith('--profile='));
  return flag ? flag.split('=')[1] : 'perf';
})();

const root = resolve(process.cwd());
const cfgPath = resolve(root, 'emcripten/wasm.config.json');

// ──────────────────────────────────────────────────────────────────────────────
// utils
function hdr(msg) {
  const bar = '─'.repeat(Math.max(0, 70 - msg.length));
  console.log(`\n${msg} ${bar}`);
}

function spawnp(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${code}`))));
  });
}

// normalize ["-s","FOO","-s","BAR"] style arrays
function pairify(arr) {
  return Array.isArray(arr) ? arr.flat() : [];
}

async function ensureDirFor(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// argument construction
function buildArgs(cfg, simd) {
  const outBase = cfg.outBase + (simd ? '-simd' : '');
  const outJs = resolve(root, `${outBase}.js`);

  const includeArgs = (cfg.includes || []).flatMap((p) => ['-I', resolve(root, p)]);
  const exportList = `EXPORTED_FUNCTIONS=${JSON.stringify(cfg.exports || [])}`;

  const cflags = [...(cfg.cflags || [])];
  if (simd) cflags.push('-msimd128');

  const emflags = pairify(cfg.emflags || []);

  // Profile-specific tweaks
  if (PROFILE === 'size') {
    // Prefer code size; keep CSP + ES6 module glue
    const i = cflags.indexOf('-O3');
    if (i >= 0) cflags.splice(i, 1);
    cflags.push('-Os');

    // Closure for smaller JS glue (safe with EXPORT_ES6 + MODULARIZE)
    emflags.push('--closure', '1');

    // If you later flip MINIMAL_RUNTIME=1 in cfg.emflags, verify tests first.
  }

  return [
    ...cflags,
    ...includeArgs,
    ...(cfg.sources || []).map((s) => resolve(root, s)),
    '-o', outJs,
    ...emflags,
    '-s', exportList,
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// one build
async function buildOne(cfg, simd) {
  const title = simd ? 'Building KISS FFT WASM (SIMD)' : 'Building KISS FFT WASM (scalar)';
  hdr(`${title} [${PROFILE}]`);

  const outBase = cfg.outBase + (simd ? '-simd' : '');
  const outJs = resolve(root, `${outBase}.js`);
  await ensureDirFor(outJs); // ensure e.g. ./build exists

  const argv = buildArgs(cfg, simd);
  await spawnp(EMCC, argv);

  console.log(`✅ ${outBase}.js / ${outBase}.wasm`);
}

// ──────────────────────────────────────────────────────────────────────────────
// main
(async () => {
  const cfg = JSON.parse(await readFile(cfgPath, 'utf-8'));

  if (WANT_BOTH) {
    await buildOne(cfg, true);
    await buildOne(cfg, false);
  } else {
    if (WANT_SIMD)   await buildOne(cfg, true);
    if (WANT_SCALAR) await buildOne(cfg, false);
  }
})().catch((e) => {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
});
