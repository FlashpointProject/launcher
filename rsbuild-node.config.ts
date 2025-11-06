import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/main/MainNode.ts',
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
      root: './build/node',
    },
    cleanDistPath: false,
  },
});
