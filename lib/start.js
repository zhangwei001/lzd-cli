/**
 * 打开服务器
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const api = require('fie-api');
const FallbackPort = require('fallback-port');
const sleep = require('co-sleep');
const preview = require('./preview');
const utils = require('./utils');

const log = api.log('lzd-toolkit-icms');
const npm = api.npm;
const cwd = process.cwd();

module.exports = function* (options) {
  const argv = options.clientOptions;
  const config = Object.assign(
    {
      host: utils.getIpv4(),
      port: 3000,
      ip: utils.getIpv4(),
    },
    api.config.get('toolkitConfig'),
    argv
  );

  // 判断下host是否配占用了
  const fallbackPort = new FallbackPort(config.port);
  const port = fallbackPort.getPort();
  // 查看端口是否占用
  if (port !== config.port) {
    log.warn(`PORT ${config.port} is taken, lzd is opening at port: ${port}!`);
    config.port = port;
  }

  // 判断下是否有node_module
  if (!fs.existsSync(path.resolve(cwd, 'node_modules'))) {
    log.info('No node_modules folder, start installing dependencies…');
    yield npm.installDependencies();
  }

  // 初始化的时候就注入pre-commit的hooks
  utils.copyPreCommitHooks(cwd);
  // 同步一下依赖
  utils.syncDependenciesToProject(cwd);

  // 为lzdmod为模块
  const type = utils.getLzdType();
  log.debug(`开启 ${type} 开发环境`);
  // 注入一个环境变量进去
  process.env.LZD_TYPE = type;
  process.env.LZD_BUILD = false;
  process.env.PORT = config.port;
  process.env.NODE_ENV = 'development';
  // 先把seed copy过去再起服务
  utils.gulpTask('default');
  utils.weexDevtool();
  // TODO 由于上面的task是异步的，正常来说应该等到task结束后才启动预览
  yield sleep(4000);
  utils.gulpTask('watch');
  yield preview(config);
};
