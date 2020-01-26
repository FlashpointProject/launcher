const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: './src/renderer/index.tsx',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, './build/window')
  },
  // Allows importing build-in node modules in electron render.
  // https://stackoverflow.com/questions/39417628/how-to-reference-node-fs-api-with-electron-in-typescript
  target: 'electron-renderer',
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })]
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json'
          }
        }
      }
    ]
  },
  externals: {
    fsevents: 'require(\'fsevents\')',
    'react-native-sqlite-storage': 'react-native-sqlite-storage'
    // archiver: 'require(\'archiver\')'
  }
};
