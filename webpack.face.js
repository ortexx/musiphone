import path from 'path';
import merge from 'lodash/merge.js';
import spWebpackConfig from 'spreadable/webpack.common.js';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = new URL('.', import.meta.url).pathname;

export default (options = {}, wp) => {
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