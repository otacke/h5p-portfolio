import Util from '@services/util.js';

/**
 * @class
 * @param {object} params Parameters.
 * @param {object} callbacks Callbacks.
 */
export default class SinglePlaceholder {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      classNames: []
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-single-placeholder-container');

    this.params.classNames.forEach((className) => {
      this.dom.classList.add(className);
    });

    const previousState = params.previousState ?? {};

    // Workaround for H5P.Video with YouTube content. Needs to be attached.
    const hiddenDOM = document.createElement('div');
    hiddenDOM.classList.add('hidden-dom');
    hiddenDOM.append(this.dom);
    document.body.append(hiddenDOM);

    // Workaround for H5P.Video with YouTube content. Needs to be attached.
    window.requestAnimationFrame(() => {
      hiddenDOM.remove(); // Not needed anymore
    });

    const instance = (!params.params) ?
      null :
      H5P.newRunnable(
        params.params,
        params.contentId,
        H5P.jQuery(this.dom),
        false,
        { previousState: previousState }
      );

    // Resize instance to fit inside parent and vice versa
    if (instance) {
      this.bubbleDown(params.context, 'resize', [instance]);
      this.bubbleUp(instance, 'resize', params.context);
    }
  }

  /**
   * Get instance container.
   * @returns {HTMLElement} Instance container.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get dead clone of instance container.
   * @returns {HTMLElement} Clone of instance container.
   */
  getDOMClone() {
    const clone = this.dom.cloneNode(true);

    // Replace all ids in clone to keep them unique
    const uuid = H5P.createUUID();
    [...clone.getElementsByTagName('*')].forEach((element) => {
      if (element.getAttribute('id')) {
        element.setAttribute('id', `${element.getAttribute('id')}-${uuid}`);
      }
    });

    return clone;
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of the event.
   * @param {string} eventName Name of the event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets = []) {
    origin.on(eventName, function (event) {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        target.trigger(eventName, event);
      });
    });
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {

      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }
}
