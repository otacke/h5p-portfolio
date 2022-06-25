import './navigation.scss';

import Util from './../../helpers/util';
import Chapters from './../../services/chapters';
import Hotspot from './hotspot';

export default class HotspotNavigation {
  /**
   * @constructor
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      image: {}
    }, params);

    this.callbacks = Util.extend({
      onClicked: (() => {})
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation');
    this.dom.setAttribute('aria-hidden', true);

    this.hotspots = [];

    if (!this.params.image.path) {
      return; // No hotspot image provided, can't continue.
    }

    const image = document.createElement('img');
    image.classList.add('h5p-portfolio-hotspot-navigation-image');
    image.src = H5P.getPath(this.params.image.path, this.params.contentId);
    this.dom.appendChild(image);

    // Hotspots
    this.hotspots = Chapters.getAll()
      .filter(chapter => chapter.params.hotspotNavigation)
      .map(chapter => {
        return new Hotspot(
          {
            id: chapter.getSubContentId(),
            position: chapter.params.hotspotNavigation.position,
            title: chapter.params.hotspotNavigation.title,
            color: this.params.color
          }, {
            onClicked: ((subContentId) => this.callbacks.onClicked(subContentId))
          }
        );
      });

    this.hotspots.forEach(hotspot => {
      this.dom.appendChild(hotspot.getDOM());
    });
  }

  getDOM() {
    return this.dom;
  }

  hasHotspots() {
    return this.hotspots.length > 0;
  }
}
