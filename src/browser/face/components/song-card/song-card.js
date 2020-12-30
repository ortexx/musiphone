import './song-card.scss'
import Akili from 'akili';
import utils from 'akili/src/utils';

export default class SongCard extends Akili.Component {
  static template = require('./song-card.html');
  static events = ['add', 'remove', 'cache'];

  static define() {
    Akili.component('song-card', this);
  }

  created() {    
    this.scope.info = {};
    this.scope.buttons = [
      {
        name: 'add',
        icon: 'fa-plus-circle',
        status: true
      },
      {
        name: 'cache',
        icon: 'fa-arrow-alt-circle-down',
        status: true
      },
      {
        name: 'caching',
        icon: 'fa-spinner fa-spin',
        silent: true,
        status: false
      },
      {
        name: 'uncaching',
        icon: 'fa-spinner fa-spin',
        silent: true,
        status: false
      },  
      {
        name: 'remove',
        icon: 'fa-times-circle',
        status: true,
      }
    ];
    this.scope.buttonClick = this.buttonClick.bind(this);
  }

  compiled() {
    this.attr('info', 'info');
    this.attr('buttons', this.setButtonsStatus);
  }

  setButtonsStatus(statuses) {
    for(let key in statuses) {
      const btn = this.scope.buttons.find(it => it.name == key);

      if(!btn) {
        continue;
      }

      btn.status = statuses[key];
    }
  }

  buttonClick(name) {
    this.attrs[`on${ utils.capitalize(name) }`].trigger();
  }
}