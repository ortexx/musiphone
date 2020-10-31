import request from 'akili/src/services/request';
import client from '../client';
import { 
  preparePlaylistToShow, 
  getPlaylistLinkFromExternalHash, 
  parsePlaylist, 
  createPlaylistLink 
} from '../lib/playlists';

/**
 * Get the external playlist
 * 
 * @async
 * @param {string} hash
 * @returns {{songs: object[], title: string, hash: string}} 
 */
export async function getExternalPlaylist (hash) {
  const url = getPlaylistLinkFromExternalHash(hash);

  try {
    const res = await request.get(url, { timeout: 5000 });
    const info = parsePlaylist(res.data);
    const link = createPlaylistLink(hash);
    
    if(!info.songs.length) {
      return null;
    }

    return { ...info, hash, link };
  }
  catch(err) {
    //eslint-disable-next-line no-console
    console.error(err);
    return null;
  }
}

/**
 * Get the playlist
 * 
 * @async
 * @param {string} hash
 * @returns {{songs: object[], title: string, hash: string}} 
 */
export async function getPlaylist (hash) {
  const playlist = await client.getPlaylist(hash);

  if(!playlist) {
    return null;
  }

  playlist.link = createPlaylistLink(playlist.hash);
  return preparePlaylistToShow(playlist);
}

/**
 * Add the playlist
 * 
 * @async
 * @param {string} title
 * @param {string[]} content
 * @returns {{songs: object[], title: string, hash: string}}
 */
export async function addPlaylist (title, content) {
  const playlist = await client.addPlaylist(title, content);

  if(!playlist) {
    return null;
  }

  playlist.link = createPlaylistLink(playlist.hash);
  return preparePlaylistToShow(playlist);
}