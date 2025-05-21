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
      name: 'nga',
      exposes: {
        './Initializer': './src/components/Initializer.tsx',
        './NgCredits': './src/components/NgCredits.tsx',
        './NgFaves': './src/components/NgFaves.tsx',
        './NgRating': './src/components/NgRating.tsx',
        './NgRatingGridIcon': './src/components/NgRatingGridIcon.tsx',
        './NgRatingListIconHeader': './src/components/NgRatingListIconHeader.tsx',
        './NgRatingListIconRow': './src/components/NgRatingListIconRow.tsx',
        './NgScore': './src/components/NgScore.tsx',
        './NgViews': './src/components/NgViews.tsx',
        './NgViewsListHeader': './src/components/NgViewsListHeader.tsx',
        './NgViewsListRow': './src/components/NgViewsListRow.tsx',
        './NgRatingSearchableSelect': './src/components/NgRatingSearchableSelect.tsx',
        './NgTrophies': './src/components/NgTrophies.tsx',
        './NgAuthorComments': './src/components/NgAuthorComments.tsx'
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
});
