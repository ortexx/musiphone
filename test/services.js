import node from '../src/node.js';
import tools from './tools.js';
import server from './server/express.js';

const Node = node();

export default function () {
  describe('services', () => {
    before(async function () {
      this.node = new Node(await tools.createNodeOptions({ server: false }));
      await this.node.init();
      this.node.options.server = { staticMaxAge: 1000 * 60 };
    });  

    after(async function () {
      await this.node.destroy();
    });

    describe('server', server.bind(this));
  });
}