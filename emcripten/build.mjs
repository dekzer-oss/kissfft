// /emcripten/build.mjs
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const EMCC = process.env.EMCC || "emcc";
const args = process.argv.slice(2);

const wantSimd = args.includes("--simd");
const wantScalar = args.includes("--scalar");
const wantBoth = args.includes("--both") || (!wantSimd && !wantScalar);

const root = resolve(".");
const cfgPath = resolve(root, "emcripten/wasm.config.json");

function hdr(msg) {
  const bar = "─".repeat(Math.max(0, 70 - msg.length));
  console.log(`\n${msg} ${bar}`);
}

function spawnp(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${code}`))));
  });
}

function pairify(arr) { return arr.flat(); }

function buildArgs(cfg, simd) {
  const outBase = cfg.outBase + (simd ? "-simd" : "");
  const outJs = resolve(root, `${outBase}.js`);

  const includeArgs = (cfg.includes || []).flatMap((p) => ["-I", resolve(root, p)]);
  const exportList = `EXPORTED_FUNCTIONS=${JSON.stringify(cfg.exports || [])}`;

  const cflags = [...(cfg.cflags || [])];
  if (simd) cflags.push("-msimd128");

  const emflags = pairify(cfg.emflags || []);

  return [
    ...cflags,
    ...includeArgs,
    ...cfg.sources.map((s) => resolve(root, s)),
    "-o", outJs,
    ...emflags,
    "-s", exportList
  ];
}

async function buildOne(cfg, simd) {
  hdr(simd ? "Building KISS FFT WASM (SIMD)" : "Building KISS FFT WASM (scalar)");
  const argv = buildArgs(cfg, simd);
  await spawnp(EMCC, argv);
  const outBase = cfg.outBase + (simd ? "-simd" : "");
  console.log(`✅ ${outBase}.js / ${outBase}.wasm`);
}

(async () => {
  const cfg = JSON.parse(await readFile(cfgPath, "utf-8"));
  if (wantBoth) {
    await buildOne(cfg, true);
    await buildOne(cfg, false);
  } else {
    if (wantSimd) await buildOne(cfg, true);
    if (wantScalar) await buildOne(cfg, false);
  }
})().catch((e) => {
  console.error("❌ Build failed:", e.message);
  process.exit(1);
});
