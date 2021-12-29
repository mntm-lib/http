/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
  rootDir: process.cwd(),
  testMatch: [
    '<rootDir>/tests/*.spec.js'
  ],
  moduleFileExtensions: [
    'js',
    'cjs',
    'mjs'
  ],
  transform: {}
};

export default config;
