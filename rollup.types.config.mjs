import dts from 'rollup-plugin-dts';
import tsconfigPaths from 'rollup-plugin-tsconfig-paths';

const plugins = [
  tsconfigPaths({ tsConfigPath: ['./tsconfig.json'] }),
  dts({ tsconfig: './tsconfig.json' }),
];

export default [
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins,
  },
  {
    input: 'src/loader.browser.ts',
    output: { file: 'dist/kissfft.browser.d.ts', format: 'es' },
    plugins,
  },
  {
    input: 'src/loader.node.ts',
    output: { file: 'dist/kissfft.node.d.ts', format: 'es' },
    plugins,
  },
  {
    input: 'src/preload.ts',
    output: { file: 'dist/kissfft.preload.d.ts', format: 'es' },
    plugins,
  },
];
