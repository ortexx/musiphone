import Akili from 'akili';
import utils from 'akili/src/utils';

export default class Scroller extends Akili.Component {
  static events = ['border'];
  static ssr = false;

  static define() {
    Akili.component('scroller', this);
  }

  resolved() { 
    this.parent = this.getScrollableParent();
    this.attr('debounce', this.handleDebounce, { callOnStart: true });
    this.attr('borderLine', this.handleBorderLine, { callOnStart: true }); 
    this.lastHeight = this.getHeight();   
    this.listenerResize = this.calculate.bind(this);
    window.addEventListener('resize', this.listenerResize);
  }

  removed() {
    window.removeEventListener('resize', this.listenerResize);
    this.parent.removeEventListener('scroll', this.listenerScroll);
    this.listenerScroll.removeDebounce();   
  }

  handleDebounce(debounce = 100) {
    this.parent.removeEventListener('scroll', this.listenerScroll);
    this.listenerScroll = utils.debounce(this.calculate.bind(this), debounce);
    this.parent.addEventListener('scroll', this.listenerScroll);
  }

  handleBorderLine(borderLine) {
    this.borderLine = borderLine || 10;
    this.calculate();
  }

  calculate() {
    const height = this.getHeight();
    
    if(height != this.lastHeight) {
      this.isBroken = false;
    }

    if(!this.isBroken && this.check()) {
      this.isBroken = true;
      this.attrs.onBorder.trigger();
    }
    
    this.lastHeight = height;
  }

  check() {
    return this.checkBorderBreaking() || this.checkScrollEnd();
  }

  checkBorderBreaking() {
    return this.getParentScrollTop() + this.getBorderSize() > this.getOffsetTop() + this.getHeight();
  }

  checkScrollEnd() {
    const sum = this.getParentClientHeight() + this.getParentScrollTop();
    return Math.ceil(sum) >= Math.floor(this.getParentScrollHeight()) - this.getBorderSize();
  }

  getHeight() {
    return this.el.getBoundingClientRect().height;
  }

  getParentScrollTop() {
    return this.parent === window? this.parent.scrollY: this.parent.scrollTop;
  }

  getBorderSize() {
    return this.getHeight() * (this.borderLine / 100);
  }

  getParentClientHeight() {
    return this.parent === window? document.documentElement.clientHeight: this.parent.clientHeight;
  }

  getParentScrollHeight() {
    return this.parent === window? document.documentElement.scrollHeight: this.parent.scrollHeight;
  }

  getOffsetTop() {
    return this.parent === window? this.el.offsetTop: this.el.offsetTop - this.parent.offsetTop;
  }

  elIsScrollable(el) {
    const style = getComputedStyle(el);

    return (
      style.overflowY == 'scroll' ||
      (
        (
          el.scrollHeight > el.clientHeight ||
          style.height > 0 ||
          style.minHeight > 0
        ) && 
        style.overflowY == 'auto'
      )
    );
  }

  findScrollable(el) {
    if(!el) {
      return document.body;
    }
    
    if(this.elIsScrollable(el)) {
      return el;
    }
    
    if(el === document.body) {      
      return document.body;
    }

    return this.findScrollable(el.parentNode);
  }

  getScrollableParent() {
    const parent = this.findScrollable(this.el.parentNode);
    return parent === document.body? window: parent;
  }
}