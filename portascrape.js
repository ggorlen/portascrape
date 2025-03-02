(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD support
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    // Browser global
    /** @type {any} */ (root).ps = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  /**
   * @typedef {Object} PsOptions
   * @property {number} [timeout=10000] - Timeout in milliseconds. 0 is infinite.
   * @property {"raf" | "mutation" | number} [polling="raf"] - Polling strategy.
   * @property {string} [exactText] - Exact text to match.
   * @property {string} [containsText] - Substring to match.
   * @property {RegExp} [matches] - Regular expression to match.
   */

  /**
   * @typedef {Object} Ps
   * @property {function(string, PsOptions | undefined): Promise<Element>} $ - Waits for a selector to appear in the DOM and returns the first element that matches.
   * @property {function(string, PsOptions): Promise<Element>} $click - Wait for an element matching selector to exist, then click it.
   * @property {function(string, PsOptions): Promise<string | null>} $text - Wait for an element matching selector to exist, then extract its `.textContent`.
   * @property {function(string, PsOptions): Promise<void>} $remove - Wait for an element matching selector to exist, then remove it.
   * @property {function(number): Promise<void>} sleep - Sleep for n milliseconds. Discouraged in favor of any of the other operations, but possible.
   * @property {function(string, PsOptions): Promise<(string | null)[][]>} $table - Wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into a 2d array.
   * @property {function(string, PsOptions): Promise<Object<string, string | null>[]>} $tableWithHeaders - Wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into an array of objects.
   * @property {function(function(): boolean, PsOptions): Promise<void>} wait - Waits for an arbitrary predicate function to return truthy.
   */

  /**
   * Default ps options.
   * @type {Object} DefaultPsOptions
   * @property {number} [timeout=10000] - Timeout in milliseconds. 0 is infinite.
   * @property {"raf" | "mutation" | number} [polling="raf"] - Polling strategy.
   */
  var defaultOptions = Object.freeze({ timeout: 10000, polling: "raf" });

  /**
   * Waits for an arbitrary predicate function to return truthy.
   * @param {function(): any} fn - The predicate function to wait for.
   * @param {PsOptions | undefined} [options] - The options for waiting.
   * @returns {Promise<any>} A promise that resolves when the predicate returns truthy.
   */
  function wait(fn, options) {
    options = Object.assign({}, defaultOptions, options);
    validateOptions(options);

    return new Promise(function (resolve, reject) {
      var result = fn();

      if (result) {
        return resolve(result);
      }

      /** @type {ReturnType<typeof setTimeout>} */
      var timeoutId;

      if (options.timeout && options.timeout > 0) {
        timeoutId = setTimeout(function () {
          var error = new Error(
            "timeout of " +
              options.timeout +
              "ms exceeded waiting for function to return true"
          );
          reject(error);
        }, options.timeout);
      }

      if (options.polling === "mutation") {
        var observer = new MutationObserver(function () {
          var result = fn();

          if (result) {
            observer.disconnect();
            clearTimeout(timeoutId);
            return resolve(result);
          }
        });
        observer.observe(document, { childList: true, subtree: true });
        return;
      }

      function poll() {
        var result = fn();

        if (result) {
          clearTimeout(timeoutId);
          return resolve(result);
        }

        if (options && typeof options.polling === "number") {
          setTimeout(poll, options.polling);
        } else {
          requestAnimationFrame(poll);
        }
      }

      poll();
    });
  }

  /**
   * Waits for an element to exist and clicks it.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<Element>} A promise that resolves when the element is clicked.
   */
  function $click(selector, options) {
    return ps.$(selector, options).then(function (element) {
      return new Promise(function (resolve, reject) {
        try {
          if (element instanceof HTMLElement) {
            element.click();
          } else {
            throw Error(
              "Element of type " + typeof element + " is unclickable"
            );
          }

          resolve(element);
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
   * @returns {Promise<string | null>} A promise that resolves with the textContent of the element.
   */
  function $text(selector, options) {
    return ps.$(selector, options).then(function (element) {
      return element.textContent;
    });
  }

  /**
   * Waits for an element to exist and removes it.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<void>} A promise that resolves when the element is removed.
   */
  function $remove(selector, options) {
    return ps.$(selector, options).then(function (element) {
      return new Promise(function (resolve, reject) {
        try {
          element.remove();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Waits for a table to exist and returns its contents as a 2D array.
   *
   * @param {string} selector - The selector to wait for.
   * @param {PsOptions} [options] - The options for waiting and selecting.
   * @returns {Promise<Array<Array<string | null>>>} A promise that resolves with the table contents.
   */
  function $table(selector, options) {
    return ps.$(selector, options).then(function (tableElement) {
      var rows = Array.from(tableElement.querySelectorAll("tr"));
      var tableData = rows.map(function (row) {
        return Array.from(row.querySelectorAll("td, th")).map(function (cell) {
          return cell.textContent && cell.textContent.trim();
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
   * @returns {Promise<Array<Record<string, string | null>>>} A promise that resolves with the table contents.
   */
  function $tableWithHeaders(selector, options) {
    return ps.$(selector, options).then(function (tableElement) {
      var rows = Array.from(tableElement.querySelectorAll("tr"));

      var headers = Array.from(rows[0].querySelectorAll("th")).map(
        function (header) {
          return header.textContent && header.textContent.trim();
        }
      );

      var tableData = rows.slice(1).map(function (row) {
        var rowData = Array.from(row.querySelectorAll("td")).map(
          function (cell) {
            return cell.textContent ? cell.textContent.trim() : null;
          }
        );
        /** @type Record<string, string | null> */
        var rowObject = {};
        headers.forEach(function (header, index) {
          if (header !== null) {
            rowObject[header] = rowData[index];
          }
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
     * Loops over childNodes of an element to find a text node
     * that fulfills an arbitrary predicate.
     *
     * @param {Element} element - The element to search through.
     * @param {function(ChildNode): any} predicate - The predicate to fulfill.
     * @returns {Element?} The element, if found.
     */
    function search(element, predicate) {
      for (var j = 0; j < element.childNodes.length; j++) {
        var child = element.childNodes[j];

        if (child.nodeType === Node.TEXT_NODE && predicate(child)) {
          return element;
        }
      }

      return null;
    }

    return wait(function () {
      if (
        !options ||
        (!options.exactText && !options.containsText && !options.matches)
      ) {
        return document.querySelector(selector);
      }

      var elements = document.querySelectorAll(selector);

      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var result;

        if (options.exactText || options.containsText) {
          result = search(element, function (child) {
            return (
              child.textContent &&
              child.textContent.trim() === options.exactText
            );
          });
        }

        if (options.containsText) {
          result = search(element, function (child) {
            return (
              child.textContent &&
              options.containsText &&
              child.textContent.indexOf(options.containsText) > -1
            );
          });
        }

        if (options.matches) {
          result = search(element, function (child) {
            return (
              child.textContent &&
              options.matches &&
              options.matches.test(child.textContent.trim())
            );
          });
        }

        if (result) {
          return result;
        }
      }

      return null;
    }, options);
  }

  /**
   * Validates the options object for ps functions.
   * @param {any} options - The options to validate.
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
      if (validKeys.indexOf(key) >= 0) {
        throw new Error("Invalid option '" + key + "' provided.");
      }

      if (textOptions.indexOf(key) >= 0) {
        if (/text/.test(key) && typeof options[key] !== "string") {
          throw new TypeError("'" + key + "' must be a string.");
        }

        if (key === "matches" && !(options[key] instanceof RegExp)) {
          throw new TypeError("'" + key + "' must be a RegExp.");
        }

        providedTextOptions++;
      }

      if (providedTextOptions > 1) {
        throw new Error(
          "Only one of 'exactText', 'containsText', or 'matches' can be provided."
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
    $remove: $remove,
    $table: $table,
    $tableWithHeaders: $tableWithHeaders,
    $text: $text,
    sleep: sleep,
    wait: wait,
  };
  return ps;
});
