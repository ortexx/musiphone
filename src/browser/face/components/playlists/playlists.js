import './playlists.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';
import { removePlaylist } from '../../lib/playlists';

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
  }

  compiled() {
    this.attr('highlight', 'highlight');
    this.attr('data', this.handleData);
  }

  handleData(data) {
    this.createTitlesInfo(data);   
    this.scope.data = data.map(pl => {
      pl._title = this.createPlaylistTitle(pl);
      return pl;
    });
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

  selectPlaylist(playlist) {   
    let pl = null;

    if(playlist) {
      playlist.isLoading = true;
      pl = {...playlist};
      delete pl._title;
    }
    
    this.attrs.onSelect.trigger(pl);
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
}