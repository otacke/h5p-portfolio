import './hotspot.scss';

import Util from './../../helpers/util';

export default class Hotspot {
  /**
   * @constructor
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onClicked: (() => {})
    }, callbacks);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation-hotspot');
    this.dom.style.left = `${this.params.position.x}%`;
    this.dom.style.top = `${this.params.position.y}%`;
    if (this.params.title) {
      this.dom.setAttribute('title', this.params.title);
    }

    this.dom.addEventListener('click', () => {
      // TODO: On touch, show title first, then callback on 2nd click
      this.callbacks.onClicked(this.params.id);
    });

  }

  getDOM() {
    return this.dom;
  }
}
