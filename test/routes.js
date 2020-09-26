const assert = require('chai').assert;
const fetch = require('node-fetch');
const Node = require('../src/node')();
const Client = require('../src/client')();
const tools = require('./tools');

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