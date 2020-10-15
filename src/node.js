const _ = require('lodash');
const NodeMetastocle = require('metastocle/src/node')();
const CollectionMusiphone = require('./collection/transports/playlist')();
const ServerExpressMuseria = require('./server/transports/express')();
const utils = require('./utils');
const schema = require('./schema');
const pack = require('../package.json');

module.exports = (Parent) => {  
  return class NodeMusiphone extends (Parent || NodeMetastocle) {
    static get version () { return pack.version }
    static get codename () { return pack.name }
    static get ServerTransport () { return ServerExpressMuseria }

     /**
     * @see NodeMetastocle
     * @param {string|string[]} [options.musicStorageAddress]
     */
    constructor(options = {}) {
      if(!options.musicStorageAddress) {
        throw new Error('You must pass the music storage address');
      }

      options = _.merge({
        server: {
          staticMaxAge: '1d'
        },
        playlist: {
          maxSize: '100kb',
          collection: {            
            pk: 'hash',
            queue: true,
            maxSize: '200mb',
            schema: schema.getPlaylistCollection()
          }
        }
      }, options);
      super(options);
    }

    /**
     * Prepare the services
     * 
     * @async
     */
    async prepareServices() {
      await super.prepareServices.apply(this, arguments);
      await this.preparePlaylistCollection();
    }

    /**
     * Prepare the playlist collection service
     * 
     * @async
     */
    async preparePlaylistCollection() {
      await this.addCollection('playlist', new CollectionMusiphone(this.options.playlist.collection));
    }

    /**
     * Export all playlists to another server
     * 
     * @async
     * @param {string} address
     * @param {object} [options]
     * @param {boolean} [options.strict]
     */
    async exportPlaylists(address, options = {}) {  
      options = _.merge({
        strict: false
      }, options);
      let success = 0;
      let fail = 0;
      const timer = this.createRequestTimer(options.timeout);
      await this.requestServer(address, `/ping`, {
        method: 'GET',
        timeout: timer(this.options.request.pingTimeout)
      });
      const collection = await this.getCollection('playlist');
      const docs = await this.db.getDocuments('playlist');

      for(let i = 0; i < docs.length; i++) {
        const doc = docs[i];

        try {
          const info = { collection: collection.name };     
          collection.pk && (info.pkValue = _.get(doc, collection.pk));
          await this.duplicateDocument([address], doc, info, { timeout: timer() });
          success++;
          this.logger.info(`Playlist "${doc.hash}" has been exported`);
        }
        catch(err) {
          if(options.strict) {
            throw err;
          }
          
          fail++;
          this.logger.warn(err.stack);
          this.logger.info(`Playlist "${doc.hash}" has been failed`);
        }
      }

      if(!success && !fail) {
        this.logger.info(`There haven't been playlists to export`);
      }
      else if(!fail) {
        this.logger.info(`${success} playlist(s) have been exported`);
      }
      else {
        this.logger.info(`${success} playlist(s) have been exported, ${fail} playlist(s) have been failed`);
      }
    }

    /**
     * Prepare the options
     */
    prepareOptions() {
      super.prepareOptions();      
      this.options.server && (this.options.server.staticMaxAge = utils.getMs(this.options.server.staticMaxAge));
      this.options.playlist.maxSize = utils.getBytes(this.options.playlist.maxSize);
    }
  }
};