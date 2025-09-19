import Util from '@services/util.js';
import './label.scss';

/** @constant {number} LABEL_SIZE_FACTOR Label size factor compared to font size. */
const LABEL_SIZE_FACTOR = 1.5;

/** @constant {number} VISIBILITY_TIMEOUT_MS Visibility timeout in milliseconds. */
const VISIBILITY_TIMEOUT_MS = 10;

export default class Label {

  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      position: 'bottom',
    }, params);

    // Label
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation-label-container');
    this.dom.classList.add(this.params.position);
    this.dom.setAttribute('aria-hidden', 'true');

    const label = document.createElement('div');
    label.classList.add('h5p-portfolio-hotspot-navigation-label');
    label.setAttribute('aria-hidden', 'true');
    this.dom.appendChild(label);

    this.labelInner = document.createElement('div');
    this.labelInner.classList.add(
      'h5p-portfolio-hotspot-navigation-label-inner',
    );
    this.labelInner.innerText = this.params.text;
    label.appendChild(this.labelInner);

    if (!this.params.startVisible) {
      this.hide();
    }
  }

  /**
   * Get label DOM.
   * @returns {HTMLElement} Label DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isTouch] If true, was called by touch device.
   * @param {boolean} [params.skipDelay] If true, will immediately show label.
   */
  show(params = {}) {
    if (this.isShowing()) {
      return;
    }

    if (!this.params.text) {
      return;
    }

    // Determine whether there are multiple lines, need to adjust position
    const fontSize = parseFloat(
      window.getComputedStyle(this.labelInner).getPropertyValue('font-size'),
    );
    const labelSize = Math.floor(this.labelInner.getBoundingClientRect().height);
    this.dom.classList.toggle('multiline', fontSize * LABEL_SIZE_FACTOR < labelSize);

    this.dom.classList.toggle('touch-device', params.isTouch || false);

    if (params.skipDelay) {
      this.dom.classList.remove('visibility-hidden');
    }
    else {
      window.setTimeout(() => {
        this.dom.classList.remove('visibility-hidden');
      }, VISIBILITY_TIMEOUT_MS);
    }

    this.dom.classList.remove('display-none');

    this.showing = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('visibility-hidden');
    window.setTimeout(() => {
      this.dom.classList.add('display-none');
    }, 0);
    this.showing = false;
  }

  /**
   * Determine whether label is showing.
   * @returns {boolean} True, if label is showing. Else false.
   */
  isShowing() {
    return this.showing;
  }
}
