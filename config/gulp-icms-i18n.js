'use strict';

const path = require('path');
const through = require('through2');
const File = require('vinyl');
const UglifyJS = require('uglify-js');

module.exports = function (opt) {
  const languages = {};

  opt = Object.assign({
    defaultLanguage: 'en-US',
    tagsLength: 2,
  }, opt);

  function bufferContents(file, encod, cb) {
    const langName = path.basename(file.path, '.json');

    try {
      languages[langName] = JSON.parse(file.contents.toString());
    } catch (e) {
      // throw new Error(`语言资源解析异常，请确保${langName}.json的文件内容为json格式。\nJSON.parse error: ${e.message}`);
      throw new Error(`Parse language resources failed，please check ${langName}.json.\nJSON.parse error: ${e.message}`);
    }

    cb();
  }

  function endStream(cb) {
    const languagesDataStr = JSON.stringify(languages, null, 2);

    if (opt.needXtpl) {
      const file1 = new File({
        path: 'i18n.xtpl',
      });
      const xtplStr = getI18nXtpl(languagesDataStr, opt.modName, opt.defaultLanguage, opt.tagsLength);
      file1.contents = new Buffer(xtplStr);
      this.push(file1);
    }

    const file2 = new File({
      path: 'i18n.js',
    });
    const jsStr = getI18nJs(languagesDataStr, opt.modName, opt.defaultLanguage, opt.tagsLength);
    file2.contents = new Buffer(jsStr);
    this.push(file2);

    if (opt.needWeex) {
      const file3 = new File({
        path: 'i18n-native.js',
      });
      const weexStr = getI18nWeex(languagesDataStr, opt.modName, opt.defaultLanguage, opt.tagsLength);
      file3.contents = new Buffer(weexStr);
      this.push(file3);
    }

    cb();
  }

  return through.obj(bufferContents, endStream);
};


function getI18nXtpl(data, modName, defaultLanguage, tagsLength) {
  return `
  {{#if(!$zebra_language_packages)}}{{set($zebra_language_packages={})}}{{/if}}
  {{set($zebra_language_packages["${modName}"]=${data})}}
  {{set($zebra_detected_language = $http.dataLanguage || $http.language || '${defaultLanguage}')}}
  {{#if(!$zebra_language_packages["${modName}"][$zebra_detected_language])}}
    {{set($zebra_detected_language = $zebra_detected_language.split('-', ${tagsLength}).join('-'))}}
  {{/if}}
  {{$i18n.set($zebra_language_packages["${modName}"][$zebra_detected_language])}}
`;
}

function getI18nJs(data, modName, defaultLanguage, tagsLength) {
  const content = `
    define('${modName}/i18n', ["@ali/mui-i18n/index"], function (require, exports, module) {
    'use strict';
    var languageData = ${data};
    var language = (window.g_config && window.g_config.language) || '${defaultLanguage}';
    if (!languageData[language]) {
      language = language.split('-', ${tagsLength}).join('-');
    }
    module.exports = require('@ali/mui-i18n/index').init(languageData[language] || {});
  });
  `;
  const result = UglifyJS.minify(content);
  return result.code;
}

function getI18nWeex(data, modName, defaultLanguage, tagsLength) {
  const content = `
    define('${modName}/i18n-native', function (require, exports, module) {
      'use strict';
      var languageData = ${data};
      var zebraConfig = require('zebraConfig') || {};
      var language = zebraConfig.language || '${defaultLanguage}';
      if (languageData[language]) {
        language = language.split('-', ${tagsLength}).join('-');
      }
      module.exports = require('zebraUtils').i18n.init(languageData[language] || {});
    });
  `;
  const result = UglifyJS.minify(content);
  return result.code;
}
