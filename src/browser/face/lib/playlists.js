
import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import clientStorage from '../client-storage';
import client from '../client';
import url from 'url';

const maxPlaylists = 15;

/**
 * Get the active playlist
 * 
 * @returns {object}
 */
export function getActivePlaylist() {
  return store.activePlaylist || utils.copy(store.playlists[store.playlists.length - 1]) || createPlaylist();
}

/**
 * Create the song info
 * 
 * @param {string} title
 * @returns {{title: string, audioLink: string, coverLink: string}}
 */
export function createSongInfo(title) {
  const address = clientStorage.workerAddress || workStorage.getItem('storageAddress');

  if(!address) {
    throw new Error('Storage address not found');
  }
  
  return {
    title,
    audioLink: clientStorage.createRequestedSongAudioLink(title, { address }),
    coverLink: clientStorage.createRequestedSongCoverLink(title, { address })
  }
}

/**
 * Remove the song from the playlist
 * 
 * @param {string} title 
 * @param {object} playlist 
 */
export function removeSong(title, playlist) {
  const index = playlist.songs.findIndex(s => s.title === title);
  index > -1&& playlist.songs.splice(index, 1)
  return playlist;
}

/**
 * Add the song to the playlist
 * 
 * @param {string} title 
 * @param {object} playlist 
 * @returns {object}
 */
export function addSong(title, playlist) {
  const info = createSongInfo(title);
  const index = playlist.songs.findIndex(s => s.title === title);
  index == -1 && playlist.songs.unshift(info);
  return playlist;
}

/**
 * Add a new playlist
 * 
 * @param {object} playlist 
 * @returns {object}
 */
export function addPlaylist(playlist) {  
  !playlist.link && (playlist.link = createPlaylistLink(playlist.hash));
  const index = store.playlists.findIndex(p => p.hash === playlist.hash);
  index > -1 && store.playlists.splice(index, 1);
  store.playlists.unshift(playlist);
  store.playlists.length > maxPlaylists && store.playlists.pop(); 
  return playlist;
}

/**
 * Remove the playlist
 * 
 * @param {string} hash
 * @returns {object[]}
 */
export function removePlaylist(hash) {
  const index = store.playlists.findIndex(p => p.hash === hash);
  index != -1 && store.playlists.splice(index, 1);
  return store.playlists;
}

/**
 * Get the playlist by the hash
 * 
 * @param {string} hash
 * @returns {object}
 */
export function getPlaylistByHash(hash) {
  return store.playlists.find(p => p.hash === hash) || null;
}

/**
 * Create a new playlist
 * 
 * @returns {{title: string, hash: string, songs: array}}
 */
export function createPlaylist() {
  return { title: '', hash: '', songs: [] };
}

/**
 * Empty the playlist
 * 
 * @param {object}
 */
export function emptyPlaylist(playlist) {
  return playlist.songs = [];
}

/**
 * Create a playlist link
 * 
 * @param {string} hash
 * @returns {string}
 */
export function createPlaylistLink(hash) {
  return `http://${ client.workerAddress || workStorage.getItem('storageAddress')}/musiphone/${hash}`;
}

/**
 * Prepare the playlists to export
 * 
 * @param {object[]} playlists 
 * @returns {object[]} 
 */
export function preparePlaylistsToExport(playlists) {
  const newPlaylists = [];

  for(let i = 0; i < playlists.length; i++) {
    newPlaylists.push(preparePlaylistToExport(playlists[i]));
  }

  return newPlaylists;
}

/**
 * Prepare the playlists to import
 * 
 * @param {object[]} playlists 
 * @returns {object[]} 
 */
export function preparePlaylistsToImport(playlists) {
  const newPlaylists = [];

  for(let i = 0; i < playlists.length; i++) {
    newPlaylists.push(preparePlaylistToImport(playlists[i]));   
  }

  return newPlaylists;
}

/**
 * Prepare the playlist to show
 * 
 * @param {object} playlist
 * @param {string[]} playlist.content
 * @returns {object} 
 */
export function preparePlaylistToShow(playlist) {
  return {
    title: playlist.title,
    hash: playlist.hash,
    songs: playlist.content.map(s => createSongInfo(s))
  }
}

/**
 * Prepare the playlist to export
 * 
 * @param {object} playlist
 * @returns {object} 
 */
export function preparePlaylistToExport(playlist) {
  return { 
    ...playlist,
    songs: playlist.songs.map(s => s.title)
  }
}

/**
 * Prepare the playlist to import
 * 
 * @param {object} playlist
 * @returns {object} 
 */
export function preparePlaylistToImport(playlist) {
  return { 
    ...playlist,
    songs: playlist.songs.map(s => createSongInfo(s))
  }
}

/**
 * Parse the hash from the playlist link
 * 
 * @param {string} link 
 * @return {string}
 */
export function parsePlaylistLink(link) {
  if(typeof link !== 'string') {
    return '';
  }

  const info = url.parse(link);

  if(!info) {
    return '';
  }

  const details = (info.path + '').split('/');
  details.shift();

  if(details[0] !== 'musiphone' || details.length != 2) {
    return null;
  }

  return details[1];
}

/**
 * Find the playlist
 * 
 * @param {string} title 
 * @param {string[]} songs 
 * @return {object}
 */
export function findPlaylist(title, songs) {
  for(let i = 0; i < store.playlists.length; i ++) {
    const playlist = store.playlists[i];

    if(playlist.title !== title) {
      continue;
    }

    if(!utils.compare(playlist.songs.map(s => s.title), songs)) {
      continue;
    }

    return playlist;
  }

  return null;
}
