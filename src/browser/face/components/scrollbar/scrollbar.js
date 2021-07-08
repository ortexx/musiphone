import './scrollbar.scss';
import Akili from 'akili';
import smoothScrollbar from 'smooth-scrollbar';

export default class Scrollbar extends Akili.Component {
  static define() {
    Akili.component('scrollbar', this);
  }

  created() {
    this.scrollbar = smoothScrollbar.init(this.el);
  }

  removed() {
    this.scrollbar && smoothScrollbar.destroy(this.el);
    delete this.scrollbar;
  }
}