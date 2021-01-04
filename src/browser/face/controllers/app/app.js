import './app.scss';
import Akili from 'akili';
import slugify from 'slugify';
import url from 'url';
import router from 'akili/src/services/router';
import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import { saveTextToFile, blobTo, getDownloadFolder } from '../../lib/files';
import { cleanUpCache } from '../../lib/cache';
import clientStorage from '../../client-storage';
import network, { getLocationOrigin } from '../../lib/network';
import { checkApiAddress } from '../../lib/system';
import { getPlaylist, getExternalPlaylist, addPlaylist as postPlaylist } from '../../actions/playlists';
import { 
  addSong, 
  addPlaylist,
  getActivePlaylist,
  getPlaylistByHash,
  isExternalHash,
  preparePlaylistsToExport,
  preparePlaylistToExport,
  createPlaylist,
  parsePlaylist,
  emptyPlaylist,
  parsePlaylistLink,
  comparePlaylists,
  findPlaylist
} from '../../lib/playlists';

export default class App extends Akili.Component {
  static template = require('./app.html');

  static define() {
    Akili.component('app', this);

    router.add('app', '^/musiphone/:hash', {
      component: this,
      handler: async (transition) => {
        const hash = transition.path.params.hash;

        if(!localStorage.apiAddress) {
          return;
        }

        if(!hash) {
          if(store.activePlaylist.hash) {
            return transition.reload({ hash: store.activePlaylist.hash });
          }

          return;
        }

        let playlist;

        if(network.connection) {
          playlist = await (isExternalHash(hash)? getExternalPlaylist: getPlaylist)(hash);
        }
        else {
          playlist = utils.copy(getPlaylistByHash(hash));
        }

        return playlist;
      }
    });
  }

