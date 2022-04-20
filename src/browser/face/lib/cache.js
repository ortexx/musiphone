import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import clientStorage from '../client-storage';
import { getDatabase } from './database';
import { getPlaylistByHash } from './playlists';
import {
  download, 
  readdir, 
  remove, 
  resolveFileSystem, 
  fileEntryToFile,
  blobTo
} from './files';

/**
 * Create a title for the cached song filename
 * 
 * @param {string} title
 * @returns {string}
 */
export function createCacheSongTitle(title) {
  return `${ btoa(encodeURIComponent(title).replace(/%([0-9A-F]{2})/g, (m, p) => String.fromCharCode('0x' + p))).replace(/\//g, '_') }.mp3`;
}

/**
 * Parse the cached song filename to a title
 * 
 * @param {string} title 
 * @returns {string}
 */
export function parseCacheSongTitle(title) {
  const text = atob(title.split('.')[0].replace(/_/g, '/'));
  const length = text.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = text.charCodeAt(i);
  }
  
  return new TextDecoder().decode(bytes);
}

/**
 * Create a path for the song title
 * 
 * @param {string} title 
 * @returns {string}
 */
export function createCacheSongPath(title) {
  return `${ cordova.file.externalCacheDirectory }${ createCacheSongTitle(title) }`;
}

/**
 * Get the cache
 * 
 * @param {string} title
 * @return {object} 
 */
export function getCache(title) {
  return store.cachedSongs.find(s => s.title === title) || null;
}

/**
 * Add the cache
 * 
 * @param {string} title 
 * @param {object} [info]
 * @param {string} [info.audioLinkCache]
 * @param {string} [info.coverLinkCache]
 */
export function addCache(title, info = {}) {
  removeCache(title);
  store.cachedSongs.push({ title, ...info });
}

/**
 * Remove the cache
 * 
 * @param {string} title 
 */
export function removeCache(title) {
  const index = store.cachedSongs.findIndex(s => s.title === title);  
  
  if(index == -1) {
    return;
  }  

  const song = store.cachedSongs[index];
  store.cachedSongs.splice(index, 1);
  song.audioLinkCache && song.audioLinkCache.match(/^blob:/i) && URL.revokeObjectURL(song.audioLinkCache);
  song.coverLinkCache && song.coverLinkCache.match(/^blob:/i) && URL.revokeObjectURL(song.coverLinkCache);
}

/**
 * Add the caching one
 * 
 * @param {string} title
 */
export function addCachingOne(title) {
  removeCachingOne(title);
  store.cachingSongs.push({ title });
}

/**
 * Remove the caching one
 * 
 * @param {string} title 
 */
export function removeCachingOne(title) {
  const index = store.cachingSongs.findIndex(s => s.title === title);  
  
  if(index == -1) {
    return;
  }  

  store.cachingSongs.splice(index, 1);
}

/**
 * Add the uncaching one
 * 
 * @param {string} title
 */
export function addUncachingOne(title) {
  removeUncachingOne(title);
  store.uncachingSongs.push({ title });
}

/**
 * Remove the uncaching one
 * 
 * @param {string} title 
 */
export function removeUncachingOne(title) {
  const index = store.uncachingSongs.findIndex(s => s.title === title);  
  
  if(index == -1) {
    return;
  }  

  store.uncachingSongs.splice(index, 1);
}

/**
 * Add the caching playlist
 * 
 * @param {string} hash
 */
export function addCachingPlaylist(hash) {
  removeCachingPlaylist(hash);
  store.cachingPlaylists.push({ hash });
}

/**
 * Remove the caching playlist
 * 
 * @param {string} hash 
 */
export function removeCachingPlaylist(hash) {
  const index = store.cachingPlaylists.findIndex(s => s.hash === hash);  
  
  if(index == -1) {
    return;
  }  

  store.cachingPlaylists.splice(index, 1);
}

/**
 * Add the uncaching playlist
 * 
 * @param {string} hash
 */
export function addUncachingPlaylist(hash) {
  removeUncachingPlaylist(hash);
  store.uncachingPlaylists.push({ hash });
}

/**
 * Remove the uncaching playlist
 * 
 * @param {string} hash 
 */
export function removeUncachingPlaylist(hash) {
  const index = store.uncachingPlaylists.findIndex(s => s.hash === hash);  
  
  if(index == -1) {
    return;
  }  

  store.uncachingPlaylists.splice(index, 1);
}

/**
 * Check tha caching playlist exists
 * 
 * @param {string} hash 
 * @returns {boolean}
 */
