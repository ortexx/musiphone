import serverExpressMetastocle from 'metastocle/src/server/transports/express/index.js';
import routes from './routes.js';
import routesClient from './client/routes.js';

const ServerExpressMetastocle = serverExpressMetastocle();

export default (Parent) => {
  return class ServerExpressMuseria extends (Parent || ServerExpressMetastocle) {
   /**
     * @see ServerExpressMetastocle.prototype.getMainRoutes
     */
    getMainRoutes() {
      let arr = super.getMainRoutes();
      const start = routes.slice(0, routes.length - 1);
      const end = [routes[routes.length - 1]];
      arr = arr.filter(obj => obj.name != 'indexPage');
      arr.splice(arr.findIndex(r => r.name == 'bodyParser'), 0, ...start);
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