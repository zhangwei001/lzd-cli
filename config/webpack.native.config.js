/**
 * rax h5 && native use to webpack
 */

'use strict';

const path = require('path');
const utils = require('./utils');

const cwd = process.cwd();
const PKG_FILE_PATH = path.join(cwd, './package.json');
const pkg = require(PKG_FILE_PATH);

module.exports = {
  entry: {
    weex: './src/weex/index.js',
  },
  output: {
    path: path.resolve(cwd, './src/weex'),
    filename: 'weex.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [path.resolve(cwd, 'src'), new RegExp(/node_modules\/.*@ali.*/)],
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [require.resolve('babel-preset-es2015'), require.resolve('babel-preset-rax')],
          },
        },
      },
      {
        test: /\.scss/,
        include: [path.resolve(cwd, 'src')],
        use: [{ loader: require.resolve('stylesheet-loader') }, { loader: require.resolve('fast-sass-loader') }],
      },
      {
        test: /\.less/,
        include: [path.resolve(cwd, 'src')],
        use: [{ loader: require.resolve('stylesheet-loader') }, { loader: require.resolve('less-loader') }],
      },
    ],
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json'],
  },
  // get external from icms solution
  externals: [utils.autoExternal(pkg)],
};
