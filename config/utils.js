/**
 * auto external runtime builtin module or lzdmod
 * @param \{{{obj}}\} {{pkg}} {{package.json}}{{}}
 */
const defaultExternal = {
  rax: 'commonjs rax',
  'weex-nuke': 'commonjs weex-nuke',
  '@ali/WeexUtils': 'commonjs @ali/WeexUtils',
  zebraConfig: 'commonjs zebraConfig',
  zebraUtils: 'commonjs zebraUtils',
};
exports.autoExternal = function (pkg) {
  return function (context, request, callback) {
    // 排除掉@weex-module
    if (/^@weex-module\//.test(request)) {
      return callback(null, 'commonjs ' + request); // eslint-disable-line
    }
    // 排除掉lzdmod和mui文件，除了commonjs的i18n文件
    if (/mui\/.*/.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    if (/mui-.*/.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    if (/lzdmod-.*/.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    if (/lzdpage-.*/.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    const reg = new RegExp(`${pkg.name}/i18n`);
    if (reg.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    if (/nuke-/.test(request)) {
      return callback(null, `commonjs ${request}`);
    }
    if (defaultExternal[request]) {
      return callback(null, defaultExternal[request]);
    }
    callback();
  };
};
