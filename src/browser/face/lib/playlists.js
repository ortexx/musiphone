
import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import clientStorage from '../client-storage';
import client from '../client';
import base64url from 'base64url';

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
  index == -1? playlist.songs.unshift(info): (playlist.songs[index] = info);
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
 * Create an external hash
 * 
 * @param {string} link 
 * @returns {string}
 */
export function createPlaylistExternalHash(link) { 
  return `external:${ base64url(link) }`;
}

/**
 * Check the hash is external
 * 
 * @param {string} hash 
 * @returns {boolean}
 */
export function isExternalHash(hash) {
  return !!String(hash).match('external:');
}

/**
 * Get the link from the external hash
 * 
 * @param {string} hash 
 * @returns  {string} string 
 */
export function getPlaylistLinkFromExternalHash(hash) {
  return base64url.decode(hash.split(':')[1]);
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
 * @async
 * @param {string} link 
 * @return {string}
 */
export async function parsePlaylistLink(link) {
  if(typeof link !== 'string') {
    return '';
  }

  let info;

  try {
    info = new URL(link);
  }
  catch(err) {
    return '';
  }

  const details = (info.pathname + '').split('/');
  details.shift();
  
  if(details[0] === 'musiphone' && details.length == 2) {
    return details[1];
  }

  return createPlaylistExternalHash(link);
}

/**
 * Find the playlist
 * 
 * @param {string} title 
 * @param {string[]} songs 
 * @param {object} [options]
 * @param {boolean} [options.ignoreExternal]
 * @return {object}
 */
export function findPlaylist(title, songs, options = {}) {
  for(let i = 0; i < store.playlists.length; i ++) {
    const playlist = store.playlists[i];

    if(options.ignoreExternal && isExternalHash(playlist.hash)) {
      continue;
    }

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

/**
 * Compare two playlists
 * 
 * @param {object} first 
 * @param {object} second
 * @returns {boolean}
 */
export function comparePlaylists(first, second) {
  if(!first && !second) {
    return true;
  }

  if(!first || !second) {
    return false;
  }
  
  if(first.title !== second.title || first.hash !== second.hash) {
    return false;
  }
   
  return utils.compare(first.songs.map(s => s.title), second.songs.map(s => s.title));
}

/**
 * Parse the playlist text
 * 
 * @param {string} text 
 * @returns {{songs: string[], title: string}}
 */
export function parsePlaylist(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const songs = [];
  const titles = {};
  let title = '';
  let lastSongTitle = '';
  let prevIsInf = false;

  for(let i = 0; i < lines.length; i++) {    
    const line = lines[i];    
    const ext = line.split(':'); 
    let songTitle = lastSongTitle;
    lastSongTitle = '';
    
    if(ext[0] == '#PLAYLIST') {
      title = ext[1];
      continue;
    }

    if(ext[0] == '#EXTINF') { 
      if(prevIsInf && songTitle) {
        i--;
      }
      else {
        lastSongTitle = (ext[1] || '').split(',').slice(1).join(',');
        prevIsInf = true;

        if(i != lines.length - 1) {
          continue;
        }

        songTitle = lastSongTitle;        
      }
    }

    prevIsInf = false;
    
    try {
      const info = new URL(line);
      info.searchParams.has('title') && !songTitle && (songTitle = info.searchParams.get('title'));
    }
    catch(err) { null }
    
    if(!songTitle || titles[songTitle] || !clientStorage.constructor.utils.isSongTitle(songTitle)) {
      continue;
    }

    songs.push(createSongInfo(songTitle));  
    titles[songTitle] = true;
  }

  return { title, songs };
}
