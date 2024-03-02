import { assert } from "chai";
import fetch from 'node-fetch';
import node from '../src/node.js';
import client from '../src/client.js';
import tools from './tools.js';

const Node = node();
const Client = client();

export default function () {
  describe('routes', () => {
    let node;
    let client;

    before(async function() {
      node = new Node(await tools.createNodeOptions({ 
        network: { 
          auth: { username: 'username', password: 'password' }
        }
      }));
      await node.init();
      client = new Client(await tools.createClientOptions({ 
        address: node.address, 
        auth: { username: 'username', password: 'password' }
      }));
      await client.init();
    });

    after(async function() {
      await node.deinit();
      await client.deinit();
    });
  
    describe('/client/get-storage-address', function () {
      it('should return an auth error', async function () { 
        const res = await fetch(`http://${node.address}/client/get-storage-address`, { method: 'get' });
        assert.equal(await res.status, 401);
      });

      it('should return an address', async function () {
        const options = client.createDefaultRequestOptions();
        const res = await fetch(`http://${node.address}/client/get-storage-address`, options);
        const json = await res.json();
        assert.equal(json.address, node.options.musicStorageAddress);
      });
    });
  });
}