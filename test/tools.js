const _tools = Object.assign({}, require('metastocle/test/tools'));
const tools =  Object.assign({}, _tools);

/**
 * Create the node options
 * 
 * @async
 * @param {object} [options]
 * @returns {object}
 */
tools.createNodeOptions = async function (options = {}) {
  options = await _tools.createNodeOptions(options);
  options.musicStorageAddress = 'localhost:1';
  return options;
};

module.exports = tools;