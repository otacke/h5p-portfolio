export default class Content {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   */
  constructor(params = {}) {
    this.instance = params.instance;
    this.semantics = params.semantics;
  }

  /**
   * Get section instance.
   * @returns {H5P.ContentType} H5P content type instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get section title.
   * @returns {string} Section title.
   */
  getTitle() {
    if (typeof this.instance.getTitle === 'function') {
      return this.instance.getTitle();
    }

    if (this.semantics?.metadata?.title) {
      return this.semantics.metadata.title;
    }

    return null;
  }

  /**
   * Get semantics values.
   * @returns {object} Semantics values.
   */
  getSemantics() {
    return this.semantics;
  }

  /**
   * Get subContentId.
   * @returns {string} SubContentId.
   */
  getSubContentId() {
    return this.getInstance().subContentId;
  }
}
