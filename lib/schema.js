const open = require('open');
const api = require('fie-api');

const log = api.log('lzd-toolkit-icms');

module.exports = function* (options) {
  const editor = require('@ali/icms-schema-editor');

  let port = 4000;
  if (options.clientOptions.port) {
    port = options.clientOptions.port;
  }

  log.info('staring data schema editor server...');
  const edit = editor({
    cwd: process.cwd(),
  });

  if (options.clientOptions.create) {
    log.info('Creating schema based on mock data...');
    edit.utils.createSchemaByMockData({
      cwd: process.cwd(),
    });
    log.info('Schema created!');
  }
  edit.listen(port);
  open(`http://127.0.0.1:${port}`);
};