  created() { 
    this.clientStorageAddress = clientStorage.address || workStorage.getItem('storageAddress');
    this.scope.storageUrl = `${ clientStorage.getRequestProtocol() }://${ this.clientStorageAddress }`;
    this.defaultPageTitle = 'Musiphone - decentralized music player';
    this.externalLinkUpdateInterval = 10000;
    this.scope.saveToWebModal = false;
    this.scope.loadFileModal = false;
    this.scope.apiAddressModal = window.cordova && network.connection && !localStorage.apiAddress;
    this.scope.apiAddressModalUnclosable = !localStorage.apiAddress;
    this.scope.linkIsBlinking = false;
    this.scope.menuModal = false; 
    this.scope.isConfirming = false;
    this.scope.isPlaylistSaving = false;
    this.scope.isPlaylistLoading = false;
    this.scope.isCheckingApiAddress = false;
    this.scope.wrongPlaylistHash = this.transition.data === null;
    this.scope.searchInputValue = '';  
    this.scope.loadPlaylistInputValue = '';   
    this.scope.apiAddressInputValue = localStorage.getItem('apiAddress') || '';  
    this.scope.activePlaylist = [];
    this.scope.playlists = [];
    this.scope.event = {};   
    this.scope.confirm = this.confirm.bind(this);
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

  async compiled() {    
    if(this.transition.data) {            
      store.activePlaylist = utils.copy(addPlaylist(this.transition.data));
    }
    else if(this.transition.params.hash && this.transition.params.hash === store.activePlaylist.hash) {
      store.activePlaylist = createPlaylist();
    }

    this.store('activeSong', this.handleActiveSong);
    this.store('pageTitle', this.handlePageTitle, { callOnStart: true });    
    this.store('event', this.handleEvent);
    this.store('playlists', this.handlePlaylists);
    this.store('activePlaylist', this.handleActivePlaylist);    
    const isExternal = isExternalHash(store.activePlaylist.hash);

    if(this.transition.data) {
      !isExternal && await this.postPlaylist(store.activePlaylist);
    }    

    clearInterval(this.externalInterval);
    isExternal && (this.externalInterval = setInterval(async () => {
      const playlist = await getExternalPlaylist(store.activePlaylist.hash); 
      
      if(!playlist || comparePlaylists(playlist, utils.copy(store.activePlaylist))) {
        return;
      }
      
      this.disableActivePlaylist = true;
      store.activePlaylist = { ...store.activePlaylist, ...playlist };
    }, this.externalLinkUpdateInterval));
  }

  removed() {
    clearInterval(this.externalInterval);
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
      icon: 'fa fa-plug',
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
        onYes: ev.onYes,
        onNo: ev.onNo,
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
    const changed = !comparePlaylists(this.lastActivePlaylist, playlist);

    if(
      this.isCompiled &&
      this.lastActivePlaylist &&
      playlist.link && 
      !this.disableActivePlaylist &&
      changed
    ) {
      delete store.activePlaylist.__target.link;
      delete store.activePlaylist.__target.hash;
      delete playlist.link;
      delete playlist.hash;
      clearInterval(this.externalInterval);
      router.reload({ hash: null }, {}, undefined, { reload: false, saveScrollPosition: true });
    }
    
    this.disableActivePlaylist = false;
    this.scope.saveToWebTitle = playlist.title;
    changed && (this.lastActivePlaylist = utils.copy(playlist));
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
    store.activePlaylist.songs.splice(data.newIndex, 0, store.activePlaylist.songs.splice(data.oldIndex, 1)[0]);
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
    const filePath = `${ getDownloadFolder() }${ filename }`;

    try {
      await saveTextToFile(text, filePath);
      store.event = { message: `The file has been saved to ${ filePath }` };
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
      store.event = { err: new Error(`The file hasn't been saved to ${ filePath }, check the app permissions`) };
    }    
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
    this.scope.isPlaylistLoading = true;
    const hash = await parsePlaylistLink(this.scope.loadPlaylistInputValue);
    this.scope.isPlaylistLoading = false;

    if(!hash) {
      return store.event = { err: new Error('Wrong playlist link') };
    }

    this.scope.loadPlaylistModal = false;
    this.scope.loadPlaylistInputValue = '';
    clearInterval(this.externalInterval);
    router.state('app', { hash });
  }

  async loadFile(file) {
    const text = await this.readFileToText(file);
    
    let { title, songs } = parsePlaylist(text);
    !title && (title = file.name.split('.')[0]);
    
    if(!songs.length) {
      return store.event = { err: new Error('There are not valid links in the file') };
    }

    const found = findPlaylist(title, songs.map(s => s.title), { ignoreExternal: true });
    this.scope.loadPlaylistModal = false;

    if(found && !isExternalHash(found.hash)) {
      return this.selectPlaylist(found.hash);
    }

    clearInterval(this.externalInterval);
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

  async selectPlaylist(hash) {
    clearInterval(this.externalInterval);

    if(!hash) {
      store.activePlaylist = createPlaylist();
    }
    
    await router.reload({ hash }, {}, undefined, { reload: true, saveScrollPosition: true });
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
    this.scope.isPlaylistSaving = true;

    try {
      const playlist = await this.postPlaylist({ 
        title: this.scope.saveToWebTitle,
        songs: store.activePlaylist.songs
      });
      this.scope.saveToWebModal = false;
      this.scope.isPlaylistSaving = false;
      await this.selectPlaylist(playlist.hash);
    }
    catch(err) {
      store.event = { err };
      this.scope.isPlaylistSaving = false;
    }
  }

  async setApiAddress() { 
    let address;
    const err = new Error('Api address invalid or busy');
    this.scope.isCheckingApiAddress = true;

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
      this.scope.isCheckingApiAddress = false;
      return store.event = { err };
    }

    localStorage.setItem('apiAddress', address);
    location.reload();
  }

  async confirm(yes) {
    const fn = this.scope.event[yes? 'onYes': 'onNo'];
    this.scope.isConfirming = true;    
    fn && await fn();
    this.scope.event.isActive = false;
    this.scope.isConfirming = false;
  }
}