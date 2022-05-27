import Section from './section';

export default class Chapter {

  /**
   * @constructor
   * @param {params} Parameters.
   */
  constructor(params = {}) {
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

    // If needed, needs to be set when instance is attached
    this.dom = null;
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
