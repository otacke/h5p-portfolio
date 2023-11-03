/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.Portfolio'] = (function () {
  return {
    0: {
      /**
       * Asynchronous content upgrade hook.
       * Fix potentially duplicated subContentIds
       * @param {object} parameters Parameters.
       * @param {function} finished Callback.
       * @param {object} extras Extra parameters.
       */
      8: function (parameters, finished, extras) {
        /**
         * Replace all subcontent ids in H5P parameters object.
         * @param {object} params Parameters.
         * @returns {object} Parameters with fresh subcontent ids.
         */
        const replaceSubContentIDs = function (params) {
          if (Array.isArray(params)) {
            params = params.map((param) => {
              return replaceSubContentIDs(param);
            });
          }
          else if (typeof params === 'object' && params !== null) {
            if (params.library && params.subContentId) {
              /*
                * NOTE: We avoid using H5P.createUUID since this is an upgrade
                * script and H5P function may change in the future
                */
              params.subContentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
                const random = Math.random() * 16 | 0, newChar = char === 'x' ? random : (random & 0x3 | 0x8);
                return newChar.toString(16);
              });
            }

            for (let param in params) {
              param = replaceSubContentIDs(params[param]);
            }
          }

          return params;
        };

        if (parameters) {
          parameters = replaceSubContentIDs(parameters);
        }

        // Done
        finished(null, parameters, extras);
      }
    }
  };
})();
