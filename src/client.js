const ClientMetastocle = require('metastocle/src/client')();
const utils = require('./utils');
const errors = require('./errors');
const pack = require('../package.json');

module.exports = (Parent) => {
  return class ClientMusiphone extends (Parent || ClientMetastocle) {
    static get version () { return pack.version }
    static get codename () { return pack.name }
    static get utils () { return utils }
    static get errors () { return errors }

    /**
     * Get the storage address
     * 
     * @param {object} [options]
     * @returns {string|string[]}
     */
    async getStorageAddress(options = {}) {
      return (await this.request('get-storage-address', options)).address;
    }

    /**
     * Get the playlist
     * 
     * @param {string} hash
     * @param {object} [options]
     * @returns {object}
     */
    async getPlaylist(hash, options = {}) {
      return await this.getDocumentByPk('playlist', hash, options);
    }

    /**
     * Add the playlist
     * 
     * @param {string} title
     * @param {string[]} content
     * @param {object} [options]
     * @returns {object}
     */
    async addPlaylist(title, content, options= {}) {
      options = Object.assign({}, options, { ignoreExistenceError: true });
      return await this.addDocument('playlist', { title, content }, options);
    }
  }
};