export function hasCachingPlaylist(hash) {
  return !!store.cachingPlaylists.find(s => s.hash === hash);
}

/**
 * Check tha uncaching playlist exists
 * 
 * @param {string} hash 
 * @returns {boolean}
 */
export function hasUncachingPlaylist(hash) {
  return !!store.uncachingPlaylists.find(s => s.hash === hash);
}

/**
 * Check tha cache exists
 * 
 * @param {string} title 
 * @returns {boolean}
 */
export function hasCache(title) {
  return !!store.cachedSongs.find(s => s.title === title);
}

/**
 * Remove unnecessary cached songs
 * 
 * @async
 */
export async function cleanUpCache() {
  const titles = {};
  let songs = store.activePlaylist.songs;
  store.playlists.forEach(p => songs = songs.concat(p.songs));
  songs.forEach(s => titles[s.title] = true);

  for(let i = 0; i < store.cachedSongs.length; i++) {
    const title = store.cachedSongs[i].title;
    !titles[title] && await removeCacheSong(title);
  }
}

/**
 * Prepare the cache list
 * 
 * @async
 */
export async function setCache() {
  store.cachedSongs = [];
  store.cachingSongs = [];
  store.uncachingSongs = [];
  store.cachingPlaylists = [];
  store.uncachingPlaylists = [];
  window.cordova? await setCacheMobile(): await setCacheBrowser(); 
}

/**
 * Prepare the cache list for browser
 * 
 * @async
 */
export async function setCacheBrowser() {
  const data = await new Promise((resolve, reject) => {
    const request = getDatabase()
      .transaction(["songs"], "readwrite")
      .objectStore("songs")
      .getAll()
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });

  for (let i = 0; i < data.length; i++) {
    const song = data[i];  

    try {
      addCache(song.title, await getSongCacheInfoFromEntry(song));
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
      removeCacheSong(song.title);
    }  
  }
}

/**
 * Prepare the cache list for mobile
 * 
 * @async
 */
export async function setCacheMobile() {
  const files = await readdir(cordova.file.externalCacheDirectory);

  for (let i = 0; i < files.length; i++) {
    const title = parseCacheSongTitle(files[i].name);
    
    try {
      addCache(title, await getSongCacheInfoFromEntry(files[i]));
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
      removeCacheSong(title);
    }    
  }
}

/**
 * Download the song to the cache
 * 
 * @async
 * @param {object} song
 * @param {string} song.title
 * @param {string} song.audioLink
 */
export async function downloadCacheSong(song) {
  addCachingOne(song.title);
  let res;

  try {
    res = window.cordova? await downloadCacheSongMobile(song): await downloadCacheSongBrowser(song);
    removeCachingOne(song.title);
  }
  catch(err) {
    removeCachingOne(song.title);
    throw err;
  }

  addCache(song.title, await getSongCacheInfoFromEntry(res));
}

/**
 * For mobile
 * 
 * @see downloadCacheSong
 */
export async function downloadCacheSongMobile(song) {
  return await download(song.audioLink, createCacheSongPath(song.title));
}


/**
 * For browser
 * 
 * @see downloadCacheSong
 */
