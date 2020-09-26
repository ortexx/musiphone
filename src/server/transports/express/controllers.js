const favicon = require('serve-favicon');
const expressStatic = require('express-static-search');
const path = require('path');

/**
 * Server index page handler
 */
module.exports.indexPage = () => {
  return (req, res) => res.sendFile(path.resolve(__dirname, '../../../browser/face/index.html'));
};

/**
 * Server favicon handler
 */
module.exports.favicon = () => {
  return favicon(path.resolve(__dirname, '../../../browser/face/favicon.png'));
};

/**
 * Server static handler
 */
module.exports.static = (node, options) => {
  options = Object.assign({
    beforeSend: (res) => {
      res.setHeader('Cache-Control', `public, max-age=${ node.options.server.staticMaxAge / 1000 }`);
    }
  }, options)
  return expressStatic(path.resolve(__dirname, '../../../../dist/face'), options);
};