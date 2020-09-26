const path = require('path');
const merge = require('lodash/merge');
const mtWebpackConfig = require('metastocle/webpack.client.js');

module.exports = (options = {}, webpack = null, onlyMerge = false) => {
  options = merge({ include: [] }, options);  
  options.include.push(path.resolve(__dirname, 'src/browser/client'));  
  return onlyMerge? options: mtWebpackConfig(options);
}