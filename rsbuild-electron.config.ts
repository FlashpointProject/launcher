import { defineConfig } from '@rsbuild/core';

const externals = [
  'bufferutil',
  'utf-8-validate',
];

export default defineConfig({
  source: {
    entry: {
      electron: './src/main/index.ts',
    }
  },
  dev: {
    assetPrefix: 'auto'
  },
  output: {
    target: 'node',
    assetPrefix: 'auto',
    minify: true,
    distPath: {
      root: './build/main',
    },
    cleanDistPath: false,
    externals,
  },
  tools: {
    rspack: {
      target: 'electron-main',
      ignoreWarnings: [
        /Critical dependency: the request of a dependency is an expression/,
        /Module not found.*\.node'/,
        /Module not found.*\.utf-8-validate'/,
        /Can't resolve '@fparchive*/
      ]
    }
  }
});
