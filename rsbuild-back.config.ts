import { defineConfig } from '@rsbuild/core';

const externals = [
  /^@fparchive\/flashpoint-archive.+$/,
  /\.\/flashpoint-archive.+node$/,
  'flashpoint-launcher',
  'bufferutil',
  'utf-8-validate',
];

export default defineConfig({
  source: {
    entry: {
      backend: './src/back/index.ts',
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
      root: './build/back',
    },
    externals,
    cleanDistPath: false,
  },
  tools: {
    rspack: {
      ignoreWarnings: [
        /Critical dependency: the request of a dependency is an expression/,
        /Module not found.*\.utf-8-validate'/,
      ]
    }
  }
});
