'use strict';

const utils = require('./utils');

module.exports = function* () {
  process.env.LZD_BUILD = false;
  process.env.NODE_ENV = 'development';
  utils.gulpTask('watch:all');
};
