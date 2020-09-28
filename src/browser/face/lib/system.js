import request from 'akili/src/services/request';
import client from '../client';
import clientStorage from '../client-storage';
import ClientMusiphone from '../../../../dist/musiphone.client.js';

/**
 * Initialize the client initial address
 * 
 * @async
 * @returns {string|null}
 */
export async function setClientInitialAddress() { 
  let address = localStorage.getItem('apiAddress');
  address && typeof API_ADDRESS === 'undefined' && !await checkApiAddress(address) && localStorage.removeItem('apiAddress');    
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
    return ClientMusiphone.getPageAddress();
  }

  return typeof API_ADDRESS !== 'undefined'? API_ADDRESS: localStorage.getItem('apiAddress');
}

/**
 * Initialize the data storage (sessionStorage, localStorage)
 */
export function initDataStorage() {
  window.workStorage = sessionStorage;

  if(window.cordova) {
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
  if(!window.cordova) {
    return;
  }
    
  const ignore = /[^,]*:hover/i;

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];

    if (!sheet.cssRules) {
      continue;
    }

    for (let j = sheet.cssRules.length - 1; j >= 0; j--) {
      const rule = sheet.cssRules[j];
      
      if (rule.type === CSSRule.STYLE_RULE && ignore.test(rule.selectorText)) {      
        sheet.deleteRule(j);
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
    const res = await request.get(`http://${ address }/ping`, { json: true, timeout: 1000 });

    if(typeof res.data == 'object' && res.data.address === address && res.data.version.split('-')[0] == 'musiphone') {
      return true;
    }
  }
  catch(err) {
    return false;
  }

  return false;
}