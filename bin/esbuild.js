import esbuild from 'esbuild';
import path from 'path';

const input = path.resolve(process.cwd(), 'src/index.ts');
const outputCJS = path.resolve(process.cwd(), 'lib/index.cjs');
const outputESM = path.resolve(process.cwd(), 'lib/index.mjs');

/**
 * @type {esbuild.BuildOptions}
 */
const options = {
  entryPoints: [input],
  bundle: true,
  platform: 'node',
  external: [
    'http',
    'net',
    'uws',
    'buffer',
    'stream',
    'events',
    'constants',
    'timers',
    'process'
  ],
  keepNames: true,
  minify: true,
};

/**
 * @type {esbuild.BuildOptions}
 */
const cjs = {
  target: 'es6',
  format: 'cjs',
  outfile: outputCJS
};

/**
 * @type {esbuild.BuildOptions}
 */
const esm = {
  target: 'node12',
  format: 'esm',
  outfile: outputESM
};

Promise.all([
  esbuild.build(Object.assign({}, options, cjs)),
  esbuild.build(Object.assign({}, options, esm))
]);
