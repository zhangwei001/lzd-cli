/**
 * rax h5 && native use to webpack
 */

'use strict';

const path = require('path');
const fs = require('fs-extra');
const api = require('fie-api');
const MuiPlugin = require('./plugin/index');

const cwd = process.cwd();
const config = api.config;
const git = api.git;
const toolkitConfig = config.get('toolkitConfig', cwd) || {};

/**
 * 获取webpack入口文件
 * @returns {}
 */
function getEntryMaps() {
  const entry = Object.assign({
    'pc/index': './src/pc/index.js',
    'm/index': './src/m/index.js',
    'weex/weex': './src/weex/index.js',
    index: './src/index.js', // 纯MUI组件时一般用根目录下这个入口
  }, toolkitConfig.webpackEntry);

  for (const i in entry) {
    if (!fs.existsSync(path.join(cwd, entry[i]))) {
      delete entry[i];
    }
  }
  return entry;
}

const entry = getEntryMaps();


function baseConfig(pkg) {
  const currentAlias = {};
  currentAlias[pkg.name] = path.resolve(cwd, './src');
  return {
    entry,
    output: {
      path: path.resolve(cwd, './build'),
      filename: '[name].js',
      library: `${pkg.name}/[name]`,
      libraryTarget: 'amd',
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          include: [path.resolve(cwd, 'src'), new RegExp(/node_modules\/.*@ali.*/)],
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                [require.resolve('babel-preset-env'), {
                  targets: {
                    browsers: [
                      '>1%',
                      'ios_saf >= 8',
                      'last 4 versions',
                      'Firefox ESR',
                      'not ie < 9',
                    ],
                  },
                  loose: false,
                  useBuiltIns: true,
                }],
                require.resolve('babel-preset-stage-0'),
                require.resolve('babel-preset-rax'),
              ],
            },
          },
        },
        {
          test: /\.scss/,
          include: [path.resolve(cwd, 'src')],
          use: [{ loader: require.resolve('stylesheet-loader') }, { loader: require.resolve('fast-sass-loader') }],
        },
      ],
    },

    // optimization: {
    //   minimize: false
    // },

    plugins: [
      new MuiPlugin({
        seed: true,
        muiName: pkg.name,
        feDependencies: pkg.feDependencies,
        weex: toolkitConfig.weex,
        group: toolkitConfig.feLoaderGroup || 'tm',
        version: pkg.version,
        project: git.project(cwd),
        cwd,
      }),
    ],

    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: currentAlias,
    },
  };
}

function dev(pkg) {
  const base = baseConfig(pkg);
  base.watch = true;
  base.mode = 'development';
  return base;
}

function prod(pkg) {
  const base = baseConfig(pkg);
  // build环境
  base.mode = 'production';
  return base;
}

module.exports = {
  dev,
  prod,
};
