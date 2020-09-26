import './playlist.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';
import { removeSong } from '../../lib/playlists';
import { downloadCacheSong, removeCacheSong, hasCache } from '../../lib/cache';
import Sortable from '@shopify/draggable/lib/sortable';

export default class Playlist extends Akili.Component {
  static template = require('./playlist.html');
  static events = ['sort'];

  static define() {
    Akili.component('playlist', this);
  }

  created() {
    this.scope.toggleCache  = this.toggleCache.bind(this);
    this.scope.removeSong = this.removeSong.bind(this);
    this.scope.selectSong = this.selectSong.bind(this);    
    this.sortable = new Sortable(this.el.querySelector('ul.playlist'), {
      draggable: 'li.playlist-song',
      delay: 300,
      mirror: {
        constrainDimensions: true
      }
    });
    this.sortable.on('sortable:start', this.onSortableStart.bind(this));    
    this.sortable.on('drag:start', this.onSortableDrag.bind(this));
    this.sortable.on('sortable:stop', this.onSortableStop.bind(this));
  }

  compiled() {    
    this.attr('data', this.handleData);
    this.store('isPlayerVisible', this.reactOnPlayerVisibility); 
    this.store('activeSong', this.setActiveSong);
    this.store('cachedSongs', this.setCachedSongs);
    this.store('song', this.changeSong);
  }

  removed() {
    this.sortable.destroy();
  }

  handleData(data) {
    this.scope.data = data;
    this.setActiveSong(store.activeSong);
    this.setCachedSongs(store.cachedSongs);
  }

  onSortableStart(event) {
    if(this.scope.data.songs.length <= 1) {
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
    
    current.isFailed = song.isFailed;
  }

  setActiveSong(song) {
    this.scope.data.songs.forEach(s => s.isActive = song? s.title === song.title: false);
  }

  setCachedSongs(arr) {
    const titles = {};
    arr.forEach(s => titles[s.title] = s);
    this.scope.data.songs = this.scope.data.songs.map(s => {
      const info = titles[s.title];
      s.isCached = !!info;
      Object.assign(s, info);
      return s;
    });
  }

  selectSong(song) {
    this.setActiveSong(song);
    store.activeSong = song;
  }

  removeSong(title) {
    store.event = { confirm: true, onYes: () => removeSong(title, store.activePlaylist) };    
  }

  async toggleCache(song) {    
    hasCache(song.title)? await this.removeCache(song): await this.addCache(song);
  }

  async addCache(song) {
    song.isCacheSaving = true;
       
    try {
      await downloadCacheSong(song);          
    }
    catch(err) {
      store.event = { err };
    }

    song.isCacheSaving = false;
    song.isFailed = false;
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