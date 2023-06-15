'use strict';

import $ from '@ali/mui-zepto/zepto';
import $i18n from '<{%=fileName %}>/i18n';

class Page {
  constructor() {
    this.initView();
    this.bindEvents();
    this.initDemo();
  }
  // The module initialization view
  initView() {}

  // Bind events to the module
  bindEvents() {}

  initDemo() {
    console.log($i18n('hello, my name is %s', '<{%=dirName %}>'));
    console.log($i18n('current language: %s', window.g_config.language));
    console.log("I'm a pc page");
    console.log($('.<{%=dirName %}> h1').text());
  }
}

export default () => {
  new Page();
};
