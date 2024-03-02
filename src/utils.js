import mtUtils from 'metastocle/src/utils.js';

const utils = Object.assign({}, mtUtils);

/**
 * Check it is a right playlist title
 * 
 * @param {string} title
 * @returns {boolean}
 */
utils.isPlaylistTitle = function (title) {
  if(typeof title != 'string' || Buffer.byteLength(title) > 1024) {
    return false;
  }

  return true;
};

export default utils;