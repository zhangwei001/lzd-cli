import $ from '@ali/mui-zepto/zepto';
import DynamicRender from '@ali/lzdmod-dynamic/render';
import mtop from '@ali/lzdmod-mtop-dynamic/index';
import $i18n from '<{%=fileName %}>/i18n';

class Module {
  constructor(box) {
    this.$el = $(box);
    this.initView();
    this.bindEvents();
    //TODO: please remove this demo method
    Module.initDemo(box);
  }

  // The module initialization view
  initView() {
    /**
     * Instantiate lazy render class, only when the module is in the visual window area of the page will execute the DynamicCallback callback
     * doc: http://gitlab.alibaba-inc.com/lzdmod/dynamic/blob/master/README.md
     * source code: http://gitlab.alibaba-inc.com/lzdmod/dynamic/blob/master/src/render.js
     */
    new DynamicRender({
      DynamicParentCls: this.$el,             // Lazy loaded parent container , default is body
      DynamicItemCls: '.J-dynamic-box',       // Need lazy load content of container
      DynamicTmsDateCls: '.J-dynamic-data',   // Data of container
      DynamicHtmlCls: '.J-tmpl',              // Template of container , use xtemplate syntax , doc: https://github.com/kissyteam/xtemplate/blob/master/docs/syntax-cn.md
      DynamicCallback: (items, xTemp, dynamicData) => {
        // TODO: module data lazy load callback
        if (!dynamicData.length) {
          items.innerHTML = '';
          return;
        }
        items.innerHTML = xTemp.render({ result: dynamicData, terminal: 'desktop' , $i18n });
      },
    });
  }
  // Bind events to the module
  bindEvents() {}

  /**
   * fetch data from ald mtop
   * Notes: If you don't need it, please remove this method
   * @returns Promise
   */
  static fetchDemoAldData() {
    const params = {
      isbackup: true,
      size: 4,
    };
    const mtopApiName = 'mtop.lazada.pegasus.service.AldRecommendService.recommend2';
    const config = {
      mtopApiName,
      params,
    };
    const dataInfo = [
      {
        __data_default: {},
        __data_param: {
          appId: '201808030',
        },
        __data_source: 'ald',
        __data_type: 'jsonp',
        __data_url: mtopApiName,
      },
    ];
    return mtop.request(config, dataInfo);
  }


  static initDemo(box) {
    console.log($i18n('hello, my name is %s', '<{%=dirName %}>'));
    console.log('current language: ', window.g_config.language);
    console.log("I'm a desktop module");
    console.log($(box).find('.J-temp-dom').html());
    // local dev, please use host: 127.0.0.1
    Module.fetchDemoAldData().then( data=> {
      console.log('fetch mtop demo data',data);
    })
  }
}

export default box => new Module(box);
