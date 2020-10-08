import './player.scss'
import Akili from 'akili';
import utils from 'akili/src/utils';
import store from 'akili/src/services/store';
import { getCache, excludeCacheFromSong } from '../../lib/cache';
import network from '../../lib/network';

export default class Player extends Akili.Component {
  static template = require('./player.html');

  static define() {
    Akili.component('player', this);
  }

  created() {
    this.media = null;   
    this.scope.progress = 0;
    this.scope.buffer = 0;
    this.volume = 0.75;
    this.history = [];
    this.filter = null;
    this.calculationDebounce = 100;
    this.audioDelayTimeout = 10000;
    this.scope.audioError = false;  
    this.scope.isLoading = false;
    this.scope.random = workStorage.getItem('playerRandom')? true: false; 
    this.scope.repeat = workStorage.getItem('playerRepeat')? true: false;  
    this.scope.closePlayer = this.closePlayer.bind(this);
    this.scope.toggleRandom = this.toggleRandom.bind(this);
    this.scope.toggleRepeat = this.toggleRepeat.bind(this);      
    this.scope.setPrevSong = this.setPrevSong.bind(this);    
    this.scope.setNextSong = this.setNextSong.bind(this);
    this.scope.play = this.play.bind(this);
    this.scope.setVolume = this.setVolume.bind(this);
    this.scope.pause = this.pause.bind(this); 
    this.elFooter = this.el.querySelector('.player-footer'); 
    this.elPlayer = this.el.querySelector('.player');  
    this.elAudio = this.el.querySelector('audio');
    this.elProgress = this.el.querySelector('.player-progress');
  }

  compiled() {
    this.store('isPlayerVisible', this.setPlayerVisibility);
    this.store('activePlaylist', this.handleActivePlaylist); 
    this.store('activeSong', this.changeActiveSong);
    this.elProgress.addEventListener('click', this.setProgress.bind(this));   
    this.elAudio.addEventListener('play', () => this.scope.isPlaying = true);
    this.elAudio.addEventListener('pause', () => this.scope.isPlaying = false);
    this.elAudio.addEventListener('ended', this.onMusicEnd.bind(this));
    this.handlePlayerPosition = utils.debounce(this.calculatePlayerPosition.bind(this), this.calculationDebounce);
    this.listenBodyKeyup = this.keyboardControl.bind(this);
    document.body.addEventListener('keyup', this.listenBodyKeyup);
    window.addEventListener('scroll', this.handlePlayerPosition);
  }

  removed() {
    window.removeEventListener('scroll', this.handlePlayerPosition);
    document.body.removeEventListener('keyup', this.listenBodyKeyup);    
  }

  setPlayerVisibility(val) {
    this.scope.isPlayerVisible = val;
    this.calculatePlayerPosition();
  }

  handleActivePlaylist() {
    this.setInfo();
    this.calculatePlayerPosition(); 
  }

  closePlayer() {
    this.stopLoading();
    store.isPlayerVisible = false;
    store.activeSong = null;
    store.pageTitle = null;
    cordova && MusicControls.destroy();
  }

  keyboardControl(event) {
    if(!store.isPlayerVisible) {
      return;
    }

    if(document.activeElement && document.activeElement.matches('input,textarea,[contenteditable]')) {
      return;
    }

    if(event.code == "ArrowRight") {
      return this.setNextSong();
    }

    if(event.code == "ArrowLeft") {
      return this.setPrevSong();
    }
    
    if(event.code == "ArrowUp") {
      return this.play();
    }
    
    if(event.code == "ArrowDown") {
      this.pause();
    }
  }

  onMusicEnd() {
    if(this.scope.repeat) {
      this.play()
    }
    else if(this.scope.nextSong) {
      this.setNextSong();
    }
  }

  changeSong(song) {
    if(this.scope.song && this.scope.song.id == song.id) {
      this.scope.song = song;
    }
  }

  setNextSong() {
    if(!this.scope.nextSong) {
      return;
    }

    store.activeSong = this.scope.nextSong;
  }

  setPrevSong() {
    if(!this.scope.prevSong) {
      return;
    }

    this.scope.random && this.history.pop();
    store.activeSong = this.scope.prevSong;
  }

