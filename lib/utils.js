'use strict';

const path = require('path');
const fs = require('fs-extra');
const shelljs = require('shelljs');
const spawn = require('cross-spawn');
const api = require('fie-api');
const coRequest = require('co-request');
const semver = require('semver');

const log = api.log('lzd-toolkit-icms');
const templateDir = path.resolve(__dirname, '../template/');


const weexDevServer = require('weex-nuke-devtool/lib/DebugServer');

function firstUpperCase(str) {
  return str.replace(/^\S/, s => s.toUpperCase());
}

function camelTrans(str, isBig) {
  let i = isBig ? 0 : 1;
  str = str.split('-');
  for (; i < str.length; i += 1) {
    str[i] = firstUpperCase(str[i]);
  }
  return str.join('');
}

/**
 * 获取项目URL
 * @returns {*}
 */
exports.getProjectUrl = function (cwd) {
  let repository;
  // 如果是云构建环境，则直接返回
  if (process.env.BUILD_GIT_GROUP && process.env.BUILD_GIT_PROJECT) {
    repository = `git@gitlab.alibaba-inc.com:${process.env.BUILD_GIT_GROUP}/${process.env.BUILD_GIT_PROJECT}`;
    log.debug('读取云构建中的repository = %s', repository);
    return repository;
  }

  try {
    repository = (shelljs.exec('git config --get remote.origin.url', { silent: true, cwd }).stdout.toString() || '').trim();
    // 有些git的url是http开头的，需要格式化为git@格式，方便统一处理
    const match = repository.match(/^(http|https):\/\/gitlab.alibaba-inc.com\/(.*)/);

    if (match && match[2]) {
      repository = `git@gitlab.alibaba-inc.com:${match[2]}`;
    }
  } catch (err) {
    log.debug('git config 错误：', err.message);
  }
  return repository;
};


exports.getCurBranch = function (cwd) {
  // 云构建的话 就直接返回云构建的分支
  if (process.env.BUILD_GIT_BRANCH) {
    return process.env.BUILD_GIT_BRANCH;
  }
  const headerFile = path.join(cwd, '.git/HEAD');
  const gitVersion = fs.existsSync(headerFile) && fs.readFileSync(headerFile, { encoding: 'utf8' }) || '';
  const arr = gitVersion.split(/refs[\\\/]heads[\\\/]/g);
  const v = arr && arr[1] || '';
  return v.trim();
};

/**
 * 获取项目的project name 和 group name
 */

exports.getProjectAndGroupName = function (cwd) {
  const repository = exports.getProjectUrl(cwd);
  const match = repository.match(/git@(.*):(.*)/);
  if (match && match[2]) {
    const info = match[2].replace('.git', '').split('/');
    return {
      group: info[0],
      name: info[1],
    };
  }
};

/**
 * 判断是否是less文件
 * @param file
 * @returns {boolean}
 */
exports.ifless = function (file) {
  const extname = path.extname(file.path);
  return extname === '.less';
};

/**
 * 判断是否是scss文件
 * @param file
 * @returns {boolean}
 */
exports.ifscss = function (file) {
  const extname = path.extname(file.path);
  return extname === '.scss';
};

/**
 * 判断是否是native.js
 */
exports.ifWeex = function (file) {
  return file.path.indexOf('index-native') > -1;
};

exports.gulpTask = function (task, options) {
  options = options || {};
  const cwd = options.cwd || process.cwd();
  const pkg = exports.getPackage();
  let gulpfile;
  // 大于1.2.0的版本，才启用新的构建
  // TODO 建议19年4月删除该逻辑，全部启用新构建
  if (pkg.template && semver.gte(pkg.template.version, '1.2.0')) {
    gulpfile = path.join(__dirname, '../config/gulpfile-v2.js');
  } else {
    gulpfile = path.join(__dirname, '../config/gulpfile.js');
  }
  const gulpBin = require.resolve('gulp/bin/gulp.js');
  log.debug('gulp file = %s', gulpfile);
  if (options.sync) {
    spawn.sync(gulpBin, [task, '--gulpfile', gulpfile, '--cwd', cwd], {
      stdio: 'inherit',
    });
  } else {
    spawn(gulpBin, [task, '--gulpfile', gulpfile, '--cwd', cwd], {
      stdio: 'inherit',
    });
  }
};

/**
 * 用户输入的是用横杠连接的名字
 * 根据用户输入的name生成各类规格变量名: 横杠连接,小驼峰,大驼峰,全大写
 */
exports.generateNames = function (name) {
  return {
    // 后续这个要修改成 @ali/xxx
    fileName: name,

    dirName: name,

    // 小驼峰
    varName: camelTrans(name),

    // 大驼峰
    className: camelTrans(name, true),

    // 全大写
    constName: name
      .split('-')
      .join('')
      .toUpperCase(),
  };
};

exports.getTemplateDir = function (type) {
  return type ? path.resolve(templateDir, type) : templateDir;
};

exports.getCwd = function () {
  return process.cwd();
};

/**
 * 获取根目录下的package文件
 * @returns {*}
 */
exports.getPackage = function () {
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    log.error('No package.json under current root folder or reading error.');
    return null;
  }
  return fs.readJsonSync(pkgPath, { throws: false }) || {};
};

/**
 * 获取脚手架类型
 */
exports.getLzdType = function () {
  const pkg = exports.getPackage();
  if (pkg.template && pkg.template.type === 'mod') {
    return 'lzdmod';
  }
  return 'lzdpage';
};

/**
 * 启动weex-devtool  必须使用8088端口，以便在xtpl中嵌入
 */
const weexInitPort = 8088;
// var weexDebugPort = new FallbackPort(weexInitPort);
exports.weexDevtool = function () {
  weexDevServer.start(weexInitPort);
};

/**
 * 获取服务ipv4地址
 */
exports.getIpv4 = function () {
  const ifaces = require('os').networkInterfaces();

  for (const dev in ifaces) {
    const iface = ifaces[dev];
    for (let i = 0; i < iface.length; i += 1) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
};

/**
 * copy pre-commit hooks 到 project
 */
exports.copyPreCommitHooks = function (cwd) {
  try {
    fs.copySync(path.join(__dirname, '../hooks/', 'pre-commit'), path.join(cwd, '.git/hooks/pre-commit'));
  } catch (err) {
    console.error(err);
  }
};

/**
 * 同步套件中的dependencies包到项目中
 */
exports.syncDependenciesToProject = function (cwd) {
  const pkg = require('../package.json');
  const modules = Object.keys(pkg.dependencies);
  modules.forEach((item) => {
    const srcPath = path.join(__dirname, '../node_modules', item);
    const dstPath = path.join(cwd, 'node_modules', item);
    log.debug('srcPath =', srcPath);
    try {
      fs.removeSync(dstPath);
      fs.ensureSymlinkSync(srcPath, dstPath);
    } catch (e) {
      log.debug('sync dependencies to project error detail : ');
      log.debug(e);
    }
  });
};


/**
 * @desc 发送http请求方法
 * @param {string} url
 * @returns {void}
 */
const request = function* (url) {
  const res = yield coRequest(url);
  return res;
};

exports.request = request;
