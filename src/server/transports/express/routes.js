import midds from './midds.js';
import * as controllers from './controllers.js';

export default [
  { name: 'favicon', fn: controllers.favicon },
  { name: 'static', url: '/', fn: controllers.static },
  { name: 'indexPage', method: 'get', url: '*', fn: [midds.networkAccess, controllers.indexPage] }
];