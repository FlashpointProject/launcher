import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { builtinModules } from 'node:module';

const externals = {
  'electron': 'commonjs electron'
};
for (const module of builtinModules) {
  externals[module] = 'commonjs ' + module;
}

export default defineConfig({
  source: {
    entry: {
      renderer: './src/renderer/index.tsx'
    }
  },
  html: {
    template: './templates/index.html'
  },
  dev: {
    assetPrefix: 'auto'
  },
  output: {
    target: 'web',
    assetPrefix: 'auto',
    minify: false,
    distPath: {
      root: './build/window',
    },
    cleanDistPath: {
      keep: [/styles*/, /images*/, /svg*/],
    },
    externals,
  },
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift(['babel-plugin-react-compiler']);
      },
    })
  ],
});
