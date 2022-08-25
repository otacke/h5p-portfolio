import Content from './content.js';

export default class Section {

  constructor(params = {}) {
    this.instance = params.instance;
    this.semantics = params.semantics;

    const instances = this.instance.getInstances();
    const instancesSemantics = this.instance.getInstancesSemantics();

    this.contents = [];
    for (let i = 0; i < instances.length; i++) {
      if (!instances[i] || instancesSemantics[i]) {
        break; // No content set
      }

      const content = new Content({
        instance: instances[i],
        semantics: instancesSemantics[i]
      });

      this.contents.push(content);
    }
  }

  /**
   * Get section instance.
   *
   * @returns {H5P.ContentType} H5P content type instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get contents.
   *
   * @returns {H5P.ContentType[]} Contents of section.
   */
  getContents() {
    return this.contents;
  }

  /**
   * Get section title.
   *
   * @returns {string} Section title.
   */
  getTitle() {
    if (typeof this.instance.getTitle === 'function') {
      return this.getInstance().getTitle();
    }

    return null;
  }

  /**
   * Get semantics values.
   *
   * @returns {object} Semantics values.
   */
  getSemantics() {
    return this.semantics;
  }

  /**
   * Get subContentId.
   *
   * @returns {string} SubContentId.
   */
  getSubContentId() {
    return this.getInstance().subContentId;
  }
}
