
const path = require('path');
const merge = require('lodash/merge');
const spWebpackConfig = require('spreadable/webpack.common.js');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (options = {}, wp) => {
  const copyPatterns = [
    'index.html', 
    'nocover.png', 
    'cordova.js'
  ].map((pattern) => {
    return {
      from: path.resolve(__dirname, `src/browser/face/${pattern}`), 
      to: path.resolve(__dirname, `dist/face/${pattern}`)
    }
  });
  options = merge({
    name: 'face',
    include: [],
    plugins: [],   
  }, options);
  options.plugins.push(new CopyPlugin({ patterns: copyPatterns }));
  options.include.push([
    path.resolve(__dirname, 'src/browser/face'),
    path.resolve(__dirname, 'node_modules/akili')
  ]);
  return wp? spWebpackConfig(options, wp): options;
};