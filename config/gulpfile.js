'use strict';

require('colors');
const del = require('del');
const fs = require('fs-extra');
const gulp = require('gulp');
const code = require('gulp-seed');
const xtpl = require('@ali/gulp-xtpl');
const gulpif = require('gulp-if');
const less = require('gulp-less');
const sass = require('gulp-sass');
const babel = require('gulp-babel');
const plumber = require('gulp-plumber');
const parseDepWeexUnify = require('@ali/parse-dep-weexunify-fake');
const prefix = require('gulp-autoprefixer');
const path = require('path');
const semver = require('semver');
const i18n = require('@ali/gulp-mui-i18n');
const webpack = require('webpack-stream');
const git = require('fie-git');
const named = require('vinyl-named');
const api = require('fie-api');
const utils = require('../lib/utils');
const nativeConf = require('./webpack.native.config.js');

const config = api.config;
// const fieFs = api.fs;
const cwd = process.cwd();
const projectInfo = utils.getProjectAndGroupName(cwd);
const pkgFilePath = path.join(cwd, 'package.json');
let pkg = require(pkgFilePath);

const toolkitConfig = config.get('toolkitConfig', cwd) || {};
// let swString = '';
// if (toolkitConfig.enableServiceWorker) {
//   swString = fs.readFileSync(path.join(__dirname, '../template/service_worker/register.xtpl'), 'utf8');
// } else {
//   swString = fs.readFileSync(path.join(__dirname, '../template/service_worker/unRegister.xtpl'), 'utf8');
// }

function err(error) {
  const isBuild = getEnvBuild();
  if (isBuild) {
    // 如果是build的情况下，需要退出异常
    throw error;
  } else {
    console.log(error);
  }
}

function getEnvBuild() {
  // gulp-if 需要返回bool
  return process.env.LZD_BUILD === 'true';
}

// function isPageType() {
//   return process.env.LZD_TYPE === 'lzdpage';
// }

function ifxtpl(file) {
  const extname = path.extname(file.path);
  return extname === '.xtpl';
}

function ifnotxtpl(file) {
  const extname = path.extname(file.path);
  return extname !== '.xtpl';
}

function genModName(file) {
  return pkg.name + (file.path || '')
    .replace(path.resolve('src/'), '');
}

/**
 * 构建js和seed
 * @returns {*}
 */
