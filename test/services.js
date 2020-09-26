const Node = require('../src/node')();
const tools = require('./tools');

describe('services', () => {
  before(async function () {
    this.node = new Node(await tools.createNodeOptions({ server: false }));
    await this.node.init();
    this.node.options.server = { staticMaxAge: 1000 * 60 };
  });  

  after(async function () {
    await this.node.destroy();
  });

  describe('server', () => {
    require('./server/express');    
  });
});