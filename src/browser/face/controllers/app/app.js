import './app.scss';
import Akili from 'akili';
import slugify from 'slugify';
import url from 'url';
import qs from 'querystring';
import router from 'akili/src/services/router';
import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import { saveBlobFile, blobTo } from '../../lib/files';
import { cleanUpCache } from '../../lib/cache';
import clientStorage from '../../client-storage';
import network, { getLocationOrigin } from '../../lib/network';
import { checkApiAddress } from '../../lib/system';
import { getPlaylist, addPlaylist as postPlaylist } from '../../actions/playlists';
import { 
  addSong, 
  addPlaylist,
  getActivePlaylist,
  getPlaylistByHash,
  preparePlaylistToShow,
  preparePlaylistsToExport,
  preparePlaylistToExport,
  createPlaylistLink,
  createPlaylist,
  createSongInfo,
  emptyPlaylist,
  parsePlaylistLink,
  findPlaylist
} from '../../lib/playlists';

export default class App extends Akili.Component {
  static template = require('./app.html');

  static define() {
    Akili.component('app', this);

    router.add('app', '^/musiphone/:hash', {
      component: this,
      handler: async (transition) => {
        if(!localStorage.apiAddress) {
          return;
        }

        if(!transition.path.params.hash) {
          if(store.activePlaylist.hash) {
            return transition.reload({ hash: store.activePlaylist.hash });
          }

          return;
        }

        let playlist;

        if(network.connection) {
          playlist = await getPlaylist(transition.path.params.hash);
          playlist && (playlist = preparePlaylistToShow(playlist));
        }
        else {
          playlist = utils.copy(getPlaylistByHash(transition.path.params.hash));
        }

        return playlist;
      }
    });
  }

  created() {  
    this.defaultPageTitle = 'Musiphone - decentralized music player';
    this.mobileDataFolder = '/Android/data/com.museria.musiphone/files';
    this.scope.saveToWebModal = false;
    this.scope.loadFileModal = false;
    this.scope.apiAddressModal = window.cordova && !localStorage.apiAddress;
    this.scope.apiAddressModalUnclosable = !localStorage.apiAddress;
    this.scope.linkIsBlinking = false;
    this.scope.menuModal = false; 
    this.scope.wrongPlaylistHash = this.transition.data === null;
    this.scope.searchInputValue = '';  
    this.scope.loadPlaylistInputValue = '';   
    this.scope.apiAddressInputValue = localStorage.getItem('apiAddress') || '';  
    this.scope.activePlaylist = [];
    this.scope.playlists = [];
    this.scope.event = {};
    this.scope.storageUrl = `http://${ clientStorage.address || workStorage.getItem('storageAddress') }`;
    this.scope.addSong = this.addSong.bind(this);
    this.scope.findSong = this.findSong.bind(this);    
    this.scope.loadFile = this.loadFile.bind(this);    
    this.scope.saveFile = this.saveFile.bind(this);
    this.scope.importConfig = this.importConfig.bind(this);    
    this.scope.newPlaylist = this.newPlaylist.bind(this);       
    this.scope.savePlaylist = this.savePlaylist.bind(this);       
    this.scope.selectPlaylist = this.selectPlaylist.bind(this);    
    this.scope.resetSearchEvent = this.resetSearchEvent.bind(this);    
    this.scope.chooseLoadingFile = this.chooseLoadingFile.bind(this);
    this.scope.closeSaveToWebModal = this.closeSaveToWebModal.bind(this);
    this.scope.changeEventActivity = this.changeEventActivity.bind(this); 
    this.scope.changePlaylistOrder = this.changePlaylistOrder.bind(this); 
    this.scope.sharePlaylistLink = this.sharePlaylistLink.bind(this);    
    this.scope.copyPlaylistLink = this.copyPlaylistLink.bind(this);    
    this.scope.loadPlaylistLink = this.loadPlaylistLink.bind(this); 
    this.scope.selectFoundSong = this.selectFoundSong.bind(this); 
    this.scope.setApiAddress = this.setApiAddress.bind(this);         
    this.resetSearchEvent();
    this.setMenu();
  } 

