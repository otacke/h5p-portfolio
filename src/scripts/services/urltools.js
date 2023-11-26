/** Class representing URL related functions */
export default class URLTools {
  /**
   * Extract fragments from browser URL.
   * @param {function} validate Validation function.
   * @param {Window} hashWindow Window.
   * @returns {object} Fragments.
   */
  static extractFragmentsFromURL(validate, hashWindow) {
    if (!hashWindow.location.hash) {
      return {};
    }

    let hashQueryString = '';

    const firstQMIndex = hashWindow.location.hash.indexOf('?');

    if (firstQMIndex !== -1) {
      hashQueryString = hashWindow.location.hash.substring(firstQMIndex + 1);
    }
    else if (hashWindow.location.hash.indexOf('=') !== -1) {
      hashQueryString = hashWindow.location.hash.replace('#', '');
    }

    const queries = hashQueryString.split('&')
      .filter((query) => query.indexOf('=') !== -1)
      .reduce((pairs, query) => {
        const [key, value] = query.split('=');
        pairs[key] = value;
        return pairs;
      }, {});

    // Optionally validate and ignore fragments
    if (typeof validate === 'function' && !validate(queries)) {
      return {};
    }

    return queries;
  }

  static parseURLQueries(urlQueries) {
    urlQueries = (urlQueries.indexOf('?') === 0 ?
      urlQueries.substring(1) :
      urlQueries);

    urlQueries = urlQueries.replace(/&amp;/g, '&');

    return urlQueries.split('&')
      .filter((query) => query.indexOf('=') !== -1)
      .reduce((pairs, query) => {
        const [key, value] = query.split('=');
        pairs[key] = value;
        return pairs;
      }, {});
  }

  static stringifyURLQueries(urlQueries, prefix = '') {
    const queryString = Object.entries(urlQueries)
      .filter((entry) => entry.length === 2)
      .map((entry) => `${entry[0]}=${entry[1]}`)
      .join('&');

    if (!queryString.length) {
      return '';
    }

    return `${prefix}${queryString}`;
  }

  /**
   * Get hash selector from URL hash.
   * @param {string} hash URL hash.
   * @param {string} [prefix] Prefix.
   * @returns {string} Hash selector.
   */
  static getHashSelector(hash, prefix = '') {
    let hashSelector = '';

    const firstQMIndex = hash.indexOf('?');

    if ( firstQMIndex !== -1 ) {
      hashSelector = hash.substring(1, firstQMIndex);
    }
    else if (hash.indexOf('=') === -1) {
      hashSelector = hash.replace('#', '');
    }

    if (!hashSelector.length) {
      return '';
    }

    return `${prefix}${hashSelector}`;
  }

  /**
   * Create fragments string from fragments object.
   * @param {object} fragments Fragments.
   * @returns {string} Fragments string.
   */
  static createFragmentsString(fragments) {
    const fragmentString = Object.entries(fragments)
      .filter((entry) => entry.length === 2)
      .map((entry) => `${entry[0]}=${entry[1]}`)
      .join('&');

    return `#${fragmentString}`;
  }

  /**
   * Determine whether two fragment objects are equal.
   * @param {object} fragment1 Fragment 1.
   * @param {object} fragment2 Fragment 2.
   * @param {string[]} [limitTo] Keys to limit equality check to.
   * @returns {boolean} True, if fragments are equal.
   */
  static areFragmentsEqual(fragment1, fragment2, limitTo = []) {
    for (const key in fragment1) {
      if (Object.prototype.hasOwnProperty.call(fragment1, key)) {
        if (limitTo.length > 0 && limitTo.indexOf(key) === -1) {
          continue;
        }
        if (!fragment2[key] || fragment1[key].toString() !== fragment2[key].toString()) {
          return false;
        }
      }
    }
    return true;
  }
}
