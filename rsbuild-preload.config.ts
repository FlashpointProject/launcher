import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: {
      preload: './src/main/MainWindowPreload.ts',
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
    externals: ['electron']
  },
  tools: {
    rspack: {
      target: 'electron-preload',
      ignoreWarnings: [
        /Critical dependency: the request of a dependency is an expression/,
        /Module not found.*\.node'/,
        /Module not found.*\.utf-8-validate'/,
        /Can't resolve '@fparchive*/
      ]
    }
  }
});
