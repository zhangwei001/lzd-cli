'use strict';

const utils = require('./utils');

module.exports = function* () {
  // type = lzdmod为模块
  const type = utils.getLzdType();
  process.env.LZD_TYPE = type;
  process.env.LZD_BUILD = true;
  process.env.NODE_ENV = 'production';
  utils.gulpTask('default');
};
