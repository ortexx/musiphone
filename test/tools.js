import mtTools from 'metastocle/test/tools.js';
const tools =  Object.assign({}, mtTools);

/**
 * Create the node options
 * 
 * @async
 * @param {object} [options]
 * @returns {object}
 */
tools.createNodeOptions = async function (options = {}) {
  options = await mtTools.createNodeOptions(options);
  options.musicStorageAddress = 'localhost:1';
  return options;
};

export default tools;