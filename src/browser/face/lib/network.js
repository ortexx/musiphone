import router from 'akili/src/services/router';
import { parsePlaylistLink } from './playlists';
import client from '../client';
import store from 'akili/src/services/store';
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
  if(!window.cordova) {
    return navigator.onLine;
  }
  else {
    const networkState = navigator.connection.type;
    const states = {};
    states[window.Connection.UNKNOWN] = false;
    states[window.Connection.ETHERNET] = true;
    states[window.Connection.WIFI] = true;
    states[window.Connection.CELL_2G] = true;
    states[window.Connection.CELL_3G] = true;
    states[window.Connection.CELL_4G] = true;
    states[window.Connection.CELL] = true;
    states[window.Connection.NONE] = false;
    return states[networkState];
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
    store.networkConnection = network.connection;

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