import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  source: {
    entry: {
      renderer: './src/renderer/index.tsx'
    }
  },
  html: {
    title: 'Flashpoint Launcher',
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
    },
    open: '/flashpoint/renderer',
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