function buildJsAndSeed() {
  const isBuild = getEnvBuild();

  const depOpts = {
    name: pkg.name,
    version: pkg.version,
    path: `//g.alicdn.com/${projectInfo.group}/${projectInfo.name}/${pkg.version}/`,
    group: toolkitConfig.feLoaderGroup || 'tm',
    feDependencies: pkg.feDependencies,
    kissyVersion: 5,
    kissyConfig: {
      combine: true,
    },
    weex: toolkitConfig.weex,
    useMuiCache: true, // 开启feDependencies依赖生成seed结果缓存
    ignoreRequires: ['rax', 'weex-nuke', 'zebraConfig', 'zebraUtils', '@ali/WeexUtils', /@weex-module\//],
  };
  /**
   * @todo   parseDepWeexUnify需兼容mui5.0
   */
  const WEEX_UNIFY_GENERATED_FILE = ['src/weex/weex.js'];
  depOpts.parser = function (file) {
    const fileOriginalPath = file.history[0];
    const projPath = file.cwd;
    const relaToProj = path.relative(projPath, fileOriginalPath);
    // if it's weexunify project code, use a new way to parse dependency
    if (WEEX_UNIFY_GENERATED_FILE.indexOf(relaToProj) >= 0) {
      return parseDepWeexUnify;
    }
    // else use default parser
    return null;
  };
  return gulp
    .src(['src/**/*.js', 'src/**/*-tpl.xtpl'], { allowEmpty: true })
    .pipe(plumber(err))
    .pipe(gulpif(ifnotxtpl, babel({
      presets: [require.resolve('babel-preset-es2015'), require.resolve('babel-preset-rax')],
    })))
    .pipe(gulpif(ifxtpl, xtpl({
      prefix(options, file) {
        const name = genModName(file);
        return `define("${name}", function(require, exports, module){var RT= require("@ali/mui-xtemplate/runtime");var _ = "";module.exports=(`;
      },
      suffix: ')(_, RT);});',
    })))
    .pipe(gulpif(isBuild, code.lint()))
    .pipe(code.dep(depOpts))
    .pipe(gulpif(isBuild, code.minify()))
    .pipe(gulp.dest('build'));
}


/**
 * 清除build目录
 * @param cb
 */
function cleanBuild(cb) {
  del.sync(['build'], { cwd });
  cb();
}

/**
 * 将seed copy 到 demo目录
 * @returns {*}
 */
function seed2demo(cb) {
  // 重构seed内容，将基础组件mui、lazdload等单独combo
  const seedPath = path.join(cwd, 'src/seed.json');
  const seed = fs.readJsonSync(seedPath, { throws: false }) || {};
  const globalModule = [
    '@ali/mui-babel-polyfill',
    '@ali/lzdmod-crossimage',
    '@ali/lzdmod-datalazyload',
    '@ali/lzdmod-dynamic',
    '@ali/lzdmod-lib-mtop',
    '@ali/lzdmod-mtop',
    '@ali/lzdmod-mtop-dynamic',
    '@ali/mui-fetch',
    '@ali/mui-i18n',
    '@ali/mui-jquery',
    '@ali/mui-mtb-windvane',
    '@ali/mui-mtop',
    '@ali/mui-xtemplate',
    '@ali/mui-zepto',
  ];
  globalModule.forEach((item) => {
    if (seed.packages[item]) {
      seed.packages[item].group = 'g';
    }
  });
  fs.writeFileSync(path.join(cwd, 'build/seed.js'), `require.config(${JSON.stringify(seed)})`);
  fs.writeJsonSync(path.join(cwd, 'demo/seed.json'), seed, { spaces: 2 });
  fs.writeJsonSync(path.join(cwd, 'build/seed.json'), seed, { spaces: 2 });
  cb();
}

/**
 * 构建出weex native文件
 * @returns {*}
 */
function buildWeexNative(callback) {
  // 使用webpack编译,不能allowempty
  if (!fs.existsSync(path.resolve(cwd, './src/weex/index.js'))) {
    return callback && callback();
  }
  return gulp
    .src(['./src/weex/index.js'], { allowEmpty: true })
    .pipe(plumber(err))
    .pipe(named())
    .pipe(webpack(nativeConf))
    .pipe(gulp.dest('src/weex/'));
}

/**
 * less scss css文件编译 ,weex文件夹下单独处理
 * @returns {*}
 * autoprefix只针对pc和mobile
 */
const vendorVersion = ['android >= 4.0', 'ie >= 9', 'iOS >= 8'];
function buildCss() {
  const isBuild = getEnvBuild();
  return gulp
    .src(['src/**/*.css', 'src/**/*.less', 'src/**/*.scss', '!src/weex/**/*.scss'], { allowEmpty: true })
    .pipe(plumber(err))
    .pipe(gulpif(utils.ifless, less()))
    .pipe(gulpif(utils.ifscss, sass()))
    .pipe(prefix(vendorVersion))
    .pipe(gulpif(isBuild, code.lint()))
    .pipe(gulpif(isBuild, code.minify()))
    .pipe(gulp.dest('build'));
}

/**
 * 将sass主题转为less
 */
// function sass2less(cb) {
//   const sassBin = require.resolve('less-plugin-sass2less/bin/cmd.js');
//   spawn.sync(sassBin, ['sass2less', 'src/{theme,theme-pc}.scss', 'demo/{name}.less', '--cwd', cwd], {
//     stdio: 'inherit',
//   });
//   cb();
// }

function buildi18n(cb) {
  if (fs.existsSync(path.join(cwd, 'src/i18n'))) {
    return gulp
      .src(['src/i18n/*.json'], { allowEmpty: true })
      .pipe(
        i18n({
          modName: `${pkg.name}`,
          needXtpl: true,
          needWeex: true,
          defaultLanguage: 'en',
          tagsLength: 1,
        })
      )
      .pipe(gulp.dest('src'));
  }
  cb();
}

/**
 * 将package.json的内容构建到build目录下
 * 开发环境下，读取的是demo目录的icms.json，故构建逻辑只需要build任务执行（云构建环境）
 */
function buildPackage(cb) {
  const isBuild = getEnvBuild();
  if (isBuild) {
    const pkgPath = path.join(cwd, 'package.json');
    const pkgData = fs.readJsonSync(pkgPath, { throws: false }) || {};

    if (pkgData.name) {
      let version = git.branch(cwd);
      version = version.split('/');

      if (version && version[1] && semver.valid(version[1])) {
        pkgData.version = version[1];
      }

      // 删掉掉一些敏感信息
      // delete pkgData.repository;
      // delete pkgData.publishConfig;
      // 然后copy到build目录
      fs.ensureDirSync(path.join(cwd, 'build'));
      fs.writeJsonSync(path.join(cwd, 'build/icms.json'), pkgData);
      fs.writeJsonSync(pkgPath, pkgData, { spaces: 2 });
    }
  }
  cb();
}

/**
 * copy非编译的文件到build目录
 * seed文件是构建出来的，不需要直接copy过去
 * @returns {*}
 */
function copy2Build() {
  return gulp.src(['src/**/*.xtpl', 'src/**/*.json', '!src/seed.json'], { allowEmpty: true }).pipe(gulp.dest('build'));
}


/**
 * 源码页面开发时，需要将src下的index文件同步到demo目录下并改名
 * 开发环境时才需要demo目录，所以build环境时则不需要这个流程
 */
function json2demo(cb) {
  const isBuild = getEnvBuild();
  if (!isBuild) {
    const srcIndex = path.join(cwd, 'src/index.json');
    const distIndex = path.join(cwd, 'demo/mobile.json');
    const srcIndexPc = path.join(cwd, 'src/index-pc.json');
    const distIndexPc = path.join(cwd, 'demo/pc.json');
    const srcIndexNative = path.join(cwd, 'src/index-native.json');
    const distIndexNative = path.join(cwd, 'demo/weex-native.json');

    const jsonFile = {};
    jsonFile[srcIndex] = distIndex;
    jsonFile[srcIndexPc] = distIndexPc;
    jsonFile[srcIndexNative] = distIndexNative;

    Object.keys(jsonFile).forEach((item) => {
      if (fs.existsSync(item)) {
        fs.copy(item, jsonFile[item]);
      }
    });
  }
  cb();
}

/**
 * copy package.json 到demo 目录
 * @returns {*}
 */
function pkg2demo() {
  return gulp.src('package.json').pipe(gulp.dest('demo'));
}

/**
 * copy mock_data 目录到demo下
 */
function mock2demo() {
  return gulp.src('src/mock_data/**', { allowEmpty: true }).pipe(gulp.dest('demo/mock_data'));
}

/**
 * 读取更新后的package.json
 * @param cb
 */
function updatePkg(cb) {
  delete require.cache[require.resolve(pkgFilePath)];
  try {
    pkg = require(pkgFilePath);
  } catch (e) {
    console.error(`${'[ERROR]'.red}package.json is not avaliable`);
  }
  cb();
}

/**
 * 模块的watch
 */
gulp.task('watch', () => {
  // js pc和h5修改
  gulp.watch(
    ['src/**/*.js', '!src/seed.js', 'src/**/*-tpl.xtpl', '!src/weex/**/*.js', '!src/weex/weex.js', '!src/i18n.js'],
    gulp.series(buildJsAndSeed, seed2demo)
  );
  // weex的scss修改需要将js放到build目录
  gulp.watch(
    ['src/weex/**/*.js', 'src/weex/**/*.scss', '!src/weex/weex.js'],
    gulp.series(buildWeexNative, buildJsAndSeed, seed2demo)
  );
  // css处理
  gulp.watch(['src/**/*.css', 'src/**/*.scss', '!src/weex/**/*.scss'], gulp.series(buildCss));
  // gulp.watch(['src/theme.scss', 'src/theme-pc.scss'], gulp.series(sass2less));

  // lzdpage需要的，mod不需要
  gulp.watch(['src/index.json', 'src/index-pc.json', 'src/index-native.json'], gulp.series(json2demo));

  // mock数据修改同步到demo
  gulp.watch(['src/mock_data/*.json'], gulp.series(mock2demo));
  // package修改也是同步到demo
  gulp.watch(['./package.json'], gulp.parallel(pkg2demo, gulp.series(updatePkg, buildJsAndSeed)));
  // 语言文件修改，则编译出语言文件
  gulp.watch(['src/i18n/*.json'], gulp.series(buildi18n, buildJsAndSeed, seed2demo));
  // xtpl同步到build目录
  gulp.watch(['src/**/*.xtpl'], gulp.series(copy2Build));
});

gulp.task(
  'default',
  gulp.series(
    cleanBuild,
    buildPackage,
    gulp.parallel(
      pkg2demo,
      mock2demo,
      json2demo,
      // sass2less,
      buildCss,
      gulp.series(buildi18n, buildWeexNative, buildJsAndSeed, seed2demo)
    ),
    gulp.series(copy2Build)
  )
);

gulp.task('watch:all', gulp.series('watch'));

gulp.task('test', gulp.series(buildi18n));
