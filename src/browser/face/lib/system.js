import client from '../client';
import clientStorage from '../client-storage';

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