export async function downloadCacheSongBrowser(song) {
  const blob = await clientStorage.getSongAudioToBlob(song.title);
  const data = { title: song.title, file: blob };
  return await new Promise((resolve, reject) => {
    const request = getDatabase()
      .transaction(["songs"], "readwrite")
      .objectStore("songs")
      .put(data)
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove the song cache
 * 
 * @async
 * @param {string} title
 */
export async function removeCacheSong(title) {
  addUncachingOne(title);

  try {
    window.cordova? await removeCacheSongMobile(title): await removeCacheSongBrowser(title);
    removeUncachingOne(title);
  }
  catch(err) {
    removeUncachingOne(title);
    throw err;
  }

  removeCache(title);
}

/**
 * For mobile
 * 
 * @see removeCacheSong
 */
export async function removeCacheSongMobile(title) {
  await remove(createCacheSongPath(title));
}

/**
 * For browser
 * 
 * @see removeCacheSong
 */
export async function removeCacheSongBrowser(title) {
  return new Promise((resolve, reject) => {
    const request = getDatabase()
      .transaction(["songs"], "readwrite")
      .objectStore("songs")
      .delete(title)
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the cached song info
 * 
 * @async
 * @param {string} title 
 * @returns {{audioLinkCache: string, coverLinkCache: string }}
 */
export async function getSongCacheInfo(title) {
  return window.cordova? getSongCacheInfoMobile(title): getSongCacheInfoBrowser(title);
}

/**
 * For browser
 * 
 * @see getSongCacheInfo
 */
export async function getSongCacheInfoBrowser(title) {
  const song = await new Promise((resolve, reject) => {
    const request = getDatabase()
      .transaction(["songs"], "readwrite")
      .objectStore("songs")
      .get(title)
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });
  return song? getSongCacheInfoFromDatabaseEntry(song): {};
}

/**
 * For mobile
 * 
 * @see getSongCacheInfo
 */
export async function getSongCacheInfoMobile(title) {
  const info = {};

  try {
    const fileEntry = await resolveFileSystem(createCacheSongPath(title));
    return await getSongCacheInfoFromFileEntry(fileEntry);

  }
  catch(err) {
    return info;
  }  
}

/**
 * Get the cached song info from the database or filesystem entry
 * 
 * @async
 * @param {object} entry 
 */
export async function getSongCacheInfoFromEntry(entry) {
  return window.cordova? getSongCacheInfoFromFileEntry(entry): getSongCacheInfoFromDatabaseEntry(entry);
}

/**
 * For browser
 * 
 * @see getSongCacheInfoFromEntry
 */
export async function getSongCacheInfoFromDatabaseEntry(entry) {
  const info = {};
  const file = entry.file;
  info.audioLinkCache = URL.createObjectURL(file);
  const buffer = await prepareSongTagsBuffer(file); 
  const tags = await clientStorage.constructor.utils.getSongTags(buffer);
  tags.APIC && (info.coverLinkCache = URL.createObjectURL(new Blob([tags.APIC])));
  return info;
}

/**
 * For mobile
 * 
 * @see getSongCacheInfoFromEntry
 */
export async function getSongCacheInfoFromFileEntry(entry) {
  const info = {};
  const file = await fileEntryToFile(entry);
  const buffer = await prepareSongTagsBuffer(file);
  info.audioLinkCache = entry.toURL();
  const tags = await clientStorage.constructor.utils.getSongTags(buffer);
  tags.APIC && (info.coverLinkCache = URL.createObjectURL(new Blob([tags.APIC])));
  return info;
}

/**
 * Reduce the blob size to get only song tags
 * 
 * @param {Blob} blob 
 * @returns {Blob}
 */
export async function prepareSongTagsBuffer(blob) {
  return Buffer.from(await blobTo(blob.slice(0, 1024 * 120), 'readAsArrayBuffer'));
}

/**
 * Cache all playlist songs
 * 
 * @async
 * @param {object} playlist 
 */
export async function cachePlaylist(playlist) {
  const titles = {};
  store.cachedSongs.forEach(s => titles[s.title] = s); 
  const songs = playlist.songs.filter(s => !titles[s.title]);
  const loop = async (index) => {
    const song = songs[index];

    if(!song || !hasCachingPlaylist(playlist.hash) || !getPlaylistByHash(playlist.hash)) {
      removeCachingPlaylist(playlist.hash);
      return;
    }

    try {
      await downloadCacheSong(song);  
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
    }

    setTimeout(() => loop(index + 1));
  }

  addCachingPlaylist(playlist.hash);
  loop(0);
}

/**
 * Unache all playlist songs
 * 
 * @async
 * @param {object} playlist 
 */
export async function uncachePlaylist(playlist) {
  const titles = {};
  store.cachedSongs.forEach(s => titles[s.title] = s); 
  const songs = playlist.songs.filter(s => titles[s.title]);
  const loop = async (index) => {
    const song = songs[index];

    if(!song || !hasUncachingPlaylist(playlist.hash) || !getPlaylistByHash(playlist.hash)) {
      removeUncachingPlaylist(playlist.hash);
      return;
    }

    try {
      await removeCacheSong(song.title);  
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
    }

    setTimeout(() => loop(index + 1));
  }

  addUncachingPlaylist(playlist.hash);
  loop(0);
}

/**
 * Trim the cache info from the song
 * 
 * @param {object} song 
 * @returns {object}
 */
export function trimCacheFromSong(song) {
  delete song.audioLinkCache;
  delete song.coverLinkCache;
  return song;
}

/**
 * Exclude the cache info from the song
 * 
 * @param {object} song 
 * @returns {object}
 */
export function excludeCacheFromSong(song) {
  return utils.excludeKeys(song, ['audioLinkCache', 'audioLinkCache']);
}