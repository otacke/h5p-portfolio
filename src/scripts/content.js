export default class Content {

  /**
   * @constructor
   * @param {params} Parameters.
   */
  constructor(params = {}) {
    this.instance = params.instance;
    this.semantics = params.semantics;
  }

  /**
   * Get section instance.
   * @return {H5P.ContentType} H5P content type instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Get section title.
   * @return {string} Section title.
   */
  getTitle() {
    if (typeof this.instance.getTitle === 'function') {
      return this.instance.getTitle();
    }

    if (this.semantics?.metadata?.title) {
      return this.semantics.metadata.title;
    }

    // TODO: Localized unnamed

    return null;
  }

  /**
   * Get semantics values.
   * @return {object} Semantics values.
   */
  getSemantics() {
    return this.semantics;
  }

  /**
   * Get subContentId.
   * @return {string} SubContentId.
   */
  getSubContentId() {
    return this.getInstance().subContentId;
  }
}
