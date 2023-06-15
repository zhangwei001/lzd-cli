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
const plumber = require('gulp-plumber');
const prefix = require('gulp-autoprefixer');
const path = require('path');
const semver = require('semver');
const i18n = require('./gulp-icms-i18n');
const webpack = require('webpack');
const git = require('fie-git');
// const named = require('vinyl-named');
const utils = require('../lib/utils');
// const nativeConf = require('./webpack.native.config.js');
const webpackConfig = require('./webpack.config');

// const config = api.config;
// const fieFs = api.fs;
const cwd = process.cwd();
// const projectInfo = utils.getProjectAndGroupName(cwd);
const pkgFilePath = path.join(cwd, 'package.json');
let pkg = require(pkgFilePath);

// const toolkitConfig = config.get('toolkitConfig', cwd) || {};


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

function genModName(file) {
  return pkg.name + (file.path || '')
    .replace(path.resolve('src/'), '');
}


// function ifxtpl(file) {
//   const extname = path.extname(file.path);
//   return extname === '.xtpl';
// }
//
// function ifnotxtpl(file) {
//   const extname = path.extname(file.path);
//   return extname !== '.xtpl';
// }


/**
 * JS 构建的核心逻辑，资源编译及seed文件生成
 * @returns Promise
 */
function buildJs() {
  const isBuild = getEnvBuild();
  return new Promise((resolve, reject) => {
    const configInfo = isBuild ? webpackConfig.prod(pkg) : webpackConfig.dev(pkg);
    webpack(configInfo, (webpackErr, stats) => {
      console.log(
        stats.toString({
          chunks: false, // Makes the build less quieter
          colors: true, // Shows colors in the console
          modules: false, // hide built modules information
        })
      );
      if (webpackErr) {
        reject();
        if (isBuild) {
          // 如果是build的情况下，需要退出异常
          throw webpackErr;
        } else {
          console.error(webpackErr);
        }
      } else {
        resolve();
      }
    });
  });
}

/**
 * JS 构建的核心逻辑，资源编译及seed文件生成
 * @returns {*}
 */
// function buildJs() {
//   const isBuild = getEnvBuild();
//   const configInfo = isBuild ? webpackConfig.prod(pkg) : webpackConfig.dev(pkg);
//   return gulp
//     .src(['src/**/*.js','src/**/*.jsx'], { allowEmpty: true })
//     .pipe(webpack(configInfo))
//     .pipe(gulp.dest('./build'));
// }

function buildXtpl2Js() {
  const isBuild = getEnvBuild();
  return gulp
    .src(['src/**/*-tpl.xtpl'], { allowEmpty: true })
    .pipe(plumber(err))
    .pipe(xtpl({
      prefix(options, file) {
        const name = genModName(file);
        return `define("${name}",["@ali/mui-xtemplate/runtime"], function(require, exports, module){var RT= require("@ali/mui-xtemplate/runtime");var _ = "";module.exports=(`;
      },
      suffix: ')(_, RT);});',
    }))
    // css 构建出错不阻断构建流程
    .on('error', function () {
      if (!isBuild) {
        this.emit('end');
      }
    })
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
    // css 构建出错不阻断构建流程
    .on('error', function () {
      if (!isBuild) {
        this.emit('end');
      }
    })
    .pipe(prefix(vendorVersion))
    .pipe(gulpif(isBuild, code.lint()))
    .pipe(gulpif(isBuild, code.minify()))
    .pipe(gulp.dest('build'));
}

/**
 * 构建多语言文件
 * @param cb
 * @returns {*}
 */
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
      .pipe(gulp.dest('build'));
  }
  cb();
}

/**
 * 将package.json的内容构建到build目录下
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
  // xtpl构建为js
  gulp.watch(
    ['src/**/*-tpl.xtpl'],
    gulp.series(buildXtpl2Js)
  );
  // weex的scss修改需要将js放到build目录
  // gulp.watch(
  //   ['src/weex/**/*.js', 'src/weex/**/*.scss', '!src/weex/weex.js'],
  //   gulp.series(buildWeexNative, buildJsAndSeed, seed2demo)
  // );

  // css处理, weex下面是在webpack里面构建的，所以需要排除掉
  gulp.watch(['src/**/*.css', 'src/**/*.scss', '!src/weex/**/*.scss'], gulp.series(buildCss));

  // lzdpage需要的，mod不需要
  gulp.watch(['src/index.json', 'src/index-pc.json', 'src/index-native.json'], gulp.series(json2demo));

  // mock数据修改同步到demo
  gulp.watch(['src/mock_data/*.json'], gulp.series(mock2demo));

  // package修改也是同步到demo
  gulp.watch(['./package.json'], gulp.parallel(pkg2demo, gulp.series(updatePkg, buildJs)));

  // 语言文件修改，则编译出语言文件
  gulp.watch(['src/i18n/*.json'], gulp.series(buildi18n));

  // xtpl同步到build目录
  gulp.watch(['src/**/*.xtpl'], gulp.series(copy2Build));
});

gulp.task(
  'default',
  gulp.series(
    cleanBuild,
    buildPackage,
    buildJs,
    gulp.parallel(
      pkg2demo,
      mock2demo,
      json2demo,
      buildCss,
      buildXtpl2Js,
      buildi18n,
      copy2Build
    )
  )
);


gulp.task('watch:all', gulp.parallel(buildJs, 'watch'));

gulp.task('test', buildJs);
