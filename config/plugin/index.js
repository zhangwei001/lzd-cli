const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const api = require('fie-api');
const ExternalModuleFactoryPlugin = require('webpack/lib/ExternalModuleFactoryPlugin');
const generateSeed = require('./seed');
const AMDMainTemplatePlugin = require('./AMDMainTemplatePlugin');

const logger = api.log('lzd-toolkit-icms');

const defaultExternal = {
  rax: 'commonjs rax',
  'weex-nuke': 'commonjs weex-nuke',
  '@ali/WeexUtils': 'commonjs @ali/WeexUtils',
  zebraConfig: 'commonjs zebraConfig',
  zebraUtils: 'commonjs zebraUtils',
};

function MuiMainTemplatePlugin(options) {
  this.options = Object.assign({}, options, {
    ignoreRequires: ['rax', 'weex-nuke', 'zebraConfig', 'zebraUtils', '@ali/WeexUtils', /@weex-module\//],
  });
}

const MUI_PLUGIN_NAME = 'MuiMainTemplatePlugin';

MuiMainTemplatePlugin.prototype = {
  apply(compiler) {
    const owner = this;

    // 重写AMD模块的方法
    AMDMainTemplatePlugin(this.options);

    // 一个新的编译(compilation)创建之后，钩入(hook into) compiler
    // DOC: https://webpack.js.org/api/compiler-hooks/
    compiler.hooks.compile.tap(MUI_PLUGIN_NAME, (params) => {
      // 排除需要CDN方式进行加载的lib
      // 排除weex 模块的调用，在lazada app weex里调用 @weex的模块
      new ExternalModuleFactoryPlugin('amd', [
        function (context, request, callback) {
          // 当前模块的引用，都要打包进去，除了i18n,xtpl相关文件外
          // 当前模块的引用方式有2种： @ali/lzdmod-module/xxxx 或者 ./xxxx
          if (request.indexOf(owner.options.muiName) !== -1 || request.indexOf('.') === 0) {
            // 如果直接require i18n 下面的json文件也是可以的
            if ((request.indexOf('/i18n') !== -1 && request.indexOf('.json') === -1) ||
              request.indexOf('.css') !== -1 ||
              request.indexOf('.xtpl') !== -1
            ) {
              return callback(null, `commonjs ${request}`);
            }
            return callback();
          }

          // 排除掉@weex-module / mui / lzdmod / lzdpage / nuke 的CDN模块
          if (/^@weex-module\/|mui\/.*|mui-.*|lzdmod-.*|.*\.css|lzdpage-.*|nuke-/.test(request)) {
            return callback(null, `commonjs ${request}`);
          }
          if (defaultExternal[request]) {
            return callback(null, defaultExternal[request]);
          }
          callback();
        },
      ]).apply(params.normalModuleFactory);
    });


    if (this.options.seed) {
      compiler.hooks.afterCompile.tapAsync(MUI_PLUGIN_NAME, (compilation, callback) => {
        const cwd = this.options.cwd || process.cwd();
        generateSeed({
          custom: {
            modules: compilation.seed,
          },
          muiName: this.options.muiName, // 当前模块名称
          weex: this.options.weex, // 是否是weex模块
          version: this.options.version, // 当前模块版本
          project: this.options.project, // group/name 格式
          group: this.options.group, // feloader combo时所需的分组
          feDependencies: this.options.feDependencies, // package中的feDependencies字段
          ignoreRequires: this.options.ignoreRequires, // 不需要在define 里面声明的依赖
        })
          .then((result) => {
            const minSeed = JSON.stringify(result.content);
            const formatSeed = JSON.stringify(result.content, null, 2);
            mkdirp.sync(path.join(cwd, 'build'));
            fs.writeFileSync(path.join(cwd, 'build', 'seed.json'), formatSeed, 'utf-8');
            fs.writeFileSync(path.join(cwd, 'build', 'seed.js'), `require.config(${minSeed});`, 'utf-8');
            fs.writeFileSync(path.join(cwd, 'demo', 'seed.json'), formatSeed, 'utf-8');
            callback && callback();
          })
          .catch((e) => {
            logger.error(e.message);
            callback && callback();
          });
      });
    }
  },
};

module.exports = MuiMainTemplatePlugin;
