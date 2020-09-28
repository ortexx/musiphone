const argv = require('yargs').argv;
const webpack = require('webpack');
const utils = require('./bin/utils');
const config = require('./webpack.face.js');

module.exports = (options = {}, wp = null, onlyMerge = false) => {
  let apiAddress = options.apiAddress || argv.apiAddress || process.env.MUSIPHONE_API_ADDRESS;

  try {
    apiAddress = require(utils.getAbsolutePath(apiAddress));
  }
  catch(err) {};
  
  if(apiAddress) {
    typeof apiAddress == 'string' && (apiAddress = apiAddress.split(','));
    const plugins = [new webpack.DefinePlugin({ API_ADDRESS: JSON.stringify(apiAddress) })];
    options = { plugins };
  }
  
  return onlyMerge? options: config(options);
}