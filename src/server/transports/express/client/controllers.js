/**
 * Get the storage address
 */
export const getStorageAddress = node => {
  return async (req, res, next) => {
    try {
      res.send({ address: node.options.musicStorageAddress });
    }
    catch(err) {
      next(err);
    }
  }
};