  toggleRandom() {
    this.scope.random = !this.scope.random; 
    this.history = this.scope.random && this.scope.song? [this.scope.song]: [];
    this.setInfo();

    if(this.scope.random) {
      workStorage.setItem('playerRandom', 'true');      
    }
    else {
      workStorage.removeItem('playerRandom');      
    }
  }

  toggleRepeat() {
    this.scope.repeat = !this.scope.repeat;

    if(this.scope.repeat) {
      workStorage.setItem('playerRepeat', 'true');      
    }
    else {
      workStorage.removeItem('playerRepeat');
    }    
  }

  addHistory(song) {
    const index = this.history.findIndex(s => s.title == song.title);
    index != -1 && this.history.splice(index, 1);
    this.history.push(song);
  }

  getFirstActiveSong() {
    for(let i = 0; i < store.activePlaylist.songs.length; i++) {
      const song = store.activePlaylist.songs[i];

      if(network.connection || getCache(song.title)) {
        return song;
      }
    }

    return null;
  }

  getNextActiveSong(index) {
    for(let i = index + 1; i < store.activePlaylist.songs.length; i++) {
      const song = store.activePlaylist.songs[i];

      if(network.connection || getCache(song.title)) {
        return song;
      }
    }

    return null;
  }

  getPrevActiveSong(index) {
    for(let i = index - 1; i >= 0; i--) {
      const song = store.activePlaylist.songs[i];

      if(network.connection || getCache(song.title)) {
        return song;
      }
    }

    return null;
  }

  getActiveSongsForRandom(title) {
    return store.activePlaylist.songs.filter(song => {
      return song.title !== title && (network.connection || getCache(song.title));
    });

  }

  setInfo() {
    const titles = {};
    const song = this.scope.song; 
    store.activePlaylist.songs.forEach(s => titles[s.title] = true);

    for(let i = this.history.length - 1; i >= 0; i--) {
      !titles[this.history[i].title] || (!network.connection && !getCache(song.title)) && this.history.splice(i, 1);
    }
        
    const last = this.history[this.history.length - 1];      
    const isPlaying = this.scope.isPlaying;

    if(!song) {
      return;
    }

    if(this.history.length && last.title === song.title && !isPlaying)  {
      this.history.pop();
    }

    this.scope.prevSong = null;
    this.scope.nextSong = null;
    const index = store.activePlaylist.songs.findIndex(s => s.title === song.title);

    if(index < 0) {
      this.scope.nextSong = this.getFirstActiveSong();
      return;
    }

    if(this.scope.random) {
      const arr = this.getActiveSongsForRandom(song.title);
      this.scope.nextSong = arr[Math.floor(Math.random() * arr.length)];    
      this.scope.prevSong = this.history[this.history.length - 1] || null;
      isPlaying && this.scope.prevSong && this.scope.prevSong.title === song.title && (this.scope.prevSong = null);
      return;
    }

    this.scope.prevSong = this.getPrevActiveSong(index);
    this.scope.nextSong = this.getNextActiveSong(index);
    !this.scope.nextSong && (this.scope.nextSong = this.getFirstActiveSong());
  }

  async calculatePlayerPosition() {
    if(!store.isPlayerVisible) {
      this.elFooter.style.height = 0;
      return;
    }

    const height = this.elPlayer.getBoundingClientRect().height;
    
    if(document.body.scrollHeight + 1 >= document.body.clientHeight) {
      this.elFooter.style.height = height + 'px';
    }
    else {
      this.elFooter.style.height = 0;
    }   
  }

  async changeActiveSong(song) {
    if(!song) {
      return;
    }

    this.stopLoading();
    store.isPlayerVisible = !!song;
    const cacheInfo = getCache(song.title) || {};
    song = { ...excludeCacheFromSong(song), ...cacheInfo };
    this.scope.song = song;
    this.scope.progress = 0;
    this.scope.buffer = 0;
    this.setInfo();
    
    try {      
      await this.loadSrc(song);
      this.play();
      store.song = {...song, isFailed: false };
      this.scope.random && this.addHistory(song);
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
      store.song = {...song, isFailed: true };
      this.setAudioError(); 
      this.failNextSongTimeout = setTimeout(() => this.setNextSong(), 1000);        
    }
  }

