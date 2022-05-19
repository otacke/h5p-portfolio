import Section from './section';

export default class Chapter {

  /**
   * @constructor
   * @param {params} Parameters.
   */
  constructor(params = {}) {
    this.isInitialized = false;
    this.title = params.content.metadata.title; // TODO: Something better?

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
  }

  /**
   * Get chapter instance.
   * @return {H5P.ContentType} H5P instance of chapter.
   */
  getInstance() {
    return this.instance;
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
