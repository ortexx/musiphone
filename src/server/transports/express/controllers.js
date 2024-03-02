import faviconLib from 'serve-favicon';
import expressStatic from 'express-static-search';
import path from 'path';

const __dirname = new URL('.', import.meta.url).pathname;

/**
 * Server index page handler
 */
export const indexPage = () => {
  return (req, res) => res.sendFile(path.resolve(__dirname, '../../../browser/face/index.html'));
};

/**
 * Server favicon handler
 */
export const favicon = () => {
  return faviconLib(path.resolve(__dirname, '../../../browser/face/favicon.png'));
};

/**
 * Server static handler
 */
export const staticFn = (node, options) => {
  options = Object.assign({
    beforeSend: (res) => {
      res.setHeader('Cache-Control', `public, max-age=${ node.options.server.staticMaxAge / 1000 }`);
    }
  }, options)
  return expressStatic(path.resolve(__dirname, '../../../../dist/face'), options);
};

export { staticFn as static };