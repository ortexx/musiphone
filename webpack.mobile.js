import yargs from 'yargs';
import webpack from 'webpack';
import utils from './bin/utils.js';
import config from './webpack.face.js';
 
const argv = yargs(process.argv).argv;

export default (options = {}, wp) => {
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