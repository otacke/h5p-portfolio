import './navigation.scss';

import Util from '@services/util';
import Hotspot from './hotspot';

export default class HotspotNavigation {
  /**
   * @class
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

    this.dom = document.createElement('navigation');
    this.dom.classList.add('h5p-portfolio-hotspot-navigation');
    this.dom.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.hotspotNavigation')
    );

    this.hotspots = [];

    if (!this.params.image.path) {
      return; // No hotspot image provided, can't continue.
    }

    const image = document.createElement('img');
    image.classList.add('h5p-portfolio-hotspot-navigation-image');
    image.src = H5P.getPath(this.params.image.path, this.params.contentId);
    image.alt = '';
    image.setAttribute('aria-hidden', true);
    this.dom.appendChild(image);

    // Hotspots
    this.hotspots = this.params.chapters.getAll()
      .map((chapter, index) => {
        if (!chapter.params.hotspotNavigation) {
          return null;
        }

        const a11yLabel = this.params.dictionary.get('a11y.goTo').replace(
          /@title/, chapter.params.hotspotNavigation.title || chapter.title
        );

        return new Hotspot(
          {
            id: chapter.getSubContentId(),
            position: chapter.params.hotspotNavigation.position,
            title: chapter.params.hotspotNavigation.title,
            a11yLabel: a11yLabel,
            color: this.params.hotspotColors[index],
            showHotspotTitles: this.params.showHotspotTitles
          }, {
            onClicked: ((subContentId) => this.callbacks.onClicked(subContentId))
          }
        );
      });

    this.hotspots = this.hotspots.filter((hotspot) => hotspot !== null);

    this.hotspots.forEach((hotspot) => {
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