  compiled() {
    if(this.transition.data) {            
      store.activePlaylist = utils.copy(addPlaylist(this.transition.data));
    }
    else if(this.transition.params.hash === store.activePlaylist.hash) {
      store.activePlaylist = createPlaylist();
    }

    this.store('activeSong', this.handleActiveSong);
    this.store('pageTitle', this.handlePageTitle, { callOnStart: true });    
    this.store('event', this.handleEvent);
    this.store('playlists', this.handlePlaylists);
    this.store('activePlaylist', this.handleActivePlaylist);
  }

  selectFoundSong() {
    this.scope.searchEvent.meta.isActive = true;
    store.activeSong = this.scope.searchEvent.meta;
  }

  setMenu() {
    this.scope.menu = [
      {
        text: 'Load config',
        icon: 'fa fa-arrow-up',
        handler: this.chooseLoadingConfig.bind(this),
        closeAfter: true
      },
      {
        text: 'Save config',
        icon: 'fa fa-arrow-down',
        handler: this.exportConfig.bind(this)
      },      
      {
        text: 'Project repository',
        icon: 'fab fa-github',
        href: 'https://github.com/ortexx/museria-player',
        blank: true
      },
      {
        text: 'Music storage',
        icon: 'fa fa-cloud',
        href: this.scope.storageUrl,
        blank: true
      }
    ];

    if(!window.cordova || typeof API_ADDRESS !== 'undefined') {
      return;
    }
    
    this.scope.menu.splice(2, 0, {
      text: 'Set address',
      icon: 'fa fa-arrow-down',
      handler: () => this.scope.apiAddressModal = true
    });
  }

  handleActiveSong(song) {
    if(!this.scope.searchEvent.meta || (song && this.scope.searchEvent.meta.title === song.title)) {
      return;
    }

    this.scope.searchEvent.meta.isActive = false;
  }

  handlePageTitle(title) {
    document.title = title || this.defaultPageTitle;
  }

  handleEvent(ev) { 
    if(!ev) {
      return;
    }

    if(ev.confirm) {
      this.scope.event = { 
        message: ev.message || 'Are you sure?',
        confirm: true, 
        type: 'warning', 
        isActive: true,
        onYes: () => {
          ev.onYes && ev.onYes();
          this.scope.event.isActive = false;
        },
        onNo: () => {
          ev.onNo && ev.onNo();
          this.scope.event.isActive = false;
        }
      };      
    }
    else if(ev.err) {
      //eslint-disable-next-line no-console
      console.error(ev.err);
      this.scope.event = { message: ev.err.message || 'An unknown error has occurred', type: 'error', isActive: true };    
    }
    else {
      this.scope.event = { message: ev.message, type: 'success', isActive: true };
    }

    store.event = null;
  }

  async handleActivePlaylist(playlist) {
    if(
      this.__isCompiled &&
      this.lastActivePlaylist &&
      playlist.link && 
      !this.__disableActivePlaylist && 
      !utils.compare(!this.lastActivePlaylist, playlist)
    ) {
      delete store.activePlaylist.__target.link;
      delete store.activePlaylist.__target.hash;
      delete playlist.link;
      delete playlist.hash;
      router.reload({ hash: null }, {}, undefined, { reload: false, saveScrollPosition: true });
    }
    
    this.scope.saveToWebTitle = playlist.title;
    this.lastActivePlaylist = playlist; 
    this.scope.activePlaylist = playlist;      
    workStorage.setItem('activePlaylist', JSON.stringify(preparePlaylistToExport(playlist)));  
    await cleanUpCache();
  }

  async handlePlaylists(playlists) {      
    this.scope.playlists = playlists;  
    workStorage.setItem('playlists', JSON.stringify(preparePlaylistsToExport(playlists))); 
    await cleanUpCache();
  }

