const argv = require('yargs').argv;
const webpack = require('webpack');
const utils = require('./bin/utils');
const config = require('./webpack.face.js');

module.exports = (options = {}, wp) => {
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
  
  return wp? config(options, wp): options;
}