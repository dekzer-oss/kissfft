// rollup.types.config.mjs
import dts from 'rollup-plugin-dts';

const entries = {
  index: 'src/index.ts',
  browser: 'src/loader.browser.ts',
  node: 'src/loader.node.ts',
};

export default {
  input: entries,
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: '[name].d.ts',
    chunkFileNames: 'types/[name].d.ts',
  },
  plugins: [
    dts({
      respectExternal: true,
      compilerOptions: {
        stripInternal: true,
        declaration: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      },
      exclude: [
        'src/**/*.test.*',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/**/fixtures/**',
      ],
    }),
  ],
  external: [/^node:/],
};
