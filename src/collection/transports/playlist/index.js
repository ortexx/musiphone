const util = require('util');
const zlib = require('zlib');
const crypto = require('crypto');
const bytes = require('bytes');
const Collection = require('metastocle/src/collection/transports/collection')();
const utils = require('../../../utils');
const schema = require('../../../schema');
const errors = require('../../../errors');
const deflate = util.promisify(zlib.deflate);
const inflate = util.promisify(zlib.inflate);

module.exports = (Parent) => {
  /**
   * Playlist collection transport
   */
  return class CollectionPlaylist extends (Parent || Collection) {
    /**
     * Prepare the document content
     * 
     * @async
     * @param {string[]} content
     * @returns {string}
     */
    async prepareDocumentContent(content) {
      utils.validateSchema(schema.getPlaylist(), content);
      content = await deflate(JSON.stringify(content));
      content = content.toString('base64');

      if(Buffer.byteLength(content) > this.node.options.playlist.maxSize) {
        const msg =`Maximum playlist size is ${ bytes(this.node.options.playlist.maxSize) }`;
        throw new errors.WorkError(msg, 'ERR_MUSIPHONE_WRONG_PLAYLIST_SIZE');
      }

      return content;
    }

    /**
     * Prepare the document to add
     * 
     * @async
     * @param {object} doc
     * @returns {object}
     */
    async prepareDocumentToAdd(doc) {
      doc = await super.prepareDocumentToAdd(doc);
      doc.content = await this.prepareDocumentContent(doc.content);
      doc.hash = crypto.createHash('md5').update(`${ doc.content }:${ doc.title }`).digest("hex");
      return doc;
    }

    /**
     * Prepare the document to get
     * 
     * @async
     * @param {object} doc
     * @returns {object}
     */
    async prepareDocumentToGet(doc) {
      doc = await super.prepareDocumentToGet(doc);
      const content = await inflate(Buffer.from(doc.content, 'base64'));
      doc.content = JSON.parse(String(content));
      return doc;
    }

    /**
     * The actions update test
     * 
     * @async
     */
    async actionsUpdateTest() {
      const msg =`Collection "Playlist" can't be updated`;
      throw new errors.WorkError(msg, 'ERR_METASTOCLE_WRONG_DOCUMENT_ACTIONS');
    }

    /**
     * The actions getting test
     * 
     * @async
     */
    async actionsGettingTest(actions) {
      utils.validateSchema(schema.getPlaylistCollectionGetting(), actions);
    }

    /**
     * The actions deletion test
     * 
     * @async
     */
    async actionsDeletionTest() {
      const msg =`Collection "Playlist" document can't be deleted`;
      throw new errors.WorkError(msg, 'ERR_METASTOCLE_WRONG_DOCUMENT_ACTIONS');
    }

    /**
     * The actions type test
     */
    actionsTypeTest(actions) {
      utils.actionsTest(actions);
    }   
  }
};