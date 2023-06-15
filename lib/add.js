'use strict';

const api = require('fie-api');
const chalk = require('chalk');
const toolUtil = require('./utils');
const path = require('path');
const fs = require('fs-extra');

const fieFs = api.fs;
const log = api.log('lzd-toolkit-icms');
const cwd = toolUtil.getCwd();

function addEslintFile() {
  fieFs.copyDirectory({
    src: toolUtil.getTemplateDir('eslint'),
    dist: cwd,
  });
}

module.exports = function* (options) {
  if (options.clientOptions.eslint) {
    toolUtil.syncDependenciesToProject(cwd);
    addEslintFile();
    log.success(`Successfully add eslint to root of current project. Run ${chalk.yellow('lzd eslint fix')} to excute eslint task`);
  } else if (options.clientArgs.length) {
    const packageList = [];
    for (const i in options.clientArgs) {
      if (!isNaN(Number(i) - Number(i)) && typeof options.clientArgs[i] === 'string' &&
        (options.clientArgs[i].indexOf('@ali/mui-') !== -1 || options.clientArgs[i].indexOf('@ali/lzdmod-') !== -1)) {
        packageList.push(options.clientArgs[i]);
      }
    }
    if (!packageList.length) {
      log.error(chalk.red('add package fail, only package name like @ali/lzdmod-* or @ali/mui-* can be add by this command'));
    } else {
      const successInstallPkg = [];
      yield packageList.map(function* (i) {
        const res = yield toolUtil.request(`https://mop.tmall.com/api_pass/lab/${i}/tags`);
        let version;
        try {
          const body = JSON.parse(res.body);
          if (body.message === '404 Project Not Found') {
            throw new Error(`can not find package ${i}`);
          }
          version = body[0].name.split('/')[1];
          if (version) {
            successInstallPkg.push({ name: i, version });
          }
        } catch (e) {
          log.error(chalk.red(e));
        }
      });
      const file = path.join(cwd, 'package.json');
      let pkg;
      if (successInstallPkg.length && fs.existsSync(file)) {
        pkg = fs.readJSONSync(file);
        pkg.feDependencies = pkg.feDependencies || {};
        successInstallPkg.forEach(i =>
          (pkg.feDependencies[i.name] = i.version.replace(/(\d+.\d+.)(\d+)/, '$1x')));
        fs.writeFileSync(file, JSON.stringify(pkg, null, 2), { encoding: 'utf8' });
        const successStr = `add package ${successInstallPkg.map(i => `${i.name} ${i.version}`).join('、')} success!`;
        log.success(successStr);
        console.log(chalk.green('if this package is using in weex, please add it in weex/core.xtpl by youself'));
      }
    }
  }
};

