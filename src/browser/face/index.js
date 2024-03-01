import './styles/main.scss';
import Akili from 'akili';
import store from 'akili/src/services/store';
import router from 'akili/src/services/router';
import App from './controllers/app/app';
import SongCard from './components/song-card/song-card';
import Menu from './components/menu/menu';
import Player from './components/player/player';
import Playlist from './components/playlist/playlist';
import Playlists from './components/playlists/playlists';
import Scroller from './components/scroller/scroller';
import Scrollbar from './components/scrollbar/scrollbar';
import Tooltip from './components/tooltip/tooltip';
import ModalWindow from './components/modal-window/modal-window';
import { initClients, removeMobileHovers, initDataStorage, setClientInitialAddress } from './lib/system';
import { preparePlaylistsToImport, preparePlaylistToImport, getActivePlaylist } from './lib/playlists';
import network, { handleDeepLinks, listenConnectionStatus } from './lib/network';
import { setCache, cleanUpCache } from './lib/cache';
import { initDatabase } from './lib/database';

removeMobileHovers();

App.define();
SongCard.define();
Menu.define();
Player.define();
Playlist.define();
Playlists.define()
Tooltip.define();
Scroller.define();
Scrollbar.define();
ModalWindow.define();

initDataStorage();

document.addEventListener(window.cordova? 'deviceready': 'DOMContentLoaded', async () => {
  try {  
    if(window.cordova) {
      window.open = window.cordova.InAppBrowser.open;
      window.cordova.plugins.backgroundMode.enable();  
      window.cordova.plugins.backgroundMode.on('activate', () => {
        cordova.plugins.backgroundMode.disableWebViewOptimizations();
        cordova.plugins.backgroundMode.disableBatteryOptimizations(); 
      });   
      document.addEventListener("backbutton", () => {
        window.cordova.plugins.backgroundMode.moveToBackground();
      }, false);
    }

    router.init('/musiphone', location.pathname.match(/\.html$/));   
    const hps = workStorage.playlists !== undefined;
    const hp = workStorage.activePlaylist !== undefined;
    store.playlists = hps? preparePlaylistsToImport(JSON.parse(workStorage.getItem('playlists'))): [];
    store.activePlaylist = hp? preparePlaylistToImport(JSON.parse(workStorage.getItem('activePlaylist'))): getActivePlaylist();  
    await listenConnectionStatus();
    await initDatabase();
    await setCache();
    await cleanUpCache();
    const address = await setClientInitialAddress();        
    network.connection && address && await initClients();
    await Akili.init();

    if(window.cordova && window.plugins && window.plugins.webintent) {
      window.plugins.webintent.getUri(handleDeepLinks);
      window.plugins.webintent.onNewIntent(handleDeepLinks);   
    }
  }
  catch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
});