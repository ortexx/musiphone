import request from 'akili/src/services/request.js';
import client from '../client.js';
import clientStorage from '../client-storage.js';
import network from './network.js';

/**
 * Initialize the client initial address
 * 
 * @async
 * @returns {string|null}
 */
export async function setClientInitialAddress() { 
  let address = localStorage.getItem('apiAddress');
  const cond = address && typeof API_ADDRESS === 'undefined' && network.connection && !await checkApiAddress(address);
  cond && localStorage.removeItem('apiAddress');
  address = getApiAddress();
  localStorage.setItem('apiAddress', address || '');
  client.address = address;
  return address;
}

/**
 * Get the api address
 * 
 * @returns {string|null}
 */
export function getApiAddress() {
  if(!window.cordova) {
    return window.ClientMusiphone.getPageAddress();
  }

  return typeof API_ADDRESS !== 'undefined'? API_ADDRESS: localStorage.getItem('apiAddress');
}

/**
 * Initialize the data storage (sessionStorage, localStorage)
 */
export function initDataStorage(session = false) {
  window.workStorage = sessionStorage;

  if(window.cordova || !session) {
    window.workStorage = localStorage;
    return;
  }

  const storageKeys = [
    'playlists', 'activePlaylist', 'storageAddress', 
    'playerRandom', 'playerRepeat', 'playerVolume'
  ];

  storageKeys.forEach((key) => {
    const local = localStorage.getItem(key);
    const session = sessionStorage.getItem(key);
    local && session === null && sessionStorage.setItem(key, local);
  });

  window.addEventListener('unload', () => {
    storageKeys.forEach((key) => {
      const val = sessionStorage.getItem(key);
      val !== null? localStorage.setItem(key, val): localStorage.removeItem(key, val);
    }); 
  });
}

/**
 * Remove all hover styles for mobile
 */
export function removeMobileHovers() {    
  if('ontouchstart' in document.documentElement) {
    for(let i = document.styleSheets.length - 1; i >= 0; i--) {
      let sheet = document.styleSheets[i];

      if(!sheet.cssRules) {
        return;
      }
      
      for(let k = sheet.cssRules.length - 1; k >= 0; k--) {
        let rule = sheet.cssRules[k];

        if(!rule.selectorText) {
          continue;
        }

        rule.selectorText = rule.selectorText.replace(":hover", ":active");
      }
    }
  }
}

/**
 * Initialize all the request clients
 * 
 * @async
 */
export async function initClients() {
  await client.init();
  clientStorage.address = await client.getStorageAddress();
  await clientStorage.init();
  workStorage.setItem('storageAddress', clientStorage.workerAddress);
}

/**
 * Check an api address is correct
 * 
 * @async
 * @param {string} address
 * @returns {boolean}
 */
export async function checkApiAddress(address) {
  try {
    const res = await request.get(`${ client.getRequestProtocol() }://${ address }/ping`, { json: true, timeout: 5000 });

    if(typeof res.data == 'object' && res.data.address === address && res.data.version.split('-')[0] == 'musiphone') {
      return true;
    }
  }
  catch(err) {
    return false;
  }

  return false;
}

/**
 * Check the user selection container is passed one
 * 
 * @async
 * @param {Element} el
 * @returns {boolean}
 */
export function checkSelection(el) {
  const selection = window.getSelection();
  
  if(selection == '') {
    return false;
  }

  if(!el) {
    return true;
  }

  let current = selection.anchorNode;

  while (current) {
    if (el === current) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}