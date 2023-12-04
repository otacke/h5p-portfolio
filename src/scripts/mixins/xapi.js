/**
 * Mixin containing methods for xapi stuff.
 * Does not actively trigger xAPI statements.
 */
export default class XAPI {
  /**
   * Get xAPI data from sub content types.
   * @param {H5P.ContentType[]} instances H5P instances.
   * @returns {object[]} xAPI data objects used to build a report.
   */
  getXAPIDataFromChildren(instances) {
    return instances
      .filter((instance) => typeof instance.getXAPIData === 'function')
      .map((instance) => instance.getXAPIData());
  }

  /**
   * Add question itself to the definition part of an xAPIEvent.
   * @param {H5P.XAPIEvent} xAPIEvent XAPI event.
   */
  addQuestionToXAPI(xAPIEvent) {
    const definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
    Object.assign(definition, this.getxAPIDefinition());
  }

  /**
   * Generate xAPI object definition used in xAPI statements.
   * @returns {object} xAPI definition.
   */
  getxAPIDefinition() {
    return {
      interactionType: 'compound',
      type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
      description: { 'en-US': 'Portfolio' }
    };
  }
}
