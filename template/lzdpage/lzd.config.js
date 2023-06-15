/**
 * icms toolkit config
 */
module.exports = {
  toolkit: '@ali/lzd-toolkit-icms',
  toolkitConfig : {
    port : 3000,
    //Note: If you do not write a weex page, please set it to false
    weex : true,
    // The "entry" configuration when the webpack is built, will merge the default configuration
    webpackEntry : {
      //example:
      // 'm/entry' : './src/m/entry.js'
    }
  },
  tasks: {
    start: [

      {
        // Must be daily/5.0.0 or later
        command: 'lzd git branch --gte 5.0.0'
      },
      {
        // Link the current project to .lzd/LocalCDNPath
        command: 'lzd link',
      },
      {
        // sync branch version to package.json
        command: 'lzd git sync',
      },
      {
        //init the git commit specification
        command : 'lzd commit init'
      },
      {
        // start proxy server
        command : 'lzd proxy start --enable',
        async : true
      }
    ],
    open: [
      {
        // open the current project on gitlab
        command: 'lzd git open',
      },
    ],
  },
};
