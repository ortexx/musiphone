import router from 'akili/src/services/router';
import { parsePlaylistLink } from './playlists';
import client from '../client';
import { initClients, setClientInitialAddress } from './system';

const network = {};

/**
 * Get the location origin path
 * 
 * @return {string}
 */
export function getLocationOrigin() {
  let origin = location.origin;
  window.cordova && (origin += location.pathname);
  return origin;
}

/**
 * Handle android deep links
 * 
 * @async
 * @param {string} uri
 */
export async function handleDeepLinks(uri) {
  const hash = await parsePlaylistLink(uri);

  if(!hash) {
    return;
  }
 
  router.state('app', { hash });
}

/**
 * Check the connection
 * 
 * @async
 * @returns boolean
 */
export async function checkConnection() {
  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = location.hostname == 'localhost' || location.protocol == 'file:'? `http://httpbin.org/get`: location.origin;
      xhr.open('HEAD', url, true);
      xhr.onload = resolve;
      xhr.onerror = reject;
      xhr.send();
    });
    return true;
  }
  catch(err) {
    return false;
  } 
}

/**
 * Check the connection status from time to time
 * 
 * @async
 */
export async function listenConnectionStatus() {
  const fn = async () => {
    const prev = network.connection;
    network.connection = await checkConnection();

    if(prev !== undefined && prev !== network.connection && network.connection && !client.workerAddress) {
      const address = await setClientInitialAddress(); 
      address && await initClients();
      router.reload({}, {}, undefined, { saveScrollPosition: true });
    }
  }

  await fn();
  setInterval(fn, 1000);
}

export default network;