  changeEventActivity(val) {
    this.scope.event.isActive = val;

    if(!val) {
      delete store.event;
    }
  }

  changePlaylistOrder(data) {    
    const oldItem = store.activePlaylist.songs[data.oldIndex];
    const newItem = store.activePlaylist.songs[data.newIndex];
    store.activePlaylist.songs[data.oldIndex] = newItem;
    store.activePlaylist.songs[data.newIndex] = oldItem;
  }

  resetSearchEvent() {
    this.scope.searchEvent = { status: '', message: '', meta: {} };
  }

  closeSaveToWebModal() {
    this.scope.saveToWebModal = false;
  }

  chooseLoadingFile() {
    this.el.querySelector('#load-file').value = null;
    this.el.querySelector('#load-file').click();
  }  

  chooseLoadingConfig() {
    this.el.querySelector('#load-config').value = null;
    this.el.querySelector('#load-config').click();
  } 
  
  addSong() {
    const info = this.scope.searchEvent.meta;
    this.resetSearchEvent();
    this.scope.searchInputValue = '';
    addSong(info.title, getActivePlaylist());
  } 

  newPlaylist() {
    emptyPlaylist(store.activePlaylist);
    store.activePlaylist.title = '';
  } 

  copyPlaylistLink() {
    this.scope.linkIsBlinking = true;
    const text = store.activePlaylist.link;
    const inputEl = document.createElement('textarea');
    inputEl.innerHTML = text;
    document.body.appendChild(inputEl);
    inputEl.select();
    document.execCommand('copy');
    document.body.removeChild(inputEl);
    setTimeout(() => this.scope.linkIsBlinking = false, 200);
  }

  downloadFileBrowser(file) {
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement("a");    
    link.href = fileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click'));
    document.body.removeChild(link);
    URL.revokeObjectURL(fileUrl);
  }
  
  async downloadFileMobile(text, filename) {
    await saveBlobFile(text, filename);
    store.event = { message: `The file has been saved to ${ this.mobileDataFolder }/${filename}` };
  }

  async sharePlaylistLink() {
    return await new Promise((resolve, reject) => {
      window.plugins.socialsharing.shareWithOptions({
        subject: `Musiphone playlist: ${ store.activePlaylist.title || store.activePlaylist.hash }`, 
        url: store.activePlaylist.link
      }, resolve, reject);
    });
  }

  async saveFile() {
    let text = '#EXTM3U\n';
    store.activePlaylist.title && (text += `#PLAYLIST:${store.activePlaylist.title}\n`);
    store.activePlaylist.songs.forEach(s => text += `#EXTINF:-1,${s.title}\n${s.audioLink}\n`);
    const filename = `${slugify(store.activePlaylist.title || 'playlist')}.m3u`;
    const type = 'audio/x-mpegurl';
    const file = new File([text], filename, { type });
    window.cordova? await this.downloadFileMobile(text, filename, type): this.downloadFileBrowser(file);    
  }

  async exportConfig() {
    const text = JSON.stringify({ ...workStorage });
    const filename = `musiphone.json`;
    const type = 'application/json';
    const file = new File([text], filename, { type });
    window.cordova? await this.downloadFileMobile(text, filename, type): this.downloadFileBrowser(file);    
  }

  async loadPlaylistLink() {
    const hash = parsePlaylistLink(this.scope.loadPlaylistInputValue);

    if(!hash) {
      return store.event = { err: new Error('Wrong playlist link') };
    }

    this.scope.loadPlaylistModal = false;
    this.scope.loadPlaylistInputValue = '';
    router.state('app', { hash });
  }

