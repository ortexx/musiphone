const chalk = require('chalk');
const argv = require('yargs').argv;
const utils = require('./utils');
const actions = Object.assign({}, require('metastocle/bin/actions'));

/**
 * Add the playlist
 */
actions.addPlaylist = async node => {
  let content = argv.content || argv.s;
  const title = argv.title || argv.t;

  try {
    content = require(utils.getAbsolutePath(content));
  }
  catch(err) {
    content = JSON.parse(content)
  }

  const result = await node.addDocument('playlist', { title, content });
  //eslint-disable-next-line no-console
  console.log(chalk.cyan(`Playlist "${ result.title || result.hash }" has been added`));
};

/**
 * Get the playlist
 */
actions.getPlaylist = async node => {
  const hash = argv.hash || argv.h;
  const document = await node.getDocumentByPk('playlist', hash);

  if(!document) {
    throw new Error(`There is no playlist "${ hash }" in the database`);
  }

  //eslint-disable-next-line no-console
  console.log(chalk.cyan(`Playlist ${ JSON.stringify(document, null, 1) } has been found`));
};

/**
 * Export all playlists to another node
 */
actions.exportPlaylists = async node => {
  await node.exportPlaylists(argv.address || argv.n);
  //eslint-disable-next-line no-console
  console.log(chalk.cyan('The playlists have been exported'));
};

module.exports = actions;