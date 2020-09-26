const controllers = require('./controllers');
const midds = require('../midds');

module.exports = [
  /**
   * Get the storage address
   * 
   * @api {post} /client/get-storage-address
   * @apiSuccess {object} - { address: '' }
   */
  { 
    name: 'getStorageAddress', 
    method: 'post', 
    url: '/get-storage-address',
    fn: [
      midds.requestQueueClient,
      controllers.getStorageAddress
    ]
  }
];