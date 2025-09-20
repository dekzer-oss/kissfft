// rollup.types.config.mjs
import dts from 'rollup-plugin-dts';

const shared = {
  plugins: [
    dts({
      compilerOptions: {
        stripInternal: true,
        declaration: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        baseUrl: '.',
        paths: { '@/*': ['src/*'] }
      },
      respectExternal: true,
    }),
  ],
  external: [/^node:/],
};

export default [
  // Root public API -> dist/index.d.ts
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    ...shared,
  },

  // Browser loader subpath -> dist/loader.browser.d.ts
  {
    input: 'src/loader.browser.ts',
    output: { file: 'dist/loader.browser.d.ts', format: 'es' },
    ...shared,
  },

  // Node loader subpath -> dist/loader.node.d.ts
  {
    input: 'src/loader.node.ts',
    output: { file: 'dist/loader.node.d.ts', format: 'es' },
    ...shared,
  },
];
