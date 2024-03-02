import path from 'path';
import merge from 'lodash/merge.js';
import mtWebpackConfig from 'metastocle/webpack.client.js';

const __dirname = new URL('.', import.meta.url).pathname;

export default (options = {}, wp) => {
  options = merge({ include: [] }, options);  
  options.include.push(path.resolve(__dirname, 'src/browser/client'));  
  return wp? mtWebpackConfig(options, wp): options;
}