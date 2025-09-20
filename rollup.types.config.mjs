import dts from 'rollup-plugin-dts';

/**
 * Bundle .d.ts for each public entry.
 * We generate:
 *   - dist/index.d.ts
 *   - dist/browser.d.ts
 *   - dist/node.d.ts
 *   - dist/preload.d.ts
 */
const entries = {
  index: 'src/index.ts',
  browser: 'src/loader.browser.ts',
  node: 'src/loader.node.ts',
  preload: 'src/preload.ts',
};

const plugin = dts({
  // Make path alias resolution explicit for the dts bundler.
  compilerOptions: {
    baseUrl: '.',
    paths: {
      '@/*': ['src/*'],
      '@/types': ['src/types/index.ts'],
    },
  },
  respectExternal: true,
  // noCheck: false, // keep typechecking on during bundle (optional)
});

export default Object.entries(entries).map(([name, input]) => ({
  input,
  output: { file: `dist/${name}.d.ts`, format: 'es' },
  plugins: [plugin],
}));
