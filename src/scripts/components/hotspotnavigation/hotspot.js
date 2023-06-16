import Util from '@services/util';
import Label from './label.js';
import he from 'he';
import './hotspot.scss';

export default class Hotspot {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      position: { x: 50, y: 50 }
    }, params);
    this.callbacks = Util.extend({
      onClicked: (() => {})
    }, callbacks);

    if (this.params.title) {
      this.params.title = he.decode(this.params.title);
    }

    this.isShowingToast = false;

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation-hotspot');
    this.dom.style.left = `${this.params.position.x}%`;
    this.dom.style.top = `${this.params.position.y}%`;
    this.dom.setAttribute('tabindex', '-1');
    if (this.params.color) {
      this.dom.style.background = this.params.color;
    }

    if (this.params.title) {
      const vertical = this.params.position.y < 50 ? 'bottom' : 'top';
      const horizontal = this.params.position.x < 50 ? 'right' : 'left';

      this.label = new Label({
        text: this.params.title,
        startVisible: this.params.showHotspotTitles,
        position: `${vertical}-${horizontal}`
      });
      this.dom.append(this.label.getDOM());

      this.dom.addEventListener('click', (event) => {
        this.handleClicked(event);
      });

      if (!this.params.showHotspotTitles) {
        // Works as a custom tooltip
        this.dom.addEventListener('mouseenter', (event) => {
          this.handleMouseOver(event);
        });
        this.dom.addEventListener('focus', (event) => {
          this.handleMouseOver(event);
        });
        this.dom.addEventListener('mouseleave', () => {
          this.handleMouseOut();
        });
        this.dom.addEventListener('blur', (event) => {
          this.handleMouseOut(event);
        });
      }
    }

    this.dom.addEventListener('click', (event) => {
      this.handleClicked(event);
    });
  }

  /**
   * Get hotspot DOM.
   * @returns {HTMLElement} Hotspot DOM.
   */
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
    if (this.isShowingToast || !this.params.title) {
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

  /**
   * Handle mouseover.
   * @param {Event} event Event that triggered.
   */
  handleMouseOver(event) {
    if (Util.supportsTouch()) {
      return;
    }

    this.label.show({ skipDelay: event instanceof FocusEvent });
  }

  /**
   * Handle mouseout.
   */
  handleMouseOut() {
    if (Util.supportsTouch()) {
      return;
    }

    this.label.hide();
  }
}

/** @constant {number} Time period to show toast message for */
Hotspot.toastDurationMs = 3000;
