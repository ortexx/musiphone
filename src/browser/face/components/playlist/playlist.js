import './playlist.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';
import utils from 'akili/src/utils';
import { removeSong } from '../../lib/playlists';
import { checkSelection } from '../../lib/system';
import { downloadCacheSong, removeCacheSong, hasCache, trimCacheFromSong } from '../../lib/cache';
import Sortable from '@shopify/draggable/lib/sortable';

export default class Playlist extends Akili.Component {
  static template = require('./playlist.html');
  static events = ['sort'];

  static define() {
    Akili.component('playlist', this);
  }

  created() {    
    this.pageChunk = 30;
    this.scope.page = 1; 
    this.scope.songSearchValue = '';  
    this.scope.filteredSongs = [];  
    this.scope.foundSongs = [];
    this.scope.data = { songs: [] };
    this.sortable = new Sortable(this.el.querySelector('ul.playlist-list'), {
      draggable: 'li.playlist-list-song',
      delay: window.cordova? 300: 100,
      mirror: {
        constrainDimensions: true
      }
    });
    this.sortable.on('sortable:start', this.onSortableStart.bind(this));    
    this.sortable.on('drag:start', this.onSortableDrag.bind(this));
    this.sortable.on('sortable:stop', this.onSortableStop.bind(this));
    this.scope.toggleCache  = this.toggleCache.bind(this);
    this.scope.removeSong = this.removeSong.bind(this);
    this.scope.selectSong = this.selectSong.bind(this);
    this.scope.filterSongs = this.filterSongs.bind(this); 
  }

  compiled() { 
    this.attr('data', this.handleData);    
    this.store('isPlayerVisible', this.reactOnPlayerVisibility); 
    this.store('activeSong', this.setActiveSong);
    this.store('song', this.changeSong); 
    this.store('cachedSongs', this.setCachedSongs, { callOnStart: false });
    this.store('cachingSongs', this.setCachingSongs, { callOnStart: false });
    this.store('uncachingSongs', this.setUncachingSongs, { callOnStart: false });    
  }

  removed() {
    this.sortable.destroy();
  }

  handleData(data) {
    this.scope.data = data;
    this.prepareSongs();
    this.setActiveSong(store.activeSong);
    this.setCachedSongs(store.cachedSongs);
    this.setCachingSongs(store.cachingSongs);
    this.setUncachingSongs(store.uncachingSongs);
  }

  prepareSongs() {
    return this.scope.data.songs = this.scope.data.songs.map(s => {
      s.isActive = !!s.isActive;
      s.isFailed = !!s.isFailed;
      return s;
    });
  }

  filterSongs(songs, page, search) {
    this.scope.foundSongs = utils.filter(songs, search, ['title']);
    return this.scope.foundSongs.slice(0, page * this.pageChunk);
  }

  onSortableStart(event) {
    if(this.scope.data.songs.length <= 1 || this.scope.songSearchValue) {
      return event.cancel();        
    }    
  }

  onSortableDrag() {
    store.isMenuEnabled = false;
  }

  onSortableStop({ data: { oldIndex, newIndex } }) {
    store.isMenuEnabled = true;

    if(oldIndex == newIndex) {
      return;
    }
    
    setTimeout(() => this.attrs.onSort.trigger({ oldIndex, newIndex }));
  }

  reactOnPlayerVisibility(value) {
    if(!value) {
      this.scope.data.songs.forEach(s => s.isFailed = false);
    }
  }

  changeSong(song) {
    const current = this.scope.data.songs.find(s => s.title === song.title);

    if(!current) {
      return;
    }
    
    song.isFailed !== undefined && (current.isFailed = song.isFailed);
  }

  setActiveSong(song) {    
    this.scope.data.songs.forEach(s => s.isActive = song? s.title === song.title: false);
  }

  setCachedSongs(arr) { 
    const titles = {};
    arr.forEach(s => titles[s.title] = s);
    this.scope.data.songs.forEach(s => { 
      trimCacheFromSong(s);    
      const info = titles[s.title] || {};
      const obj = { isCached: !!titles[s.title] };
      obj.isCached && (obj.isFailed = false);
      Object.assign(s, info, obj);
    });
  }

  setCachingSongs(arr) {
    const titles = {};
    arr.forEach(s => titles[s.title] = s);
    this.scope.data.songs.forEach(s => { 
      Object.assign(s, { caching: !!titles[s.title] });
    });
  }

  setUncachingSongs(arr) {
    const titles = {};
    arr.forEach(s => titles[s.title] = s);
    this.scope.data.songs.forEach(s => {
      Object.assign(s, { uncaching: !!titles[s.title] });
    });
  }

  selectSong(song) {
    if(checkSelection()) {
      return;
    }

    if(this.scope.songSearchValue) {
      this.scope.songSearchValue = '';
      this.scope.page = 1;
    }
    
    store.activeSong = song;
  }

  removeSong(title) {
    store.event = { confirm: true, onYes: () => removeSong(title, store.activePlaylist) };    
  }

  async toggleCache(song) {    
    hasCache(song.title)? await this.removeCache(song): await this.addCache(song);
  }

  async addCache(song) {       
    try {
      await downloadCacheSong(song);
    }
    catch(err) {
      store.event = { err };
    }
  }

  async removeCache(song) {
    try {
      await removeCacheSong(song.title);  
    }
    catch(err) {
      store.event = { err };
    }
  }
}