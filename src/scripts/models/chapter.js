import Section from './section';

export default class Chapter {

  /**
   * @constructor
   * @param {params} Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.isInitialized = false;
    this.title = params.content.metadata.title; // TODO: Something better?
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

    // If needed, needs to be set when instance is attached
    this.instanceDOM = null;
  }

  /**
   * Get chapter instance.
   * @return {H5P.ContentType} H5P instance of chapter.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get DOM.
   * @return {HTMLElement|null} Instance DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set DOM.
   * @param {HTMLElement|null} Instance DOM.
   */
  setInstanceDOM(dom) {
    if (this.instanceDOM) {
      this.dom.removeChild(this.instanceDOM);
    }

    this.instanceDOM = dom;
    this.dom.appendChild(this.instanceDOM);
  }

  setHotspotNavigation(hotspotNavigation) {
    if (!this.params.displayHotspotNavigation) {
      return; // Chapter should not display hotspot navigation
    }

    if (this.hotspotNavigationDOM) {
      this.dom.removeChild(this.hotspotNavigationDOM);
    }

    this.hotspotNavigation = hotspotNavigation;
    this.dom.appendChild(this.hotspotNavigation.getDOM());
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
   * @return {string} Hierachy.
   */
  getHierarchy() {
    return this.hierarchy;
  }

  /**
   * Get sections.
   */
  getSections() {
    return this.sections;
  }

  /**
   * Get section.
   * @param {number} index Section index.
   * @return {Section} Section.
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
   * @return {string} Chapter title.
   */
  getTitle() {
    return this.getInstance().getTitle();
  }

  /**
   * Get subContentId.
   * @return {string} SubContentId.
   */
  getSubContentId() {
    return this.getInstance().subContentId;
  }
}
