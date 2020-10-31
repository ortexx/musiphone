import './playlists.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';
import { removePlaylist } from '../../lib/playlists';
import { downloadCacheSong, removeCacheSong } from '../../lib/cache';

export default class Playlists extends Akili.Component {
  static template = require('./playlists.html');
  static events = ['select'];

  static define() {
    Akili.component('playlists', this);
  }

  created() {  
    this.scope.activeHasLink = false; 
    this.scope.selectPlaylist = this.selectPlaylist.bind(this);
    this.scope.removePlaylist = this.removePlaylist.bind(this);
    this.scope.cachePlaylist = this.cachePlaylist.bind(this);
    this.scope.addCache = this.addCache.bind(this);
    this.scope.removeCache = this.removeCache.bind(this);
  }

  compiled() {
    this.attr('highlight', 'highlight');
    this.attr('data', this.handleData);
    this.store('cachedSongs', this.setCached);
  }

  handleData(data) {
    this.createTitlesInfo(data);   
    this.scope.data = data;
    this.setTitle();
    !this.isCompiled && this.setCached(store.cachedSongs);
  }

  createTitlesInfo(data) {    
    this.titles = {};

    for(let i = 0; i < data.length; i ++) {
      const pl = data[i];
      this.titles[pl.title] = this.titles[pl.title]? this.titles[pl.title] + 1: 1;
    }
  }

  createPlaylistTitle(playlist) {
    let str = '';
    const hash = `${playlist.hash.slice(0, 3)}...${playlist.hash.slice(-3)}`
    
    if(playlist.title) {
      str += playlist.title;
      this.titles[playlist.title] > 1 && (str += ` (${hash})`);
    }
    else {
      str += hash;
    }

    return str;
  }

  setTitle() {
    this.scope.data.forEach(pl => {
      pl._title = this.createPlaylistTitle(pl);
    });
  }

  setCached(arr) {
    const titles = {};
    arr.forEach(s => titles[s.title] = s);   

    for(let i = 0; i < this.scope.data.length; i++) {
      let cached = 0;
      const data = this.scope.data[i];

      for(let i = 0; i < data.songs.length; i++) {
        const song = data.songs[i];
  
        if(titles[song.title]) {
          cached++;
          continue;
        }
      }

      data.cached = cached;
    }
  }

  selectPlaylist(playlist) {   
    let hash = null;

    if(playlist) {
      playlist.isLoading = true;
      hash = playlist.hash;
    }
    
    this.attrs.onSelect.trigger(hash);
  }

  removePlaylist(playlist) { 
    store.event = { 
      confirm: true, 
      onYes: () => {
        const index = this.scope.data.indexOf(playlist);
        playlist.isRemoved = true;
        removePlaylist(playlist.hash);
        index == 0 && this.selectPlaylist(this.scope.data[1]);
      } 
    };
  }

  async cachePlaylist(playlist) {
    if(playlist.cached && playlist.cached == playlist.songs.length) {
      return await this.removeCache(playlist);
    }

    return await this.addCache(playlist);
  }

  async removeCache(playlist) {
    const loop = async (index) => {
      const song = playlist.songs[index];

      if(!song || playlist.isRemoved || !playlist.isCaching) {
        playlist.isCaching = false;
        return;
      }

      try {
        await removeCacheSong(song.title);  
      }
      catch(err) {
        //eslint-disable-next-line no-console
        console.error(err);
      }

      setTimeout(() => loop(index + 1));
    }

    playlist.isCaching = true;
    loop(0);
  }

  async addCache(playlist) {
    const loop = async (index) => {      
      const song = playlist.songs[index];           

      if(!song || playlist.isRemoved || !playlist.isCaching) {
        playlist.isCaching = false;
        return;
      }

      const titles = {};
      store.cachedSongs.forEach(s => titles[s.title] = s); 

      if(titles[song.title]) {
        return loop(index + 1);
      }

      try {
        store.song = { ...song, isCacheSaving: true };
        await downloadCacheSong(song);
      }
      catch(err) {
        //eslint-disable-next-line no-console
        console.error(err);
      }

      store.song = { ...song, isCacheSaving: false };
      setTimeout(() => loop(index + 1));
    }

    playlist.isCaching = true;
    loop(0);   
  }
}