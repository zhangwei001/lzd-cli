'use strict';

const chalk = require('chalk');

module.exports = function* () {
  const help = [
    '',
    'lzd-toolkit-icms Toolkit help info:  $ lzd [command] [option]',
    '',
    '  $ lzd start                 # Could one click to start the dev environment',
    '  $ lzd start --solution pre  # start dev environment and use pre solution',
    '  $ lzd watch                 # Only watch the file changes, do not start the dev environment',
    '  $ lzd preview               # Only start wormhole service , do not start proxy and watch',
    '  $ lzd schema                # start mock data schema edit service',
    '  $ lzd build                 # local build project',
    '  $ lzd publish [type]        # publish assets to cdn',
    '  $ lzd help                  # Review help info',
    '  $ lzd add                   # Add lzdmod or mui package in package.json',
    '  $ lzd eslint fix            # run eslint',
    '  $ lzd proxy start           # Start proxy server',
    '  $ lzd proxy start --enable  # Start proxy server and enable system web proxy',
    '',
    'more detail: http://fie.alibaba-inc.com/mod?name=ali-lzd-toolkit-icms',
    '',
  ].join('\r\n');

  process.stdout.write(chalk.green(help));
};
