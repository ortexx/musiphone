import 'tippy.js/dist/tippy.css';
import './tooltip.scss';
import Akili from 'akili';
import tippy from 'tippy.js';

export default class Tooltip extends Akili.Component {
  static define() {
    Akili.component('tooltip', this);
  }

  created() {
    window.cordova && (this.el.style.userSelect = 'none'); 
    this.defaults = { 
      arrow: true, 
      offset: [0, 10],
      delay: 500, 
      maxWidth: 'none'
    };
    this.options = { ...this.defaults };
  }

  compiled() { 
    this.attr('options', this.handleOptions);
    this.attr('message', this.create);
    this.attr('is-open', val => val? this.show(): this.hide()); 
  } 

  removed() { 
    this.remove();
  }

  handleOptions(options) {
    this.options = { ...this.defaults, ...options };
  }

  remove() {
    this.tooltip && this.tooltip.destroy();
    delete this.tooltip;
  }

  create() {    
    this.remove();  
    this.attrs.message && (this.tooltip = tippy(this.el, { ...this.options, content: this.attrs.message }));
  }

  show() {
    this.tooltip && this.tooltip.show();
  }

  hide() {
    this.tooltip && this.tooltip.popperInstance && this.tooltip.hide();
  }
}