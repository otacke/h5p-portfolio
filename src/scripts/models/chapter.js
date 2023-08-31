import Section from '@models/section.js';
import HotspotNavigation from '@components/hotspotnavigation/navigation.js';

/*
 * TODO: Clean up, so the placeholders for navigation, chapters, etc. can be
 * reset
 */

export default class Chapter {

  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.isInitialized = false;
    this.title = params.content.metadata.title;
    this.hierarchy = params.hierarchy;

    // Build chapter instance
    this.instance = H5P.newRunnable(
      params.content,
      params.contentId,
      undefined,
      undefined,
      { previousState: params.previousState }
    );

    // Build sections
    this.sections = [];
    const childInstances = this.instance.getInstances();
    const childSemantics = this.instance.getInstancesSemantics();

    for (let i = 0; i < childInstances.length; i++) {
      this.sections.push(new Section({
        instance: childInstances[i],
        semantics: childSemantics[i]
      }));
    }

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-chapter-container');

    this.hotspotNavigationDOM = document.createElement('div');
    this.hotspotNavigationDOM.style.display = 'none';
    this.dom.append(this.hotspotNavigationDOM);

    this.headerDOM = document.createElement('div');
    this.headerDOM.style.display = 'none';
    this.dom.append(this.headerDOM);

    this.chapterDOM = document.createElement('div');
    this.dom.append(this.chapterDOM);

    this.footerDOM = document.createElement('div');
    this.footerDOM.style.display = 'none';
    this.dom.append(this.footerDOM);
  }

  /**
   * Get chapter instance.
   * @returns {H5P.ContentType} H5P instance of chapter.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get DOM.
   * @returns {HTMLElement|null} Instance DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set hotspot navigation.
   * @param {HotspotNavigation} hotspotNavigation Hotspot Navigation.
   */
  setHotspotNavigation(hotspotNavigation) {
    if (!this.params.displayHotspotNavigation) {
      return; // Chapter should not display hotspot navigation
    }

    this.hotspotNavigation = hotspotNavigation;
    const newHotspotNavigation = this.hotspotNavigation.getDOM();
    this.dom.replaceChild(newHotspotNavigation, this.hotspotNavigationDOM);
    this.hotspotNavigationDOM = newHotspotNavigation;
  }

  /**
   * Set header.
   *
   * `remove` to remove header, `original` to set original placeholder DOM
   * incl. event listeners, `clone` for clone.
   * @param {string} action Action: remove|original|clone.
   */
  setHeader(action) {
    if (!this.params.displayHeader || !this.params.header) {
      return;
    }

    let newDOM;
    if (action === 'remove') {
      newDOM = document.createElement('div');
      newDOM.style.display = 'none';
    }
    else if (action === 'original') {
      newDOM = this.params.header.getDOM();
    }
    else if (action === 'clone') {
      newDOM = this.params.header.getDOMClone();
      const rect = (this.params.header.getDOM().childNodes[0]).getBoundingClientRect();
      if (rect.height > 0) {
        const oldHeight = newDOM.childNodes[0].style.minHeight;
        newDOM.childNodes[0].style.minHeight = `${rect.height}px`;
        window.setTimeout(() => {
          newDOM.childNodes[0].style.minHeight = oldHeight;
        }, 500);
      }
    }
    else {
      return;
    }

    this.dom.replaceChild(newDOM, this.headerDOM);
    this.headerDOM = newDOM;
  }

  /**
   * Set footer.
   *
   * `remove` to remove footer, `original` to set original placeholder DOM
   * incl. event listeners, `clone` for clone.
   * @param {string} action Action: remove|original|clone.
   */
  setFooter(action) {
    if (!this.params.displayFooter || !this.params.footer) {
      return;
    }

    let newDOM;
    if (action === 'remove') {
      newDOM = document.createElement('div');
      newDOM.style.display = 'none';
    }
    else if (action === 'original') {
      newDOM = this.params.footer.getDOM();
    }
    else if (action === 'clone') {
      newDOM = this.params.footer.getDOMClone();
    }
    else {
      return;
    }

    this.dom.replaceChild(newDOM, this.footerDOM);
    this.footerDOM = newDOM;
  }

  /**
   * Start animation.
   */
  startAnimation() {
    this.dom.classList.add('h5p-portfolio-animate');
  }

  /**
   * Stop animation.
   */
  stopAnimation() {
    this.dom.classList.remove('h5p-portfolio-animate');
  }

  /**
   * Add position.
   * @param {string} position From previous|current|next.
   * @param {boolean} [state] Forced state to toggle to.
   */
  toggleAnimationPosition(position, state) {
    if (!['previous', 'current', 'next'].includes(position)) {
      return;
    }

    if (typeof state !== 'boolean') {
      state = !this.dom.classList.contains(`h5p-portfolio-${position}`);
    }

    this.dom.classList.toggle(`h5p-portfolio-${position}`, state);
  }

  /**
   * Get id.
   * @returns {string} Hierachy.
   */
  getHierarchy() {
    return this.hierarchy;
  }

  /**
   * Get sections.
   * @returns {object[]} Sections.
   */
  getSections() {
    return this.sections;
  }

  /**
   * Get section.
   * @param {number} index Section index.
   * @returns {Section} Section.
   */
  getSection(index) {
    if (
      typeof index !== 'number' ||
      index < 0 || index > this.sections.length - 1
    ) {
      return null;
    }

    return this.sections[index];
  }

  /**
   * Get title.
   * @returns {string} Chapter title.
   */
  getTitle() {
    return this.getInstance().getTitle();
  }

  /**
   * Get subContentId.
   * @returns {string} SubContentId.
   */
  getSubContentId() {
    return this.getInstance().subContentId;
  }
}
