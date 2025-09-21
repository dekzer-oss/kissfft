import { defineConfig, type Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Emit ESM alias files that ALWAYS provide a default export (namespace bag)
 * and forward all named exports. This avoids runtime errors when the target
 * module has only named exports (ESM spec: `export *` does NOT forward default).
 * MDN/docs: export vs re-export default semantics.
 */
function emitEsmAliases(options?: {
  outDir?: string;
  aliases?: Array<{ fileBase: string; targetBase: string }>;
}): Plugin {
  const outDir = options?.outDir ?? resolve(__dirname, 'dist');
  const aliases = options?.aliases ?? [
    {
      fileBase: 'kissfft.browser.esm',
      targetBase: 'loader.browser',
    },
    { fileBase: 'kissfft.node.esm', targetBase: 'loader.node' },
  ];

  return {
    name: 'emit-esm-aliases',
    apply: 'build',
    enforce: 'post',
    async writeBundle() {
      await fs.mkdir(outDir, { recursive: true });
      await Promise.all(
        aliases.flatMap(({ fileBase, targetBase }) => {
          const js = [
            `// Auto-generated alias: ${fileBase}.js -> ${targetBase}.js`,
            `// Ensures a default export (namespace bag) + forwards named exports.`,
            `import * as api from './${targetBase}.js';`,
            `export default api;`,
            `export * from './${targetBase}.js';`,
            ``,
          ].join('\n');

          const dts = [
            `// Auto-generated alias types: ${fileBase}.d.ts -> ${targetBase}.d.ts`,
            `export * from './${targetBase}';`,
            `declare const _default: typeof import('./${targetBase}');`,
            `export default _default;`,
            ``,
          ].join('\n');

          return [
            fs.writeFile(join(outDir, `${fileBase}.js`), js, 'utf8'),
            fs.writeFile(join(outDir, `${fileBase}.d.ts`), dts, 'utf8'),
          ];
        }),
      );
    },
  };
}

/**
 * Copy WASM artifacts into dist/ so that UMD→loader paths can fetch them
 * via the test server at /dist/*. This avoids 404s when Playwright only
 * serves dist/ but your blobs live in build/ (or build/web/).
 */
function copyWasmAssets(options?: { from?: string[]; toDir?: string }): Plugin {
  const toDir = options?.toDir ?? resolve(__dirname, 'dist');
  const fromGlobs = options?.from ?? [
    resolve(__dirname, 'build/dekzer-kissfft.wasm'),
    resolve(__dirname, 'build/dekzer-kissfft-simd.wasm'),
    resolve(__dirname, 'build/web/dekzer-kissfft.wasm'),
    resolve(__dirname, 'build/web/dekzer-kissfft-simd.wasm'),
  ];

  return {
    name: 'copy-wasm-assets-into-dist',
    apply: 'build',
    enforce: 'post',
    async writeBundle() {
      await fs.mkdir(toDir, { recursive: true });
      const seen = new Set<string>();
      for (const src of fromGlobs) {
        try {
          const stat = await fs.stat(src);
          if (!stat.isFile()) continue;
          const base = src.split('/').pop()!;
          if (seen.has(base)) continue;
          const dst = join(toDir, base);
          await fs.copyFile(src, dst);
          seen.add(base);
        } catch {
          // ignore missing variants; at least one pair should exist
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    emitEsmAliases({
      outDir: resolve(__dirname, 'dist'),
      aliases: [
        {
          fileBase: 'loader.browser',
          targetBase: 'kissfft.browser.esm'
        },
        {
          fileBase: 'loader.node',
          targetBase: 'kissfft.node.esm',
        },
      ],
    }),
    copyWasmAssets(),
  ],

  assetsInclude: [/\.wasm$/],

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DekzerKissfft',
      formats: ['umd'],
      fileName: () => 'kissfft.umd.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2018',
    minify: 'esbuild',
    rollupOptions: {
      external: [/^node:/],
      output: {
        exports: 'named',
      },
    },
  },
});
