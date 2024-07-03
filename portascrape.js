/**
 * @typedef {Object} PsOptions
 * @property {number} [timeout=30000] - Timeout in milliseconds.
 * @property {"raf" | "mutation" | number} [polling="raf"] - Polling strategy.
 * @property {string} [exactText] - Exact text to match.
 * @property {string} [containsText] - Substring to match.
 * @property {RegExp} [matches] - Regular expression to match.
 */

/**
 * @typedef {Object} Ps
 * @property {function(string, PsOptions): Promise<Element>} $ - Waits for a selector to appear in the DOM and returns the first element that matches.
 * @property {function(string, PsOptions): Promise<void>} $click - Waits for an element to exist and clicks it.
 * @property {function(string, PsOptions): Promise<string>} $text - Waits for an element to exist and returns its textContent.
 * @property {function(number): Promise<void>} sleep - Waits for a given number of milliseconds.
 * @property {function(string, PsOptions): Promise<Array<Array<string>>>} $table - Waits for a table to exist and returns its contents as a 2D array.
 * @property {function(string, PsOptions): Promise<Array<Object>>} $tableWithHeaders - Waits for a table to exist and returns its contents as an array of objects with table headers as keys.
 */

/**
 * Default ps options.
 * @typedef {Object} DefaultPsOptions
 * @property {number} [timeout=10000] - Timeout in milliseconds.
 * @property {"raf" | "mutation" | number} [polling="raf"] - Polling strategy.
 */

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD support
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    // CommonJS/Node.js support
    module.exports = factory();
  } else {
    // Browser global
    root.ps = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  /**
   * Waits for an element to exist and clicks it.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<void>} A promise that resolves when the element is clicked.
   */
  function $click(selector, options) {
    return ps.$(selector, options).then(function (element) {
      return new Promise(function (resolve, reject) {
        try {
          element.click();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Waits for an element to exist and returns its textContent.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<string>} A promise that resolves with the textContent of the element.
   */
  function $text(selector, options) {
    return ps.$(selector, options).then(function (element) {
      return element.textContent;
    });
  }

  /**
   * Waits for a table to exist and returns its contents as a 2D array.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<Array<Array<string>>>} A promise that resolves with the table contents.
   */
  function $table(selector, options) {
    return ps.$(selector, options).then(function (tableElement) {
      var rows = Array.from(tableElement.querySelectorAll("tr"));
      var tableData = rows.map(function (row) {
        return Array.from(row.querySelectorAll("td, th")).map(function (cell) {
          return cell.textContent.trim();
        });
      });
      return tableData;
    });
  }

  /**
   * Waits for a table to exist and returns its contents as an array of objects with table headers as keys.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<Array<Object>>} A promise that resolves with the table contents.
   */
  function $tableWithHeaders(selector, options) {
    return ps.$(selector, options).then(function (tableElement) {
      var rows = Array.from(tableElement.querySelectorAll("tr"));
      var headers = Array.from(rows.shift().querySelectorAll("th")).map(
        function (header) {
          return header.textContent.trim();
        },
      );

      var tableData = rows.map(function (row) {
        var rowData = Array.from(row.querySelectorAll("td")).map(
          function (cell) {
            return cell.textContent.trim();
          },
        );
        var rowObject = {};
        headers.forEach(function (header, index) {
          rowObject[header] = rowData[index];
        });
        return rowObject;
      });

      return tableData;
    });
  }

  /**
   * Pauses execution for a specified number of milliseconds.
   * @param {number} milliseconds - The number of milliseconds to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  function sleep(milliseconds) {
    return new Promise(function (resolve) {
      setTimeout(resolve, milliseconds);
    });
  }

  /**
   * Waits for a selector to appear in the DOM and returns the first element that matches.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<Element>} A promise that resolves with the found element.
   */
  function $(selector, options) {
    /**
     * @type {DefaultPsOptions}
     */
    var defaultOptions = { timeout: 10000, polling: "raf" };
    options = Object.assign(defaultOptions, options);
    validateOptions(options);

    return new Promise(function (resolve, reject) {
      var timeoutId = setTimeout(function () {
        if (observer) {
          observer.disconnect();
        }

        reject(
          "timeout of " +
            options.timeout +
            "ms exceeded waiting for selector " +
            selector,
        );
      }, options.timeout);

      function findElement() {
        var element;

        if (
          options.exactText === undefined &&
          options.containsText === undefined &&
          options.matches === undefined
        ) {
          element = document.querySelector(selector);
        } else {
          // TODO find tightest element matching text/regex
          var elements = document.querySelectorAll(selector);
          element = Array.prototype.find.call(elements, function (element) {
            return (
              (options.exactText &&
                element.textContent.trim() === options.exactText.trim()) ||
              (options.containsText &&
                element.textContent.includes(options.containsText)) ||
              (options.matches && options.matches.test(element.textContent))
            );
          });
        }

        if (element) {
          clearTimeout(timeoutId);

          if (observer) {
            observer.disconnect();
          }

          resolve(element);
          return true;
        }
      }

      var observer;

      if (options.polling === "mutation") {
        if (!findElement()) {
          observer = new MutationObserver(function () {
            findElement();
          });
          observer.observe(document, { childList: true, subtree: true });
        }

        return;
      }

      function poll() {
        if (findElement()) {
          return;
        }

        if (typeof options.polling === "number") {
          setTimeout(poll, options.polling);
        } else {
          requestAnimationFrame(poll);
        }
      }

      poll();
    });
  }

  /**
   * Validates the options object for ps functions.
   * @param {PsOptions} options - The options to validate.
   * @throws {Error} Throws an error if options are invalid or conflicting.
   */
  function validateOptions(options) {
    var validKeys = [
      "timeout",
      "polling",
      "exactText",
      "containsText",
      "matches",
    ];
    var textOptions = ["exactText", "containsText", "matches"];
    var providedTextOptions = 0;

    for (var key in options) {
      if (!validKeys.includes(key)) {
        throw new Error("Invalid option '" + key + "' provided.");
      }

      if (textOptions.includes(key)) {
        providedTextOptions++;

        if (
          typeof options[key] !== "string" &&
          !(options[key] instanceof RegExp)
        ) {
          throw new TypeError("'" + key + "' must be a string or RegExp.");
        }
      }

      if (providedTextOptions > 1) {
        throw new Error(
          "Only one of 'exactText', 'containsText', or 'matches' can be provided.",
        );
      }
    }
  }

  /**
   * @type {Ps}
   */
  var ps = {
    $: $,
    $click: $click,
    $text: $text,
    $table: $table,
    $tableWithHeaders: $tableWithHeaders,
    sleep: sleep,
  };
  return ps;
});

