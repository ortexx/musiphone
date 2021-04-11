const path = require('path');
const merge = require('lodash/merge');
const mtWebpackConfig = require('metastocle/webpack.client.js');

module.exports = (options = {}, wp) => {
  options = merge({ include: [] }, options);  
  options.include.push(path.resolve(__dirname, 'src/browser/client'));  
  return wp? mtWebpackConfig(options, wp): options;
}