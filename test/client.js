const assert = require('chai').assert;
const Node = require('../src/node')();
const Client = require('../src/client')();
const tools = require('./tools');

describe('Client', () => {
  let client;
  let node;

  before(async function() {
    node = new Node(await tools.createNodeOptions());
    await node.init();
  });

  after(async function() {
    await node.deinit();
  });

  describe('instance creation', function () {
    it('should create an instance', async function () { 
      const options = await tools.createClientOptions({ address: node.address });
      assert.doesNotThrow(() => client = new Client(options));
    });
  });

  describe('.init()', function () {
    it('should not throw an exception', async function () {
      await client.init();
    });
  });

  describe('.getStorageAddress()', function () {
    it('should return the right address', async function () {
      const address = await client.getStorageAddress();
      assert.equal(address, node.options.musicStorageAddress);
    });
  });
  
  describe('.addPlaylist()', function () {
    it('should not add the playlist with wrong song titles', async function () {
      try {
        await client.addPlaylist('test', ['wrongSongTitle']);
        throw new Error('Fail');
      }
      catch(err) {
        assert.equal(err.code, 'ERR_SPREADABLE_VALIDATE_SCHEMA_VALUE');
      }
    });

    it('should add the playlist', async () => {
      const title = 'test';
      const content = [
        'Ping - Pong',
        'Good - Bye'
      ]
      const result = await client.addPlaylist(title, content);
      const doc = await node.db.getDocumentByPk('playlist', result.hash);
      assert.isNotNull(doc, 'check the database');
      assert.equal(result.title, title, 'check the title');
      assert.equal(JSON.stringify(result.content), JSON.stringify(content), 'check the content');
    });
  });

  describe('.getPlaylist()', function () {
    it('should return null', async function () {
      assert.isNull(await client.getPlaylist('unexistent'));
    });

    it('should return the playlist', async function () {
      const doc = (await node.db.getDocuments('playlist'))[0];
      const result = await client.getPlaylist(doc.hash);
      assert.isNotNull(result, 'check the database');
      assert.equal(result.title, doc.title, 'check the title');
      assert.equal(result.hash, doc.hash, 'check the hash');
      assert.lengthOf(result.content, 2, 'check the content');      
    });
  });  

  describe('.deinit()', function () {
    it('should not throw an exception', async function () {
      await client.deinit();
    });
  });
});