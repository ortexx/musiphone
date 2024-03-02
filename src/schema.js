import mtSchema from 'metastocle/src/schema.js';
import maUtils from'museria/src/utils.js';
import utils from './utils.js';

const schema = Object.assign({}, mtSchema);

schema.getPlaylist = function () {
  return {
    type: 'array',
    uniq: true,
    minLength: 1,
    items: {      
      type: 'string',
      value: maUtils.isSongTitle.bind(maUtils)
    }
  };
};

schema.getPlaylistCollection = function () {
  return {
    type: 'object',
    props: {
      hash: 'string',
      title: {
        type: 'string',
        value: utils.isPlaylistTitle.bind(utils)
      },
      content: 'string'
    }
  }
};

schema.getPlaylistCollectionGetting = function () {
  const nullType = {
    type: 'object',
    value: null
  };

  return {
    type: 'object',
    strict: true,
    props: {          
      offset: {
        type: 'number',
        value: 0
      },
      limit: {
        type: 'number',
        value: 1
      },
      removeDuplicates: {
        type: 'boolean',
        value: true
      },
      sort: nullType,
      fields: nullType,
      filter: nullType
    }
  }
};

export default schema;