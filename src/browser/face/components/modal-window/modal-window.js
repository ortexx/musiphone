import './modal-window.scss'
import Akili from 'akili';

export default class ModalWindow extends Akili.Component {
  static template = require('./modal-window.html');
  static events = ['open', 'close'];

  static define() {
    Akili.component('modal-window', this);
  }

  created() {
    this.scope.zIndex = 11000;
    this.scope.isOpen = false;
  }

  compiled() {
    this.attr('body-class', 'bodyClass');
    this.attr('z-index', 'zIndex');
    this.attr('isOpen', 'isOpen');
    this.attr('unclosable', 'unclosable');
  }
}