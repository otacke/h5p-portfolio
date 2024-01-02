/** Class representing URL related functions */
export default class URLTools {
  /**
   * Extract fragments from browser URL.
   * @param {Window} contextWindow Window.
   * @param {function} validate Validation function.
   * @returns {object} Fragments.
   */
  static extractFragmentsFromURL(contextWindow, validate) {
    if (!contextWindow?.location?.hash && !contextWindow?.location?.search) {
      return {};
    }

    let hashQueryString = contextWindow.location.hash;
    if (hashQueryString.indexOf('#') === 0) {
      hashQueryString = hashQueryString.substring(1);
    }

    // Original implementation encoded fragments in the hash :-/
    const firstQMIndex = contextWindow.location.hash.indexOf('?');
    if (firstQMIndex !== -1) {
      hashQueryString = contextWindow.location.hash.substring(firstQMIndex + 1);
    }

    let queries = {
      ... URLTools.parseURLQueryString(hashQueryString),
      ... URLTools.parseURLQueryString(contextWindow.location.search)
    };

    // Optionally validate and ignore fragments
    if (typeof validate === 'function' && !validate(queries)) {
      return {};
    }

    return queries;
  }

  /**
   * Parse URL query string into object.
   * @param {string} urlQueryString URL query string to parse.
   * @returns {object} Parsed URL query string.
   */
  static parseURLQueryString(urlQueryString = '') {
    if (typeof urlQueryString !== 'string') {
      urlQueryString = '';
    }

    urlQueryString = (
      urlQueryString.indexOf('?') === 0 ||
      urlQueryString.indexOf('&') === 0
    ) ?
      urlQueryString.substring(1) :
      urlQueryString;

    urlQueryString = urlQueryString.replace(/&amp;/g, '&');

    return urlQueryString.split('&')
      .filter((query) => query.indexOf('=') !== -1)
      .reduce((pairs, query) => {
        const [key, value] = query.split('=');
        pairs[key] = value;
        return pairs;
      }, {});
  }

  /**
   * Stringify URL queries.
   * @param {object} urlQueries URL queries to stringify.
   * @param {string} [prefix] Optional prefix.
   * @returns {string} Stringified URL queries.
   */
  static stringifyURLQueries(urlQueries, prefix = '') {
    if (typeof urlQueries !== 'object' || urlQueries === null) {
      return '';
    }

    prefix = prefix ?? '';

    const queryString = Object.entries(urlQueries)
      .filter((entry) => entry.length === 2 && !!entry[1])
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
    prefix = prefix ?? '';

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
}
