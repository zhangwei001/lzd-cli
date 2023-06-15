const logger = require('tapc-plugin-preview/lib/logger');
const server = require('tapc-plugin-preview/lib/server');
const path = require('path');
const api = require('fie-api');

const cwd = process.cwd();
const log = api.log('lzd-toolkit-icms');

module.exports = function* (options) {
  logger.start();
  const template = path.join(__dirname, '../views/home.xtpl');
  log.debug('preview template = %s', template);
  const config = Object.assign({ template, root: cwd, srcDir: 'build' }, options);
  // 后面带上端口
  if (config.port !== 80) {
    config.host = `${config.host}:${config.port}`;
  }
  config.previewUrl = 'http://pre-wormholepreview-ims.alibaba-inc.com/preview';
  log.debug('server config = %o', config);
  yield server(config);
};
