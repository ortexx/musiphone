import client from '../client';
import { preparePlaylistToShow } from '../lib/playlists';

/**
 * Get the playlist
 * 
 * @async
 * @param {string} hash
 * @returns {{content: string[], title: string, hash: string}} 
 */
export async function getPlaylist (hash) {
  return await client.getPlaylist(hash);
}

/**
 * Add the playlist
 * 
 * @async
 * @param {string} title
 * @param {string[]} content
 * @returns {{content: string[], title: string, hash: string}}
 */
export async function addPlaylist (title, content) {
  return preparePlaylistToShow(await client.addPlaylist(title, content));
}

