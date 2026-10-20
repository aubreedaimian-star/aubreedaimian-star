'use strict';

const colors = require('colors/safe');

function buildMessages() {
  const title = 'My First Node.JS Program';
  return [
    `*********** ${title} ***********`,
    'Welcome to your first node program',
  ];
}

function run(logger = console) {
  const [title, welcome] = buildMessages();
  logger.log(colors.red(title));
  logger.log(colors.green(welcome));
}

if (require.main === module) {
  run();
}

module.exports = { buildMessages, run };
