const midds = require('./midds');
const controllers = require('./controllers');

module.exports = [
  { name: 'favicon', fn: controllers.favicon },
  { name: 'static', url: '/', fn: controllers.static },
  { name: 'indexPage', method: 'get', url: '*', fn: [midds.networkAccess, controllers.indexPage] }
];