  async loadSrc(song) {
    this.scope.isLoading = true;
    try {
      window.cordova? await this.loadSrcMobile(song): await this.loadSrcBrowser(song);
    }
    catch(err) {
      this.stopLoading(); 
      throw err;
    }
    this.scope.isLoading = false;
  }

  stopLoading() {
    this.scope.audioError = false;
    this.scope.isPlaying = false;
    this.scope.isLoading = false;
    this.failNextSongTimeout && clearTimeout(this.failNextSongTimeout);
    this.releaseMedia();
  }

  releaseMedia() {
    window.cordova? this.releaseMediaMobile(): this.releaseMediaBrowser();
  }

  releaseMediaMobile(media) {
    media = media || this.media;

    if(!media) {
      return;
    }

    clearInterval(media.__mediaInterval);
    clearTimeout(media.__delayTimeout);
    media.__releasing = true;
    media.release();
    delete media.__releasing;
    media.__released = true;
  }

  releaseMediaBrowser() {
    this.listenAudioTimeUpdate && this.elAudio.removeEventListener("timeupdate", this.listenAudioTimeUpdate);
    this.listenAudioProgress && this.elAudio.removeEventListener("progress", this.listenAudioProgress);
    this.listenAudioLoadedMetaData && this.elAudio.removeEventListener("loadedmetadata", this.listenAudioLoadedMetaData);
    this.listenAudioError && this.elAudio.removeEventListener("error", this.listenAudioError);
    this.elAudio.__delayTimeout && clearTimeout(this.elAudio.__delayTimeout);
    delete this.elAudio.__delayTimeout;
    delete this.elAudio.__resolved;
    this.elAudio.src = '';
  }

  async loadSrcBrowser(song) {    
    await new Promise((resolve, reject) => {
      this.elAudio.src = song.audioLinkCache || song.audioLink;

      this.listenAudioLoadedMetaData = () => {
        const lsPlayerVolume = workStorage.getItem('playerVolume');
        this.setVolume(lsPlayerVolume === null? this.volume: lsPlayerVolume);
        this.elAudio.addEventListener("timeupdate", this.listenAudioTimeUpdate); 
        this.elAudio.__resolved = true;  
        clearTimeout(this.elAudio.__delayTimeout);
        resolve();
      };

      this.listenAudioTimeUpdate = () => {
        this.checkProgress();
        this.checkBufferProgress();
      };

      this.listenAudioError = () => {
        reject(new Error('Audio not found'));
      };
      
      this.elAudio.addEventListener("error", this.listenAudioError); 
      this.elAudio.addEventListener('loadedmetadata', this.listenAudioLoadedMetaData);
      this.elAudio.__delayTimeout = setTimeout(() => {
        if(!this.elAudio.__resolved) {
          this.releaseMedia();
          reject(new Error('Audio loading timeout'));
        }
      }, this.audioDelayTimeout);
    });
  }

