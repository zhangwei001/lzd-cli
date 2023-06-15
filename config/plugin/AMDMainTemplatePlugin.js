/**
 * 重写AMD模块的require方式，让其支持feloader及weex构建
 * Author: 宇果(Hugo)
 */
const AmdMainTemplatePlugin = require('webpack/lib/AmdMainTemplatePlugin');
const Template = require('webpack/lib/Template');
const ConcatSource = require('webpack-sources').ConcatSource;


module.exports = function (options) {
  AmdMainTemplatePlugin.prototype.apply = function (compilation) {
    const { mainTemplate, chunkTemplate } = compilation;

    compilation.seed = compilation.seed || {};

    const onRenderWithEntry = (source, chunk, hash) => {
      let externals = chunk.getModules().filter(m => m.external).map((a) => {
        a.muiName = (typeof a.request === 'object' ? a.request.amd : a.request) || '';
        return a;
      });

      // 将css的require依赖放最后吧
      externals.sort((a) => {
        if (a.muiName.indexOf('.css') !== -1) return 1;
        return -1;
      });

      if (options.ignoreRequires) {
        externals = externals.filter(m =>
          // weex 构建中，需要排除掉的包，这些包不需要加到 deps中
          options.ignoreRequires.indexOf(m.muiName) < 0
        ).filter((m) => {
          let flag = true;
          options.ignoreRequires.forEach((ignore) => {
            if (ignore instanceof RegExp) {
              if (ignore.test(m.muiName)) {
                flag = false;
              }
            }
          });
          return flag;
        });
      }

      const externalsArr = externals.map(
        m => m.muiName
      );

      const externalsDepsArray = JSON.stringify(externalsArr);
      const externalsArguments = externals
        .map(
          m => `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(`${m.id}`)}__`
        )
        .join(', ');

      if (this.name) {
        const name = mainTemplate.getAssetPath(this.name, {
          hash,
          chunk,
        });

        // 将当前模块的seed依赖存储起来
        if (externalsArr && externalsArr.length) {
          compilation.seed[name] = {
            requires: externalsArr,
          };

          // 如果存在i18n 或者 xtpl的话，则需要额外的将 这2个文件依赖的seed添加进去，
          // 做法有点hard code，主要是为了构建性能，么有将这2个文件夹到webpack的entry里去
          externalsArr.forEach((module) => {
            if (/\/i18n$/.test(module)) {
              compilation.seed[module] = {
                requires: ['@ali/mui-i18n/index'],
              };
            } else if (/\.xtpl$/.test(module)) {
              compilation.seed[module] = {
                requires: ['@ali/mui-xtemplate/runtime'],
              };
            }
          });
        }

        // weex 的构建走原来的封装逻辑，不然的话会报错
        if (name.indexOf('weex/') !== -1) {
          return new ConcatSource(
            `define(${JSON.stringify(
              name
            )}, ${externalsDepsArray}, function(require, exports, module) { module.exports = `,
            source,
            '});'
          );
        }

        return new ConcatSource(
          `define(${JSON.stringify(
            name
          )}, ${externalsDepsArray}, function(require) { return `,
          source,
          '});'
        );
      } else if (externalsArguments) {
        return new ConcatSource(
          `define(${externalsDepsArray}, function(require) { return `,
          source,
          '});'
        );
      }
      return new ConcatSource('define(function() { return ', source, '});');
    };

    for (const template of [mainTemplate, chunkTemplate]) {
      template.hooks.renderWithEntry.tap(
        'AmdMainTemplatePlugin',
        onRenderWithEntry
      );
    }

    mainTemplate.hooks.globalHashPaths.tap('AmdMainTemplatePlugin', (paths) => {
      if (this.name) {
        paths.push(this.name);
      }
      return paths;
    });

    mainTemplate.hooks.hash.tap('AmdMainTemplatePlugin', (hash) => {
      hash.update('exports amd');
      if (this.name) {
        hash.update(this.name);
      }
    });
  };
};
