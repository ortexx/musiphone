import yargs from 'yargs';
import webpack from 'webpack';
import utils from './bin/utils.js';
import config from './webpack.face.js';
import { createRequire } from 'node:module';
 
const argv = yargs(process.argv).argv;
const require = createRequire(import.meta.url);

export default (options = {}, wp) => {
  let apiAddress = options.apiAddress || argv.apiAddress || process.env.MUSIPHONE_API_ADDRESS;

  try {
    apiAddress = require(utils.getAbsolutePath(apiAddress));
  }
  catch(err) {
    console.warn(err);
  };
  
  if(apiAddress) {
    typeof apiAddress == 'string' && (apiAddress = apiAddress.split(','));
    const plugins = [new webpack.DefinePlugin({ API_ADDRESS: JSON.stringify(apiAddress) })];
    options = { plugins };
  }
  
  return wp? config(options, wp): options;
}