  async loadSrcMobile(song) {
    let media;

    await new Promise((resolve, reject) => {      
      media = this.media = new Media(song.audioLinkCache || song.audioLink, () => {}, (err) => { 
        reject(new Error(err.message || 'Wrong audio file'));
      }, (status) => {
        if(media.__releasing || media.__released) {
          return;
        }

        if(media !== this.media) {
          this.releaseMediaMobile(media);
          return resolve();
        }

        const prevStatus = this.scope.isPlaying;
        this.scope.isPlaying = status == 2 || status == 1;
        
        if(status == 4 && prevStatus) {
          this.onMusicEnd();
        }

        if(status == 2 || status == 3) {          
          MusicControls.updateIsPlaying(status == 2);
        }
        
        if(status == 2 && !media.__resolved) {
          clearTimeout(media.__delayTimeout);
          media.__resolved = true;
          resolve();
        }
      });
      media.__delayTimeout = setTimeout(() => {
        if(!media.__resolved) {
          this.releaseMedia();
          reject(new Error('Audio loading timeout'));
        }        
      }, this.audioDelayTimeout);
      this.play();
    });

    this.pause();
    media.__mediaInterval = setInterval(() => this.checkProgress(), 1000);
    const covers = ['nocover.png'];
    song.coverLinkCache && !network.connection && covers.push(song.coverLinkCache);
    network.connection && covers.push(song.coverLink);
    const parts = song.title.split(' - ');
    
    for(let i = 0; i < covers.length; i++) {
      MusicControls.create({
        track: parts[1],
        artist: parts[0],
        dismissable: false,
        cover: covers[i],
        hasPrev: true,
        hasNext: true
      });
    }    

    MusicControls.subscribe(action => {
      const parsed = JSON.parse(action);
      const message = parsed.message;
    
      if(message == 'music-controls-media-button-play-pause' || message == 'music-controls-toggle-play-pause') {
        this.scope.isPlaying? this.pause(): this.play();
      }
      else if(message == 'music-controls-next' || message == 'music-controls-media-button-next') {
        this.setNextSong();
      }
      else if(message == 'music-controls-previous' || message == 'music-controls-media-button-previous') {
        this.setPrevSong();
      }
      else if(message == 'music-controls-pause') {
        this.pause();
      }
      else if(message == 'music-controls-play') {
        this.play();
      }
      else if(message == 'music-controls-seek-to') {
        MusicControls.updateElapsed({ elapsed: parsed.position, isPlaying: true });
      }
    });

    MusicControls.listen();
  }

  play() { 
    if(this.scope.isPlaying) {
      return;
    }

    window.cordova? this.playMobile(): this.playBrowser();
  }
  
  playBrowser() {
    this.elAudio.play();
  }

  playMobile() {
    this.media.play({ playAudioWhenScreenIsLocked : true });
    MusicControls.updateIsPlaying(true);
  }

  pause() {
    if(!this.scope.isPlaying) {
      return;
    }

    window.cordova? this.pauseMobile(): this.pauseBrowser(); 
  }

  pauseBrowser() {
    this.elAudio.pause();
  }

  pauseMobile() {
    this.media.pause();
    MusicControls.updateIsPlaying(false);
  }

  setVolume(val) {
    this.scope.volume = this.elAudio.volume = val;
    workStorage.setItem('playerVolume', val);
  }

  checkProgress() {
    store.pageTitle = this.scope.song.title; 
    window.cordova? this.checkProgressMobile(): this.checkProgressBrowser(); 
  }

  checkProgressBrowser() {
    if(this.elAudio.readyState < 4 || isNaN(this.elAudio.duration) || !this.elAudio.duration) {
      return;
    }

    const width = this.getProgressWidth();
    this.scope.progress = width * (this.elAudio.currentTime / this.elAudio.duration); 
  }

  checkProgressMobile() {
    const duration = this.media.getDuration();

    if(!duration) {
      return;
    }

    this.media.getCurrentPosition(
      position => {
        const width = this.getProgressWidth();
        
        if (position > 0) {
          this.scope.progress = width * (position / duration);         
        }
        else {  
          this.scope.progress = 0;
        }
      }
    );  
  }

  checkBufferProgress() {
    if(!this.elAudio.duration || isNaN(this.elAudio.duration)) {
      return;
    }
    
    const width = this.getProgressWidth();    
    const buffer = this.elAudio.buffered.end(0);
    this.scope.buffer = width * (buffer / this.elAudio.duration);
  }

  setProgress(event) {
    if(this.scope.audioError) {
      return;
    }

    window.cordova? this.setProgressMobile(event): this.setProgressBrowser(event); 
  }

  setProgressBrowser(event) {
    if (!this.elAudio.duration) {
      return;
    }

    this.elAudio.currentTime = this.elAudio.duration * (event.x / this.getProgressWidth());
    this.elAudio.paused && this.play();
  }

  setProgressMobile(event) {
    const duration = this.media.getDuration();

    if(!duration) {
      return;
    }

    const currentTime = duration * (event.x / this.getProgressWidth())
    this.media.seekTo(currentTime * 1000);
    this.play(); 
  }

  getProgressWidth() {
    return this.elProgress.offsetWidth
  }

  setAudioError() {
    this.scope.isPlaying = false;
    this.scope.audioError = true;
  }
}