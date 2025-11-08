import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { dependencies } from './package.json';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift(['babel-plugin-react-compiler']);
      },
    }),
    pluginModuleFederation({
      name: 'core_controller',
      dts: false,
      exposes: {
        './Initializer': './src/components/Initializer.tsx',
        './ControllerSupport': './src/components/ControllerSupport.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: dependencies.react },
        'react-dom': { singleton: true, requiredVersion: dependencies['react-dom'] }
      },
    })
  ],
  source: {
    entry: {
      index: './src/init.ts',
    },
  },
  lib: [
    {
      format: 'mf',
      dts: false,
      output: {
        distPath: {
          root: 'static'
        },
        assetPrefix: 'auto',
        minify: false,
        cleanDistPath: {
          keep: [/assets*/, /\.css/],
        }
      },
    }
  ],
  output: {
    target: 'web'
  },
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  },
  tools: {
    rspack: {
      externals: [
        /^flashpoint-launcher-renderer-ext.+/
      ]
    }
  }
});
