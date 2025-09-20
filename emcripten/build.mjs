// emcripten/build.mjs
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const cfgPath = resolve(__dirname, 'wasm.config.json');

const EMCC = process.env.EMCC || 'emcc';

// CLI flags
const WANT_SIMD = process.argv.includes('--simd');
const WANT_SCALAR = process.argv.includes('--scalar');
const WANT_BOTH = process.argv.includes('--both') || (!WANT_SIMD && !WANT_SCALAR);

const PROFILE =
  process.argv.find((a) => a.startsWith('--profile='))?.split('=')[1] || 'perf';
const ENVSEL = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] || 'both'; // browser|node|both

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

// normalize ["-s","FOO","-s","BAR"] style arrays
function pairify(arr) {
  return Array.isArray(arr) ? arr.flat() : [];
}

async function ensureDirFor(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

// Build args per env + simd
function buildArgs(cfg, { simd, env }) {
  const includeArgs = (cfg.includes || []).flatMap((p) => ['-I', resolve(root, p)]);
  const exportList = `EXPORTED_FUNCTIONS=${JSON.stringify(cfg.exports || [])}`;

  const cflags = [...(cfg.cflags || [])];
  if (simd) cflags.push('-msimd128');

  // Base emflags from config, but strip any ENVIRONMENT and re-inject
  const emflags = pairify(cfg.emflags || []).filter((x, i, arr) => {
    // remove "-s","ENVIRONMENT=..." pairs if present
    if (x === '-s' && /^ENVIRONMENT=/.test(arr[i + 1] || '')) return false;
    if (/^ENVIRONMENT=/.test(x)) return false;
    return true;
  });

  emflags.push('-s', env === 'browser' ? 'ENVIRONMENT=web,worker' : 'ENVIRONMENT=node');

  if (PROFILE === 'size') {
    const i = cflags.indexOf('-O3');
    if (i >= 0) cflags.splice(i, 1);
    cflags.push('-Os');
    emflags.push('--closure', '1');
  }

  return { cflags, includeArgs, emflags, exportList };
}

function outBaseFor(cfg, { simd, env }) {
  const base = cfg.outBase.replace(/^build\//, '');
  const dir = env === 'browser' ? 'build/web' : 'build/node';
  return `${dir}/${base}${simd ? '-simd' : ''}`;
}

async function buildOne(cfg, { simd, env }) {
  const title = `Building KISS FFT WASM (${simd ? 'SIMD' : 'scalar'}) [${env}]`;
  hdr(`${title} [${PROFILE}]`);

  const outBase = outBaseFor(cfg, { simd, env });
  const outJs = resolve(root, `${outBase}.js`);
  await ensureDirFor(outJs);

  const a = buildArgs(cfg, { simd, env });
  const argv = [
    ...a.cflags,
    ...a.includeArgs,
    ...(cfg.sources || []).map((s) => resolve(root, s)),
    '-o',
    outJs,
    ...a.emflags,
    '-s',
    a.exportList,
  ];

  await spawnp(EMCC, argv);
  console.log(`✅ ${outBase}.js / ${outBase}.wasm`);
}

(async () => {
  const cfg = JSON.parse(await readFile(cfgPath, 'utf-8'));
  const envs = ENVSEL === 'both' ? ['browser', 'node'] : [ENVSEL];

  for (const env of envs) {
    if (WANT_BOTH || WANT_SIMD) await buildOne(cfg, { simd: true, env });
    if (WANT_BOTH || WANT_SCALAR) await buildOne(cfg, { simd: false, env });
  }
})().catch((e) => {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
});
