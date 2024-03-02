import * as controllers from './controllers.js';
import midds from '../midds.js';

export default [
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