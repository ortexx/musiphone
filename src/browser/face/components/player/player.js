import './player.scss'
import Akili from 'akili';
import utils from 'akili/src/utils';
import store from 'akili/src/services/store';
import { getCache, excludeCacheFromSong } from '../../lib/cache';
import { checkSelection } from '../../lib/system';
import network from '../../lib/network';
import clientStorage from '../../client-storage';

export default class Player extends Akili.Component {
  static template = require('./player.html');

  static define() {
    Akili.component('player', this);
  }

  created() {    
    this.media = null; 
    this.mediaList = [];
    this.scope.progress = 0;
    this.scope.buffer = 0;
    this.volume = 0.75;
    this.history = [];
    this.filter = null;
    this.calculationDebounce = 100;
    this.audioDelayTimeout = 12000;
    this.prevSongBorderTime = 10;
    this.scope.song = null; 
    this.scope.isLoading = false;
    this.scope.hasPrevSong = false;
    this.scope.hasNextSong = false;
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
    this.scope.song = null;
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
    if(this.checkNextSongAsCurrent()) {
      return store.activeSong = this.scope.song;
    }

    if(!this.scope.nextSong) {
      return;
    }

    store.activeSong = this.scope.nextSong;
  }

  setPrevSong() {
    if(this.checkPrevSongAsCurrent()) {
      return store.activeSong = this.scope.song;
    }

    if(!this.scope.prevSong) {
      return;
    }

    this.scope.random && this.history.pop();
    store.activeSong = this.scope.prevSong;
  }

