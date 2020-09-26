import './menu.scss'
import Akili from 'akili';
import store from 'akili/src/services/store';

export default class Menu extends Akili.Component {
  static template = require('./menu.html');

  static define() {
    Akili.component('menu', this);
    store.isMenuEnabled = true;
  }

  created() {
    this.actualMenuPercent = 0.25;
    this.animationTransitionPeriod = 200;
    this._animationTimeout = null;
    this._animating = false;    
    this.scope.isOpen = false;
    this.scope.setVisibility = this.setVisibility.bind(this);
    this.menuEl = document.querySelector('.main-menu');
    this.onTouchStartListener = this.onTouchStart.bind(this);
    this.onTouchMoveListener = this.onTouchMove.bind(this);
    this.onTouchEndListener = this.onTouchEnd.bind(this);
    document.body.addEventListener('touchstart', this.onTouchStartListener);
    document.body.addEventListener('touchmove', this.onTouchMoveListener);
    document.body.addEventListener('touchend', this.onTouchEndListener);
    this.menuEl.addEventListener('touchstart', this.onMenuTouchStart.bind(this));
    this.menuEl.addEventListener('touchmove', this.onMenuTouchMove.bind(this));
    this.menuEl.addEventListener('touchend', this.onMenuTouchEnd.bind(this));
  }  

  compiled() {
    this.attr('data', 'data');
    this.attr('isOpen', 'isOpen', { get: false });
    this.attr('isOpen', this.setVisibility, { callOnStart: true });    
  }

  removed() {
    document.body.removeEventListener('touchstart', this.onTouchStartListener);
    document.body.removeEventListener('touchmove', this.onTouchMoveListener);
    document.body.removeEventListener('touchend', this.onTouchEndListener);
  }

  setVisibility(val) {
    this.scope.isOpen = val;

    if(val) {
      this.el.style.display = 'block';
      this.menuEl.style.width = '100%';      
    }
    else {
      this.el.style.display = 'none';
      this.menuEl.style.width = 0;
    }
  }

  animateMenu(left = false) {
    this._animationTimeout && clearTimeout(this.animationTimeout);
    this._animating = true;

    return new Promise((resolve, reject) => {
      this.menuEl.style.transition = `width ${this.animationTransitionPeriod / 1000}s`;
      this.menuEl.style.width = left? 0: '100%';
      this._animationTimeout = setTimeout(() => {
        try {
          this.menuEl.style.transition = null;
          this._animating = false;
          resolve();
        }
        catch(err) {
          reject(err);
        }
      }, this.animationTransitionPeriod);      
    });   
  }

  isWrongWay(event) {
    const touch = event.changedTouches[0];
    const diffX = touch.clientX - this.pos.x;
    const diffY = touch.clientY - this.pos.y;
    return Math.abs(diffX) < Math.abs(diffY);
  }

  onTouchStart(event) {
    this._menuContext = this.menuEl.contains(event.target);

    if(this._animating || !store.isMenuEnabled || this._menuContext) {
      return;
    }
    
    const touch = event.changedTouches[0];
    this.pos = { x: touch.clientX, y: touch.clientY };
  }

  onTouchMove(event) {   
    if(!this.pos || !store.isMenuEnabled || this._menuContext) {
      return;
    }

    const diffX = event.changedTouches[0].clientX - this.pos.x;     

    if(diffX <= 0 || this.isWrongWay(event)) {
      return;
    }

    this.isActive = true;   
    this.el.style.display = 'block';    
    const absDiffX = Math.abs(diffX);
    this.menuEl.style.width = (absDiffX >= window.innerWidth? window.innerWidth: diffX) + 'px';
  }

  onTouchEnd(event) {
    if(!this.isActive || this._menuContext || this.menuEl.offsetWidth == 0) {
      return;
    }

    let diffX = event.changedTouches[0].clientX - this.pos.x;
    diffX <= 0 && (diffX = 0);
    this.pos = null;
    this.isActive = false;
    const right = diffX > window.innerWidth * this.actualMenuPercent;
    this.animateMenu(!right).then(() => this.setVisibility(right));
  }

  onMenuTouchStart(event) {
    if(this._animating || !store.isMenuEnabled) {
      return;
    }

    const touch = event.changedTouches[0];
    this.pos = { x: touch.clientX, y: touch.clientY };
  }

  onMenuTouchMove(event) {    
    if(!this.pos || !store.isMenuEnabled) {
      return;
    }

    const diffX = event.changedTouches[0].clientX - this.pos.x;

    if(diffX >= 0 || this.isWrongWay(event)) {
      return;
    }

    this.isActive = true;
    const absDiffX = Math.abs(diffX);
    this.menuEl.style.width = (absDiffX <= 0? 0: window.innerWidth - absDiffX) + 'px'; 
  }

  onMenuTouchEnd(event) {
    if(!this.isActive) {
      return;
    }
    
    const diffX = event.changedTouches[0].clientX - this.pos.x;
    this.pos = null;
    this.isActive = false;

    if(diffX >= 0) {
      return;
    }
    
    const absDiffX = Math.abs(diffX);
    const left = absDiffX > window.innerWidth * this.actualMenuPercent;
    this.animateMenu(left).then(() => this.setVisibility(!left));
  }
}