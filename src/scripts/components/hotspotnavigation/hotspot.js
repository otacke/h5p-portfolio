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

    this.isShowingToast = false;

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation-hotspot');
    this.dom.style.left = `${this.params.position.x}%`;
    this.dom.style.top = `${this.params.position.y}%`;
    if (this.params.title) {
      this.dom.setAttribute('title', this.params.title);
    }

    this.dom.addEventListener('click', (event) => {
      this.handleClicked(event);
    });
  }

  getDOM() {
    return this.dom;
  }

  /**
   * Handle click on hotspot.
   * @param {Event} event Mouse event.
   */
  handleClicked(event) {
    if (event.pointerType === 'mouse') {
      this.callbacks.onClicked(this.params.id);
      return;
    }

    /*
     * Touch or pen. Will show title for Hotspot.toastDurationMs and during
     * that interval, another "click" will execute the regular click.
     */
    if (this.isShowingToast) {
      this.callbacks.onClicked(this.params.id);
      this.isShowingToast = false;
      clearTimeout(this.toastTimeout);
      return;
    }

    H5P.attachToastTo(this.dom, this.params.title, {
      duration: Hotspot.toastDurationMs,
      position: { noOverflowX: true, noOverflowY: true }
    });

    this.isShowingToast = true;
    this.toastTimeout = setTimeout(() => {
      this.isShowingToast = false;
    }, Hotspot.toastDurationMs);
  }
}

/** @const {number} Time period to show toast message for */
Hotspot.toastDurationMs = 3000;
