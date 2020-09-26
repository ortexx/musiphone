/**
 * Get the storage address
 */
module.exports.getStorageAddress = node => {
  return async (req, res, next) => {
    try {
      res.send({ address: node.options.musicStorageAddress });
    }
    catch(err) {
      next(err);
    }
  }
};