  toggleRandom() {
    this.scope.random = !this.scope.random; 
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

    if(this.history.length && last.title === song.title && !isPlaying) {
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
    this.setPrevState();
    this.setNextState();
    
    try {      
      const result = await this.loadSrc(song);
      
      if(result === false) {
        return;
      }

      store.song = {...song, isFailed: false };
      this.scope.random && this.addHistory(song);
      this.play();      
    }
    catch(err) {
      //eslint-disable-next-line no-console
      console.error(err);
      store.song = {...song, isFailed: true };
      this.failNextSongTimeout = setTimeout(() => this.setNextSong(), 1000);        
    }
  }

  async loadSrc(song) {
    this.scope.isLoading = true;
    let result;

    try {
      result = window.cordova? await this.loadSrcMobile(song): await this.loadSrcBrowser(song);
    }
    catch(err) {
      this.stopLoading(); 
      throw err;
    }

    this.scope.isLoading = false;
    return result;
  }

  stopLoading() {
    this.scope.isPlaying = false;
    this.scope.isLoading = false;
    this.isMobileLoaded = false;
    clearTimeout(this.failNextSongTimeout);
    this.releaseMedia();
  }

  releaseMedia() {
    window.cordova? this.releaseMediaMobile(): this.releaseMediaBrowser();
  }

  releaseMediaMobile(media) {
    media = media || this.media;

    if(!media || media.__released || media.__releasing) {
      return;
    }

    media.__releasing = true;
    clearInterval(media.__mediaInterval);
    clearTimeout(media.__delayTimeout);
    media.stop();
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
        resolve(true);
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
    const result = await new Promise((resolve, reject) => {      
      media = this.media = new Media(song.audioLinkCache || song.audioLink, () => {}, (err) => {
        this.releaseMediaMobile(media);
        err.code !== 0? reject(new Error(err.message || 'Wrong audio file')): resolve(false);
      }, (status) => {
        /**
         * Probable bug handling
         * @link https://github.com/apache/cordova-plugin-media/issues/299
        */ 
        clearTimeout(this.mobileReleaseTimeout);
        this.mobileReleaseTimeout = setTimeout(() => {
          for(let i = this.mediaList.length - 1; i >= 0; i--) {
            const media = this.mediaList[i];

            if(!media.__released) {
              continue;
            }

            media.release();
            this.mediaList.splice(i, 1);
          }

          if(this.scope.isPlaying && this.media.__released) {
            store.activeSong = song;
          }
          else if(!this.scope.isPlaying && media !== this.media) {
            this.media.play();
          }
        }, 1000);

        if(media.__releasing || media.__released) {
          status < 3 && media.stop();
          return;
        }

        const prevStatus = this.scope.isPlaying;
        this.scope.isPlaying = status == 2 || status == 1;
        
        if(status == 4 && prevStatus) {
          return this.onMusicEnd();
        }

        if(this.isMobileLoaded && (status == 2 || status == 3)) {          
          MusicControls.updateIsPlaying(status == 2);
        }
        
        if(!media.__resolved && status == 2) {
          clearTimeout(media.__delayTimeout);
          resolve(media.__resolved = true);
        }
      });
      this.mediaList.push(media);
      media.__delayTimeout = setTimeout(() => {
        if(!media.__resolved) {
          this.releaseMediaMobile(media);
          reject(new Error('Audio loading timeout'));
        }        
      }, this.audioDelayTimeout);
      this.play();      
    });

    if(result === false) {
      return result;
    }
    
    await this.setControls(song);
    this.pause();
    this.isMobileLoaded = true;
    media.__currentTime = 0;
    media.__mediaInterval = setInterval(async () => {
      this.checkProgress();
      media.__currentTime = await new Promise((resolve) => {
        this.media.getCurrentPosition(p => resolve(p < 0? 0: p), () => resolve(0));
      });
    }, 1000);   
    return result;
  }

  async setControls(song) {
    window.cordova && await this.setControlsMobile(song);
  }

  async setControlsMobile(song) {
    return new Promise((resolve, reject) => {
      const parts = clientStorage.constructor.utils.splitSongTitle(song.title);
    
      MusicControls.create({
        track: parts[1],
        artist: parts[0],
        dismissable: false,
        cover: song.coverLink,
        hasPrev: true,
        hasNext: true
      }, () => {
        MusicControls.subscribe(action => {
          if(!this.isMobileLoaded) {
            return;
          }

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
          else if(message == 'music-controls-pause' || message == 'music-controls-media-button-pause') {
            this.pause();
          }
          else if(message == 'music-controls-play'  || message == 'music-controls-media-button-play') {
            this.play();
          }
          else if(message == 'music-controls-seek-to') {
            MusicControls.updateElapsed({ elapsed: parsed.position, isPlaying: true });
          }
        });
  
        MusicControls.listen();
        resolve();
      }, reject);   
    });
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
    if(this.media.__releasing || this.media.__released) {
      return;
    }

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
    if(this.media.__releasing || this.media.__released) {
      return;
    }

    this.media.pause();
    MusicControls.updateIsPlaying(false);
  }

  setVolume(val) {
    this.scope.volume = this.elAudio.volume = val;
    workStorage.setItem('playerVolume', val);
  }

  checkPrevSongAsCurrent() {
    return this.scope.song && (this.getCurrentTime() > this.prevSongBorderTime || !this.scope.prevSong);
  }

  checkNextSongAsCurrent() {
    return this.scope.song && !this.scope.nextSong;
  }

  setPrevState() {
    if(this.checkPrevSongAsCurrent()) {
      this.scope.hasPrevSong = true;
      return;
    }

    this.scope.hasPrevSong = !!this.scope.prevSong;
  }

  setNextState() {
    if(this.checkNextSongAsCurrent()) {
      this.scope.hasNextSong = true;
      return;
    }

    this.scope.hasNextSong = !!this.scope.nextSong;
  }

  checkProgress() {
    store.pageTitle = this.scope.song.title; 
    window.cordova? this.checkProgressMobile(): this.checkProgressBrowser();
    this.setPrevState();
    this.setNextState();
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
    if(checkSelection(this.elProgress)) {
      return;
    }

    window.cordova? this.setProgressMobile(event): this.setProgressBrowser(event);
    this.setPrevState();
    this.setNextState();
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

  getCurrentTime() {
    return window.cordova? this.getCurrentTimeMobile(): this.getCurrentTimeBrowser(); 
  }

  getCurrentTimeMobile() {
    return this.media? this.media.__currentTime: 0;  
  }

  getCurrentTimeBrowser() {
    return this.elAudio.currentTime;
  }

  getProgressWidth() {
    return this.elProgress.offsetWidth;
  }
}