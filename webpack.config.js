const path = require('path');

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
    extensions: ['.js', '.json', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader'
      }
    ]
  }
};
