// emcripten/build.mjs
// Deterministic Emscripten builder with smart caching.
// - Stamps live under build/.stamps/{env}/... (tidy)
// - --force     : rebuild regardless of cache
// - --no-cache  : bypass cache checks for this run
// - --stamp=none: no stamp files; mtime-only caching
//
// Reads emscripten/wasm.config.json:
// {
//   "outBase": "build/dekzer-kissfft",  // basename (no -simd), "build/" prefix optional
//   "sources": ["vendor/kissfft/kiss_fft.c", ...],
//   "includes": ["vendor/kissfft"],
//   "cflags": ["-O3"],
//   "emflags": ["-s","MODULARIZE=1","-s","EXPORT_ES6=1", ...],
//   "exports": ["_malloc","_free", ...] // C symbols
// }

import { mkdir, readFile, readdir, stat, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const cfgPath = resolve(__dirname, 'wasm.config.json');
const selfPath = fileURLToPath(import.meta.url);

const EMCC = process.env.EMCC || 'emcc';

// ── CLI flags ─────────────────────────────────────────────────────────────────
const WANT_SIMD   = process.argv.includes('--simd');
const WANT_SCALAR = process.argv.includes('--scalar');
const WANT_BOTH   = process.argv.includes('--both') || (!WANT_SIMD && !WANT_SCALAR);

const PROFILE = process.argv.find((a) => a.startsWith('--profile='))?.split('=')[1] || 'perf'; // perf|size
const ENVSEL  = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1]     || 'both'; // browser|node|both

const FORCE    = process.argv.includes('--force');
const NOCACHE  = process.argv.includes('--no-cache');
const STAMP_MODE = process.argv.find(a => a.startsWith('--stamp='))?.split('=')[1] || 'file'; // file|none

// ── utils ─────────────────────────────────────────────────────────────────────
function hdr(msg) {
  const w = 70;
  console.log(`${msg} ${'─'.repeat(Math.max(1, w - msg.length))}`);
}

