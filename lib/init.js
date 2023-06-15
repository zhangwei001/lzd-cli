'use strict';

const _ = require('underscore');
const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const path = require('path');
const api = require('fie-api');
const argv = require('yargs').help(false).argv;
const toolUtil = require('./utils');
const addCommand = require('./add');
const pkg = require('../package.json');

const npm = api.npm;
const fieFs = api.fs;
const fieUser = api.user;
const fieConfig = api.config;
const log = api.log('lzd-toolkit-icms');
const fieModuleName = api.moduleName;

const MOD_GROUP = 'lzdmod';
const PAGE_GROUP = 'lzdpage';

module.exports = function* (options) {
  // 当前项目的根目录
  const cwd = toolUtil.getCwd();
  const prefix = fieModuleName.prefix();
  // 当前项目名称集合
  const generateNames = toolUtil.generateNames(cwd.split(path.sep).pop());
  const config = fieConfig.get('toolkitConfig');
  const user = fieUser.getUser() || {};
  const option = Object.assign({}, argv, options);

  let templateType;
  if (option.m || option.mod) {
    templateType = MOD_GROUP;
  } else if (option.p || option.page) {
    templateType = PAGE_GROUP;
  } else {
    const ask = yield inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Choose a type:',
        choices: [
          {
            name: 'module    -     To init a Module for ICMS',
            value: MOD_GROUP,
          },
          {
            name: 'page      -     To init a Page for ICMS',
            value: PAGE_GROUP,
          },
        ],
      },
    ]);
    templateType = ask.type;
  }

  // 判断是否有.git,没有的话 则初始化一下
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    log.info('Initializing gitlab repository ... ');
    spawn.sync('git', ['init']);
    spawn.sync('git', ['remote', 'add', 'origin', `git@gitlab.alibaba-inc.com:${templateType}/${generateNames.dirName}.git`]);
    // 初始化后提交一把
    spawn.sync('git', ['add', '*']);
    spawn.sync('git', ['commit', '-m', 'temp: init project']);
  }
  // 符合mui5规范
  generateNames.fileName = `@ali/${templateType}-${generateNames.fileName}`;
  fieFs.copyDirectory({
    src: toolUtil.getTemplateDir(templateType),
    dist: cwd,
    data: _.extend({}, config, generateNames, {
      group: templateType,
      author: user.name,
      email: user.email,
      toolkitVersion: pkg.version,
    }),
    ignore: ['node_modules', 'build', '.DS_Store', '.idea'],
    filenameTransformer(name) {
      if (name === '__gitignore') {
        name = '.gitignore';
      } else if (name === '__npmignore') {
        name = '.npmignore';
      } else if (name === '__package.json') {
        name = 'package.json';
      } else if (name === 'fie.config.js') {
        name = fieConfig.getConfigName();
      }
      return name;
    },
  });

  // 初始化的时候就注入pre-commit的hooks
  toolUtil.copyPreCommitHooks(cwd);

  log.info('Installing dependencies ... ');
  try {
    yield npm.installDependencies();
  } catch (e) {
    log.error(e);
    log.error('tnpm dependencies install failed, please try run command: tnpm install');
  }

  // add eslint file

  yield addCommand({ clientOptions: { eslint: true } });

  console.log(chalk.yellow('\n---------------Initialize succeed! Please follow the steps as below---------------\n'));
  console.log(chalk.green(`${chalk.yellow(`$ ${prefix} start`)}         # Could one click to start the dev environment`));
  console.log(chalk.green(`${chalk.yellow(`$ ${prefix} watch`)}         # Only watch the file changes, do not start the dev environment`));
  console.log(chalk.green(`${chalk.yellow(`$ ${prefix} schema`)}        # start mock data schema edit server`));
  console.log(chalk.green(`${chalk.yellow(`$ ${prefix} git create`)}    # Could automatically create repository on gitlab`));
  console.log(chalk.green(`${chalk.yellow(`$ ${prefix} help`)}          # Could get more help document for current toolkit`));
  console.log(chalk.green(`\nRecommend to push the initialized code to master branch at first, then you can switch to  ${chalk.yellow('daily/x.y.z')} for development`));
  console.log(chalk.yellow('\n---------------Technical Support: @宇果(Hugo) @天牙(phoenix) ---------------\n'));
};
