import store from 'akili/src/services/store';
import clientStorage from '../client-storage';
import { getDatabase } from './database';
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
  return `${ btoa(encodeURIComponent(title)) }.mp3`;
}

/**
 * Parse the cached song filename to a title
 * 
 * @param {string} title 
 * @returns {string}
 */
export function parseCacheSongTitle(title) {
  return decodeURIComponent(atob(title.split('.')[0]));
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
  const res = window.cordova? await downloadCacheSongMobile(song): await downloadCacheSongBrowser(song);
  addCache(song.title, await getSongCacheInfoFromEntry(res));
}

/**
 * For mobile
 * 
 * @see downloadCacheSong
 */
export async function downloadCacheSongMobile(song) {
  return await download(decodeURI(song.audioLink), createCacheSongPath(song.title));
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
  window.cordova? await removeCacheSongMobile(title): await removeCacheSongBrowser(title);
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