function spawnp(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${code}`))));
  });
}

function pairify(arr) {
  return Array.isArray(arr) ? arr.flat() : [];
}

async function ensureDirFor(p) {
  await mkdir(dirname(p), { recursive: true });
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function latestMTime(p) {
  try {
    const s = await stat(p);
    if (!s.isDirectory()) return s.mtimeMs;

    let latest = s.mtimeMs;
    const entries = await readdir(p, { withFileTypes: true });
    for (const e of entries) {
      const fp = resolve(p, e.name);
      latest = Math.max(latest, await latestMTime(fp));
    }
    return latest;
  } catch {
    return 0;
  }
}

function sha16(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

// ── build config helpers ──────────────────────────────────────────────────────
function buildArgs(cfg, { simd, env }) {
  const includeArgs = (cfg.includes || []).flatMap((p) => ['-I', resolve(root, p)]);
  const exportList  = `EXPORTED_FUNCTIONS=${JSON.stringify(cfg.exports || [])}`;

  const cflags = [...(cfg.cflags || [])];
  if (simd) cflags.push('-msimd128');

  // Strip any ENVIRONMENT in emflags; we inject based on target env.
  const emflags = pairify(cfg.emflags || []).filter((x, i, arr) => {
    if (x === '-s' && /^ENVIRONMENT=/.test(arr[i + 1] || '')) return false;
    if (/^ENVIRONMENT=/.test(x)) return false;
    return true;
  });

  emflags.push('-s', env === 'browser' ? 'ENVIRONMENT=web,worker' : 'ENVIRONMENT=node');

  if (PROFILE === 'size') {
    const i = cflags.indexOf('-O3');
    if (i >= 0) cflags.splice(i, 1);
    if (!cflags.includes('-Os')) cflags.push('-Os');
    emflags.push('--closure', '1');
  }

  return { cflags, includeArgs, emflags, exportList };
}

function outBaseFor(cfg, { simd, env }) {
  const base = cfg.outBase.replace(/^build\//, '');
  const dir  = env === 'browser' ? 'build/web' : 'build/node';
  return `${dir}/${base}${simd ? '-simd' : ''}`;
}

async function gatherInputs(cfg) {
  const sources    = (cfg.sources  || []).map((s) => resolve(root, s));
  const includeDirs= (cfg.includes || []).map((p) => resolve(root, p));
  return { sources, includeDirs };
}

async function computeInputsLatestMTime(cfg) {
  const { sources, includeDirs } = await gatherInputs(cfg);
  const times = [
    await latestMTime(cfgPath),
    await latestMTime(selfPath),
    ...(await Promise.all(sources.map(latestMTime))),
    ...(await Promise.all(includeDirs.map(latestMTime))),
  ];
  return Math.max(...times);
}

// Centralized stamp location (tidy, easy to clean with `rimraf build`)
const STAMP_ROOT = resolve(root, 'build/.stamps');

function stampPathFor(cfg, { simd, env }) {
  const base = cfg.outBase.replace(/^build\//, '');
  const name = `${base}${simd ? '-simd' : ''}.json`;
  return resolve(STAMP_ROOT, `${env}/${name}`);
}

async function readStamp(p) {
  try { return JSON.parse(await readFile(p, 'utf-8')); } catch { return null; }
}

async function writeStamp(p, data) {
  await ensureDirFor(p);
  await writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

async function shouldSkipBuild(cfg, opts, outJs, outWasm, stampPath, args) {
  if (FORCE || NOCACHE) return false;

  const jsExists   = await exists(outJs);
  const wasmExists = await exists(outWasm);
  if (!jsExists || !wasmExists) return false;

  const outJsStat   = await stat(outJs);
  const outWasmStat = await stat(outWasm);
  const outputsOlderThan = Math.min(outJsStat.mtimeMs, outWasmStat.mtimeMs);

  const latestInput = await computeInputsLatestMTime(cfg);
  if (outputsOlderThan <= latestInput) return false;

  if (STAMP_MODE === 'none') {
    // mtime-only caching
    return true;
  }

  const stampPrev = await readStamp(stampPath);
  const stampNow = {
    profile: PROFILE,
    env:     opts.env,
    simd:    !!opts.simd,
    cflags:  args.cflags,
    emflags: args.emflags,
    exportList:  args.exportList,
    includeArgs: args.includeArgs,
    cfgHash: sha16(await readFile(cfgPath, 'utf-8')),
    emcc:    EMCC,
  };

  return !!stampPrev && JSON.stringify(stampPrev) === JSON.stringify(stampNow);
}

// ── build target ──────────────────────────────────────────────────────────────
async function buildOne(cfg, { simd, env }) {
  const title = `Building KISS FFT WASM (${simd ? 'SIMD' : 'scalar'}) [${env}]`;
  hdr(`${title} [${PROFILE}]`);

  const outBase = outBaseFor(cfg, { simd, env });
  const outJs   = resolve(root, `${outBase}.js`);
  const outWasm = resolve(root, `${outBase}.wasm`);
  const stamp   = stampPathFor(cfg, { simd, env });

  await ensureDirFor(outJs);

  const a = buildArgs(cfg, { simd, env });

  if (await shouldSkipBuild(cfg, { simd, env }, outJs, outWasm, stamp, a)) {
    console.log(`⏭️  cache hit → ${outBase}.js / ${outBase}.wasm`);
    return;
  }

  const argv = [
    ...(a.cflags || []),
    ...(a.includeArgs || []),
    ...(cfg.sources || []).map((s) => resolve(root, s)),
    '-o', outJs,
    ...(a.emflags || []),
    '-s', a.exportList,
  ];

  await spawnp(EMCC, argv);

  if (STAMP_MODE !== 'none') {
    await writeStamp(stamp, {
      profile: PROFILE,
      env,
      simd: !!simd,
      cflags: a.cflags,
      emflags: a.emflags,
      exportList:  a.exportList,
      includeArgs: a.includeArgs,
      cfgHash: sha16(await readFile(cfgPath, 'utf-8')),
      emcc: EMCC,
    });
  }

  console.log(`✅ ${outBase}.js / ${outBase}.wasm`);
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  const cfg = JSON.parse(await readFile(cfgPath, 'utf-8'));
  const envs = ENVSEL === 'both' ? ['browser', 'node'] : [ENVSEL];

  for (const env of envs) {
    if (WANT_BOTH || WANT_SIMD)   await buildOne(cfg, { simd: true,  env });
    if (WANT_BOTH || WANT_SCALAR) await buildOne(cfg, { simd: false, env });
  }
})().catch((e) => {
  console.error('❌ Build failed:', e.stack || e.message);
  process.exit(1);
});
