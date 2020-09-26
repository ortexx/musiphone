const assert = require('chai').assert;
const Node = require('../src/node')();
const tools = require('./tools');

describe('Node', () => {
  let node;

  describe('instance creation', () => {
    it('should create an instance', async () => { 
      const options = await tools.createNodeOptions();
      assert.doesNotThrow(() => node = new Node(options));
    });
  });

  describe('.init()', () => {
    it('should not throw an exception', async () => {
      await node.init();
    });

    it('should create a playlist collection', async () => {
      assert.isNotNull(await node.getCollection('playlist'));
    });
  });

  describe('.exportPlaylists()', () => {
    let importNode;
    
    before(async () => {
      importNode = new Node(await tools.createNodeOptions());
      await importNode.init();
    });

    after(async () => {
      await importNode.deinit();
    });

    it('should export the playlist', async () => {
      const result = await node.addDocument('playlist', { content: ['Artist - Title'] });      
      await node.exportPlaylists(importNode.address);
      const doc = await importNode.db.getDocumentByPk('playlist', result.hash);
      assert.isNotNull(doc, 'check the database');
    });
  });

  describe('.deinit()', () => {
    it('should not throw an exception', async () => {
      await node.deinit();
    });
  }); 

  describe('reinitialization', () => {
    it('should not throw an exception', async () => {
      await node.init();
    });
  });

  describe('.destroy()', () => {
    it('should not throw an exception', async () => {
      await node.destroy();
    });
  });
});