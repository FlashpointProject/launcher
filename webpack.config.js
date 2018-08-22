const path = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader');
module.exports = {
  entry: './src/renderer/index.tsx',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, './dist/renderer/'),
  },
  //devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
      },
    ]
  },
  externals: {
    "react": "React",
    "react-dom": "ReactDOM",
    "react-virtualized": "ReactVirtualized",
  },
  plugins: [
    new CheckerPlugin({
      //configFileName: './tsconfig-renderer.json',
      // compiler: ???,
    })
  ],
};
