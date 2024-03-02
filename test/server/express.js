import { assert } from "chai";
import serverExpressMusiphone from '../../src/server/transports/express/index.js';

const ServerExpressMusiphone = serverExpressMusiphone();

export default function () {
  describe('ServerExpressMusiphone', () => {
    let server;
    let nodeServer;

    describe('instance creation', function () {
      it('should create an instance', function () { 
        assert.doesNotThrow(() => server = new ServerExpressMusiphone());
        server.node = this.node;  
        nodeServer = this.node.server;
        this.node.server = server; 
      });
    });

    describe('.init()', function () { 
      it('should not throw an exception', async function () {
        await server.init();
      });
    });
    
    describe('.deinit()', function () { 
      it('should not throw an exception', async function () {
        await server.deinit();
      });
    }); 

    describe('reinitialization', () => {
      it('should not throw an exception', async function () {
        await server.init();
      });
    });
    
    describe('.destroy()', function () { 
      it('should not throw an exception', async function () {
        await server.destroy();
        this.node.server = nodeServer; 
      });
    });
  });
}