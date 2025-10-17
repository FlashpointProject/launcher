import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';

const externals = {
  'electron': 'commonjs electron'
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
  dev: {
    assetPrefix: 'auto'
  },
  server: {
    base: '/flashpoint',
    publicDir: {
      name: './build/window',
      copyOnBuild: false,
      watch: true
    }
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
    pluginNodePolyfill(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift(['babel-plugin-react-compiler']);
      },
    })
  ],
});
