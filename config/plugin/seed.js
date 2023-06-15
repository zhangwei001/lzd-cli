const mui = require('mui-dep');
const _ = require('lodash');
const api = require('fie-api');

const logger = api.log('lzd-toolkit-icms');

const DEFAULT_CONFIG = {
  custom: {},
};

module.exports = function generateSeed(cfg) {
  cfg = _.assign({}, DEFAULT_CONFIG, cfg);
  const custom = cfg.custom || {};
  custom.packages = custom.packages || {};
  const muiObj = {
    version: cfg.version,
    path: `//g.alicdn.com/${cfg.project}/${cfg.version}/`,
    ignorePackageNameInUri: true,
    debug: true,
    weex: cfg.weex,
    group: cfg.group,
  };
  custom.packages = _.assign(
    {},
    {
      [cfg.muiName]: muiObj,
    },
    custom.packages || {}
  );
  custom.modules = custom.modules || {};
  return new Promise((resolve, reject) => {
    mui(
      {
        dependsObj: cfg.feDependencies || {},
        rootSeedJson: custom,
        noCache: true,
        useDemandDepSeed: false,
      },
      (err, result, warnings) => {
        if (err) return reject(new Error(err));
        warnings && warnings.forEach(warn => logger.warn(warn));
        // 将主要核心模块的group改为g，这样避免与其他模块combo
        const globalModule = [
          '@ali/mui-babel-polyfill',
          '@ali/lzdmod-crossimage',
          '@ali/lzdmod-datalazyload',
          '@ali/lzdmod-dynamic',
          '@ali/lzdmod-lib-mtop',
          '@ali/lzdmod-mtop',
          '@ali/lzdmod-mtop-dynamic',
          '@ali/mui-fetch',
          '@ali/mui-i18n',
          '@ali/mui-jquery',
          '@ali/mui-mtb-windvane',
          '@ali/mui-mtop',
          '@ali/mui-xtemplate',
          '@ali/mui-zepto',
        ];
        globalModule.forEach((item) => {
          if (result.packages[item]) {
            result.packages[item].group = 'g';
          }
        });
        resolve({
          content: result,
          warnings,
        });
      }
    );
  });
};
