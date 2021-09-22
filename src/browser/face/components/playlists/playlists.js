import './playlists.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';
import { getPlaylistByHash, removePlaylist } from '../../lib/playlists';
import { cachePlaylist, uncachePlaylist, removeCachingPlaylist, removeUncachingPlaylist } from '../../lib/cache';

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
    this.scope.cancelPlaylistCacheWorks = this.cancelPlaylistCacheWorks.bind(this);   
  }

  compiled() {
    this.attr('highlight', 'highlight');
    this.attr('data', this.handleData);
    this.store('cachedSongs', this.setCached, { callOnStart: false });
    this.store('cachingPlaylists', this.setCaching, { callOnStart: false });
    this.store('uncachingPlaylists', this.setUncaching, { callOnStart: false });
  }

  handleData(data) {    
    this.createTitlesInfo(data);   
    this.scope.data = data;
    this.setTitle();
    this.setCached(store.cachedSongs);
    this.setCaching(store.cachingPlaylists);
    this.setUncaching(store.uncachingPlaylists);
  }

  createTitlesInfo(data) {    
    this.titles = {};
    
    for(let i = 0; i < data.length; i ++) {
      const pl = data[i];
      this.titles[pl.title] = this.titles[pl.title]? this.titles[pl.title] + 1: 1;
    }
  }

  createPlaylistTitle(playlist) {
    let short = '';
    let full = '';
    const hash = `${playlist.hash.slice(0, 3)}...${playlist.hash.slice(-3)}`;
    
    if(playlist.title) {
      short += playlist.title;
      full += playlist.title;

      if(this.titles[playlist.title] > 1) {
        short += ` (${hash})`;
        full += ` (${playlist.hash})`;
      }
    }
    else {
      short += hash;
      full += playlist.hash;
    }

    return { short, full };
  }

  setTitle() {
    this.scope.data.forEach(pl => {
      const obj = this.createPlaylistTitle(pl);
      pl._title = obj.short;
      pl._titleFull = obj.full;
    });
  }

  setCached(arr) {    
    const titles = {};
    arr.forEach(s => titles[s.title] = s);

    for(let i = 0; i < this.scope.data.length; i++) {
      let cached = 0;
      const data = this.scope.data[i];
      const songs = getPlaylistByHash(data.hash).songs;

      for(let i = 0; i < songs.length; i++) {
        const song = songs[i];
  
        if(titles[song.title]) {
          cached++;
          continue;
        }
      }

      data.cached = cached;
      data.songsLength = songs.length;
    }
  }

  setCaching(arr) {
    const hashes = {};
    arr.forEach(s => hashes[s.hash] = s);   

    for(let i = 0; i < this.scope.data.length; i++) {
      const data = this.scope.data[i];
      data.caching = !!hashes[data.hash];
    }
  }

  setUncaching(arr) {
    const hashes = {};
    arr.forEach(s => hashes[s.hash] = s);   

    for(let i = 0; i < this.scope.data.length; i++) {
      const data = this.scope.data[i];
      data.uncaching = !!hashes[data.hash];
    }
  }

  cancelPlaylistCacheWorks(playlist) {
    removeCachingPlaylist(playlist.hash);
    removeUncachingPlaylist(playlist.hash);
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
        removePlaylist(playlist.hash);
        index == 0 && this.selectPlaylist(this.scope.data[1]);
      } 
    };
  }

  async cachePlaylist(playlist) {
    if(playlist.cached && playlist.cached == playlist.songsLength) {
      return await this.removeCache(playlist);
    }

    return await this.addCache(playlist);
  }

  async removeCache(playlist) {
    await uncachePlaylist(getPlaylistByHash(playlist.hash));
  }

  async addCache(playlist) {
    await cachePlaylist(getPlaylistByHash(playlist.hash));
  }
}