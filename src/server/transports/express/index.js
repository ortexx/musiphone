const ServerExpressMetastocle = require('metastocle/src/server/transports/express')();
const routes = require('./routes');
const routesClient = require('./client/routes');

module.exports = (Parent) => {
  return class ServerExpressMuseria extends (Parent || ServerExpressMetastocle) {
   /**
     * @see ServerExpressMetastocle.prototype.getMainRoutes
     */
    getMainRoutes() {
      let arr = super.getMainRoutes();
      const current = routes.slice(2);
      const end = current.slice(2);
      arr = [routes[0], routes[1]].concat(arr.filter(obj => obj.name != 'indexPage'));
      arr.splice(arr.findIndex(r => r.name == 'bodyParser'), 0, ...[current[0], current[1]]);
      arr.splice(arr.findIndex(r => r.name == 'notFound'), 0, ...end);
      return arr;
    }
  
    /**
     * @see ServerExpressMetastocle.prototype.getClientRoutes
     */
    getClientRoutes() {     
      return super.getClientRoutes().concat(routesClient);
    }  
  }
};