  async loadFile(file) {
    const text = await this.readFileToText(file);
    const lines = text.split('\n');
    const songs = [];
    let title = file.name.split('.')[0];
    let lastSongTitle = '';

    for(let i = 0; i < lines.length; i++) {    
      const line = lines[i];

      if(!line.trim()) {
        continue;
      }

      const info = url.parse(line);
      const ext = line.split(':'); 
      let songTitle = lastSongTitle;
      lastSongTitle = ''; 

      if(ext[0] == '#PLAYLIST') {
        title = ext[1];
        continue;
      }

      if(ext[0] == '#EXTINF') {
        lastSongTitle = (ext[1] || '').split(',')[1];        
        continue;
      }

      if(!info || !info.query) {
        continue;
      }

      const query = qs.parse(info.query);

      if(query.title && !songTitle) {
        songTitle = query.title;
      }

      if(!songTitle || !clientStorage.constructor.utils.isSongTitle(songTitle)) {
        continue;
      }

      songs.push(createSongInfo(songTitle));      
    }
    
    if(!songs.length) {
      return store.event = { err: new Error('There are not valid links in the file') };
    }

    const found = findPlaylist(title, songs.map(s => s.title));
    this.scope.loadPlaylistModal = false;

    if(found) {
      return this.selectPlaylist(found);
    }

    store.activePlaylist.songs = songs;
    store.activePlaylist.title = title;   
  }

  async importConfig(file) {
    const text = await this.readFileToText(file);
    const data = JSON.parse(text);
    
    for(let key in data) {
      workStorage.setItem(key, data[key]);
    }

    location.href = getLocationOrigin();
  }

  async readFileToText(file) {
    return blobTo(file, 'readAsText');
  }

  async selectPlaylist(playlist, update = true) {
    if(!playlist) {
      store.activePlaylist = createPlaylist();
      return;
    }

    this.__disableActivePlaylist = true;
    store.activePlaylist.link = createPlaylistLink(playlist.hash);
    store.activePlaylist.title = playlist.title;
    store.activePlaylist.hash = playlist.hash;
    store.activePlaylist.songs = playlist.songs;     
    await router.reload({ hash: playlist.hash }, {}, undefined, {  reload: false, saveScrollPosition: true });
    this.__disableActivePlaylist = false;
    addPlaylist(playlist);
    update && await this.postPlaylist(playlist);
  }

  async postPlaylist(playlist) {
    return await postPlaylist(playlist.title, playlist.songs.map(s => s.title));
  }

  async findSong() {
    if(!this.scope.searchInputValue) {
      this.resetSearchEvent();
      return;
    }

    try {
      const info = await clientStorage.getSong(this.scope.searchInputValue);       
      this.scope.searchEvent.status = 'info';     
      this.scope.searchEvent.message = 'No related songs found';    
  
      if(info) { 
        this.scope.searchEvent.status = 'success';
        this.scope.searchEvent.message = '';
        this.scope.searchEvent.meta = info;
        this.scope.searchEvent.meta.isActive = store.activeSong && store.activeSong.title === info.title;
      }
    }
    catch(err) {
      if(!err.code) {
        return store.event = { err };
      }

      this.scope.searchEvent.status = 'danger';
      this.scope.searchEvent.message = err.message;

      if(err.code == 'ERR_MUSERIA_SONG_WRONG_TITLE') {
        this.scope.searchEvent.message = 'Wrong song title. It must be like "Artist - Title"';
      }
    }
  }  

  async savePlaylist() {
    try {
      const playlist = await this.postPlaylist({ 
        title: this.scope.saveToWebTitle,
        songs: store.activePlaylist.songs
      });
      this.scope.saveToWebModal = false;
      await this.selectPlaylist(playlist, false);
    }
    catch(err) {
      store.event = { err };
    }
  }

  async setApiAddress() { 
    let address;
    const err = new Error('Api address invalid or busy');

    try {      
      let value = this.scope.apiAddressInputValue;
      !value.match(/^http/i) && (value = `http://${ value }`);
      const info = url.parse(value);

      if(!info) {
        throw err;
      }
      
      address = `${ info.hostname }:${ info.port || (info.protocol === 'https:'? 443: 80) }`;

      if(!await checkApiAddress(address)) {
        throw err;
      }      
    }
    catch(err) {
      return store.event = { err };
    }

    localStorage.setItem('apiAddress', address);
    location.reload();
  }
}