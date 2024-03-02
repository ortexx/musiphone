import fse from 'fs-extra';
import tools from './tools.js';
import utils from "./utils.js";
import node from "./node.js";
import client from "./client.js";
import services from "./services.js";
import routes from "./routes.js";

describe('museria', () => {
  before(() => fse.ensureDir(tools.tmpPath));
  after(() => fse.remove(tools.tmpPath));
  describe('utils', utils.bind(this));
  describe('node', node.bind(this));
  describe('client', client.bind(this));
  describe('services', services.bind(this));
  describe('routes', routes.bind(this));
});