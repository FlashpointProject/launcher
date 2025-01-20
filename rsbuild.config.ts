import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { builtinModules } from 'node:module';

const externals = {
  'electron': 'commonjs electron'
};
for (const module of builtinModules) {
  externals[module] = 'commonjs ' + module
}

const ReactCompilerConfig = {
  target: '17'
};

export default defineConfig({
  source: {
    entry: {
      renderer: './src/renderer/index.tsx'
    }
  },
  html: {
    template: './templates/index.html'
  },
  output: {
    target: 'web',
    assetPrefix: './',
    minify: false,
    distPath: {
      root: './build/window',
    },
    externals,
  },
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift([
          'babel-plugin-react-compiler',
          ReactCompilerConfig,
        ]);
      },
    }),
  ],
});