'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.0';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();

      // Remove un-printable characters, e.g. for `fromCharCode` calls for CTRL only events
      key = key.replace(/\W+/, '');

      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;

      // Remove trailing underscore, in case only modifiers were used (e.g. only `CTRL_ALT`)
      key = key.replace(/_$/, '');

      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      if (!$element) {
        return false;
      }
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    },


    /**
     * Traps the focus in the given element.
     * @param  {jQuery} $element  jQuery object to trap the foucs into.
     */
    trapFocus: function ($element) {
      var $focusable = Foundation.Keyboard.findFocusable($element),
          $firstFocusable = $focusable.eq(0),
          $lastFocusable = $focusable.eq(-1);

      $element.on('keydown.zf.trapfocus', function (event) {
        if (event.target === $lastFocusable[0] && Foundation.Keyboard.parseKey(event) === 'TAB') {
          event.preventDefault();
          $firstFocusable.focus();
        } else if (event.target === $firstFocusable[0] && Foundation.Keyboard.parseKey(event) === 'SHIFT_TAB') {
          event.preventDefault();
          $lastFocusable.focus();
        }
      });
    },

    /**
     * Releases the trapped focus from the given element.
     * @param  {jQuery} $element  jQuery object to release the focus for.
     */
    releaseFocus: function ($element) {
      $element.off('keydown.zf.trapfocus');
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is: function (size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-label': $item.children('a:first').text()
          });
          // Note:  Drilldowns behave differently in how they hide, and so need
          // additional attributes.  We should look if this possibly over-generalized
          // utility (Nest) is appropriate when we rework menus in 6.4
          if (type === 'drilldown') {
            $item.attr({ 'aria-expanded': false });
          }

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'role': 'menu'
          });
          if (type === 'drilldown') {
            $sub.attr({ 'aria-hidden': true });
          }
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var //items = menu.find('li'),
      subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('>li, .menu, .menu > li').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + '?' + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    var id = $(this).data('toggle');
    if (id) {
      triggers($(this), 'toggle');
    } else {
      $(this).trigger('toggle.zf.trigger');
    }
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    mutateListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function mutateListener(debounce) {
    var $nodes = $('[data-mutate]');
    if ($nodes.length && MutationObserver) {
      //trigger all listening elements and signal a mutate event
      //no IE 9 or 10
      $nodes.each(function () {
        $(this).triggerHandler('mutateme.zf.trigger');
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);

      //trigger the event handler for the element depending on type
      switch (mutationRecordsList[0].type) {

        case "attributes":
          if ($target.attr("data-events") === "scroll" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          }
          if ($target.attr("data-events") === "resize" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('resizeme.zf.trigger', [$target]);
          }
          if (mutationRecordsList[0].attributeName === "style") {
            $target.closest("[data-mutate]").attr("data-events", "mutate");
            $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          }
          break;

        case "childList":
          $target.closest("[data-mutate]").attr("data-events", "mutate");
          $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, or mutation add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["data-events", "style"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  var Abide = function () {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Abide(element) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Abide);

      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */


    _createClass(Abide, [{
      key: '_init',
      value: function _init() {
        this.$inputs = this.$element.find('input, textarea, select');

        this._events();
      }

      /**
       * Initializes events for Abide.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        this.$element.off('.abide').on('reset.zf.abide', function () {
          _this2.resetForm();
        }).on('submit.zf.abide', function () {
          return _this2.validateForm();
        });

        if (this.options.validateOn === 'fieldChange') {
          this.$inputs.off('change.zf.abide').on('change.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.liveValidate) {
          this.$inputs.off('input.zf.abide').on('input.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.validateOnBlur) {
          this.$inputs.off('blur.zf.abide').on('blur.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }
      }

      /**
       * Calls necessary functions to update Abide upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        this._init();
      }

      /**
       * Checks whether or not a form element has the required attribute and if it's checked or not
       * @param {Object} element - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'requiredCheck',
      value: function requiredCheck($el) {
        if (!$el.attr('required')) return true;

        var isGood = true;

        switch ($el[0].type) {
          case 'checkbox':
            isGood = $el[0].checked;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            var opt = $el.find('option:selected');
            if (!opt.length || !opt.val()) isGood = false;
            break;

          default:
            if (!$el.val() || !$el.val().length) isGood = false;
        }

        return isGood;
      }

      /**
       * Based on $el, get the first element with selector in this order:
       * 1. The element's direct sibling('s).
       * 3. The element's parent's children.
       *
       * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
       *
       * @param {Object} $el - jQuery object to use as reference to find the form error selector.
       * @returns {Object} jQuery object with the selector.
       */

    }, {
      key: 'findFormError',
      value: function findFormError($el) {
        var $error = $el.siblings(this.options.formErrorSelector);

        if (!$error.length) {
          $error = $el.parent().find(this.options.formErrorSelector);
        }

        return $error;
      }

      /**
       * Get the first element in this order:
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findLabel',
      value: function findLabel($el) {
        var id = $el[0].id;
        var $label = this.$element.find('label[for="' + id + '"]');

        if (!$label.length) {
          return $el.closest('label');
        }

        return $label;
      }

      /**
       * Get the set of labels associated with a set of radio els in this order
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findRadioLabels',
      value: function findRadioLabels($els) {
        var _this3 = this;

        var labels = $els.map(function (i, el) {
          var id = el.id;
          var $label = _this3.$element.find('label[for="' + id + '"]');

          if (!$label.length) {
            $label = $(el).closest('label');
          }
          return $label[0];
        });

        return $(labels);
      }

      /**
       * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
       * @param {Object} $el - jQuery object to add the class to
       */

    }, {
      key: 'addErrorClasses',
      value: function addErrorClasses($el) {
        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.addClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.addClass(this.options.formErrorClass);
        }

        $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
      }

      /**
       * Remove CSS error classes etc from an entire radio button group
       * @param {String} groupName - A string that specifies the name of a radio button group
       *
       */

    }, {
      key: 'removeRadioErrorClasses',
      value: function removeRadioErrorClasses(groupName) {
        var $els = this.$element.find(':radio[name="' + groupName + '"]');
        var $labels = this.findRadioLabels($els);
        var $formErrors = this.findFormError($els);

        if ($labels.length) {
          $labels.removeClass(this.options.labelErrorClass);
        }

        if ($formErrors.length) {
          $formErrors.removeClass(this.options.formErrorClass);
        }

        $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Removes CSS error class as specified by the Abide settings from the label, input, and the form
       * @param {Object} $el - jQuery object to remove the class from
       */

    }, {
      key: 'removeErrorClasses',
      value: function removeErrorClasses($el) {
        // radios need to clear all of the els
        if ($el[0].type == 'radio') {
          return this.removeRadioErrorClasses($el.attr('name'));
        }

        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.removeClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.removeClass(this.options.formErrorClass);
        }

        $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Goes through a form to find inputs and proceeds to validate them in ways specific to their type
       * @fires Abide#invalid
       * @fires Abide#valid
       * @param {Object} element - jQuery object to validate, should be an HTML input
       * @returns {Boolean} goodToGo - If the input is valid or not.
       */

    }, {
      key: 'validateInput',
      value: function validateInput($el) {
        var _this4 = this;

        var clearRequire = this.requiredCheck($el),
            validated = false,
            customValidator = true,
            validator = $el.attr('data-validator'),
            equalTo = true;

        // don't validate ignored inputs or hidden inputs
        if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]')) {
          return true;
        }

        switch ($el[0].type) {
          case 'radio':
            validated = this.validateRadio($el.attr('name'));
            break;

          case 'checkbox':
            validated = clearRequire;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            validated = clearRequire;
            break;

          default:
            validated = this.validateText($el);
        }

        if (validator) {
          customValidator = this.matchValidation($el, validator, $el.attr('required'));
        }

        if ($el.attr('data-equalto')) {
          equalTo = this.options.validators.equalTo($el);
        }

        var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
        var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

        if (goodToGo) {
          // Re-validate inputs that depend on this one with equalto
          var dependentElements = this.$element.find('[data-equalto="' + $el.attr('id') + '"]');
          if (dependentElements.length) {
            (function () {
              var _this = _this4;
              dependentElements.each(function () {
                if ($(this).val()) {
                  _this.validateInput($(this));
                }
              });
            })();
          }
        }

        this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

        /**
         * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
         * Trigger includes the DOM element of the input.
         * @event Abide#valid
         * @event Abide#invalid
         */
        $el.trigger(message, [$el]);

        return goodToGo;
      }

      /**
       * Goes through a form and if there are any invalid inputs, it will display the form error element
       * @returns {Boolean} noError - true if no errors were detected...
       * @fires Abide#formvalid
       * @fires Abide#forminvalid
       */

    }, {
      key: 'validateForm',
      value: function validateForm() {
        var acc = [];
        var _this = this;

        this.$inputs.each(function () {
          acc.push(_this.validateInput($(this)));
        });

        var noError = acc.indexOf(false) === -1;

        this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

        /**
         * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
         * Trigger includes the element of the form.
         * @event Abide#formvalid
         * @event Abide#forminvalid
         */
        this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

        return noError;
      }

      /**
       * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
       * @param {Object} $el - jQuery object to validate, should be a text input HTML element
       * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
       * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
       */

    }, {
      key: 'validateText',
      value: function validateText($el, pattern) {
        // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
        pattern = pattern || $el.attr('pattern') || $el.attr('type');
        var inputText = $el.val();
        var valid = false;

        if (inputText.length) {
          // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
          if (this.options.patterns.hasOwnProperty(pattern)) {
            valid = this.options.patterns[pattern].test(inputText);
          }
          // If the pattern name isn't also the type attribute of the field, then test it as a regexp
          else if (pattern !== $el.attr('type')) {
              valid = new RegExp(pattern).test(inputText);
            } else {
              valid = true;
            }
        }
        // An empty field is valid if it's not required
        else if (!$el.prop('required')) {
            valid = true;
          }

        return valid;
      }

      /**
       * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
       * @param {String} groupName - A string that specifies the name of a radio button group
       * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
       */

    }, {
      key: 'validateRadio',
      value: function validateRadio(groupName) {
        // If at least one radio in the group has the `required` attribute, the group is considered required
        // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
        var $group = this.$element.find(':radio[name="' + groupName + '"]');
        var valid = false,
            required = false;

        // For the group to be required, at least one radio needs to be required
        $group.each(function (i, e) {
          if ($(e).attr('required')) {
            required = true;
          }
        });
        if (!required) valid = true;

        if (!valid) {
          // For the group to be valid, at least one radio needs to be checked
          $group.each(function (i, e) {
            if ($(e).prop('checked')) {
              valid = true;
            }
          });
        };

        return valid;
      }

      /**
       * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
       * @param {Object} $el - jQuery input element.
       * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
       * @param {Boolean} required - self explanatory?
       * @returns {Boolean} - true if validations passed.
       */

    }, {
      key: 'matchValidation',
      value: function matchValidation($el, validators, required) {
        var _this5 = this;

        required = required ? true : false;

        var clear = validators.split(' ').map(function (v) {
          return _this5.options.validators[v]($el, required, $el.parent());
        });
        return clear.indexOf(false) === -1;
      }

      /**
       * Resets form inputs and styles
       * @fires Abide#formreset
       */

    }, {
      key: 'resetForm',
      value: function resetForm() {
        var $form = this.$element,
            opts = this.options;

        $('.' + opts.labelErrorClass, $form).not('small').removeClass(opts.labelErrorClass);
        $('.' + opts.inputErrorClass, $form).not('small').removeClass(opts.inputErrorClass);
        $(opts.formErrorSelector + '.' + opts.formErrorClass).removeClass(opts.formErrorClass);
        $form.find('[data-abide-error]').css('display', 'none');
        $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
        $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        /**
         * Fires when the form has been reset.
         * @event Abide#formreset
         */
        $form.trigger('formreset.zf.abide', [$form]);
      }

      /**
       * Destroys an instance of Abide.
       * Removes error styles and classes from elements, without resetting their values.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        var _this = this;
        this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

        this.$inputs.off('.abide').each(function () {
          _this.removeErrorClasses($(this));
        });

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Abide;
  }();

  /**
   * Default settings for plugin
   */


  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @example 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @example 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @example 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @example '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @example 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @example false
     */
    liveValidate: false,

    /**
     * Set to true to validate inputs on blur.
     * @option
     * @example false
     */
    validateOnBlur: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $('#' + el.attr('data-equalto')).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  var Accordion = function () {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    function Accordion(element, options) {
      _classCallCheck(this, Accordion);

      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */


    _createClass(Accordion, [{
      key: '_init',
      value: function _init() {
        this.$element.attr('role', 'tablist');
        this.$tabs = this.$element.children('[data-accordion-item]');

        this.$tabs.each(function (idx, el) {
          var $el = $(el),
              $content = $el.children('[data-tab-content]'),
              id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
              linkId = el.id || id + '-label';

          $el.find('a:first').attr({
            'aria-controls': id,
            'role': 'tab',
            'id': linkId,
            'aria-expanded': false,
            'aria-selected': false
          });

          $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
        });
        var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
        if ($initActive.length) {
          this.down($initActive, true);
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the accordion.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$tabs.each(function () {
          var $elem = $(this);
          var $tabContent = $elem.children('[data-tab-content]');
          if ($tabContent.length) {
            $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
              e.preventDefault();
              _this.toggle($tabContent);
            }).on('keydown.zf.accordion', function (e) {
              Foundation.Keyboard.handleKey(e, 'Accordion', {
                toggle: function () {
                  _this.toggle($tabContent);
                },
                next: function () {
                  var $a = $elem.next().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                previous: function () {
                  var $a = $elem.prev().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                handled: function () {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            });
          }
        });
      }

      /**
       * Toggles the selected content pane's open/close state.
       * @param {jQuery} $target - jQuery object of the pane to toggle (`.accordion-content`).
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if ($target.parent().hasClass('is-active')) {
          this.up($target);
        } else {
          this.down($target);
        }
      }

      /**
       * Opens the accordion tab defined by `$target`.
       * @param {jQuery} $target - Accordion pane to open (`.accordion-content`).
       * @param {Boolean} firstTime - flag to determine if reflow should happen.
       * @fires Accordion#down
       * @function
       */

    }, {
      key: 'down',
      value: function down($target, firstTime) {
        var _this2 = this;

        $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

        if (!this.options.multiExpand && !firstTime) {
          var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
          if ($currentActive.length) {
            this.up($currentActive.not($target));
          }
        }

        $target.slideDown(this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done opening.
           * @event Accordion#down
           */
          _this2.$element.trigger('down.zf.accordion', [$target]);
        });

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': true,
          'aria-selected': true
        });
      }

      /**
       * Closes the tab defined by `$target`.
       * @param {jQuery} $target - Accordion tab to close (`.accordion-content`).
       * @fires Accordion#up
       * @function
       */

    }, {
      key: 'up',
      value: function up($target) {
        var $aunts = $target.parent().siblings(),
            _this = this;

        if (!this.options.allowAllClosed && !$aunts.hasClass('is-active') || !$target.parent().hasClass('is-active')) {
          return;
        }

        // Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done collapsing up.
           * @event Accordion#up
           */
          _this.$element.trigger('up.zf.accordion', [$target]);
        });
        // });

        $target.attr('aria-hidden', true).parent().removeClass('is-active');

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': false,
          'aria-selected': false
        });
      }

      /**
       * Destroys an instance of an accordion.
       * @fires Accordion#destroyed
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
        this.$element.find('a').off('.zf.accordion');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Accordion;
  }();

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @example false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @example false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var AccordionMenu = function () {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function AccordionMenu(element, options) {
      _classCallCheck(this, AccordionMenu);

      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */


    _createClass(AccordionMenu, [{
      key: '_init',
      value: function _init() {
        this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
        this.$element.attr({
          'role': 'menu',
          'aria-multiselectable': this.options.multiOpen
        });

        this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
        this.$menuLinks.each(function () {
          var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
              $elem = $(this),
              $sub = $elem.children('[data-submenu]'),
              subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
              isActive = $sub.hasClass('is-active');
          $elem.attr({
            'aria-controls': subId,
            'aria-expanded': isActive,
            'role': 'menuitem',
            'id': linkId
          });
          $sub.attr({
            'aria-labelledby': linkId,
            'aria-hidden': !isActive,
            'role': 'menu',
            'id': subId
          });
        });
        var initPanes = this.$element.find('.is-active');
        if (initPanes.length) {
          var _this = this;
          initPanes.each(function () {
            _this.down($(this));
          });
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the menu.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$element.find('li').each(function () {
          var $submenu = $(this).children('[data-submenu]');

          if ($submenu.length) {
            $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
              e.preventDefault();

              _this.toggle($submenu);
            });
          }
        }).on('keydown.zf.accordionmenu', function (e) {
          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement,
              $target = $element.children('[data-submenu]');

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

              if ($(this).children('[data-submenu]:visible').length) {
                // has open sub menu
                $nextElement = $element.find('li:first-child').find('a').first();
              }
              if ($(this).is(':first-child')) {
                // is first element of sub menu
                $prevElement = $element.parents('li').first().find('a').first();
              } else if ($prevElement.parents('li').first().children('[data-submenu]:visible').length) {
                // if previous element has open sub menu
                $prevElement = $prevElement.parents('li').find('li:last-child').find('a').first();
              }
              if ($(this).is(':last-child')) {
                // is last element of sub menu
                $nextElement = $element.parents('li').first().next('li').find('a').first();
              }

              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
            open: function () {
              if ($target.is(':hidden')) {
                _this.down($target);
                $target.find('li').first().find('a').first().focus();
              }
            },
            close: function () {
              if ($target.length && !$target.is(':hidden')) {
                // close active sub of this item
                _this.up($target);
              } else if ($element.parent('[data-submenu]').length) {
                // close currently open sub
                _this.up($element.parent('[data-submenu]'));
                $element.parents('li').first().find('a').first().focus();
              }
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            toggle: function () {
              if ($element.children('[data-submenu]').length) {
                _this.toggle($element.children('[data-submenu]'));
              }
            },
            closeAll: function () {
              _this.hideAll();
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); //.attr('tabindex', 0);
      }

      /**
       * Closes all panes of the menu.
       * @function
       */

    }, {
      key: 'hideAll',
      value: function hideAll() {
        this.up(this.$element.find('[data-submenu]'));
      }

      /**
       * Opens all panes of the menu.
       * @function
       */

    }, {
      key: 'showAll',
      value: function showAll() {
        this.down(this.$element.find('[data-submenu]'));
      }

      /**
       * Toggles the open/close state of a submenu.
       * @function
       * @param {jQuery} $target - the submenu to toggle
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if (!$target.is(':animated')) {
          if (!$target.is(':hidden')) {
            this.up($target);
          } else {
            this.down($target);
          }
        }
      }

      /**
       * Opens the sub-menu defined by `$target`.
       * @param {jQuery} $target - Sub-menu to open.
       * @fires AccordionMenu#down
       */

    }, {
      key: 'down',
      value: function down($target) {
        var _this = this;

        if (!this.options.multiOpen) {
          this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
        }

        $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

        //Foundation.Move(this.options.slideSpeed, $target, function() {
        $target.slideDown(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done opening.
           * @event AccordionMenu#down
           */
          _this.$element.trigger('down.zf.accordionMenu', [$target]);
        });
        //});
      }

      /**
       * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
       * @param {jQuery} $target - Sub-menu to close.
       * @fires AccordionMenu#up
       */

    }, {
      key: 'up',
      value: function up($target) {
        var _this = this;
        //Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done collapsing up.
           * @event AccordionMenu#up
           */
          _this.$element.trigger('up.zf.accordionMenu', [$target]);
        });
        //});

        var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

        $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
      }

      /**
       * Destroys an instance of accordion menu.
       * @fires AccordionMenu#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-submenu]').slideDown(0).css('display', '');
        this.$element.find('a').off('click.zf.accordionMenu');

        Foundation.Nest.Burn(this.$element, 'accordion');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return AccordionMenu;
  }();

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @example true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var Drilldown = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Drilldown(element, options) {
      _classCallCheck(this, Drilldown);

      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */


    _createClass(Drilldown, [{
      key: '_init',
      value: function _init() {
        this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
        this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
        this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');
        this.$element.attr('data-mutate', this.$element.attr('data-drilldown') || Foundation.GetYoDigits(6, 'drilldown'));

        this._prepareMenu();
        this._registerEvents();

        this._keyboardEvents();
      }

      /**
       * prepares drilldown menu by setting attributes to links and elements
       * sets a min height to prevent content jumping
       * wraps the element if not already wrapped
       * @private
       * @function
       */

    }, {
      key: '_prepareMenu',
      value: function _prepareMenu() {
        var _this = this;
        // if(!this.options.holdOpen){
        //   this._menuLinkEvents();
        // }
        this.$submenuAnchors.each(function () {
          var $link = $(this);
          var $sub = $link.parent();
          if (_this.options.parentLink) {
            $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
          }
          $link.data('savedHref', $link.attr('href')).removeAttr('href').attr('tabindex', 0);
          $link.children('[data-submenu]').attr({
            'aria-hidden': true,
            'tabindex': 0,
            'role': 'menu'
          });
          _this._events($link);
        });
        this.$submenus.each(function () {
          var $menu = $(this),
              $back = $menu.find('.js-drilldown-back');
          if (!$back.length) {
            switch (_this.options.backButtonPosition) {
              case "bottom":
                $menu.append(_this.options.backButton);
                break;
              case "top":
                $menu.prepend(_this.options.backButton);
                break;
              default:
                console.error("Unsupported backButtonPosition value '" + _this.options.backButtonPosition + "'");
            }
          }
          _this._back($menu);
        });

        if (!this.options.autoHeight) {
          this.$submenus.addClass('drilldown-submenu-cover-previous');
        }

        if (!this.$element.parent().hasClass('is-drilldown')) {
          this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
          if (this.options.animateHeight) this.$wrapper.addClass('animate-height');
          this.$wrapper = this.$element.wrap(this.$wrapper).parent().css(this._getMaxDims());
        }
      }
    }, {
      key: '_resize',
      value: function _resize() {
        this.$wrapper.css({ 'max-width': 'none', 'min-height': 'none' });
        // _getMaxDims has side effects (boo) but calling it should update all other necessary heights & widths
        this.$wrapper.css(this._getMaxDims());
      }

      /**
       * Adds event handlers to elements in the menu.
       * @function
       * @private
       * @param {jQuery} $elem - the current menu item to add handlers to.
       */

    }, {
      key: '_events',
      value: function _events($elem) {
        var _this = this;

        $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }

          // if(e.target !== e.currentTarget.firstElementChild){
          //   return false;
          // }
          _this._show($elem.parent('li'));

          if (_this.options.closeOnClick) {
            var $body = $('body');
            $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
              if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
                return;
              }
              e.preventDefault();
              _this._hideAll();
              $body.off('.zf.drilldown');
            });
          }
        });
        this.$element.on('mutateme.zf.trigger', this._resize.bind(this));
      }

      /**
       * Adds event handlers to the menu element.
       * @function
       * @private
       */

    }, {
      key: '_registerEvents',
      value: function _registerEvents() {
        if (this.options.scrollTop) {
          this._bindHandler = this._scrollTop.bind(this);
          this.$element.on('open.zf.drilldown hide.zf.drilldown closed.zf.drilldown', this._bindHandler);
        }
      }

      /**
       * Scroll to Top of Element or data-scroll-top-element
       * @function
       * @fires Drilldown#scrollme
       */

    }, {
      key: '_scrollTop',
      value: function _scrollTop() {
        var _this = this;
        var $scrollTopElement = _this.options.scrollTopElement != '' ? $(_this.options.scrollTopElement) : _this.$element,
            scrollPos = parseInt($scrollTopElement.offset().top + _this.options.scrollTopOffset);
        $('html, body').stop(true).animate({ scrollTop: scrollPos }, _this.options.animationDuration, _this.options.animationEasing, function () {
          /**
            * Fires after the menu has scrolled
            * @event Drilldown#scrollme
            */
          if (this === $('html')[0]) _this.$element.trigger('scrollme.zf.drilldown');
        });
      }

      /**
       * Adds keydown event listener to `li`'s in the menu.
       * @private
       */

    }, {
      key: '_keyboardEvents',
      value: function _keyboardEvents() {
        var _this = this;

        this.$menuItems.add(this.$element.find('.js-drilldown-back > a, .is-submenu-parent-item > a')).on('keydown.zf.drilldown', function (e) {
          var $element = $(this),
              $elements = $element.parent('li').parent('ul').children('li').children('a'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'Drilldown', {
            next: function () {
              if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            previous: function () {
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            close: function () {
              _this._back();
              //_this.$menuItems.first().focus(); // focus to first element
            },
            open: function () {
              if (!$element.is(_this.$menuItems)) {
                // not menu item means back button
                _this._hide($element.parent('li').parent('ul'));
                $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                  setTimeout(function () {
                    $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                  }, 1);
                });
                return true;
              } else if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); // end keyboardAccess
      }

      /**
       * Closes all open elements, and returns to root menu.
       * @function
       * @fires Drilldown#closed
       */

    }, {
      key: '_hideAll',
      value: function _hideAll() {
        var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        $elem.one(Foundation.transitionend($elem), function (e) {
          $elem.removeClass('is-active is-closing');
        });
        /**
         * Fires when the menu is fully closed.
         * @event Drilldown#closed
         */
        this.$element.trigger('closed.zf.drilldown');
      }

      /**
       * Adds event listener for each `back` button, and closes open menus.
       * @function
       * @fires Drilldown#back
       * @param {jQuery} $elem - the current sub-menu to add `back` event.
       */

    }, {
      key: '_back',
      value: function _back($elem) {
        var _this = this;
        $elem.off('click.zf.drilldown');
        $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
          e.stopImmediatePropagation();
          // console.log('mouseup on back');
          _this._hide($elem);

          // If there is a parent submenu, call show
          var parentSubMenu = $elem.parent('li').parent('ul').parent('li');
          if (parentSubMenu.length) {
            _this._show(parentSubMenu);
          }
        });
      }

      /**
       * Adds event listener to menu items w/o submenus to close open menus on click.
       * @function
       * @private
       */

    }, {
      key: '_menuLinkEvents',
      value: function _menuLinkEvents() {
        var _this = this;
        this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          // e.stopImmediatePropagation();
          setTimeout(function () {
            _this._hideAll();
          }, 0);
        });
      }

      /**
       * Opens a submenu.
       * @function
       * @fires Drilldown#open
       * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
       */

    }, {
      key: '_show',
      value: function _show($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.children('[data-submenu]').data('calcHeight') });
        $elem.attr('aria-expanded', true);
        $elem.children('[data-submenu]').addClass('is-active').attr('aria-hidden', false);
        /**
         * Fires when the submenu has opened.
         * @event Drilldown#open
         */
        this.$element.trigger('open.zf.drilldown', [$elem]);
      }
    }, {
      key: '_hide',


      /**
       * Hides a submenu
       * @function
       * @fires Drilldown#hide
       * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
       */
      value: function _hide($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        var _this = this;
        $elem.parent('li').attr('aria-expanded', false);
        $elem.attr('aria-hidden', true).addClass('is-closing');
        $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
          $elem.removeClass('is-active is-closing');
          $elem.blur();
        });
        /**
         * Fires when the submenu has closed.
         * @event Drilldown#hide
         */
        $elem.trigger('hide.zf.drilldown', [$elem]);
      }

      /**
       * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
       * Prevents content jumping.
       * @function
       * @private
       */

    }, {
      key: '_getMaxDims',
      value: function _getMaxDims() {
        var maxHeight = 0,
            result = {},
            _this = this;
        this.$submenus.add(this.$element).each(function () {
          var numOfElems = $(this).children('li').length;
          var height = Foundation.Box.GetDimensions(this).height;
          maxHeight = height > maxHeight ? height : maxHeight;
          if (_this.options.autoHeight) {
            $(this).data('calcHeight', height);
            if (!$(this).hasClass('is-drilldown-submenu')) result['height'] = height;
          }
        });

        if (!this.options.autoHeight) result['min-height'] = maxHeight + 'px';

        result['max-width'] = this.$element[0].getBoundingClientRect().width + 'px';

        return result;
      }

      /**
       * Destroys the Drilldown Menu
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        if (this.options.scrollTop) this.$element.off('.zf.drilldown', this._bindHandler);
        this._hideAll();
        this.$element.off('mutateme.zf.trigger');
        Foundation.Nest.Burn(this.$element, 'drilldown');
        this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
        this.$submenuAnchors.each(function () {
          $(this).off('.zf.drilldown');
        });

        this.$submenus.removeClass('drilldown-submenu-cover-previous');

        this.$element.find('a').each(function () {
          var $link = $(this);
          $link.removeAttr('tabindex');
          if ($link.data('savedHref')) {
            $link.attr('href', $link.data('savedHref')).removeData('savedHref');
          } else {
            return;
          }
        });
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Drilldown;
  }();

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended  or appended (see backButtonPosition) to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\li><\a>Back<\/a><\/li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Position the back button either at the top or bottom of drilldown submenus.
     * @option
     * @example bottom
     */
    backButtonPosition: 'top',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\div class="is-drilldown"><\/div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @example false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @example false
     */
    closeOnClick: false,
    /**
     * Allow the menu to auto adjust height.
     * @option
     * @example false
     */
    autoHeight: false,
    /**
     * Animate the auto adjust height.
     * @option
     * @example false
     */
    animateHeight: false,
    /**
     * Scroll to the top of the menu after opening a submenu or navigating back using the menu back button
     * @option
     * @example false
     */
    scrollTop: false,
    /**
     * String jquery selector (for example 'body') of element to take offset().top from, if empty string the drilldown menu offset().top is taken
     * @option
     * @example ''
     */
    scrollTopElement: '',
    /**
     * ScrollTop offset
     * @option
     * @example 100
     */
    scrollTopOffset: 0,
    /**
     * Scroll animation duration
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Scroll animation easing
     * @option
     * @example 'swing'
     */
    animationEasing: 'swing'
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Dropdown = function () {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Dropdown(element, options) {
      _classCallCheck(this, Dropdown);

      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */


    _createClass(Dropdown, [{
      key: '_init',
      value: function _init() {
        var $id = this.$element.attr('id');

        this.$anchor = $('[data-toggle="' + $id + '"]').length ? $('[data-toggle="' + $id + '"]') : $('[data-open="' + $id + '"]');
        this.$anchor.attr({
          'aria-controls': $id,
          'data-is-focus': false,
          'data-yeti-box': $id,
          'aria-haspopup': true,
          'aria-expanded': false

        });

        if (this.options.parentClass) {
          this.$parent = this.$element.parents('.' + this.options.parentClass);
        } else {
          this.$parent = null;
        }
        this.options.positionClass = this.getPositionClass();
        this.counter = 4;
        this.usedPositions = [];
        this.$element.attr({
          'aria-hidden': 'true',
          'data-yeti-box': $id,
          'data-resize': $id,
          'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
        });
        this._events();
      }

      /**
       * Helper function to determine current orientation of dropdown pane.
       * @function
       * @returns {String} position - string value of a position class.
       */

    }, {
      key: 'getPositionClass',
      value: function getPositionClass() {
        var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
        verticalPosition = verticalPosition ? verticalPosition[0] : '';
        var horizontalPosition = /float-(\S+)/.exec(this.$anchor[0].className);
        horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
        var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;

        return position;
      }

      /**
       * Adjusts the dropdown panes orientation by adding/removing positioning classes.
       * @function
       * @private
       * @param {String} position - position class to remove.
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');
        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.$element.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.$element.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.$element.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * Sets the position and orientation of the dropdown pane, checks for collisions.
       * Recursively calls itself if a collision is detected, with a new position class.
       * @function
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        if (this.$anchor.attr('aria-expanded') === 'false') {
          return false;
        }
        var position = this.getPositionClass(),
            $eleDims = Foundation.Box.GetDimensions(this.$element),
            $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
            _this = this,
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

        if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element, this.$parent)) {
          var newWidth = $eleDims.windowDims.width,
              parentHOffset = 0;
          if (this.$parent) {
            var $parentDims = Foundation.Box.GetDimensions(this.$parent),
                parentHOffset = $parentDims.offset.left;
            if ($parentDims.width < newWidth) {
              newWidth = $parentDims.width;
            }
          }

          this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset + parentHOffset, true)).css({
            'width': newWidth - this.options.hOffset * 2,
            'height': 'auto'
          });
          this.classChanged = true;
          return false;
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.$element, this.$parent, true) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * Adds event listeners to the element utilizing the triggers utility library.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': this._setPosition.bind(this)
        });

        if (this.options.hover) {
          this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            var bodyData = $('body').data();
            if (typeof bodyData.whatinput === 'undefined' || bodyData.whatinput === 'mouse') {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.open();
                _this.$anchor.data('hover', true);
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
          if (this.options.hoverPane) {
            this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
              clearTimeout(_this.timeout);
            }).on('mouseleave.zf.dropdown', function () {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.close();
                _this.$anchor.data('hover', false);
              }, _this.options.hoverDelay);
            });
          }
        }
        this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

          var $target = $(this),
              visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

          Foundation.Keyboard.handleKey(e, 'Dropdown', {
            open: function () {
              if ($target.is(_this.$anchor)) {
                _this.open();
                _this.$element.attr('tabindex', -1).focus();
                e.preventDefault();
              }
            },
            close: function () {
              _this.close();
              _this.$anchor.focus();
            }
          });
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body).not(this.$element),
            _this = this;
        $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
          if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
            return;
          }
          if (_this.$element.find(e.target).length) {
            return;
          }
          _this.close();
          $body.off('click.zf.dropdown');
        });
      }

      /**
       * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
       * @function
       * @fires Dropdown#closeme
       * @fires Dropdown#show
       */

    }, {
      key: 'open',
      value: function open() {
        // var _this = this;
        /**
         * Fires to close other open dropdowns
         * @event Dropdown#closeme
         */
        this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
        this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
        // this.$element/*.show()*/;
        this._setPosition();
        this.$element.addClass('is-open').attr({ 'aria-hidden': false });

        if (this.options.autoFocus) {
          var $focusable = Foundation.Keyboard.findFocusable(this.$element);
          if ($focusable.length) {
            $focusable.eq(0).focus();
          }
        }

        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }

        if (this.options.trapFocus) {
          Foundation.Keyboard.trapFocus(this.$element);
        }

        /**
         * Fires once the dropdown is visible.
         * @event Dropdown#show
         */
        this.$element.trigger('show.zf.dropdown', [this.$element]);
      }

      /**
       * Closes the open dropdown pane.
       * @function
       * @fires Dropdown#hide
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.$element.hasClass('is-open')) {
          return false;
        }
        this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

        this.$anchor.removeClass('hover').attr('aria-expanded', false);

        if (this.classChanged) {
          var curPositionClass = this.getPositionClass();
          if (curPositionClass) {
            this.$element.removeClass(curPositionClass);
          }
          this.$element.addClass(this.options.positionClass)
          /*.hide()*/.css({ height: '', width: '' });
          this.classChanged = false;
          this.counter = 4;
          this.usedPositions.length = 0;
        }
        this.$element.trigger('hide.zf.dropdown', [this.$element]);

        if (this.options.trapFocus) {
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the dropdown pane's visibility.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.$element.hasClass('is-open')) {
          if (this.$anchor.data('hover')) return;
          this.close();
        } else {
          this.open();
        }
      }

      /**
       * Destroys the dropdown.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger').hide();
        this.$anchor.off('.zf.dropdown');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Dropdown;
  }();

  Dropdown.defaults = {
    /**
     * Class that designates bounding container of Dropdown (Default: window)
     * @option
     * @example 'dropdown-parent'
     */
    parentClass: null,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @example false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @example true
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @example false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @example true
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @example false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_isVertical',
      value: function _isVertical() {
        return this.$tabs.css('display') === 'block';
      }

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function (e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($sub);
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        // Handle Leaf element Clicks
        if (_this.options.closeOnClickInside) {
          this.$menuItems.on('click.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (!hasSub) {
              _this._hide();
            }
          });
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay));
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime));
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function () {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function () {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function () {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function () {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function () {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function () {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this._isVertical()) {
              // vertical menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              }
            } else {
              // horizontal menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  next: prevSibling,
                  previous: nextSibling,
                  down: openSub,
                  up: closeSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  next: nextSibling,
                  previous: prevSibling,
                  down: openSub,
                  up: closeSub
                });
              }
            }
          } else {
            // not tabs -> one sub
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').parent('li.is-dropdown-submenu-parent').addClass('is-active');
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @example true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader if equalizer contains images
   */

  var Equalizer = function () {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Equalizer(element, options) {
      _classCallCheck(this, Equalizer);

      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Equalizer, [{
      key: '_init',
      value: function _init() {
        var eqId = this.$element.attr('data-equalizer') || '';
        var $watched = this.$element.find('[data-equalizer-watch="' + eqId + '"]');

        this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
        this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));
        this.$element.attr('data-mutate', eqId || Foundation.GetYoDigits(6, 'eq'));

        this.hasNested = this.$element.find('[data-equalizer]').length > 0;
        this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
        this.isOn = false;
        this._bindHandler = {
          onResizeMeBound: this._onResizeMe.bind(this),
          onPostEqualizedBound: this._onPostEqualized.bind(this)
        };

        var imgs = this.$element.find('img');
        var tooSmall;
        if (this.options.equalizeOn) {
          tooSmall = this._checkMQ();
          $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
        } else {
          this._events();
        }
        if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
          if (imgs.length) {
            Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
          } else {
            this._reflow();
          }
        }
      }

      /**
       * Removes event listeners if the breakpoint is too small.
       * @private
       */

    }, {
      key: '_pauseEvents',
      value: function _pauseEvents() {
        this.isOn = false;
        this.$element.off({
          '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
          'resizeme.zf.trigger': this._bindHandler.onResizeMeBound,
          'mutateme.zf.trigger': this._bindHandler.onResizeMeBound
        });
      }

      /**
       * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
       * @private
       */

    }, {
      key: '_onResizeMe',
      value: function _onResizeMe(e) {
        this._reflow();
      }

      /**
       * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
       * @private
       */

    }, {
      key: '_onPostEqualized',
      value: function _onPostEqualized(e) {
        if (e.target !== this.$element[0]) {
          this._reflow();
        }
      }

      /**
       * Initializes events for Equalizer.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this._pauseEvents();
        if (this.hasNested) {
          this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
        } else {
          this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
          this.$element.on('mutateme.zf.trigger', this._bindHandler.onResizeMeBound);
        }
        this.isOn = true;
      }

      /**
       * Checks the current breakpoint to the minimum required size.
       * @private
       */

    }, {
      key: '_checkMQ',
      value: function _checkMQ() {
        var tooSmall = !Foundation.MediaQuery.is(this.options.equalizeOn);
        if (tooSmall) {
          if (this.isOn) {
            this._pauseEvents();
            this.$watched.css('height', 'auto');
          }
        } else {
          if (!this.isOn) {
            this._events();
          }
        }
        return tooSmall;
      }

      /**
       * A noop version for the plugin
       * @private
       */

    }, {
      key: '_killswitch',
      value: function _killswitch() {
        return;
      }

      /**
       * Calls necessary functions to update Equalizer upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        if (!this.options.equalizeOnStack) {
          if (this._isStacked()) {
            this.$watched.css('height', 'auto');
            return false;
          }
        }
        if (this.options.equalizeByRow) {
          this.getHeightsByRow(this.applyHeightByRow.bind(this));
        } else {
          this.getHeights(this.applyHeight.bind(this));
        }
      }

      /**
       * Manually determines if the first 2 elements are *NOT* stacked.
       * @private
       */

    }, {
      key: '_isStacked',
      value: function _isStacked() {
        if (!this.$watched[0] || !this.$watched[1]) {
          return true;
        }
        return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} heights - An array of heights of children within Equalizer container
       */

    }, {
      key: 'getHeights',
      value: function getHeights(cb) {
        var heights = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          heights.push(this.$watched[i].offsetHeight);
        }
        cb(heights);
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       */

    }, {
      key: 'getHeightsByRow',
      value: function getHeightsByRow(cb) {
        var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
            groups = [],
            group = 0;
        //group by Row
        groups[group] = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          //maybe could use this.$watched[i].offsetTop
          var elOffsetTop = $(this.$watched[i]).offset().top;
          if (elOffsetTop != lastElTopOffset) {
            group++;
            groups[group] = [];
            lastElTopOffset = elOffsetTop;
          }
          groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
        }

        for (var j = 0, ln = groups.length; j < ln; j++) {
          var heights = $(groups[j]).map(function () {
            return this[1];
          }).get();
          var max = Math.max.apply(null, heights);
          groups[j].push(max);
        }
        cb(groups);
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest
       * @param {array} heights - An array of heights of children within Equalizer container
       * @fires Equalizer#preequalized
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeight',
      value: function applyHeight(heights) {
        var max = Math.max.apply(null, heights);
        /**
         * Fires before the heights are applied
         * @event Equalizer#preequalized
         */
        this.$element.trigger('preequalized.zf.equalizer');

        this.$watched.css('height', max);

        /**
         * Fires when the heights have been applied
         * @event Equalizer#postequalized
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
       * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       * @fires Equalizer#preequalized
       * @fires Equalizer#preequalizedrow
       * @fires Equalizer#postequalizedrow
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeightByRow',
      value: function applyHeightByRow(groups) {
        /**
         * Fires before the heights are applied
         */
        this.$element.trigger('preequalized.zf.equalizer');
        for (var i = 0, len = groups.length; i < len; i++) {
          var groupsILength = groups[i].length,
              max = groups[i][groupsILength - 1];
          if (groupsILength <= 2) {
            $(groups[i][0][0]).css({ 'height': 'auto' });
            continue;
          }
          /**
            * Fires before the heights per row are applied
            * @event Equalizer#preequalizedrow
            */
          this.$element.trigger('preequalizedrow.zf.equalizer');
          for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
            $(groups[i][j][0]).css({ 'height': max });
          }
          /**
            * Fires when the heights per row have been applied
            * @event Equalizer#postequalizedrow
            */
          this.$element.trigger('postequalizedrow.zf.equalizer');
        }
        /**
         * Fires when the heights have been applied
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Destroys an instance of Equalizer.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._pauseEvents();
        this.$watched.css('height', 'auto');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Equalizer;
  }();

  /**
   * Default settings for plugin
   */


  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @example true
     */
    equalizeOnStack: false,
    /**
     * Enable height equalization row by row.
     * @option
     * @example false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @example 'medium'
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  var Interchange = function () {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Interchange(element, options) {
      _classCallCheck(this, Interchange);

      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */


    _createClass(Interchange, [{
      key: '_init',
      value: function _init() {
        this._addBreakpoints();
        this._generateRules();
        this._reflow();
      }

      /**
       * Initializes events for Interchange.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        $(window).on('resize.zf.interchange', Foundation.util.throttle(function () {
          _this2._reflow();
        }, 50));
      }

      /**
       * Calls necessary functions to update Interchange upon DOM change
       * @function
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        var match;

        // Iterate through each rule, but only save the last match
        for (var i in this.rules) {
          if (this.rules.hasOwnProperty(i)) {
            var rule = this.rules[i];
            if (window.matchMedia(rule.query).matches) {
              match = rule;
            }
          }
        }

        if (match) {
          this.replace(match.path);
        }
      }

      /**
       * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
       * @function
       * @private
       */

    }, {
      key: '_addBreakpoints',
      value: function _addBreakpoints() {
        for (var i in Foundation.MediaQuery.queries) {
          if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
            var query = Foundation.MediaQuery.queries[i];
            Interchange.SPECIAL_QUERIES[query.name] = query.value;
          }
        }
      }

      /**
       * Checks the Interchange element for the provided media query + content pairings
       * @function
       * @private
       * @param {Object} element - jQuery object that is an Interchange instance
       * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
       */

    }, {
      key: '_generateRules',
      value: function _generateRules(element) {
        var rulesList = [];
        var rules;

        if (this.options.rules) {
          rules = this.options.rules;
        } else {
          rules = this.$element.data('interchange').match(/\[.*?\]/g);
        }

        for (var i in rules) {
          if (rules.hasOwnProperty(i)) {
            var rule = rules[i].slice(1, -1).split(', ');
            var path = rule.slice(0, -1).join('');
            var query = rule[rule.length - 1];

            if (Interchange.SPECIAL_QUERIES[query]) {
              query = Interchange.SPECIAL_QUERIES[query];
            }

            rulesList.push({
              path: path,
              query: query
            });
          }
        }

        this.rules = rulesList;
      }

      /**
       * Update the `src` property of an image, or change the HTML of a container, to the specified path.
       * @function
       * @param {String} path - Path to the image or HTML partial.
       * @fires Interchange#replaced
       */

    }, {
      key: 'replace',
      value: function replace(path) {
        if (this.currentPath === path) return;

        var _this = this,
            trigger = 'replaced.zf.interchange';

        // Replacing images
        if (this.$element[0].nodeName === 'IMG') {
          this.$element.attr('src', path).on('load', function () {
            _this.currentPath = path;
          }).trigger(trigger);
        }
        // Replacing background images
        else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
            this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
          }
          // Replacing HTML
          else {
              $.get(path, function (response) {
                _this.$element.html(response).trigger(trigger);
                $(response).foundation();
                _this.currentPath = path;
              });
            }

        /**
         * Fires when content in an Interchange element is done being loaded.
         * @event Interchange#replaced
         */
        // this.$element.trigger('replaced.zf.interchange');
      }

      /**
       * Destroys an instance of interchange.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        //TODO this.
      }
    }]);

    return Interchange;
  }();

  /**
   * Default settings for plugin
   */


  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  var Magellan = function () {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Magellan(element, options) {
      _classCallCheck(this, Magellan);

      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();
      this.calcPoints();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Magellan, [{
      key: '_init',
      value: function _init() {
        var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
        var _this = this;
        this.$targets = $('[data-magellan-target]');
        this.$links = this.$element.find('a');
        this.$element.attr({
          'data-resize': id,
          'data-scroll': id,
          'id': id
        });
        this.$active = $();
        this.scrollPos = parseInt(window.pageYOffset, 10);

        this._events();
      }

      /**
       * Calculates an array of pixel values that are the demarcation lines between locations on the page.
       * Can be invoked if new elements are added or the size of a location changes.
       * @function
       */

    }, {
      key: 'calcPoints',
      value: function calcPoints() {
        var _this = this,
            body = document.body,
            html = document.documentElement;

        this.points = [];
        this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
        this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

        this.$targets.each(function () {
          var $tar = $(this),
              pt = Math.round($tar.offset().top - _this.options.threshold);
          $tar.targetPoint = pt;
          _this.points.push(pt);
        });
      }

      /**
       * Initializes events for Magellan.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            $body = $('html, body'),
            opts = {
          duration: _this.options.animationDuration,
          easing: _this.options.animationEasing
        };
        $(window).one('load', function () {
          if (_this.options.deepLinking) {
            if (location.hash) {
              _this.scrollToLoc(location.hash);
            }
          }
          _this.calcPoints();
          _this._updateActive();
        });

        this.$element.on({
          'resizeme.zf.trigger': this.reflow.bind(this),
          'scrollme.zf.trigger': this._updateActive.bind(this)
        }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
          e.preventDefault();
          var arrival = this.getAttribute('href');
          _this.scrollToLoc(arrival);
        });
        $(window).on('popstate', function (e) {
          if (_this.options.deepLinking) {
            _this.scrollToLoc(window.location.hash);
          }
        });
      }

      /**
       * Function to scroll to a given location on the page.
       * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
       * @function
       */

    }, {
      key: 'scrollToLoc',
      value: function scrollToLoc(loc) {
        // Do nothing if target does not exist to prevent errors
        if (!$(loc).length) {
          return false;
        }
        this._inTransition = true;
        var _this = this,
            scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

        $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing, function () {
          _this._inTransition = false;_this._updateActive();
        });
      }

      /**
       * Calls necessary functions to update Magellan upon DOM change
       * @function
       */

    }, {
      key: 'reflow',
      value: function reflow() {
        this.calcPoints();
        this._updateActive();
      }

      /**
       * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
       * @private
       * @function
       * @fires Magellan#update
       */

    }, {
      key: '_updateActive',
      value: function _updateActive() /*evt, elem, scrollPos*/{
        if (this._inTransition) {
          return;
        }
        var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
            curIdx;

        if (winPos + this.winHeight === this.docHeight) {
          curIdx = this.points.length - 1;
        } else if (winPos < this.points[0]) {
          curIdx = undefined;
        } else {
          var isDown = this.scrollPos < winPos,
              _this = this,
              curVisible = this.points.filter(function (p, i) {
            return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
          });
          curIdx = curVisible.length ? curVisible.length - 1 : 0;
        }

        this.$active.removeClass(this.options.activeClass);
        this.$active = this.$links.filter('[href="#' + this.$targets.eq(curIdx).data('magellan-target') + '"]').addClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = "";
          if (curIdx != undefined) {
            hash = this.$active[0].getAttribute('href');
          }
          if (hash !== window.location.hash) {
            if (window.history.pushState) {
              window.history.pushState(null, null, hash);
            } else {
              window.location.hash = hash;
            }
          }
        }

        this.scrollPos = winPos;
        /**
         * Fires when magellan is finished updating to the new active element.
         * @event Magellan#update
         */
        this.$element.trigger('update.zf.magellan', [this.$active]);
      }

      /**
       * Destroys an instance of Magellan and resets the url of the window.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger .zf.magellan').find('.' + this.options.activeClass).removeClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          window.location.hash.replace(hash, '');
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Magellan;
  }();

  /**
   * Default settings for plugin
   */


  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations.
     * @option
     * @example 'ease-in-out'
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @example 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @example 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @example true
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @example 25
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        this.$element.addClass('is-transition-' + this.options.transition);

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add an overlay over the content if necessary
        if (this.options.contentOverlay === true) {
          var overlay = document.createElement('div');
          var overlayPosition = $(this.$element).css("position") === 'fixed' ? 'is-overlay-fixed' : 'is-overlay-absolute';
          overlay.setAttribute('class', 'js-off-canvas-overlay ' + overlayPosition);
          this.$overlay = $(overlay);
          if (overlayPosition === 'is-overlay-fixed') {
            $('body').append(this.$overlay);
          } else {
            this.$element.siblings('[data-off-canvas-content]').append(this.$overlay);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed === true) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime === true) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick === true) {
          var $target = this.options.contentOverlay ? this.$overlay : $('[data-off-canvas-content]');
          $target.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          this.$element.attr('aria-hidden', 'false');
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          this.$element.attr('aria-hidden', 'true');
          this.$element.on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Stops scrolling of the body when offcanvas is open on mobile Safari and other troublesome browsers.
       * @private
       */

    }, {
      key: '_stopScrolling',
      value: function _stopScrolling(event) {
        return false;
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this;

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.forceTo === 'top') {
          window.scrollTo(0, 0);
        } else if (this.options.forceTo === 'bottom') {
          window.scrollTo(0, document.body.scrollHeight);
        }

        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        _this.$element.addClass('is-open');

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        // If `contentScroll` is set to false, add class and disable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').addClass('is-off-canvas-open').on('touchmove', this._stopScrolling);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.addClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.addClass('is-closable');
        }

        if (this.options.autoFocus === true) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            _this.$element.find('a, button').eq(0).focus();
          });
        }

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').attr('tabindex', '-1');
          Foundation.Keyboard.trapFocus(this.$element);
        }
      }

      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        _this.$element.removeClass('is-open');

        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');

        // If `contentScroll` is set to false, remove class and re-enable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').removeClass('is-off-canvas-open').off('touchmove', this._stopScrolling);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-closable');
        }

        this.$triggers.attr('aria-expanded', 'false');

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').removeAttr('tabindex');
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(e) {
        var _this2 = this;

        Foundation.Keyboard.handleKey(e, 'OffCanvas', {
          close: function () {
            _this2.close();
            _this2.$lastTrigger.focus();
            return true;
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$overlay.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Adds an overlay on top of `[data-off-canvas-content]`.
     * @option
     * @example true
     */
    contentOverlay: true,

    /**
     * Enable/disable scrolling of the main content when an off canvas panel is open.
     * @option
     * @example true
     */
    contentScroll: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
     * @option
     * @example push
     */
    transition: 'push',

    /**
     * Force the page to scroll to top or bottom on open.
     * @option
     * @example top
     */
    forceTo: null,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  var Orbit = function () {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    function Orbit(element, options) {
      _classCallCheck(this, Orbit);

      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */


    _createClass(Orbit, [{
      key: '_init',
      value: function _init() {
        // @TODO: consider discussion on PR #9278 about DOM pollution by changeSlide
        this._reset();

        this.$wrapper = this.$element.find('.' + this.options.containerClass);
        this.$slides = this.$element.find('.' + this.options.slideClass);

        var $images = this.$element.find('img'),
            initActive = this.$slides.filter('.is-active'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'orbit');

        this.$element.attr({
          'data-resize': id,
          'id': id
        });

        if (!initActive.length) {
          this.$slides.eq(0).addClass('is-active');
        }

        if (!this.options.useMUI) {
          this.$slides.addClass('no-motionui');
        }

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
        } else {
          this._prepareForOrbit(); //hehe
        }

        if (this.options.bullets) {
          this._loadBullets();
        }

        this._events();

        if (this.options.autoPlay && this.$slides.length > 1) {
          this.geoSync();
        }

        if (this.options.accessible) {
          // allow wrapper to be focusable to enable arrow navigation
          this.$wrapper.attr('tabindex', 0);
        }
      }

      /**
      * Creates a jQuery collection of bullets, if they are being used.
      * @function
      * @private
      */

    }, {
      key: '_loadBullets',
      value: function _loadBullets() {
        this.$bullets = this.$element.find('.' + this.options.boxOfBullets).find('button');
      }

      /**
      * Sets a `timer` object on the orbit, and starts the counter for the next slide.
      * @function
      */

    }, {
      key: 'geoSync',
      value: function geoSync() {
        var _this = this;
        this.timer = new Foundation.Timer(this.$element, {
          duration: this.options.timerDelay,
          infinite: false
        }, function () {
          _this.changeSlide(true);
        });
        this.timer.start();
      }

      /**
      * Sets wrapper and slide heights for the orbit.
      * @function
      * @private
      */

    }, {
      key: '_prepareForOrbit',
      value: function _prepareForOrbit() {
        var _this = this;
        this._setWrapperHeight();
      }

      /**
      * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
      * @function
      * @private
      * @param {Function} cb - a callback function to fire when complete.
      */

    }, {
      key: '_setWrapperHeight',
      value: function _setWrapperHeight(cb) {
        //rewrite this to `for` loop
        var max = 0,
            temp,
            counter = 0,
            _this = this;

        this.$slides.each(function () {
          temp = this.getBoundingClientRect().height;
          $(this).attr('data-slide', counter);

          if (_this.$slides.filter('.is-active')[0] !== _this.$slides.eq(counter)[0]) {
            //if not the active slide, set css position and display property
            $(this).css({ 'position': 'relative', 'display': 'none' });
          }
          max = temp > max ? temp : max;
          counter++;
        });

        if (counter === this.$slides.length) {
          this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
          if (cb) {
            cb(max);
          } //fire callback with max height dimension.
        }
      }

      /**
      * Sets the max-height of each slide.
      * @function
      * @private
      */

    }, {
      key: '_setSlideHeight',
      value: function _setSlideHeight(height) {
        this.$slides.each(function () {
          $(this).css('max-height', height);
        });
      }

      /**
      * Adds event listeners to basically everything within the element.
      * @function
      * @private
      */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        //***************************************
        //**Now using custom event - thanks to:**
        //**      Yohai Ararat of Toronto      **
        //***************************************
        //
        this.$element.off('.resizeme.zf.trigger').on({
          'resizeme.zf.trigger': this._prepareForOrbit.bind(this)
        });
        if (this.$slides.length > 1) {

          if (this.options.swipe) {
            this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(true);
            }).on('swiperight.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(false);
            });
          }
          //***************************************

          if (this.options.autoPlay) {
            this.$slides.on('click.zf.orbit', function () {
              _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
              _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
            });

            if (this.options.pauseOnHover) {
              this.$element.on('mouseenter.zf.orbit', function () {
                _this.timer.pause();
              }).on('mouseleave.zf.orbit', function () {
                if (!_this.$element.data('clickedOn')) {
                  _this.timer.start();
                }
              });
            }
          }

          if (this.options.navButtons) {
            var $controls = this.$element.find('.' + this.options.nextClass + ', .' + this.options.prevClass);
            $controls.attr('tabindex', 0)
            //also need to handle enter/return and spacebar key presses
            .on('click.zf.orbit touchend.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide($(this).hasClass(_this.options.nextClass));
            });
          }

          if (this.options.bullets) {
            this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
              if (/is-active/g.test(this.className)) {
                return false;
              } //if this is active, kick out of function.
              var idx = $(this).data('slide'),
                  ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                  $slide = _this.$slides.eq(idx);

              _this.changeSlide(ltr, $slide, idx);
            });
          }

          if (this.options.accessible) {
            this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
              // handle keyboard event with keyboard util
              Foundation.Keyboard.handleKey(e, 'Orbit', {
                next: function () {
                  _this.changeSlide(true);
                },
                previous: function () {
                  _this.changeSlide(false);
                },
                handled: function () {
                  // if bullet is focused, make sure focus moves
                  if ($(e.target).is(_this.$bullets)) {
                    _this.$bullets.filter('.is-active').focus();
                  }
                }
              });
            });
          }
        }
      }

      /**
       * Resets Orbit so it can be reinitialized
       */

    }, {
      key: '_reset',
      value: function _reset() {
        // Don't do anything if there are no slides (first run)
        if (typeof this.$slides == 'undefined') {
          return;
        }

        if (this.$slides.length > 1) {
          // Remove old events
          this.$element.off('.zf.orbit').find('*').off('.zf.orbit');

          // Restart timer if autoPlay is enabled
          if (this.options.autoPlay) {
            this.timer.restart();
          }

          // Reset all sliddes
          this.$slides.each(function (el) {
            $(el).removeClass('is-active is-active is-in').removeAttr('aria-live').hide();
          });

          // Show the first slide
          this.$slides.first().addClass('is-active').show();

          // Triggers when the slide has finished animating
          this.$element.trigger('slidechange.zf.orbit', [this.$slides.first()]);

          // Select first bullet if bullets are present
          if (this.options.bullets) {
            this._updateBullets(0);
          }
        }
      }

      /**
      * Changes the current slide to a new one.
      * @function
      * @param {Boolean} isLTR - flag if the slide should move left to right.
      * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
      * @param {Number} idx - the index of the new slide in its collection, if one chosen.
      * @fires Orbit#slidechange
      */

    }, {
      key: 'changeSlide',
      value: function changeSlide(isLTR, chosenSlide, idx) {
        if (!this.$slides) {
          return;
        } // Don't freak out if we're in the middle of cleanup
        var $curSlide = this.$slides.filter('.is-active').eq(0);

        if (/mui/g.test($curSlide[0].className)) {
          return false;
        } //if the slide is currently animating, kick out of the function

        var $firstSlide = this.$slides.first(),
            $lastSlide = this.$slides.last(),
            dirIn = isLTR ? 'Right' : 'Left',
            dirOut = isLTR ? 'Left' : 'Right',
            _this = this,
            $newSlide;

        if (!chosenSlide) {
          //most of the time, this will be auto played or clicked from the navButtons.
          $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
          this.options.infiniteWrap ? $curSlide.next('.' + this.options.slideClass).length ? $curSlide.next('.' + this.options.slideClass) : $firstSlide : $curSlide.next('.' + this.options.slideClass) : //pick next slide if moving left to right
          this.options.infiniteWrap ? $curSlide.prev('.' + this.options.slideClass).length ? $curSlide.prev('.' + this.options.slideClass) : $lastSlide : $curSlide.prev('.' + this.options.slideClass); //pick prev slide if moving right to left
        } else {
          $newSlide = chosenSlide;
        }

        if ($newSlide.length) {
          /**
          * Triggers before the next slide starts animating in and only if a next slide has been found.
          * @event Orbit#beforeslidechange
          */
          this.$element.trigger('beforeslidechange.zf.orbit', [$curSlide, $newSlide]);

          if (this.options.bullets) {
            idx = idx || this.$slides.index($newSlide); //grab index to update bullets
            this._updateBullets(idx);
          }

          if (this.options.useMUI && !this.$element.is(':hidden')) {
            Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options['animInFrom' + dirIn], function () {
              $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
            });

            Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options['animOutTo' + dirOut], function () {
              $curSlide.removeAttr('aria-live');
              if (_this.options.autoPlay && !_this.timer.isPaused) {
                _this.timer.restart();
              }
              //do stuff?
            });
          } else {
            $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
            $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
            if (this.options.autoPlay && !this.timer.isPaused) {
              this.timer.restart();
            }
          }
          /**
          * Triggers when the slide has finished animating in.
          * @event Orbit#slidechange
          */
          this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
        }
      }

      /**
      * Updates the active state of the bullets, if displayed.
      * @function
      * @private
      * @param {Number} idx - the index of the current slide.
      */

    }, {
      key: '_updateBullets',
      value: function _updateBullets(idx) {
        var $oldBullet = this.$element.find('.' + this.options.boxOfBullets).find('.is-active').removeClass('is-active').blur(),
            span = $oldBullet.find('span:last').detach(),
            $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
      }

      /**
      * Destroys the carousel and hides the element.
      * @function
      */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Orbit;
  }();

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
    * @example true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
    * @example true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
    * @example true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
    * @example 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
    * @example true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
    * @example true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
    * @example true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
    * @example true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
    * @example 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
    * @example 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
    * @example 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
    * @example 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
    * @example 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
    * @example true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.accordionMenu
   * @requires foundation.util.drilldown
   * @requires foundation.util.dropdown-menu
   */

  var ResponsiveMenu = function () {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveMenu(element, options) {
      _classCallCheck(this, ResponsiveMenu);

      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveMenu, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
        // Add data-mutate since children may need it.
        this.$element.attr('data-mutate', this.$element.attr('data-mutate') || Foundation.GetYoDigits(6, 'responsive-menu'));
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
        // $(window).on('resize.zf.ResponsiveMenu', function() {
        //   _this._checkMediaQueries();
        // });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) this.currentPlugin.destroy();
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveMenu');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveMenu;
  }();

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]');
        this.options = $.extend({}, this.options, this.$targetMenu.data());

        // If they were set, parse the animation classes
        if (this.options.animate) {
          var input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        var _this2 = this;

        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          if (this.options.animate) {
            if (this.$targetMenu.is(':hidden')) {
              Foundation.Motion.animateIn(this.$targetMenu, this.animationIn, function () {
                /**
                 * Fires when the element attached to the tab bar toggles.
                 * @event ResponsiveToggle#toggled
                 */
                _this2.$element.trigger('toggled.zf.responsiveToggle');
                _this2.$targetMenu.find('[data-mutate]').triggerHandler('mutateme.zf.trigger');
              });
            } else {
              Foundation.Motion.animateOut(this.$targetMenu, this.animationOut, function () {
                /**
                 * Fires when the element attached to the tab bar toggles.
                 * @event ResponsiveToggle#toggled
                 */
                _this2.$element.trigger('toggled.zf.responsiveToggle');
              });
            }
          } else {
            this.$targetMenu.toggle(0);
            this.$targetMenu.find('[data-mutate]').trigger('mutateme.zf.trigger');

            /**
             * Fires when the element attached to the tab bar toggles.
             * @event ResponsiveToggle#toggled
             */
            this.$element.trigger('toggled.zf.responsiveToggle');
          }
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @example 'medium'
     */
    hideFor: 'medium',

    /**
     * To decide if the toggle should be animated or not.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($(this.options.appendTo));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay() {
        return $('<div></div>').addClass('reveal-overlay').appendTo(this.options.appendTo);
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }

        var _this = this;

        function addRevealOpenClasses() {
          if (_this.isMobile) {
            if (!_this.originalScrollPos) {
              _this.originalScrollPos = window.pageYOffset;
            }
            $('html, body').addClass('is-reveal-open');
          } else {
            $('body').addClass('is-reveal-open');
          }
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          (function () {
            var afterAnimation = function () {
              _this.$element.attr({
                'aria-hidden': false,
                'tabindex': -1
              }).focus();
              addRevealOpenClasses();
              Foundation.Keyboard.trapFocus(_this.$element);
            };

            if (_this3.options.overlay) {
              Foundation.Motion.animateIn(_this3.$overlay, 'fade-in');
            }
            Foundation.Motion.animateIn(_this3.$element, _this3.options.animationIn, function () {
              if (_this3.$element) {
                // protect against object having been removed
                _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
                afterAnimation();
              }
            });
          })();
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();
        Foundation.Keyboard.trapFocus(this.$element);

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        addRevealOpenClasses();

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        if (!this.$element) {
          return;
        } // If we're in the middle of cleanup, don't freak out
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {
            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }

            this.$element.hide(this.options.hideDelay);
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            $('html, body').removeClass('is-reveal-open');
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            $('body').removeClass('is-reveal-open');
          }

          Foundation.Keyboard.releaseFocus(_this.$element);

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState('', document.title, window.location.href.replace('#' + this.id, ''));
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($(this.options.appendTo)); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-in-left'
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-out-right'
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @example true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @example false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @example auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @example auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @example false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @example 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @example true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @example false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @example false
     */
    deepLink: false,
    /**
    * Allows the modal to append to custom div.
    * @option
    * @example false
    */
    appendTo: "body"

  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  var Slider = function () {
    /**
     * Creates a new instance of a slider control.
     * @class
     * @param {jQuery} element - jQuery object to make into a slider control.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Slider(element, options) {
      _classCallCheck(this, Slider);

      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */


    _createClass(Slider, [{
      key: '_init',
      value: function _init() {
        this.inputs = this.$element.find('input');
        this.handles = this.$element.find('[data-slider-handle]');

        this.$handle = this.handles.eq(0);
        this.$input = this.inputs.length ? this.inputs.eq(0) : $('#' + this.$handle.attr('aria-controls'));
        this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

        var isDbl = false,
            _this = this;
        if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
          this.options.disabled = true;
          this.$element.addClass(this.options.disabledClass);
        }
        if (!this.inputs.length) {
          this.inputs = $().add(this.$input);
          this.options.binding = true;
        }

        this._setInitAttr(0);

        if (this.handles[1]) {
          this.options.doubleSided = true;
          this.$handle2 = this.handles.eq(1);
          this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $('#' + this.$handle2.attr('aria-controls'));

          if (!this.inputs[1]) {
            this.inputs = this.inputs.add(this.$input2);
          }
          isDbl = true;

          // this.$handle.triggerHandler('click.zf.slider');
          this._setInitAttr(1);
        }

        // Set handle positions
        this.setHandles();

        this._events();
      }
    }, {
      key: 'setHandles',
      value: function setHandles() {
        var _this2 = this;

        if (this.handles[1]) {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true, function () {
            _this2._setHandlePos(_this2.$handle2, _this2.inputs.eq(1).val(), true);
          });
        } else {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true);
        }
      }
    }, {
      key: '_reflow',
      value: function _reflow() {
        this.setHandles();
      }
      /**
      * @function
      * @private
      * @param {Number} value - floating point (the value) to be transformed using to a relative position on the slider (the inverse of _value)
      */

    }, {
      key: '_pctOfBar',
      value: function _pctOfBar(value) {
        var pctOfBar = percent(value - this.options.start, this.options.end - this.options.start);

        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._logTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._powTransform(pctOfBar);
            break;
        }

        return pctOfBar.toFixed(2);
      }

      /**
      * @function
      * @private
      * @param {Number} pctOfBar - floating point, the relative position of the slider (typically between 0-1) to be transformed to a value
      */

    }, {
      key: '_value',
      value: function _value(pctOfBar) {
        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._powTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._logTransform(pctOfBar);
            break;
        }
        var value = (this.options.end - this.options.start) * pctOfBar + this.options.start;

        return value;
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the log function
      */

    }, {
      key: '_logTransform',
      value: function _logTransform(value) {
        return baseLog(this.options.nonLinearBase, value * (this.options.nonLinearBase - 1) + 1);
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the power function
      */

    }, {
      key: '_powTransform',
      value: function _powTransform(value) {
        return (Math.pow(this.options.nonLinearBase, value) - 1) / (this.options.nonLinearBase - 1);
      }

      /**
       * Sets the position of the selected handle and fill bar.
       * @function
       * @private
       * @param {jQuery} $hndl - the selected handle to move.
       * @param {Number} location - floating point between the start and end values of the slider bar.
       * @param {Function} cb - callback function to fire on completion.
       * @fires Slider#moved
       * @fires Slider#changed
       */

    }, {
      key: '_setHandlePos',
      value: function _setHandlePos($hndl, location, noInvert, cb) {
        // don't move if the slider has been disabled since its initialization
        if (this.$element.hasClass(this.options.disabledClass)) {
          return;
        }
        //might need to alter that slightly for bars that will have odd number selections.
        location = parseFloat(location); //on input change events, convert string to number...grumble.

        // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
        if (location < this.options.start) {
          location = this.options.start;
        } else if (location > this.options.end) {
          location = this.options.end;
        }

        var isDbl = this.options.doubleSided;

        if (isDbl) {
          //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
          if (this.handles.index($hndl) === 0) {
            var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
            location = location >= h2Val ? h2Val - this.options.step : location;
          } else {
            var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
            location = location <= h1Val ? h1Val + this.options.step : location;
          }
        }

        //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
        //for click and drag events, it's weird due to the scale(-1, 1) css property
        if (this.options.vertical && !noInvert) {
          location = this.options.end - location;
        }

        var _this = this,
            vert = this.options.vertical,
            hOrW = vert ? 'height' : 'width',
            lOrT = vert ? 'top' : 'left',
            handleDim = $hndl[0].getBoundingClientRect()[hOrW],
            elemDim = this.$element[0].getBoundingClientRect()[hOrW],

        //percentage of bar min/max value based on click or drag point
        pctOfBar = this._pctOfBar(location),

        //number of actual pixels to shift the handle, based on the percentage obtained above
        pxToMove = (elemDim - handleDim) * pctOfBar,

        //percentage of bar to shift the handle
        movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
        //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
        location = parseFloat(location.toFixed(this.options.decimal));
        // declare empty object for css adjustments, only used with 2 handled-sliders
        var css = {};

        this._setValues($hndl, location);

        // TODO update to calculate based on values set to respective inputs??
        if (isDbl) {
          var isLeftHndl = this.handles.index($hndl) === 0,

          //empty variable, will be used for min-height/width for fill bar
          dim,

          //percentage w/h of the handle compared to the slider bar
          handlePct = ~~(percent(handleDim, elemDim) * 100);
          //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
          if (isLeftHndl) {
            //left or top percentage value to apply to the fill bar.
            css[lOrT] = movement + '%';
            //calculate the new min-height/width for the fill bar.
            dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
            //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
            //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
            if (cb && typeof cb === 'function') {
              cb();
            } //this is only needed for the initialization of 2 handled sliders
          } else {
            //just caching the value of the left/bottom handle's left/top property
            var handlePos = parseFloat(this.$handle[0].style[lOrT]);
            //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
            //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
            dim = movement - (isNaN(handlePos) ? (this.options.initialStart - this.options.start) / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
          }
          // assign the min-height/width to our css object
          css['min-' + hOrW] = dim + '%';
        }

        this.$element.one('finished.zf.animate', function () {
          /**
           * Fires when the handle is done moving.
           * @event Slider#moved
           */
          _this.$element.trigger('moved.zf.slider', [$hndl]);
        });

        //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
        var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

        Foundation.Move(moveTime, $hndl, function () {
          // adjusting the left/top property of the handle, based on the percentage calculated above
          // if movement isNaN, that is because the slider is hidden and we cannot determine handle width,
          // fall back to next best guess.
          if (isNaN(movement)) {
            $hndl.css(lOrT, pctOfBar * 100 + '%');
          } else {
            $hndl.css(lOrT, movement + '%');
          }

          if (!_this.options.doubleSided) {
            //if single-handled, a simple method to expand the fill bar
            _this.$fill.css(hOrW, pctOfBar * 100 + '%');
          } else {
            //otherwise, use the css object we created above
            _this.$fill.css(css);
          }
        });

        /**
         * Fires when the value has not been change for a given time.
         * @event Slider#changed
         */
        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
          _this.$element.trigger('changed.zf.slider', [$hndl]);
        }, _this.options.changedDelay);
      }

      /**
       * Sets the initial attribute for the slider element.
       * @function
       * @private
       * @param {Number} idx - index of the current handle/input to use.
       */

    }, {
      key: '_setInitAttr',
      value: function _setInitAttr(idx) {
        var initVal = idx === 0 ? this.options.initialStart : this.options.initialEnd;
        var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
        this.inputs.eq(idx).attr({
          'id': id,
          'max': this.options.end,
          'min': this.options.start,
          'step': this.options.step
        });
        this.inputs.eq(idx).val(initVal);
        this.handles.eq(idx).attr({
          'role': 'slider',
          'aria-controls': id,
          'aria-valuemax': this.options.end,
          'aria-valuemin': this.options.start,
          'aria-valuenow': initVal,
          'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
          'tabindex': 0
        });
      }

      /**
       * Sets the input and `aria-valuenow` values for the slider element.
       * @function
       * @private
       * @param {jQuery} $handle - the currently selected handle.
       * @param {Number} val - floating point of the new value.
       */

    }, {
      key: '_setValues',
      value: function _setValues($handle, val) {
        var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
        this.inputs.eq(idx).val(val);
        $handle.attr('aria-valuenow', val);
      }

      /**
       * Handles events on the slider element.
       * Calculates the new location of the current handle.
       * If there are two handles and the bar was clicked, it determines which handle to move.
       * @function
       * @private
       * @param {Object} e - the `event` object passed from the listener.
       * @param {jQuery} $handle - the current handle to calculate for, if selected.
       * @param {Number} val - floating point number for the new value of the slider.
       * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
       */

    }, {
      key: '_handleEvent',
      value: function _handleEvent(e, $handle, val) {
        var value, hasVal;
        if (!val) {
          //click or drag events
          e.preventDefault();
          var _this = this,
              vertical = this.options.vertical,
              param = vertical ? 'height' : 'width',
              direction = vertical ? 'top' : 'left',
              eventOffset = vertical ? e.pageY : e.pageX,
              halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
              barDim = this.$element[0].getBoundingClientRect()[param],
              windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

          var elemOffset = this.$element.offset()[direction];

          // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
          // best way to guess this is simulated is if clientY == pageY
          if (e.clientY === e.pageY) {
            eventOffset = eventOffset + windowScroll;
          }
          var eventFromBar = eventOffset - elemOffset;
          var barXY;
          if (eventFromBar < 0) {
            barXY = 0;
          } else if (eventFromBar > barDim) {
            barXY = barDim;
          } else {
            barXY = eventFromBar;
          }
          var offsetPct = percent(barXY, barDim);

          value = this._value(offsetPct);

          // turn everything around for RTL, yay math!
          if (Foundation.rtl() && !this.options.vertical) {
            value = this.options.end - value;
          }

          value = _this._adjustValue(null, value);
          //boolean flag for the setHandlePos fn, specifically for vertical sliders
          hasVal = false;

          if (!$handle) {
            //figure out which handle it is, pass it to the next function.
            var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
                secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
            $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
          }
        } else {
          //change event on input
          value = this._adjustValue(null, val);
          hasVal = true;
        }

        this._setHandlePos($handle, value, hasVal);
      }

      /**
       * Adjustes value for handle in regard to step value. returns adjusted value
       * @function
       * @private
       * @param {jQuery} $handle - the selected handle.
       * @param {Number} value - value to adjust. used if $handle is falsy
       */

    }, {
      key: '_adjustValue',
      value: function _adjustValue($handle, value) {
        var val,
            step = this.options.step,
            div = parseFloat(step / 2),
            left,
            prev_val,
            next_val;
        if (!!$handle) {
          val = parseFloat($handle.attr('aria-valuenow'));
        } else {
          val = value;
        }
        left = val % step;
        prev_val = val - left;
        next_val = prev_val + step;
        if (left === 0) {
          return val;
        }
        val = val >= prev_val + div ? next_val : prev_val;
        return val;
      }

      /**
       * Adds event listeners to the slider elements.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._eventsForHandle(this.$handle);
        if (this.handles[1]) {
          this._eventsForHandle(this.$handle2);
        }
      }

      /**
       * Adds event listeners a particular handle
       * @function
       * @private
       * @param {jQuery} $handle - the current handle to apply listeners to.
       */

    }, {
      key: '_eventsForHandle',
      value: function _eventsForHandle($handle) {
        var _this = this,
            curHandle,
            timer;

        this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
          var idx = _this.inputs.index($(this));
          _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
        });

        if (this.options.clickSelect) {
          this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
            if (_this.$element.data('dragging')) {
              return false;
            }

            if (!$(e.target).is('[data-slider-handle]')) {
              if (_this.options.doubleSided) {
                _this._handleEvent(e);
              } else {
                _this._handleEvent(e, _this.$handle);
              }
            }
          });
        }

        if (this.options.draggable) {
          this.handles.addTouch();

          var $body = $('body');
          $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
            $handle.addClass('is-dragging');
            _this.$fill.addClass('is-dragging'); //
            _this.$element.data('dragging', true);

            curHandle = $(e.currentTarget);

            $body.on('mousemove.zf.slider', function (e) {
              e.preventDefault();
              _this._handleEvent(e, curHandle);
            }).on('mouseup.zf.slider', function (e) {
              _this._handleEvent(e, curHandle);

              $handle.removeClass('is-dragging');
              _this.$fill.removeClass('is-dragging');
              _this.$element.data('dragging', false);

              $body.off('mousemove.zf.slider mouseup.zf.slider');
            });
          })
          // prevent events triggered by touch
          .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
            e.preventDefault();
          });
        }

        $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
          var _$handle = $(this),
              idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
              oldValue = parseFloat(_this.inputs.eq(idx).val()),
              newValue;

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Slider', {
            decrease: function () {
              newValue = oldValue - _this.options.step;
            },
            increase: function () {
              newValue = oldValue + _this.options.step;
            },
            decrease_fast: function () {
              newValue = oldValue - _this.options.step * 10;
            },
            increase_fast: function () {
              newValue = oldValue + _this.options.step * 10;
            },
            handled: function () {
              // only set handle pos when event was handled specially
              e.preventDefault();
              _this._setHandlePos(_$handle, newValue, true);
            }
          });
          /*if (newValue) { // if pressed key has special function, update value
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue);
          }*/
        });
      }

      /**
       * Destroys the slider plugin.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.handles.off('.zf.slider');
        this.inputs.off('.zf.slider');
        this.$element.off('.zf.slider');

        clearTimeout(this.timeout);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Slider;
  }();

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @example 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @example 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @example 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @example 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @example 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @example false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @example true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @example false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @example true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @example false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @example false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @example 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @example 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @example 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @example false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @example 500
     */
    changedDelay: 500,
    /**
    * Basevalue for non-linear sliders
    * @option
    * @example 5
    */
    nonLinearBase: 5,
    /**
    * Basevalue for non-linear sliders, possible values are: 'linear', 'pow' & 'log'. Pow and Log use the nonLinearBase setting.
    * @option
    * @example 'linear'
    */
    positionValueFunction: 'linear'
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }
  function baseLog(base, value) {
    return Math.log(value) / Math.log(base);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var Sticky = function () {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    function Sticky(element, options) {
      _classCallCheck(this, Sticky);

      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */


    _createClass(Sticky, [{
      key: '_init',
      value: function _init() {
        var $parent = this.$element.parent('[data-sticky-container]'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
            _this = this;

        if (!$parent.length) {
          this.wasWrapped = true;
        }
        this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
        this.$container.addClass(this.options.containerClass);

        this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

        this.scrollCount = this.options.checkEvery;
        this.isStuck = false;
        $(window).one('load.zf.sticky', function () {
          //We calculate the container height to have correct values for anchor points offset calculation.
          _this.containerHeight = _this.$element.css("display") == "none" ? 0 : _this.$element[0].getBoundingClientRect().height;
          _this.$container.css('height', _this.containerHeight);
          _this.elemHeight = _this.containerHeight;
          if (_this.options.anchor !== '') {
            _this.$anchor = $('#' + _this.options.anchor);
          } else {
            _this._parsePoints();
          }

          _this._setSizes(function () {
            var scroll = window.pageYOffset;
            _this._calc(false, scroll);
            //Unstick the element will ensure that proper classes are set.
            if (!_this.isStuck) {
              _this._removeSticky(scroll >= _this.topPoint ? false : true);
            }
          });
          _this._events(id.split('-').reverse().join('-'));
        });
      }

      /**
       * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
       * @function
       * @private
       */

    }, {
      key: '_parsePoints',
      value: function _parsePoints() {
        var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
            btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
            pts = [top, btm],
            breaks = {};
        for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
          var pt;
          if (typeof pts[i] === 'number') {
            pt = pts[i];
          } else {
            var place = pts[i].split(':'),
                anchor = $('#' + place[0]);

            pt = anchor.offset().top;
            if (place[1] && place[1].toLowerCase() === 'bottom') {
              pt += anchor[0].getBoundingClientRect().height;
            }
          }
          breaks[i] = pt;
        }

        this.points = breaks;
        return;
      }

      /**
       * Adds event handlers for the scrolling element.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_events',
      value: function _events(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;
        if (this.isOn) {
          return;
        }
        if (this.canStick) {
          this.isOn = true;
          $(window).off(scrollListener).on(scrollListener, function (e) {
            if (_this.scrollCount === 0) {
              _this.scrollCount = _this.options.checkEvery;
              _this._setSizes(function () {
                _this._calc(false, window.pageYOffset);
              });
            } else {
              _this.scrollCount--;
              _this._calc(false, window.pageYOffset);
            }
          });
        }

        this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
          _this._setSizes(function () {
            _this._calc(false);
            if (_this.canStick) {
              if (!_this.isOn) {
                _this._events(id);
              }
            } else if (_this.isOn) {
              _this._pauseListeners(scrollListener);
            }
          });
        });
      }

      /**
       * Removes event handlers for scroll and change events on anchor.
       * @fires Sticky#pause
       * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
       */

    }, {
      key: '_pauseListeners',
      value: function _pauseListeners(scrollListener) {
        this.isOn = false;
        $(window).off(scrollListener);

        /**
         * Fires when the plugin is paused due to resize event shrinking the view.
         * @event Sticky#pause
         * @private
         */
        this.$element.trigger('pause.zf.sticky');
      }

      /**
       * Called on every `scroll` event and on `_init`
       * fires functions based on booleans and cached values
       * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
       * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
       */

    }, {
      key: '_calc',
      value: function _calc(checkSizes, scroll) {
        if (checkSizes) {
          this._setSizes();
        }

        if (!this.canStick) {
          if (this.isStuck) {
            this._removeSticky(true);
          }
          return false;
        }

        if (!scroll) {
          scroll = window.pageYOffset;
        }

        if (scroll >= this.topPoint) {
          if (scroll <= this.bottomPoint) {
            if (!this.isStuck) {
              this._setSticky();
            }
          } else {
            if (this.isStuck) {
              this._removeSticky(false);
            }
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(true);
          }
        }
      }

      /**
       * Causes the $element to become stuck.
       * Adds `position: fixed;`, and helper classes.
       * @fires Sticky#stuckto
       * @function
       * @private
       */

    }, {
      key: '_setSticky',
      value: function _setSticky() {
        var _this = this,
            stickTo = this.options.stickTo,
            mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
            notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
            css = {};

        css[mrgn] = this.options[mrgn] + 'em';
        css[stickTo] = 0;
        css[notStuckTo] = 'auto';
        this.isStuck = true;
        this.$element.removeClass('is-anchored is-at-' + notStuckTo).addClass('is-stuck is-at-' + stickTo).css(css)
        /**
         * Fires when the $element has become `position: fixed;`
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
         * @event Sticky#stuckto
         */
        .trigger('sticky.zf.stuckto:' + stickTo);
        this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
          _this._setSizes();
        });
      }

      /**
       * Causes the $element to become unstuck.
       * Removes `position: fixed;`, and helper classes.
       * Adds other helper classes.
       * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
       * @fires Sticky#unstuckfrom
       * @private
       */

    }, {
      key: '_removeSticky',
      value: function _removeSticky(isTop) {
        var stickTo = this.options.stickTo,
            stickToTop = stickTo === 'top',
            css = {},
            anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
            mrgn = stickToTop ? 'marginTop' : 'marginBottom',
            notStuckTo = stickToTop ? 'bottom' : 'top',
            topOrBottom = isTop ? 'top' : 'bottom';

        css[mrgn] = 0;

        css['bottom'] = 'auto';
        if (isTop) {
          css['top'] = 0;
        } else {
          css['top'] = anchorPt;
        }

        this.isStuck = false;
        this.$element.removeClass('is-stuck is-at-' + stickTo).addClass('is-anchored is-at-' + topOrBottom).css(css)
        /**
         * Fires when the $element has become anchored.
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
         * @event Sticky#unstuckfrom
         */
        .trigger('sticky.zf.unstuckfrom:' + topOrBottom);
      }

      /**
       * Sets the $element and $container sizes for plugin.
       * Calls `_setBreakPoints`.
       * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
       * @private
       */

    }, {
      key: '_setSizes',
      value: function _setSizes(cb) {
        this.canStick = Foundation.MediaQuery.is(this.options.stickyOn);
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          }
        }
        var _this = this,
            newElemWidth = this.$container[0].getBoundingClientRect().width,
            comp = window.getComputedStyle(this.$container[0]),
            pdngl = parseInt(comp['padding-left'], 10),
            pdngr = parseInt(comp['padding-right'], 10);

        if (this.$anchor && this.$anchor.length) {
          this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
        } else {
          this._parsePoints();
        }

        this.$element.css({
          'max-width': newElemWidth - pdngl - pdngr + 'px'
        });

        var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
        if (this.$element.css("display") == "none") {
          newContainerHeight = 0;
        }
        this.containerHeight = newContainerHeight;
        this.$container.css({
          height: newContainerHeight
        });
        this.elemHeight = newContainerHeight;

        if (!this.isStuck) {
          if (this.$element.hasClass('is-at-bottom')) {
            var anchorPt = (this.points ? this.points[1] - this.$container.offset().top : this.anchorHeight) - this.elemHeight;
            this.$element.css('top', anchorPt);
          }
        }

        this._setBreakPoints(newContainerHeight, function () {
          if (cb && typeof cb === 'function') {
            cb();
          }
        });
      }

      /**
       * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
       * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
       * @param {Function} cb - optional callback function to be called on completion.
       * @private
       */

    }, {
      key: '_setBreakPoints',
      value: function _setBreakPoints(elemHeight, cb) {
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          } else {
            return false;
          }
        }
        var mTop = emCalc(this.options.marginTop),
            mBtm = emCalc(this.options.marginBottom),
            topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
            bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

        // topPoint = this.$anchor.offset().top || this.points[0],
        // bottomPoint = topPoint + this.anchorHeight || this.points[1],
        winHeight = window.innerHeight;

        if (this.options.stickTo === 'top') {
          topPoint -= mTop;
          bottomPoint -= elemHeight + mTop;
        } else if (this.options.stickTo === 'bottom') {
          topPoint -= winHeight - (elemHeight + mBtm);
          bottomPoint -= winHeight - mBtm;
        } else {
          //this would be the stickTo: both option... tricky
        }

        this.topPoint = topPoint;
        this.bottomPoint = bottomPoint;

        if (cb && typeof cb === 'function') {
          cb();
        }
      }

      /**
       * Destroys the current sticky element.
       * Resets the element to the top position first.
       * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._removeSticky(true);

        this.$element.removeClass(this.options.stickyClass + ' is-anchored is-at-top').css({
          height: '',
          top: '',
          bottom: '',
          'max-width': ''
        }).off('resizeme.zf.trigger');
        if (this.$anchor && this.$anchor.length) {
          this.$anchor.off('change.zf.sticky');
        }
        $(window).off(this.scrollListener);

        if (this.wasWrapped) {
          this.$element.unwrap();
        } else {
          this.$container.removeClass(this.options.containerClass).css({
            height: ''
          });
        }
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Sticky;
  }();

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @example '&lt;div data-sticky-container class="small-6 columns"&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to.
     * @option
     * @example 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @example 'exampleId'
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @example 'exampleId:top'
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @example 'exampleId:bottom'
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @example 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @example 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @example 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @example 50
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  var Tabs = function () {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Tabs(element, options) {
      _classCallCheck(this, Tabs);

      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */


    _createClass(Tabs, [{
      key: '_init',
      value: function _init() {
        var _this = this;

        this.$element.attr({ 'role': 'tablist' });
        this.$tabTitles = this.$element.find('.' + this.options.linkClass);
        this.$tabContent = $('[data-tabs-content="' + this.$element[0].id + '"]');

        this.$tabTitles.each(function () {
          var $elem = $(this),
              $link = $elem.find('a'),
              isActive = $elem.hasClass('' + _this.options.linkActiveClass),
              hash = $link[0].hash.slice(1),
              linkId = $link[0].id ? $link[0].id : hash + '-label',
              $tabContent = $('#' + hash);

          $elem.attr({ 'role': 'presentation' });

          $link.attr({
            'role': 'tab',
            'aria-controls': hash,
            'aria-selected': isActive,
            'id': linkId
          });

          $tabContent.attr({
            'role': 'tabpanel',
            'aria-hidden': !isActive,
            'aria-labelledby': linkId
          });

          if (isActive && _this.options.autoFocus) {
            $(window).load(function () {
              $('html, body').animate({ scrollTop: $elem.offset().top }, _this.options.deepLinkSmudgeDelay, function () {
                $link.focus();
              });
            });
          }

          //use browser to open a tab, if it exists in this tabset
          if (_this.options.deepLink) {
            var anchor = window.location.hash;
            //need a hash and a relevant anchor in this tabset
            if (anchor.length) {
              var $link = $elem.find('[href="' + anchor + '"]');
              if ($link.length) {
                _this.selectTab($(anchor));

                //roll up a little to show the titles
                if (_this.options.deepLinkSmudge) {
                  $(window).load(function () {
                    var offset = $elem.offset();
                    $('html, body').animate({ scrollTop: offset.top }, _this.options.deepLinkSmudgeDelay);
                  });
                }

                /**
                  * Fires when the zplugin has deeplinked at pageload
                  * @event Tabs#deeplink
                  */
                $elem.trigger('deeplink.zf.tabs', [$link, $(anchor)]);
              }
            }
          }
        });

        if (this.options.matchHeight) {
          var $images = this.$tabContent.find('img');

          if ($images.length) {
            Foundation.onImagesLoaded($images, this._setHeight.bind(this));
          } else {
            this._setHeight();
          }
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._addKeyHandler();
        this._addClickHandler();
        this._setHeightMqHandler = null;

        if (this.options.matchHeight) {
          this._setHeightMqHandler = this._setHeight.bind(this);

          $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      /**
       * Adds click handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addClickHandler',
      value: function _addClickHandler() {
        var _this = this;

        this.$element.off('click.zf.tabs').on('click.zf.tabs', '.' + this.options.linkClass, function (e) {
          e.preventDefault();
          e.stopPropagation();
          _this._handleTabChange($(this));
        });
      }

      /**
       * Adds keyboard event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addKeyHandler',
      value: function _addKeyHandler() {
        var _this = this;

        this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
          if (e.which === 9) return;

          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              if (_this.options.wrapOnKeys) {
                $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
                $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
              } else {
                $prevElement = $elements.eq(Math.max(0, i - 1));
                $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              }
              return;
            }
          });

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Tabs', {
            open: function () {
              $element.find('[role="tab"]').focus();
              _this._handleTabChange($element);
            },
            previous: function () {
              $prevElement.find('[role="tab"]').focus();
              _this._handleTabChange($prevElement);
            },
            next: function () {
              $nextElement.find('[role="tab"]').focus();
              _this._handleTabChange($nextElement);
            },
            handled: function () {
              e.stopPropagation();
              e.preventDefault();
            }
          });
        });
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`. Collapses active tab.
       * @param {jQuery} $target - Tab to open.
       * @fires Tabs#change
       * @function
       */

    }, {
      key: '_handleTabChange',
      value: function _handleTabChange($target) {

        /**
         * Check for active class on target. Collapse if exists.
         */
        if ($target.hasClass('' + this.options.linkActiveClass)) {
          if (this.options.activeCollapse) {
            this._collapseTab($target);

            /**
             * Fires when the zplugin has successfully collapsed tabs.
             * @event Tabs#collapse
             */
            this.$element.trigger('collapse.zf.tabs', [$target]);
          }
          return;
        }

        var $oldTab = this.$element.find('.' + this.options.linkClass + '.' + this.options.linkActiveClass),
            $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        //close old tab
        this._collapseTab($oldTab);

        //open new tab
        this._openTab($target);

        //either replace or update browser history
        if (this.options.deepLink) {
          var anchor = $target.find('a').attr('href');

          if (this.options.updateHistory) {
            history.pushState({}, '', anchor);
          } else {
            history.replaceState({}, '', anchor);
          }
        }

        /**
         * Fires when the plugin has successfully changed tabs.
         * @event Tabs#change
         */
        this.$element.trigger('change.zf.tabs', [$target, $targetContent]);

        //fire to children a mutation event
        $targetContent.find("[data-mutate]").trigger("mutateme.zf.trigger");
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_openTab',
      value: function _openTab($target) {
        var $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        $target.addClass('' + this.options.linkActiveClass);

        $tabLink.attr({ 'aria-selected': 'true' });

        $targetContent.addClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'false' });
      }

      /**
       * Collapses `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_collapseTab',
      value: function _collapseTab($target) {
        var $target_anchor = $target.removeClass('' + this.options.linkActiveClass).find('[role="tab"]').attr({ 'aria-selected': 'false' });

        $('#' + $target_anchor.attr('aria-controls')).removeClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'true' });
      }

      /**
       * Public method for selecting a content pane to display.
       * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
       * @function
       */

    }, {
      key: 'selectTab',
      value: function selectTab(elem) {
        var idStr;

        if (typeof elem === 'object') {
          idStr = elem[0].id;
        } else {
          idStr = elem;
        }

        if (idStr.indexOf('#') < 0) {
          idStr = '#' + idStr;
        }

        var $target = this.$tabTitles.find('[href="' + idStr + '"]').parent('.' + this.options.linkClass);

        this._handleTabChange($target);
      }
    }, {
      key: '_setHeight',

      /**
       * Sets the height of each panel to the height of the tallest panel.
       * If enabled in options, gets called on media query change.
       * If loading content via external source, can be called directly or with _reflow.
       * @function
       * @private
       */
      value: function _setHeight() {
        var max = 0;
        this.$tabContent.find('.' + this.options.panelClass).css('height', '').each(function () {
          var panel = $(this),
              isActive = panel.hasClass('' + this.options.panelActiveClass);

          if (!isActive) {
            panel.css({ 'visibility': 'hidden', 'display': 'block' });
          }

          var temp = this.getBoundingClientRect().height;

          if (!isActive) {
            panel.css({
              'visibility': '',
              'display': ''
            });
          }

          max = temp > max ? temp : max;
        }).css('height', max + 'px');
      }

      /**
       * Destroys an instance of an tabs.
       * @fires Tabs#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('.' + this.options.linkClass).off('.zf.tabs').hide().end().find('.' + this.options.panelClass).hide();

        if (this.options.matchHeight) {
          if (this._setHeightMqHandler != null) {
            $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
          }
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tabs;
  }();

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of pane specified by hash anchor
     * @option
     * @example false
     */
    deepLink: false,

    /**
     * Adjust the deep link scroll to make sure the top of the tab panel is visible
     * @option
     * @example false
     */
    deepLinkSmudge: false,

    /**
     * Animation time (ms) for the deep link adjustment
     * @option
     * @example 300
     */
    deepLinkSmudgeDelay: 300,

    /**
     * Update the browser history with the open tab
     * @option
     * @example false
     */
    updateHistory: false,

    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * Not recommended if more than one tab panel per page.
     * @option
     * @example false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @example true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @example false
     */
    matchHeight: false,

    /**
     * Allows active tabs to collapse when clicked.
     * @option
     * @example false
     */
    activeCollapse: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @example 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the active `li` in tab link list.
     * @option
     * @example 'is-active'
     */
    linkActiveClass: 'is-active',

    /**
     * Class applied to the content containers.
     * @option
     * @example 'tabs-panel'
     */
    panelClass: 'tabs-panel',

    /**
     * Class applied to the active content container.
     * @option
     * @example 'is-active'
     */
    panelActiveClass: 'is-active'
  };

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  var Toggler = function () {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Toggler(element, options) {
      _classCallCheck(this, Toggler);

      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */


    _createClass(Toggler, [{
      key: '_init',
      value: function _init() {
        var input;
        // Parse animation classes if they were set
        if (this.options.animate) {
          input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }
        // Otherwise, parse toggle class
        else {
            input = this.$element.data('toggler');
            // Allow for a . at the beginning of the string
            this.className = input[0] === '.' ? input.slice(1) : input;
          }

        // Add ARIA attributes to triggers
        var id = this.$element[0].id;
        $('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-controls', id);
        // If the target is hidden, add aria-hidden
        this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
      }

      /**
       * Initializes events for the toggle trigger.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
      }

      /**
       * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
       * @function
       * @fires Toggler#on
       * @fires Toggler#off
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
      }
    }, {
      key: '_toggleClass',
      value: function _toggleClass() {
        this.$element.toggleClass(this.className);

        var isOn = this.$element.hasClass(this.className);
        if (isOn) {
          /**
           * Fires if the target element has the class after a toggle.
           * @event Toggler#on
           */
          this.$element.trigger('on.zf.toggler');
        } else {
          /**
           * Fires if the target element does not have the class after a toggle.
           * @event Toggler#off
           */
          this.$element.trigger('off.zf.toggler');
        }

        this._updateARIA(isOn);
        this.$element.find('[data-mutate]').trigger('mutateme.zf.trigger');
      }
    }, {
      key: '_toggleAnimate',
      value: function _toggleAnimate() {
        var _this = this;

        if (this.$element.is(':hidden')) {
          Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
            _this._updateARIA(true);
            this.trigger('on.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        } else {
          Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
            _this._updateARIA(false);
            this.trigger('off.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        }
      }
    }, {
      key: '_updateARIA',
      value: function _updateARIA(isOn) {
        this.$element.attr('aria-expanded', isOn ? true : false);
      }

      /**
       * Destroys the instance of Toggler on the element.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.toggler');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Toggler;
  }();

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   */

  var Tooltip = function () {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    function Tooltip(element, options) {
      _classCallCheck(this, Tooltip);

      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */


    _createClass(Tooltip, [{
      key: '_init',
      value: function _init() {
        var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

        this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
        this.options.tipText = this.options.tipText || this.$element.attr('title');
        this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

        if (this.options.allowHtml) {
          this.template.appendTo(document.body).html(this.options.tipText).hide();
        } else {
          this.template.appendTo(document.body).text(this.options.tipText).hide();
        }

        this.$element.attr({
          'title': '',
          'aria-describedby': elemId,
          'data-yeti-box': elemId,
          'data-toggle': elemId,
          'data-resize': elemId
        }).addClass(this.options.triggerClass);

        //helper variables to track movement on collisions
        this.usedPositions = [];
        this.counter = 4;
        this.classChanged = false;

        this._events();
      }

      /**
       * Grabs the current positioning class, if present, and returns the value or an empty string.
       * @private
       */

    }, {
      key: '_getPositionClass',
      value: function _getPositionClass(element) {
        if (!element) {
          return '';
        }
        // var position = element.attr('class').match(/top|left|right/g);
        var position = element[0].className.match(/\b(top|left|right)\b/g);
        position = position ? position[0] : '';
        return position;
      }
    }, {
      key: '_buildTemplate',

      /**
       * builds the tooltip element, adds attributes, and returns the template.
       * @private
       */
      value: function _buildTemplate(id) {
        var templateClasses = (this.options.tooltipClass + ' ' + this.options.positionClass + ' ' + this.options.templateClasses).trim();
        var $template = $('<div></div>').addClass(templateClasses).attr({
          'role': 'tooltip',
          'aria-hidden': true,
          'data-is-active': false,
          'data-is-focus': false,
          'id': id
        });
        return $template;
      }

      /**
       * Function that gets called if a collision event is detected.
       * @param {String} position - positioning class to try
       * @private
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');

        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.template.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.template.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.template.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
       * if the tooltip is larger than the screen width, default to full width - any user selected margin
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        var position = this._getPositionClass(this.template),
            $tipDims = Foundation.Box.GetDimensions(this.template),
            $anchorDims = Foundation.Box.GetDimensions(this.$element),
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
            _this = this;

        if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
          this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          return false;
        }

        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * reveals the tooltip, and fires an event to close any other open tooltips on the page
       * @fires Tooltip#closeme
       * @fires Tooltip#show
       * @function
       */

    }, {
      key: 'show',
      value: function show() {
        if (this.options.showOn !== 'all' && !Foundation.MediaQuery.is(this.options.showOn)) {
          // console.error('The screen is too small to display this tooltip');
          return false;
        }

        var _this = this;
        this.template.css('visibility', 'hidden').show();
        this._setPosition();

        /**
         * Fires to close all other open tooltips on the page
         * @event Closeme#tooltip
         */
        this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

        this.template.attr({
          'data-is-active': true,
          'aria-hidden': false
        });
        _this.isActive = true;
        // console.log(this.template);
        this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
          //maybe do stuff?
        });
        /**
         * Fires when the tooltip is shown
         * @event Tooltip#show
         */
        this.$element.trigger('show.zf.tooltip');
      }

      /**
       * Hides the current tooltip, and resets the positioning class if it was changed due to collision
       * @fires Tooltip#hide
       * @function
       */

    }, {
      key: 'hide',
      value: function hide() {
        // console.log('hiding', this.$element.data('yeti-box'));
        var _this = this;
        this.template.stop().attr({
          'aria-hidden': true,
          'data-is-active': false
        }).fadeOut(this.options.fadeOutDuration, function () {
          _this.isActive = false;
          _this.isClick = false;
          if (_this.classChanged) {
            _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

            _this.usedPositions = [];
            _this.counter = 4;
            _this.classChanged = false;
          }
        });
        /**
         * fires when the tooltip is hidden
         * @event Tooltip#hide
         */
        this.$element.trigger('hide.zf.tooltip');
      }

      /**
       * adds event listeners for the tooltip and its anchor
       * TODO combine some of the listeners like focus and mouseenter, etc.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        var $template = this.template;
        var isFocus = false;

        if (!this.options.disableHover) {

          this.$element.on('mouseenter.zf.tooltip', function (e) {
            if (!_this.isActive) {
              _this.timeout = setTimeout(function () {
                _this.show();
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.tooltip', function (e) {
            clearTimeout(_this.timeout);
            if (!isFocus || _this.isClick && !_this.options.clickOpen) {
              _this.hide();
            }
          });
        }

        if (this.options.clickOpen) {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            if (_this.isClick) {
              //_this.hide();
              // _this.isClick = false;
            } else {
              _this.isClick = true;
              if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
                _this.show();
              }
            }
          });
        } else {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            _this.isClick = true;
          });
        }

        if (!this.options.disableForTouch) {
          this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
            _this.isActive ? _this.hide() : _this.show();
          });
        }

        this.$element.on({
          // 'toggle.zf.trigger': this.toggle.bind(this),
          // 'close.zf.trigger': this.hide.bind(this)
          'close.zf.trigger': this.hide.bind(this)
        });

        this.$element.on('focus.zf.tooltip', function (e) {
          isFocus = true;
          if (_this.isClick) {
            // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
            // a real focus, otherwise on hover and come back we get bad behavior
            if (!_this.options.clickOpen) {
              isFocus = false;
            }
            return false;
          } else {
            _this.show();
          }
        }).on('focusout.zf.tooltip', function (e) {
          isFocus = false;
          _this.isClick = false;
          _this.hide();
        }).on('resizeme.zf.trigger', function () {
          if (_this.isActive) {
            _this._setPosition();
          }
        });
      }

      /**
       * adds a toggle method, in addition to the static show() & hide() functions
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.hide();
        } else {
          this.show();
        }
      }

      /**
       * Destroys an instance of tooltip, removes template element from the view.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tooltip').removeClass('has-tip top right left').removeAttr('aria-describedby aria-haspopup data-disable-hover data-resize data-toggle data-tooltip data-yeti-box');

        this.template.remove();

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tooltip;
  }();

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @example 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @example 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @example 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @example 'my-cool-tip-class'
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @example 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @example 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @example 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @example '&lt;div class="tooltip"&gt;&lt;/div&gt;'
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @example 'Some cool space fact here.'
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @example true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @example 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @example 12
     */
    hOffset: 12,
    /**
    * Allow HTML in tooltip. Warning: If you are loading user-generated content into tooltips,
    * allowing HTML may open yourself up to XSS attacks.
    * @option
    * @example false
    */
    allowHtml: false
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveAccordionTabs module.
   * @module foundation.responsiveAccordionTabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.motion
   * @requires foundation.accordion
   * @requires foundation.tabs
   */

  var ResponsiveAccordionTabs = function () {
    /**
     * Creates a new instance of a responsive accordion tabs.
     * @class
     * @fires ResponsiveAccordionTabs#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveAccordionTabs(element, options) {
      _classCallCheck(this, ResponsiveAccordionTabs);

      this.$element = $(element);
      this.options = $.extend({}, this.$element.data(), options);
      this.rules = this.$element.data('responsive-accordion-tabs');
      this.currentMq = null;
      this.currentPlugin = null;
      if (!this.$element.attr('id')) {
        this.$element.attr('id', Foundation.GetYoDigits(6, 'responsiveaccordiontabs'));
      };

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveAccordionTabs');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-responsive-accordion-tabs' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveAccordionTabs, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        this._getAllOptions();

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
      }
    }, {
      key: '_getAllOptions',
      value: function _getAllOptions() {
        //get all defaults and options
        var _this = this;
        _this.allOptions = {};
        for (var key in MenuPlugins) {
          if (MenuPlugins.hasOwnProperty(key)) {
            var obj = MenuPlugins[key];
            try {
              var dummyPlugin = $('<ul></ul>');
              var tmpPlugin = new obj.plugin(dummyPlugin, _this.options);
              for (var keyKey in tmpPlugin.options) {
                if (tmpPlugin.options.hasOwnProperty(keyKey) && keyKey !== 'zfPlugin') {
                  var objObj = tmpPlugin.options[keyKey];
                  _this.allOptions[keyKey] = objObj;
                }
              }
              tmpPlugin.destroy();
            } catch (e) {}
          }
        }
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) {
          //don't know why but on nested elements data zfPlugin get's lost
          if (!this.currentPlugin.$element.data('zfPlugin') && this.storezfData) this.currentPlugin.$element.data('zfPlugin', this.storezfData);
          this.currentPlugin.destroy();
        }
        this._handleMarkup(this.rules[matchedMq].cssClass);
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
        this.storezfData = this.currentPlugin.$element.data('zfPlugin');
      }
    }, {
      key: '_handleMarkup',
      value: function _handleMarkup(toSet) {
        var _this = this,
            fromString = 'accordion';
        var $panels = $('[data-tabs-content=' + this.$element.attr('id') + ']');
        if ($panels.length) fromString = 'tabs';
        if (fromString === toSet) {
          return;
        };

        var tabsTitle = _this.allOptions.linkClass ? _this.allOptions.linkClass : 'tabs-title';
        var tabsPanel = _this.allOptions.panelClass ? _this.allOptions.panelClass : 'tabs-panel';

        this.$element.removeAttr('role');
        var $liHeads = this.$element.children('.' + tabsTitle + ',[data-accordion-item]').removeClass(tabsTitle).removeClass('accordion-item').removeAttr('data-accordion-item');
        var $liHeadsA = $liHeads.children('a').removeClass('accordion-title');

        if (fromString === 'tabs') {
          $panels = $panels.children('.' + tabsPanel).removeClass(tabsPanel).removeAttr('role').removeAttr('aria-hidden').removeAttr('aria-labelledby');
          $panels.children('a').removeAttr('role').removeAttr('aria-controls').removeAttr('aria-selected');
        } else {
          $panels = $liHeads.children('[data-tab-content]').removeClass('accordion-content');
        };

        $panels.css({ display: '', visibility: '' });
        $liHeads.css({ display: '', visibility: '' });
        if (toSet === 'accordion') {
          $panels.each(function (key, value) {
            $(value).appendTo($liHeads.get(key)).addClass('accordion-content').attr('data-tab-content', '').removeClass('is-active').css({ height: '' });
            $('[data-tabs-content=' + _this.$element.attr('id') + ']').after('<div id="tabs-placeholder-' + _this.$element.attr('id') + '"></div>').remove();
            $liHeads.addClass('accordion-item').attr('data-accordion-item', '');
            $liHeadsA.addClass('accordion-title');
          });
        } else if (toSet === 'tabs') {
          var $tabsContent = $('[data-tabs-content=' + _this.$element.attr('id') + ']');
          var $placeholder = $('#tabs-placeholder-' + _this.$element.attr('id'));
          if ($placeholder.length) {
            $tabsContent = $('<div class="tabs-content"></div>').insertAfter($placeholder).attr('data-tabs-content', _this.$element.attr('id'));
            $placeholder.remove();
          } else {
            $tabsContent = $('<div class="tabs-content"></div>').insertAfter(_this.$element).attr('data-tabs-content', _this.$element.attr('id'));
          };
          $panels.each(function (key, value) {
            var tempValue = $(value).appendTo($tabsContent).addClass(tabsPanel);
            var hash = $liHeadsA.get(key).hash.slice(1);
            var id = $(value).attr('id') || Foundation.GetYoDigits(6, 'accordion');
            if (hash !== id) {
              if (hash !== '') {
                $(value).attr('id', hash);
              } else {
                hash = id;
                $(value).attr('id', hash);
                $($liHeadsA.get(key)).attr('href', $($liHeadsA.get(key)).attr('href').replace('#', '') + '#' + hash);
              };
            };
            var isActive = $($liHeads.get(key)).hasClass('is-active');
            if (isActive) {
              tempValue.addClass('is-active');
            };
          });
          $liHeads.addClass(tabsTitle);
        };
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        if (this.currentPlugin) this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveAccordionTabs');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveAccordionTabs;
  }();

  ResponsiveAccordionTabs.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    tabs: {
      cssClass: 'tabs',
      plugin: Foundation._plugins.tabs || null
    },
    accordion: {
      cssClass: 'accordion',
      plugin: Foundation._plugins.accordion || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveAccordionTabs, 'ResponsiveAccordionTabs');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;'use strict';

// gForms validation
(function ($) {
	if ($('.gform_wrapper').length) {
		var $body = $('body');
		$body.on('click', 'input,textarea', function () {
			hideErrors($(this));
		});
		$body.on('click', '.validation_message', function () {
			$(this).hide();
			hideErrors($(this));
		});
	}
	function hideErrors($el) {
		$el.closest('li.gfield_error').removeClass('gfield_error');
		$el.closest('div.ginput_container').next('div.validation_message').hide();
	}
})(jQuery);
;"use strict";

jQuery(document).foundation();
;'use strict';

/* Sticky Footer */

(function ($) {

  var $footer = $('#footer-container'); // only search once

  $(window).bind('load resize orientationChange', function () {

    var pos = $footer.position(),
        height = $(window).height() - pos.top - ($footer.height() - 1);

    if (height > 0) {
      $footer.css('margin-top', height);
    }
  });
})(jQuery);
;"use strict";
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwiZm91bmRhdGlvbi5hYmlkZS5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uLmpzIiwiZm91bmRhdGlvbi5hY2NvcmRpb25NZW51LmpzIiwiZm91bmRhdGlvbi5kcmlsbGRvd24uanMiLCJmb3VuZGF0aW9uLmRyb3Bkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bk1lbnUuanMiLCJmb3VuZGF0aW9uLmVxdWFsaXplci5qcyIsImZvdW5kYXRpb24uaW50ZXJjaGFuZ2UuanMiLCJmb3VuZGF0aW9uLm1hZ2VsbGFuLmpzIiwiZm91bmRhdGlvbi5vZmZjYW52YXMuanMiLCJmb3VuZGF0aW9uLm9yYml0LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudS5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZS5qcyIsImZvdW5kYXRpb24ucmV2ZWFsLmpzIiwiZm91bmRhdGlvbi5zbGlkZXIuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsImZvdW5kYXRpb24uemYucmVzcG9uc2l2ZUFjY29yZGlvblRhYnMuanMiLCJtb3Rpb24tdWkuanMiLCJnZm9ybXMuanMiLCJpbml0LWZvdW5kYXRpb24uanMiLCJzdGlja3lmb290ZXIuanMiLCJjdXN0b20uanMiXSwibmFtZXMiOlsiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ0b0xvd2VyQ2FzZSIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJwdXNoIiwidW5yZWdpc3RlclBsdWdpbiIsInNwbGljZSIsImluZGV4T2YiLCJyZW1vdmVBdHRyIiwicmVtb3ZlRGF0YSIsInByb3AiLCJyZUluaXQiLCJwbHVnaW5zIiwiaXNKUSIsImVhY2giLCJfaW5pdCIsInR5cGUiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJrZXlzIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJlbmQiLCJ0Iiwic3R5bGUiLCJzZXRUaW1lb3V0IiwidHJpZ2dlckhhbmRsZXIiLCJ1dGlsIiwidGhyb3R0bGUiLCJmdW5jIiwiZGVsYXkiLCJ0aW1lciIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwicGx1Z0NsYXNzIiwidW5kZWZpbmVkIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJ3aW5kb3ciLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwiY2xlYXJUaW1lb3V0IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0IiwiYm9keSIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiZXZlbnQiLCJrZXkiLCJ3aGljaCIsImtleUNvZGUiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJ0cmFwRm9jdXMiLCIkZm9jdXNhYmxlIiwiJGZpcnN0Rm9jdXNhYmxlIiwiZXEiLCIkbGFzdEZvY3VzYWJsZSIsIm9uIiwidGFyZ2V0IiwicHJldmVudERlZmF1bHQiLCJmb2N1cyIsInJlbGVhc2VGb2N1cyIsIm9mZiIsImtjcyIsImsiLCJrYyIsImRlZmF1bHRRdWVyaWVzIiwibGFuZHNjYXBlIiwicG9ydHJhaXQiLCJyZXRpbmEiLCJxdWVyaWVzIiwiY3VycmVudCIsInNlbGYiLCJleHRyYWN0ZWRTdHlsZXMiLCJjc3MiLCJuYW1lZFF1ZXJpZXMiLCJwYXJzZVN0eWxlVG9PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsInZhbHVlIiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwibmV3U2l6ZSIsImN1cnJlbnRTaXplIiwic3R5bGVNZWRpYSIsIm1lZGlhIiwic2NyaXB0IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJpbmZvIiwiaWQiLCJpbnNlcnRCZWZvcmUiLCJnZXRDb21wdXRlZFN0eWxlIiwiY3VycmVudFN0eWxlIiwibWF0Y2hNZWRpdW0iLCJ0ZXh0Iiwic3R5bGVTaGVldCIsImNzc1RleHQiLCJ0ZXh0Q29udGVudCIsInN0eWxlT2JqZWN0IiwicmVkdWNlIiwicmV0IiwicGFyYW0iLCJwYXJ0cyIsInZhbCIsImRlY29kZVVSSUNvbXBvbmVudCIsImlzQXJyYXkiLCJpbml0Q2xhc3NlcyIsImFjdGl2ZUNsYXNzZXMiLCJNb3Rpb24iLCJhbmltYXRlSW4iLCJhbmltYXRpb24iLCJjYiIsImFuaW1hdGUiLCJhbmltYXRlT3V0IiwiTW92ZSIsImR1cmF0aW9uIiwiYW5pbSIsInByb2ciLCJtb3ZlIiwidHMiLCJpc0luIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwicmVhZHlTdGF0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwic3JjIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsIm1vdmVUaHJlc2hvbGQiLCJ0aW1lVGhyZXNob2xkIiwic3RhcnRQb3NYIiwic3RhcnRQb3NZIiwic3RhcnRUaW1lIiwiZWxhcHNlZFRpbWUiLCJpc01vdmluZyIsIm9uVG91Y2hFbmQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib25Ub3VjaE1vdmUiLCJ4IiwidG91Y2hlcyIsInBhZ2VYIiwieSIsInBhZ2VZIiwiZHgiLCJkeSIsImRpciIsImFicyIsIm9uVG91Y2hTdGFydCIsImFkZEV2ZW50TGlzdGVuZXIiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJjaGVja0xpc3RlbmVycyIsImV2ZW50c0xpc3RlbmVyIiwicmVzaXplTGlzdGVuZXIiLCJzY3JvbGxMaXN0ZW5lciIsIm11dGF0ZUxpc3RlbmVyIiwiY2xvc2VtZUxpc3RlbmVyIiwieWV0aUJveGVzIiwicGx1Z05hbWVzIiwibGlzdGVuZXJzIiwiam9pbiIsInBsdWdpbklkIiwibm90IiwiZGVib3VuY2UiLCIkbm9kZXMiLCJub2RlcyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uIiwibXV0YXRpb25SZWNvcmRzTGlzdCIsIiR0YXJnZXQiLCJhdHRyaWJ1dGVOYW1lIiwiY2xvc2VzdCIsImVsZW1lbnRPYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVzIiwiY2hpbGRMaXN0IiwiY2hhcmFjdGVyRGF0YSIsInN1YnRyZWUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJJSGVhcllvdSIsIkFiaWRlIiwiZGVmYXVsdHMiLCIkaW5wdXRzIiwiX2V2ZW50cyIsInJlc2V0Rm9ybSIsInZhbGlkYXRlRm9ybSIsInZhbGlkYXRlT24iLCJ2YWxpZGF0ZUlucHV0IiwibGl2ZVZhbGlkYXRlIiwidmFsaWRhdGVPbkJsdXIiLCJpc0dvb2QiLCJjaGVja2VkIiwiJGVycm9yIiwic2libGluZ3MiLCJmb3JtRXJyb3JTZWxlY3RvciIsIiRsYWJlbCIsIiRlbHMiLCJsYWJlbHMiLCJmaW5kTGFiZWwiLCIkZm9ybUVycm9yIiwiZmluZEZvcm1FcnJvciIsImxhYmVsRXJyb3JDbGFzcyIsImZvcm1FcnJvckNsYXNzIiwiaW5wdXRFcnJvckNsYXNzIiwiZ3JvdXBOYW1lIiwiJGxhYmVscyIsImZpbmRSYWRpb0xhYmVscyIsIiRmb3JtRXJyb3JzIiwicmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMiLCJjbGVhclJlcXVpcmUiLCJyZXF1aXJlZENoZWNrIiwidmFsaWRhdGVkIiwiY3VzdG9tVmFsaWRhdG9yIiwidmFsaWRhdG9yIiwiZXF1YWxUbyIsInZhbGlkYXRlUmFkaW8iLCJ2YWxpZGF0ZVRleHQiLCJtYXRjaFZhbGlkYXRpb24iLCJ2YWxpZGF0b3JzIiwiZ29vZFRvR28iLCJtZXNzYWdlIiwiZGVwZW5kZW50RWxlbWVudHMiLCJhY2MiLCJub0Vycm9yIiwicGF0dGVybiIsImlucHV0VGV4dCIsInZhbGlkIiwicGF0dGVybnMiLCJSZWdFeHAiLCIkZ3JvdXAiLCJyZXF1aXJlZCIsImNsZWFyIiwidiIsIiRmb3JtIiwicmVtb3ZlRXJyb3JDbGFzc2VzIiwiYWxwaGEiLCJhbHBoYV9udW1lcmljIiwiaW50ZWdlciIsIm51bWJlciIsImNhcmQiLCJjdnYiLCJlbWFpbCIsInVybCIsImRvbWFpbiIsImRhdGV0aW1lIiwiZGF0ZSIsInRpbWUiLCJkYXRlSVNPIiwibW9udGhfZGF5X3llYXIiLCJkYXlfbW9udGhfeWVhciIsImNvbG9yIiwiQWNjb3JkaW9uIiwiJHRhYnMiLCJpZHgiLCIkY29udGVudCIsImxpbmtJZCIsIiRpbml0QWN0aXZlIiwiZG93biIsIiR0YWJDb250ZW50IiwidG9nZ2xlIiwibmV4dCIsIiRhIiwibXVsdGlFeHBhbmQiLCJwcmV2aW91cyIsInByZXYiLCJoYXNDbGFzcyIsInVwIiwiZmlyc3RUaW1lIiwiJGN1cnJlbnRBY3RpdmUiLCJzbGlkZURvd24iLCJzbGlkZVNwZWVkIiwiJGF1bnRzIiwiYWxsb3dBbGxDbG9zZWQiLCJzbGlkZVVwIiwic3RvcCIsIkFjY29yZGlvbk1lbnUiLCJtdWx0aU9wZW4iLCIkbWVudUxpbmtzIiwic3ViSWQiLCJpc0FjdGl2ZSIsImluaXRQYW5lcyIsIiRzdWJtZW51IiwiJGVsZW1lbnRzIiwiJHByZXZFbGVtZW50IiwiJG5leHRFbGVtZW50IiwibWluIiwicGFyZW50cyIsIm9wZW4iLCJjbG9zZSIsImNsb3NlQWxsIiwiaGlkZUFsbCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsInBhcmVudHNVbnRpbCIsImFkZCIsIiRtZW51cyIsIkRyaWxsZG93biIsIiRzdWJtZW51QW5jaG9ycyIsIiRzdWJtZW51cyIsIiRtZW51SXRlbXMiLCJfcHJlcGFyZU1lbnUiLCJfcmVnaXN0ZXJFdmVudHMiLCJfa2V5Ym9hcmRFdmVudHMiLCIkbGluayIsInBhcmVudExpbmsiLCJjbG9uZSIsInByZXBlbmRUbyIsIndyYXAiLCIkbWVudSIsIiRiYWNrIiwiYmFja0J1dHRvblBvc2l0aW9uIiwiYXBwZW5kIiwiYmFja0J1dHRvbiIsInByZXBlbmQiLCJfYmFjayIsImF1dG9IZWlnaHQiLCIkd3JhcHBlciIsIndyYXBwZXIiLCJhbmltYXRlSGVpZ2h0IiwiX2dldE1heERpbXMiLCJfc2hvdyIsImNsb3NlT25DbGljayIsIiRib2R5IiwiY29udGFpbnMiLCJfaGlkZUFsbCIsIl9yZXNpemUiLCJzY3JvbGxUb3AiLCJfYmluZEhhbmRsZXIiLCJfc2Nyb2xsVG9wIiwiJHNjcm9sbFRvcEVsZW1lbnQiLCJzY3JvbGxUb3BFbGVtZW50Iiwic2Nyb2xsUG9zIiwicGFyc2VJbnQiLCJzY3JvbGxUb3BPZmZzZXQiLCJhbmltYXRpb25EdXJhdGlvbiIsImFuaW1hdGlvbkVhc2luZyIsIl9oaWRlIiwicGFyZW50U3ViTWVudSIsImJsdXIiLCJtYXhIZWlnaHQiLCJyZXN1bHQiLCJudW1PZkVsZW1zIiwidW53cmFwIiwicmVtb3ZlIiwiRHJvcGRvd24iLCIkaWQiLCIkYW5jaG9yIiwicGFyZW50Q2xhc3MiLCIkcGFyZW50IiwicG9zaXRpb25DbGFzcyIsImdldFBvc2l0aW9uQ2xhc3MiLCJjb3VudGVyIiwidXNlZFBvc2l0aW9ucyIsInZlcnRpY2FsUG9zaXRpb24iLCJtYXRjaCIsImhvcml6b250YWxQb3NpdGlvbiIsImNsYXNzQ2hhbmdlZCIsImRpcmVjdGlvbiIsIm5ld1dpZHRoIiwicGFyZW50SE9mZnNldCIsIiRwYXJlbnREaW1zIiwiX3JlcG9zaXRpb24iLCJfc2V0UG9zaXRpb24iLCJob3ZlciIsImJvZHlEYXRhIiwid2hhdGlucHV0IiwidGltZW91dCIsImhvdmVyRGVsYXkiLCJob3ZlclBhbmUiLCJ2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMiLCJhdXRvRm9jdXMiLCJfYWRkQm9keUhhbmRsZXIiLCJjdXJQb3NpdGlvbkNsYXNzIiwiRHJvcGRvd25NZW51Iiwic3VicyIsInZlcnRpY2FsQ2xhc3MiLCJyaWdodENsYXNzIiwiYWxpZ25tZW50IiwiY2hhbmdlZCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiY2xvc2VPbkNsaWNrSW5zaWRlIiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIl9pc1ZlcnRpY2FsIiwiJHNpYnMiLCJvbGRDbGFzcyIsIiRwYXJlbnRMaSIsIiR0b0Nsb3NlIiwic29tZXRoaW5nVG9DbG9zZSIsIkVxdWFsaXplciIsImVxSWQiLCIkd2F0Y2hlZCIsImhhc05lc3RlZCIsImlzTmVzdGVkIiwiaXNPbiIsIm9uUmVzaXplTWVCb3VuZCIsIl9vblJlc2l6ZU1lIiwib25Qb3N0RXF1YWxpemVkQm91bmQiLCJfb25Qb3N0RXF1YWxpemVkIiwiaW1ncyIsInRvb1NtYWxsIiwiZXF1YWxpemVPbiIsIl9jaGVja01RIiwiX3JlZmxvdyIsIl9wYXVzZUV2ZW50cyIsImVxdWFsaXplT25TdGFjayIsIl9pc1N0YWNrZWQiLCJlcXVhbGl6ZUJ5Um93IiwiZ2V0SGVpZ2h0c0J5Um93IiwiYXBwbHlIZWlnaHRCeVJvdyIsImdldEhlaWdodHMiLCJhcHBseUhlaWdodCIsImhlaWdodHMiLCJsZW4iLCJvZmZzZXRIZWlnaHQiLCJsYXN0RWxUb3BPZmZzZXQiLCJncm91cHMiLCJncm91cCIsImVsT2Zmc2V0VG9wIiwiaiIsImxuIiwiZ3JvdXBzSUxlbmd0aCIsImxlbkoiLCJJbnRlcmNoYW5nZSIsInJ1bGVzIiwiY3VycmVudFBhdGgiLCJfYWRkQnJlYWtwb2ludHMiLCJfZ2VuZXJhdGVSdWxlcyIsInJ1bGUiLCJwYXRoIiwiU1BFQ0lBTF9RVUVSSUVTIiwicnVsZXNMaXN0Iiwibm9kZU5hbWUiLCJyZXNwb25zZSIsImh0bWwiLCJNYWdlbGxhbiIsImNhbGNQb2ludHMiLCIkdGFyZ2V0cyIsIiRsaW5rcyIsIiRhY3RpdmUiLCJwb2ludHMiLCJ3aW5IZWlnaHQiLCJpbm5lckhlaWdodCIsImNsaWVudEhlaWdodCIsImRvY0hlaWdodCIsInNjcm9sbEhlaWdodCIsIiR0YXIiLCJwdCIsInRocmVzaG9sZCIsInRhcmdldFBvaW50IiwiZWFzaW5nIiwiZGVlcExpbmtpbmciLCJsb2NhdGlvbiIsImhhc2giLCJzY3JvbGxUb0xvYyIsIl91cGRhdGVBY3RpdmUiLCJhcnJpdmFsIiwiZ2V0QXR0cmlidXRlIiwibG9jIiwiX2luVHJhbnNpdGlvbiIsImJhck9mZnNldCIsIndpblBvcyIsImN1cklkeCIsImlzRG93biIsImN1clZpc2libGUiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiT2ZmQ2FudmFzIiwiJGxhc3RUcmlnZ2VyIiwiJHRyaWdnZXJzIiwidHJhbnNpdGlvbiIsImNvbnRlbnRPdmVybGF5Iiwib3ZlcmxheSIsIm92ZXJsYXlQb3NpdGlvbiIsInNldEF0dHJpYnV0ZSIsIiRvdmVybGF5IiwiaXNSZXZlYWxlZCIsInJldmVhbENsYXNzIiwicmV2ZWFsT24iLCJfc2V0TVFDaGVja2VyIiwidHJhbnNpdGlvblRpbWUiLCJfaGFuZGxlS2V5Ym9hcmQiLCJyZXZlYWwiLCIkY2xvc2VyIiwiZm9yY2VUbyIsInNjcm9sbFRvIiwiY29udGVudFNjcm9sbCIsIl9zdG9wU2Nyb2xsaW5nIiwiT3JiaXQiLCJfcmVzZXQiLCJjb250YWluZXJDbGFzcyIsIiRzbGlkZXMiLCJzbGlkZUNsYXNzIiwiJGltYWdlcyIsImluaXRBY3RpdmUiLCJ1c2VNVUkiLCJfcHJlcGFyZUZvck9yYml0IiwiYnVsbGV0cyIsIl9sb2FkQnVsbGV0cyIsImF1dG9QbGF5IiwiZ2VvU3luYyIsImFjY2Vzc2libGUiLCIkYnVsbGV0cyIsImJveE9mQnVsbGV0cyIsInRpbWVyRGVsYXkiLCJjaGFuZ2VTbGlkZSIsIl9zZXRXcmFwcGVySGVpZ2h0IiwidGVtcCIsInBhdXNlT25Ib3ZlciIsIm5hdkJ1dHRvbnMiLCIkY29udHJvbHMiLCJuZXh0Q2xhc3MiLCJwcmV2Q2xhc3MiLCIkc2xpZGUiLCJfdXBkYXRlQnVsbGV0cyIsImlzTFRSIiwiY2hvc2VuU2xpZGUiLCIkY3VyU2xpZGUiLCIkZmlyc3RTbGlkZSIsIiRsYXN0U2xpZGUiLCJsYXN0IiwiZGlySW4iLCJkaXJPdXQiLCIkbmV3U2xpZGUiLCJpbmZpbml0ZVdyYXAiLCIkb2xkQnVsbGV0Iiwic3BhbiIsImRldGFjaCIsIiRuZXdCdWxsZXQiLCJhbmltSW5Gcm9tUmlnaHQiLCJhbmltT3V0VG9SaWdodCIsImFuaW1JbkZyb21MZWZ0IiwiYW5pbU91dFRvTGVmdCIsIlJlc3BvbnNpdmVNZW51IiwiY3VycmVudE1xIiwiY3VycmVudFBsdWdpbiIsInJ1bGVzVHJlZSIsInJ1bGVTaXplIiwicnVsZVBsdWdpbiIsIk1lbnVQbHVnaW5zIiwiaXNFbXB0eU9iamVjdCIsIl9jaGVja01lZGlhUXVlcmllcyIsIm1hdGNoZWRNcSIsImNzc0NsYXNzIiwiZGVzdHJveSIsImRyb3Bkb3duIiwiZHJpbGxkb3duIiwiYWNjb3JkaW9uIiwiUmVzcG9uc2l2ZVRvZ2dsZSIsInRhcmdldElEIiwiJHRhcmdldE1lbnUiLCIkdG9nZ2xlciIsImlucHV0IiwiYW5pbWF0aW9uSW4iLCJhbmltYXRpb25PdXQiLCJfdXBkYXRlIiwiX3VwZGF0ZU1xSGFuZGxlciIsInRvZ2dsZU1lbnUiLCJoaWRlRm9yIiwiUmV2ZWFsIiwiY2FjaGVkIiwibXEiLCJpc01vYmlsZSIsIm1vYmlsZVNuaWZmIiwiZnVsbFNjcmVlbiIsIl9tYWtlT3ZlcmxheSIsImRlZXBMaW5rIiwib3V0ZXJXaWR0aCIsIm91dGVySGVpZ2h0IiwibWFyZ2luIiwiX3VwZGF0ZVBvc2l0aW9uIiwiX2hhbmRsZVN0YXRlIiwibXVsdGlwbGVPcGVuZWQiLCJhZGRSZXZlYWxPcGVuQ2xhc3NlcyIsIm9yaWdpbmFsU2Nyb2xsUG9zIiwiYWZ0ZXJBbmltYXRpb24iLCJmb2N1c2FibGVFbGVtZW50cyIsInNob3dEZWxheSIsIl9leHRyYUhhbmRsZXJzIiwiY2xvc2VPbkVzYyIsImZpbmlzaFVwIiwiaGlkZURlbGF5IiwicmVzZXRPbkNsb3NlIiwicmVwbGFjZVN0YXRlIiwidGl0bGUiLCJocmVmIiwiYnRtT2Zmc2V0UGN0IiwiaVBob25lU25pZmYiLCJhbmRyb2lkU25pZmYiLCJTbGlkZXIiLCJpbnB1dHMiLCJoYW5kbGVzIiwiJGhhbmRsZSIsIiRpbnB1dCIsIiRmaWxsIiwidmVydGljYWwiLCJpc0RibCIsImRpc2FibGVkIiwiZGlzYWJsZWRDbGFzcyIsImJpbmRpbmciLCJfc2V0SW5pdEF0dHIiLCJkb3VibGVTaWRlZCIsIiRoYW5kbGUyIiwiJGlucHV0MiIsInNldEhhbmRsZXMiLCJfc2V0SGFuZGxlUG9zIiwicGN0T2ZCYXIiLCJwZXJjZW50IiwicG9zaXRpb25WYWx1ZUZ1bmN0aW9uIiwiX2xvZ1RyYW5zZm9ybSIsIl9wb3dUcmFuc2Zvcm0iLCJ0b0ZpeGVkIiwiYmFzZUxvZyIsIm5vbkxpbmVhckJhc2UiLCIkaG5kbCIsIm5vSW52ZXJ0IiwiaDJWYWwiLCJzdGVwIiwiaDFWYWwiLCJ2ZXJ0IiwiaE9yVyIsImxPclQiLCJoYW5kbGVEaW0iLCJlbGVtRGltIiwiX3BjdE9mQmFyIiwicHhUb01vdmUiLCJtb3ZlbWVudCIsImRlY2ltYWwiLCJfc2V0VmFsdWVzIiwiaXNMZWZ0SG5kbCIsImRpbSIsImhhbmRsZVBjdCIsImhhbmRsZVBvcyIsImluaXRpYWxTdGFydCIsIm1vdmVUaW1lIiwiY2hhbmdlZERlbGF5IiwiaW5pdFZhbCIsImluaXRpYWxFbmQiLCJoYXNWYWwiLCJldmVudE9mZnNldCIsImhhbGZPZkhhbmRsZSIsImJhckRpbSIsIndpbmRvd1Njcm9sbCIsInNjcm9sbExlZnQiLCJlbGVtT2Zmc2V0IiwiZXZlbnRGcm9tQmFyIiwiYmFyWFkiLCJvZmZzZXRQY3QiLCJfdmFsdWUiLCJfYWRqdXN0VmFsdWUiLCJmaXJzdEhuZGxQb3MiLCJhYnNQb3NpdGlvbiIsInNlY25kSG5kbFBvcyIsImRpdiIsInByZXZfdmFsIiwibmV4dF92YWwiLCJfZXZlbnRzRm9ySGFuZGxlIiwiY3VySGFuZGxlIiwiX2hhbmRsZUV2ZW50IiwiY2xpY2tTZWxlY3QiLCJkcmFnZ2FibGUiLCJjdXJyZW50VGFyZ2V0IiwiXyRoYW5kbGUiLCJvbGRWYWx1ZSIsIm5ld1ZhbHVlIiwiZGVjcmVhc2UiLCJpbmNyZWFzZSIsImRlY3JlYXNlX2Zhc3QiLCJpbmNyZWFzZV9mYXN0IiwiaW52ZXJ0VmVydGljYWwiLCJmcmFjIiwibnVtIiwiY2xpY2tQb3MiLCJiYXNlIiwibG9nIiwiU3RpY2t5Iiwid2FzV3JhcHBlZCIsIiRjb250YWluZXIiLCJjb250YWluZXIiLCJ3cmFwSW5uZXIiLCJzdGlja3lDbGFzcyIsInNjcm9sbENvdW50IiwiY2hlY2tFdmVyeSIsImlzU3R1Y2siLCJjb250YWluZXJIZWlnaHQiLCJlbGVtSGVpZ2h0IiwiX3BhcnNlUG9pbnRzIiwiX3NldFNpemVzIiwic2Nyb2xsIiwiX2NhbGMiLCJfcmVtb3ZlU3RpY2t5IiwidG9wUG9pbnQiLCJyZXZlcnNlIiwidG9wQW5jaG9yIiwiYnRtIiwiYnRtQW5jaG9yIiwicHRzIiwiYnJlYWtzIiwicGxhY2UiLCJjYW5TdGljayIsIl9wYXVzZUxpc3RlbmVycyIsImNoZWNrU2l6ZXMiLCJib3R0b21Qb2ludCIsIl9zZXRTdGlja3kiLCJzdGlja1RvIiwibXJnbiIsIm5vdFN0dWNrVG8iLCJpc1RvcCIsInN0aWNrVG9Ub3AiLCJhbmNob3JQdCIsImFuY2hvckhlaWdodCIsInRvcE9yQm90dG9tIiwic3RpY2t5T24iLCJuZXdFbGVtV2lkdGgiLCJjb21wIiwicGRuZ2wiLCJwZG5nciIsIm5ld0NvbnRhaW5lckhlaWdodCIsIl9zZXRCcmVha1BvaW50cyIsIm1Ub3AiLCJlbUNhbGMiLCJtYXJnaW5Ub3AiLCJtQnRtIiwibWFyZ2luQm90dG9tIiwiZW0iLCJmb250U2l6ZSIsIlRhYnMiLCIkdGFiVGl0bGVzIiwibGlua0NsYXNzIiwibGlua0FjdGl2ZUNsYXNzIiwibG9hZCIsImRlZXBMaW5rU211ZGdlRGVsYXkiLCJzZWxlY3RUYWIiLCJkZWVwTGlua1NtdWRnZSIsIm1hdGNoSGVpZ2h0IiwiX3NldEhlaWdodCIsIl9hZGRLZXlIYW5kbGVyIiwiX2FkZENsaWNrSGFuZGxlciIsIl9zZXRIZWlnaHRNcUhhbmRsZXIiLCJfaGFuZGxlVGFiQ2hhbmdlIiwid3JhcE9uS2V5cyIsImFjdGl2ZUNvbGxhcHNlIiwiX2NvbGxhcHNlVGFiIiwiJG9sZFRhYiIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCJfb3BlblRhYiIsInVwZGF0ZUhpc3RvcnkiLCJwYW5lbEFjdGl2ZUNsYXNzIiwiJHRhcmdldF9hbmNob3IiLCJpZFN0ciIsInBhbmVsQ2xhc3MiLCJwYW5lbCIsIlRvZ2dsZXIiLCJ0b2dnbGVDbGFzcyIsIl91cGRhdGVBUklBIiwiVG9vbHRpcCIsImlzQ2xpY2siLCJlbGVtSWQiLCJfZ2V0UG9zaXRpb25DbGFzcyIsInRpcFRleHQiLCJ0ZW1wbGF0ZSIsIl9idWlsZFRlbXBsYXRlIiwiYWxsb3dIdG1sIiwidHJpZ2dlckNsYXNzIiwidGVtcGxhdGVDbGFzc2VzIiwidG9vbHRpcENsYXNzIiwiJHRlbXBsYXRlIiwiJHRpcERpbXMiLCJzaG93T24iLCJmYWRlSW4iLCJmYWRlSW5EdXJhdGlvbiIsImZhZGVPdXREdXJhdGlvbiIsImlzRm9jdXMiLCJkaXNhYmxlRm9yVG91Y2giLCJ0b3VjaENsb3NlVGV4dCIsIlJlc3BvbnNpdmVBY2NvcmRpb25UYWJzIiwiX2dldEFsbE9wdGlvbnMiLCJhbGxPcHRpb25zIiwib2JqIiwiZHVtbXlQbHVnaW4iLCJ0bXBQbHVnaW4iLCJrZXlLZXkiLCJvYmpPYmoiLCJzdG9yZXpmRGF0YSIsIl9oYW5kbGVNYXJrdXAiLCJ0b1NldCIsImZyb21TdHJpbmciLCIkcGFuZWxzIiwidGFic1RpdGxlIiwidGFic1BhbmVsIiwiJGxpSGVhZHMiLCIkbGlIZWFkc0EiLCJkaXNwbGF5IiwidmlzaWJpbGl0eSIsImFmdGVyIiwiJHRhYnNDb250ZW50IiwiJHBsYWNlaG9sZGVyIiwiaW5zZXJ0QWZ0ZXIiLCJ0ZW1wVmFsdWUiLCJ0YWJzIiwiZW5kRXZlbnQiLCJNb3Rpb25VSSIsImhpZGVFcnJvcnMiLCIkZm9vdGVyIiwicG9zIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBU0EsQ0FBVCxFQUFZOztBQUViOztBQUVBLE1BQUlDLHFCQUFxQixPQUF6Qjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsYUFBYTtBQUNmQyxhQUFTRixrQkFETTs7QUFHZjs7O0FBR0FHLGNBQVUsRUFOSzs7QUFRZjs7O0FBR0FDLFlBQVEsRUFYTzs7QUFhZjs7O0FBR0FDLFNBQUssWUFBVTtBQUNiLGFBQU9OLEVBQUUsTUFBRixFQUFVTyxJQUFWLENBQWUsS0FBZixNQUEwQixLQUFqQztBQUNELEtBbEJjO0FBbUJmOzs7O0FBSUFDLFlBQVEsVUFBU0EsTUFBVCxFQUFpQkMsSUFBakIsRUFBdUI7QUFDN0I7QUFDQTtBQUNBLFVBQUlDLFlBQWFELFFBQVFFLGFBQWFILE1BQWIsQ0FBekI7QUFDQTtBQUNBO0FBQ0EsVUFBSUksV0FBWUMsVUFBVUgsU0FBVixDQUFoQjs7QUFFQTtBQUNBLFdBQUtO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QVksWUFBWixFQUEwQjVFLE1BQTFCO0FBQ0Y7QUFFRixHQVREO0FBV0QsQ0FmRCxFQWVHaEIsTUFmSDtDQ0ZBIiwiZmlsZSI6ImZvdW5kYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIhZnVuY3Rpb24oJCkge1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEZPVU5EQVRJT05fVkVSU0lPTiA9ICc2LjMuMCc7XG5cbi8vIEdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuLy8gVGhpcyBpcyBhdHRhY2hlZCB0byB0aGUgd2luZG93LCBvciB1c2VkIGFzIGEgbW9kdWxlIGZvciBBTUQvQnJvd3NlcmlmeVxudmFyIEZvdW5kYXRpb24gPSB7XG4gIHZlcnNpb246IEZPVU5EQVRJT05fVkVSU0lPTixcblxuICAvKipcbiAgICogU3RvcmVzIGluaXRpYWxpemVkIHBsdWdpbnMuXG4gICAqL1xuICBfcGx1Z2luczoge30sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xuICAgKi9cbiAgX3V1aWRzOiBbXSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIGJvb2xlYW4gZm9yIFJUTCBzdXBwb3J0XG4gICAqL1xuICBydGw6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuICQoJ2h0bWwnKS5hdHRyKCdkaXInKSA9PT0gJ3J0bCc7XG4gIH0sXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgRm91bmRhdGlvbiBwbHVnaW4sIGFkZGluZyBpdCB0byB0aGUgYEZvdW5kYXRpb25gIG5hbWVzcGFjZSBhbmQgdGhlIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplIHdoZW4gcmVmbG93aW5nLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXG4gICAqL1xuICBwbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSkge1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuICAgIC8vIEV4YW1wbGVzOiBGb3VuZGF0aW9uLlJldmVhbCwgRm91bmRhdGlvbi5PZmZDYW52YXNcbiAgICB2YXIgY2xhc3NOYW1lID0gKG5hbWUgfHwgZnVuY3Rpb25OYW1lKHBsdWdpbikpO1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxuICAgIC8vIEV4YW1wbGVzOiBkYXRhLXJldmVhbCwgZGF0YS1vZmYtY2FudmFzXG4gICAgdmFyIGF0dHJOYW1lICA9IGh5cGhlbmF0ZShjbGFzc05hbWUpO1xuXG4gICAgLy8gQWRkIHRvIHRoZSBGb3VuZGF0aW9uIG9iamVjdCBhbmQgdGhlIHBsdWdpbnMgbGlzdCAoZm9yIHJlZmxvd2luZylcbiAgICB0aGlzLl9wbHVnaW5zW2F0dHJOYW1lXSA9IHRoaXNbY2xhc3NOYW1lXSA9IHBsdWdpbjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXG4gICAqIEFkZHMgdGhlIGB6ZlBsdWdpbmAgZGF0YS1hdHRyaWJ1dGUgdG8gcHJvZ3JhbW1hdGljYWxseSBjcmVhdGVkIHBsdWdpbnMgdG8gYWxsb3cgdXNlIG9mICQoc2VsZWN0b3IpLmZvdW5kYXRpb24obWV0aG9kKSBjYWxscy5cbiAgICogQWxzbyBmaXJlcyB0aGUgaW5pdGlhbGl6YXRpb24gZXZlbnQgZm9yIGVhY2ggcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4sIHBhc3NlZCBhcyBhIGNhbWVsQ2FzZWQgc3RyaW5nLlxuICAgKiBAZmlyZXMgUGx1Z2luI2luaXRcbiAgICovXG4gIHJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpe1xuICAgIHZhciBwbHVnaW5OYW1lID0gbmFtZSA/IGh5cGhlbmF0ZShuYW1lKSA6IGZ1bmN0aW9uTmFtZShwbHVnaW4uY29uc3RydWN0b3IpLnRvTG93ZXJDYXNlKCk7XG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xuXG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKSl7IHBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gLCBwbHVnaW4udXVpZCk7IH1cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBpbml0aWFsaXplZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcbiAgICAgICAgICAgKi9cbiAgICBwbHVnaW4uJGVsZW1lbnQudHJpZ2dlcihgaW5pdC56Zi4ke3BsdWdpbk5hbWV9YCk7XG5cbiAgICB0aGlzLl91dWlkcy5wdXNoKHBsdWdpbi51dWlkKTtcblxuICAgIHJldHVybjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBSZW1vdmVzIHRoZSBwbHVnaW5zIHV1aWQgZnJvbSB0aGUgX3V1aWRzIGFycmF5LlxuICAgKiBSZW1vdmVzIHRoZSB6ZlBsdWdpbiBkYXRhIGF0dHJpYnV0ZSwgYXMgd2VsbCBhcyB0aGUgZGF0YS1wbHVnaW4tbmFtZSBhdHRyaWJ1dGUuXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQGZpcmVzIFBsdWdpbiNkZXN0cm95ZWRcbiAgICovXG4gIHVucmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBoeXBoZW5hdGUoZnVuY3Rpb25OYW1lKHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpLmNvbnN0cnVjdG9yKSk7XG5cbiAgICB0aGlzLl91dWlkcy5zcGxpY2UodGhpcy5fdXVpZHMuaW5kZXhPZihwbHVnaW4udXVpZCksIDEpO1xuICAgIHBsdWdpbi4kZWxlbWVudC5yZW1vdmVBdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKS5yZW1vdmVEYXRhKCd6ZlBsdWdpbicpXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2Rlc3Ryb3llZFxuICAgICAgICAgICAqL1xuICAgICAgICAgIC50cmlnZ2VyKGBkZXN0cm95ZWQuemYuJHtwbHVnaW5OYW1lfWApO1xuICAgIGZvcih2YXIgcHJvcCBpbiBwbHVnaW4pe1xuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gICAgfVxuICAgIHJldHVybjtcbiAgfSxcblxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIENhdXNlcyBvbmUgb3IgbW9yZSBhY3RpdmUgcGx1Z2lucyB0byByZS1pbml0aWFsaXplLCByZXNldHRpbmcgZXZlbnQgbGlzdGVuZXJzLCByZWNhbGN1bGF0aW5nIHBvc2l0aW9ucywgZXRjLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGx1Z2lucyAtIG9wdGlvbmFsIHN0cmluZyBvZiBhbiBpbmRpdmlkdWFsIHBsdWdpbiBrZXksIGF0dGFpbmVkIGJ5IGNhbGxpbmcgYCQoZWxlbWVudCkuZGF0YSgncGx1Z2luTmFtZScpYCwgb3Igc3RyaW5nIG9mIGEgcGx1Z2luIGNsYXNzIGkuZS4gYCdkcm9wZG93bidgXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXG4gICAqL1xuICAgcmVJbml0OiBmdW5jdGlvbihwbHVnaW5zKXtcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcbiAgICAgdHJ5e1xuICAgICAgIGlmKGlzSlEpe1xuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICQodGhpcykuZGF0YSgnemZQbHVnaW4nKS5faW5pdCgpO1xuICAgICAgICAgfSk7XG4gICAgICAgfWVsc2V7XG4gICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBwbHVnaW5zLFxuICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgZm5zID0ge1xuICAgICAgICAgICAnb2JqZWN0JzogZnVuY3Rpb24ocGxncyl7XG4gICAgICAgICAgICAgcGxncy5mb3JFYWNoKGZ1bmN0aW9uKHApe1xuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcbiAgICAgICAgICAgICAgICQoJ1tkYXRhLScrIHAgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3N0cmluZyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgcGx1Z2lucyA9IGh5cGhlbmF0ZShwbHVnaW5zKTtcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICd1bmRlZmluZWQnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgIH07XG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XG4gICAgICAgfVxuICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgIH1maW5hbGx5e1xuICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgICB9XG4gICB9LFxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgcmFuZG9tIGJhc2UtMzYgdWlkIHdpdGggbmFtZXNwYWNpbmdcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlIC0gbmFtZSBvZiBwbHVnaW4gdG8gYmUgaW5jb3Jwb3JhdGVkIGluIHVpZCwgb3B0aW9uYWwuXG4gICAqIEBkZWZhdWx0IHtTdHJpbmd9ICcnIC0gaWYgbm8gcGx1Z2luIG5hbWUgaXMgcHJvdmlkZWQsIG5vdGhpbmcgaXMgYXBwZW5kZWQgdG8gdGhlIHVpZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcbiAgICovXG4gIEdldFlvRGlnaXRzOiBmdW5jdGlvbihsZW5ndGgsIG5hbWVzcGFjZSl7XG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucG93KDM2LCBsZW5ndGggKyAxKSAtIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygzNiwgbGVuZ3RoKSkpLnRvU3RyaW5nKDM2KS5zbGljZSgxKSArIChuYW1lc3BhY2UgPyBgLSR7bmFtZXNwYWNlfWAgOiAnJyk7XG4gIH0sXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBsdWdpbnMgb24gYW55IGVsZW1lbnRzIHdpdGhpbiBgZWxlbWAgKGFuZCBgZWxlbWAgaXRzZWxmKSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluaXRpYWxpemVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbSAtIGpRdWVyeSBvYmplY3QgY29udGFpbmluZyB0aGUgZWxlbWVudCB0byBjaGVjayBpbnNpZGUuIEFsc28gY2hlY2tzIHRoZSBlbGVtZW50IGl0c2VsZiwgdW5sZXNzIGl0J3MgdGhlIGBkb2N1bWVudGAgb2JqZWN0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cbiAgICovXG4gIHJlZmxvdzogZnVuY3Rpb24oZWxlbSwgcGx1Z2lucykge1xuXG4gICAgLy8gSWYgcGx1Z2lucyBpcyB1bmRlZmluZWQsIGp1c3QgZ3JhYiBldmVyeXRoaW5nXG4gICAgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xuICAgIH1cbiAgICAvLyBJZiBwbHVnaW5zIGlzIGEgc3RyaW5nLCBjb252ZXJ0IGl0IHRvIGFuIGFycmF5IHdpdGggb25lIGl0ZW1cbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBsdWdpbnMgPSBbcGx1Z2luc107XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxuICAgICQuZWFjaChwbHVnaW5zLCBmdW5jdGlvbihpLCBuYW1lKSB7XG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgcGx1Z2luXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XG5cbiAgICAgIC8vIExvY2FsaXplIHRoZSBzZWFyY2ggdG8gYWxsIGVsZW1lbnRzIGluc2lkZSBlbGVtLCBhcyB3ZWxsIGFzIGVsZW0gaXRzZWxmLCB1bmxlc3MgZWxlbSA9PT0gZG9jdW1lbnRcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHBsdWdpbiBmb3VuZCwgaW5pdGlhbGl6ZSBpdFxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xuICAgICAgICBpZiAoJGVsLmRhdGEoJ3pmUGx1Z2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmllZCB0byBpbml0aWFsaXplIFwiK25hbWUrXCIgb24gYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgaGFzIGEgRm91bmRhdGlvbiBwbHVnaW4uXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XG4gICAgICAgICAgdmFyIHRoaW5nID0gJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpLnNwbGl0KCc7JykuZm9yRWFjaChmdW5jdGlvbihlLCBpKXtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKGVsKXsgcmV0dXJuIGVsLnRyaW0oKTsgfSk7XG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgJGVsLmRhdGEoJ3pmUGx1Z2luJywgbmV3IHBsdWdpbigkKHRoaXMpLCBvcHRzKSk7XG4gICAgICAgIH1jYXRjaChlcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XG4gICAgICAgIH1maW5hbGx5e1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldEZuTmFtZTogZnVuY3Rpb25OYW1lLFxuICB0cmFuc2l0aW9uZW5kOiBmdW5jdGlvbigkZWxlbSl7XG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xuICAgICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICAgIH07XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgZW5kO1xuXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XG4gICAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgZW5kID0gdHJhbnNpdGlvbnNbdF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKGVuZCl7XG4gICAgICByZXR1cm4gZW5kO1xuICAgIH1lbHNle1xuICAgICAgZW5kID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xuICAgICAgfSwgMSk7XG4gICAgICByZXR1cm4gJ3RyYW5zaXRpb25lbmQnO1xuICAgIH1cbiAgfVxufTtcblxuRm91bmRhdGlvbi51dGlsID0ge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgZW5kIG9mIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxuICAgKiBAcmV0dXJucyBmdW5jdGlvblxuICAgKi9cbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xuICAgIHZhciB0aW1lciA9IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFRPRE86IGNvbnNpZGVyIG5vdCBtYWtpbmcgdGhpcyBhIGpRdWVyeSBmdW5jdGlvblxuLy8gVE9ETzogbmVlZCB3YXkgdG8gcmVmbG93IHZzLiByZS1pbml0aWFsaXplXG4vKipcbiAqIFRoZSBGb3VuZGF0aW9uIGpRdWVyeSBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gbWV0aG9kIC0gQW4gYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGN1cnJlbnQgalF1ZXJ5IG9iamVjdC5cbiAqL1xudmFyIGZvdW5kYXRpb24gPSBmdW5jdGlvbihtZXRob2QpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgbWV0aG9kLFxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcbiAgICAgICRub0pTID0gJCgnLm5vLWpzJyk7XG5cbiAgaWYoISRtZXRhLmxlbmd0aCl7XG4gICAgJCgnPG1ldGEgY2xhc3M9XCJmb3VuZGF0aW9uLW1xXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCk7XG4gIH1cbiAgaWYoJG5vSlMubGVuZ3RoKXtcbiAgICAkbm9KUy5yZW1vdmVDbGFzcygnbm8tanMnKTtcbiAgfVxuXG4gIGlmKHR5cGUgPT09ICd1bmRlZmluZWQnKXsvL25lZWRzIHRvIGluaXRpYWxpemUgdGhlIEZvdW5kYXRpb24gb2JqZWN0LCBvciBhbiBpbmRpdmlkdWFsIHBsdWdpbi5cbiAgICBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcbiAgfWVsc2UgaWYodHlwZSA9PT0gJ3N0cmluZycpey8vYW4gaW5kaXZpZHVhbCBtZXRob2QgdG8gaW52b2tlIG9uIGEgcGx1Z2luIG9yIGdyb3VwIG9mIHBsdWdpbnNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7Ly9jb2xsZWN0IGFsbCB0aGUgYXJndW1lbnRzLCBpZiBuZWNlc3NhcnlcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cblxuICAgIGlmKHBsdWdDbGFzcyAhPT0gdW5kZWZpbmVkICYmIHBsdWdDbGFzc1ttZXRob2RdICE9PSB1bmRlZmluZWQpey8vbWFrZSBzdXJlIGJvdGggdGhlIGNsYXNzIGFuZCBtZXRob2QgZXhpc3RcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkocGx1Z0NsYXNzLCBhcmdzKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseSgkKGVsKS5kYXRhKCd6ZlBsdWdpbicpLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfWVsc2V7Ly9lcnJvciBmb3Igbm8gY2xhc3Mgb3Igbm8gbWV0aG9kXG4gICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJXZSdyZSBzb3JyeSwgJ1wiICsgbWV0aG9kICsgXCInIGlzIG5vdCBhbiBhdmFpbGFibGUgbWV0aG9kIGZvciBcIiArIChwbHVnQ2xhc3MgPyBmdW5jdGlvbk5hbWUocGx1Z0NsYXNzKSA6ICd0aGlzIGVsZW1lbnQnKSArICcuJyk7XG4gICAgfVxuICB9ZWxzZXsvL2Vycm9yIGZvciBpbnZhbGlkIGFyZ3VtZW50IHR5cGVcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBXZSdyZSBzb3JyeSwgJHt0eXBlfSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuIFlvdSBtdXN0IHVzZSBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1ldGhvZCB5b3Ugd2lzaCB0byBpbnZva2UuYCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG53aW5kb3cuRm91bmRhdGlvbiA9IEZvdW5kYXRpb247XG4kLmZuLmZvdW5kYXRpb24gPSBmb3VuZGF0aW9uO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcbiAgICB3aW5kb3cuRGF0ZS5ub3cgPSBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdnArJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddKTtcbiAgfVxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSAtIG5vdyk7XG4gICAgfTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG4gIH1cbiAgLyoqXG4gICAqIFBvbHlmaWxsIGZvciBwZXJmb3JtYW5jZS5ub3csIHJlcXVpcmVkIGJ5IHJBRlxuICAgKi9cbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgc3RhcnQ6IERhdGUubm93KCksXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGNsb3Nlc3QgdGhpbmcgcG9zc2libGUgdG8gdGhlIEVDTUFTY3JpcHQgNVxuICAgICAgLy8gaW50ZXJuYWwgSXNDYWxsYWJsZSBmdW5jdGlvblxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG5cbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgICBmTk9QICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICB9O1xuXG4gICAgaWYgKHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAvLyBuYXRpdmUgZnVuY3Rpb25zIGRvbid0IGhhdmUgYSBwcm90b3R5cGVcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cbi8vIFBvbHlmaWxsIHRvIGdldCB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGluIElFOVxuZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZuKSB7XG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZ1bmNOYW1lUmVnZXggPSAvZnVuY3Rpb25cXHMoW14oXXsxLH0pXFwoLztcbiAgICB2YXIgcmVzdWx0cyA9IChmdW5jTmFtZVJlZ2V4KS5leGVjKChmbikudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XG4gIH1cbiAgZWxzZSBpZiAoZm4ucHJvdG90eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcbiAgaWYgKCd0cnVlJyA9PT0gc3RyKSByZXR1cm4gdHJ1ZTtcbiAgZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gc3RyKSByZXR1cm4gZmFsc2U7XG4gIGVsc2UgaWYgKCFpc05hTihzdHIgKiAxKSkgcmV0dXJuIHBhcnNlRmxvYXQoc3RyKTtcbiAgcmV0dXJuIHN0cjtcbn1cbi8vIENvbnZlcnQgUGFzY2FsQ2FzZSB0byBrZWJhYi1jYXNlXG4vLyBUaGFuayB5b3U6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzg5NTU1ODBcbmZ1bmN0aW9uIGh5cGhlbmF0ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCAnJDEtJDInKS50b0xvd2VyQ2FzZSgpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbkZvdW5kYXRpb24uQm94ID0ge1xuICBJbU5vdFRvdWNoaW5nWW91OiBJbU5vdFRvdWNoaW5nWW91LFxuICBHZXREaW1lbnNpb25zOiBHZXREaW1lbnNpb25zLFxuICBHZXRPZmZzZXRzOiBHZXRPZmZzZXRzXG59XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIGRpbWVuc2lvbnMgb2YgYW4gZWxlbWVudCB0byBhIGNvbnRhaW5lciBhbmQgZGV0ZXJtaW5lcyBjb2xsaXNpb24gZXZlbnRzIHdpdGggY29udGFpbmVyLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdGVzdCBmb3IgY29sbGlzaW9ucy5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBwYXJlbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyBib3VuZGluZyBjb250YWluZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGxyT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIGxlZnQgYW5kIHJpZ2h0IHZhbHVlcyBvbmx5LlxuICogQHBhcmFtIHtCb29sZWFufSB0Yk9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayB0b3AgYW5kIGJvdHRvbSB2YWx1ZXMgb25seS5cbiAqIEBkZWZhdWx0IGlmIG5vIHBhcmVudCBvYmplY3QgcGFzc2VkLCBkZXRlY3RzIGNvbGxpc2lvbnMgd2l0aCBgd2luZG93YC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgY29sbGlzaW9uIGZyZWUsIGZhbHNlIGlmIGEgY29sbGlzaW9uIGluIGFueSBkaXJlY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIEltTm90VG91Y2hpbmdZb3UoZWxlbWVudCwgcGFyZW50LCBsck9ubHksIHRiT25seSkge1xuICB2YXIgZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICB0b3AsIGJvdHRvbSwgbGVmdCwgcmlnaHQ7XG5cbiAgaWYgKHBhcmVudCkge1xuICAgIHZhciBwYXJEaW1zID0gR2V0RGltZW5zaW9ucyhwYXJlbnQpO1xuXG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IHBhckRpbXMuaGVpZ2h0ICsgcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IHBhckRpbXMud2lkdGggKyBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgfVxuICBlbHNlIHtcbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCArIGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpO1xuICB9XG5cbiAgdmFyIGFsbERpcnMgPSBbYm90dG9tLCB0b3AsIGxlZnQsIHJpZ2h0XTtcblxuICBpZiAobHJPbmx5KSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0ID09PSB0cnVlO1xuICB9XG5cbiAgaWYgKHRiT25seSkge1xuICAgIHJldHVybiB0b3AgPT09IGJvdHRvbSA9PT0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBhbGxEaXJzLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbn07XG5cbi8qKlxuICogVXNlcyBuYXRpdmUgbWV0aG9kcyB0byByZXR1cm4gYW4gb2JqZWN0IG9mIGRpbWVuc2lvbiB2YWx1ZXMuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5IHx8IEhUTUx9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IG9yIERPTSBlbGVtZW50IGZvciB3aGljaCB0byBnZXQgdGhlIGRpbWVuc2lvbnMuIENhbiBiZSBhbnkgZWxlbWVudCBvdGhlciB0aGF0IGRvY3VtZW50IG9yIHdpbmRvdy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IC0gbmVzdGVkIG9iamVjdCBvZiBpbnRlZ2VyIHBpeGVsIHZhbHVlc1xuICogVE9ETyAtIGlmIGVsZW1lbnQgaXMgd2luZG93LCByZXR1cm4gb25seSB0aG9zZSB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIEdldERpbWVuc2lvbnMoZWxlbSwgdGVzdCl7XG4gIGVsZW0gPSBlbGVtLmxlbmd0aCA/IGVsZW1bMF0gOiBlbGVtO1xuXG4gIGlmIChlbGVtID09PSB3aW5kb3cgfHwgZWxlbSA9PT0gZG9jdW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gc29ycnksIERhdmUuIEknbSBhZnJhaWQgSSBjYW4ndCBkbyB0aGF0LlwiKTtcbiAgfVxuXG4gIHZhciByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHBhclJlY3QgPSBlbGVtLnBhcmVudE5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5SZWN0ID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG4gICAgICB3aW5YID0gd2luZG93LnBhZ2VYT2Zmc2V0O1xuXG4gIHJldHVybiB7XG4gICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICBvZmZzZXQ6IHtcbiAgICAgIHRvcDogcmVjdC50b3AgKyB3aW5ZLFxuICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgd2luWFxuICAgIH0sXG4gICAgcGFyZW50RGltczoge1xuICAgICAgd2lkdGg6IHBhclJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHBhclJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogcGFyUmVjdC50b3AgKyB3aW5ZLFxuICAgICAgICBsZWZ0OiBwYXJSZWN0LmxlZnQgKyB3aW5YXG4gICAgICB9XG4gICAgfSxcbiAgICB3aW5kb3dEaW1zOiB7XG4gICAgICB3aWR0aDogd2luUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogd2luUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiB3aW5ZLFxuICAgICAgICBsZWZ0OiB3aW5YXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgb2YgdG9wIGFuZCBsZWZ0IGludGVnZXIgcGl4ZWwgdmFsdWVzIGZvciBkeW5hbWljYWxseSByZW5kZXJlZCBlbGVtZW50cyxcbiAqIHN1Y2ggYXM6IFRvb2x0aXAsIFJldmVhbCwgYW5kIERyb3Bkb3duXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgYmVpbmcgcG9zaXRpb25lZC5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBhbmNob3IgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCdzIGFuY2hvciBwb2ludC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIGEgc3RyaW5nIHJlbGF0aW5nIHRvIHRoZSBkZXNpcmVkIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50LCByZWxhdGl2ZSB0byBpdCdzIGFuY2hvclxuICogQHBhcmFtIHtOdW1iZXJ9IHZPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgdmVydGljYWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBoT2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIGhvcml6b250YWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNPdmVyZmxvdyAtIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLCBzZXRzIHRvIHRydWUgdG8gZGVmYXVsdCB0aGUgZWxlbWVudCB0byBmdWxsIHdpZHRoIC0gYW55IGRlc2lyZWQgb2Zmc2V0LlxuICogVE9ETyBhbHRlci9yZXdyaXRlIHRvIHdvcmsgd2l0aCBgZW1gIHZhbHVlcyBhcyB3ZWxsL2luc3RlYWQgb2YgcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIEdldE9mZnNldHMoZWxlbWVudCwgYW5jaG9yLCBwb3NpdGlvbiwgdk9mZnNldCwgaE9mZnNldCwgaXNPdmVyZmxvdykge1xuICB2YXIgJGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgJGFuY2hvckRpbXMgPSBhbmNob3IgPyBHZXREaW1lbnNpb25zKGFuY2hvcikgOiBudWxsO1xuXG4gIHN3aXRjaCAocG9zaXRpb24pIHtcbiAgICBjYXNlICd0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0LFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciB0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiBpc092ZXJmbG93ID8gaE9mZnNldCA6ICgoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgcmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgKyAxLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0ICsgKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgKCRlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZXZlYWwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLSAkZWxlRGltcy53aWR0aCkgLyAyLFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICBjYXNlICdyZXZlYWwgZnVsbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0LFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgLSAkZWxlRGltcy53aWR0aCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgfVxufVxuXG59KGpRdWVyeSk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXG4gKiBQbGVhc2UgdGhhbmsgTWFyaXVzIG9uIEdpdEh1YiAvb3dsYmVydHogKlxuICogb3IgdGhlIHdlYiBodHRwOi8vd3d3Lm1hcml1c29sYmVydHouZGUvICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IGtleUNvZGVzID0ge1xuICA5OiAnVEFCJyxcbiAgMTM6ICdFTlRFUicsXG4gIDI3OiAnRVNDQVBFJyxcbiAgMzI6ICdTUEFDRScsXG4gIDM3OiAnQVJST1dfTEVGVCcsXG4gIDM4OiAnQVJST1dfVVAnLFxuICAzOTogJ0FSUk9XX1JJR0hUJyxcbiAgNDA6ICdBUlJPV19ET1dOJ1xufVxuXG52YXIgY29tbWFuZHMgPSB7fVxuXG52YXIgS2V5Ym9hcmQgPSB7XG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcblxuICAvKipcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XG4gICAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcbiAgICovXG4gIHBhcnNlS2V5KGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBSZW1vdmUgdW4tcHJpbnRhYmxlIGNoYXJhY3RlcnMsIGUuZy4gZm9yIGBmcm9tQ2hhckNvZGVgIGNhbGxzIGZvciBDVFJMIG9ubHkgZXZlbnRzXG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL1xcVysvLCAnJyk7XG5cbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIGtleSA9IGBTSElGVF8ke2tleX1gO1xuICAgIGlmIChldmVudC5jdHJsS2V5KSBrZXkgPSBgQ1RSTF8ke2tleX1gO1xuICAgIGlmIChldmVudC5hbHRLZXkpIGtleSA9IGBBTFRfJHtrZXl9YDtcblxuICAgIC8vIFJlbW92ZSB0cmFpbGluZyB1bmRlcnNjb3JlLCBpbiBjYXNlIG9ubHkgbW9kaWZpZXJzIHdlcmUgdXNlZCAoZS5nLiBvbmx5IGBDVFJMX0FMVGApXG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL18kLywgJycpO1xuXG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgZ2l2ZW4gKGtleWJvYXJkKSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50J3MgbmFtZSwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEBwYXJhbSB7T2JqZWN0c30gZnVuY3Rpb25zIC0gY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgdG8gYmUgZXhlY3V0ZWRcbiAgICovXG4gIGhhbmRsZUtleShldmVudCwgY29tcG9uZW50LCBmdW5jdGlvbnMpIHtcbiAgICB2YXIgY29tbWFuZExpc3QgPSBjb21tYW5kc1tjb21wb25lbnRdLFxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxuICAgICAgY21kcyxcbiAgICAgIGNvbW1hbmQsXG4gICAgICBmbjtcblxuICAgIGlmICghY29tbWFuZExpc3QpIHJldHVybiBjb25zb2xlLndhcm4oJ0NvbXBvbmVudCBub3QgZGVmaW5lZCEnKTtcblxuICAgIGlmICh0eXBlb2YgY29tbWFuZExpc3QubHRyID09PSAndW5kZWZpbmVkJykgeyAvLyB0aGlzIGNvbXBvbmVudCBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIGJldHdlZW4gbHRyIGFuZCBydGxcbiAgICAgICAgY21kcyA9IGNvbW1hbmRMaXN0OyAvLyB1c2UgcGxhaW4gbGlzdFxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5sdHIsIGNvbW1hbmRMaXN0LnJ0bCk7XG5cbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcbiAgICB9XG4gICAgY29tbWFuZCA9IGNtZHNba2V5Q29kZV07XG5cbiAgICBmbiA9IGZ1bmN0aW9uc1tjb21tYW5kXTtcbiAgICBpZiAoZm4gJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gIGlmIGV4aXN0c1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcbiAgICAgIGlmIChmdW5jdGlvbnMuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLmhhbmRsZWQocmV0dXJuVmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnVuY3Rpb25zLnVuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLnVuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBzZWFyY2ggd2l0aGluXG4gICAqIEByZXR1cm4ge2pRdWVyeX0gJGZvY3VzYWJsZSAtIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIGAkZWxlbWVudGBcbiAgICovXG4gIGZpbmRGb2N1c2FibGUoJGVsZW1lbnQpIHtcbiAgICBpZighJGVsZW1lbnQpIHtyZXR1cm4gZmFsc2U7IH1cbiAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnYVtocmVmXSwgYXJlYVtocmVmXSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBzZWxlY3Q6bm90KFtkaXNhYmxlZF0pLCB0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSksIGJ1dHRvbjpub3QoW2Rpc2FibGVkXSksIGlmcmFtZSwgb2JqZWN0LCBlbWJlZCwgKlt0YWJpbmRleF0sICpbY29udGVudGVkaXRhYmxlXScpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEByZXR1cm4gU3RyaW5nIGNvbXBvbmVudE5hbWVcbiAgICovXG5cbiAgcmVnaXN0ZXIoY29tcG9uZW50TmFtZSwgY21kcykge1xuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcbiAgfSwgIFxuXG4gIC8qKlxuICAgKiBUcmFwcyB0aGUgZm9jdXMgaW4gdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqIEBwYXJhbSAge2pRdWVyeX0gJGVsZW1lbnQgIGpRdWVyeSBvYmplY3QgdG8gdHJhcCB0aGUgZm91Y3MgaW50by5cbiAgICovXG4gIHRyYXBGb2N1cygkZWxlbWVudCkge1xuICAgIHZhciAkZm9jdXNhYmxlID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKCRlbGVtZW50KSxcbiAgICAgICAgJGZpcnN0Rm9jdXNhYmxlID0gJGZvY3VzYWJsZS5lcSgwKSxcbiAgICAgICAgJGxhc3RGb2N1c2FibGUgPSAkZm9jdXNhYmxlLmVxKC0xKTtcblxuICAgICRlbGVtZW50Lm9uKCdrZXlkb3duLnpmLnRyYXBmb2N1cycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSAkbGFzdEZvY3VzYWJsZVswXSAmJiBGb3VuZGF0aW9uLktleWJvYXJkLnBhcnNlS2V5KGV2ZW50KSA9PT0gJ1RBQicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJGZpcnN0Rm9jdXNhYmxlLmZvY3VzKCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChldmVudC50YXJnZXQgPT09ICRmaXJzdEZvY3VzYWJsZVswXSAmJiBGb3VuZGF0aW9uLktleWJvYXJkLnBhcnNlS2V5KGV2ZW50KSA9PT0gJ1NISUZUX1RBQicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJGxhc3RGb2N1c2FibGUuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIFJlbGVhc2VzIHRoZSB0cmFwcGVkIGZvY3VzIGZyb20gdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqIEBwYXJhbSAge2pRdWVyeX0gJGVsZW1lbnQgIGpRdWVyeSBvYmplY3QgdG8gcmVsZWFzZSB0aGUgZm9jdXMgZm9yLlxuICAgKi9cbiAgcmVsZWFzZUZvY3VzKCRlbGVtZW50KSB7XG4gICAgJGVsZW1lbnQub2ZmKCdrZXlkb3duLnpmLnRyYXBmb2N1cycpO1xuICB9XG59XG5cbi8qXG4gKiBDb25zdGFudHMgZm9yIGVhc2llciBjb21wYXJpbmcuXG4gKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAqL1xuZnVuY3Rpb24gZ2V0S2V5Q29kZXMoa2NzKSB7XG4gIHZhciBrID0ge307XG4gIGZvciAodmFyIGtjIGluIGtjcykga1trY3Nba2NdXSA9IGtjc1trY107XG4gIHJldHVybiBrO1xufVxuXG5Gb3VuZGF0aW9uLktleWJvYXJkID0gS2V5Ym9hcmQ7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLy8gRGVmYXVsdCBzZXQgb2YgbWVkaWEgcXVlcmllc1xuY29uc3QgZGVmYXVsdFF1ZXJpZXMgPSB7XG4gICdkZWZhdWx0JyA6ICdvbmx5IHNjcmVlbicsXG4gIGxhbmRzY2FwZSA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgcG9ydHJhaXQgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgcmV0aW5hIDogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbnZhciBNZWRpYVF1ZXJ5ID0ge1xuICBxdWVyaWVzOiBbXSxcblxuICBjdXJyZW50OiAnJyxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1lZGlhIHF1ZXJ5IGhlbHBlciwgYnkgZXh0cmFjdGluZyB0aGUgYnJlYWtwb2ludCBsaXN0IGZyb20gdGhlIENTUyBhbmQgYWN0aXZhdGluZyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXh0cmFjdGVkU3R5bGVzID0gJCgnLmZvdW5kYXRpb24tbXEnKS5jc3MoJ2ZvbnQtZmFtaWx5Jyk7XG4gICAgdmFyIG5hbWVkUXVlcmllcztcblxuICAgIG5hbWVkUXVlcmllcyA9IHBhcnNlU3R5bGVUb09iamVjdChleHRyYWN0ZWRTdHlsZXMpO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWVkUXVlcmllcykge1xuICAgICAgaWYobmFtZWRRdWVyaWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2VsZi5xdWVyaWVzLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICB2YWx1ZTogYG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAke25hbWVkUXVlcmllc1trZXldfSlgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCk7XG5cbiAgICB0aGlzLl93YXRjaGVyKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIGlzIGF0IGxlYXN0IGFzIHdpZGUgYXMgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBicmVha3BvaW50IG1hdGNoZXMsIGBmYWxzZWAgaWYgaXQncyBzbWFsbGVyLlxuICAgKi9cbiAgYXRMZWFzdChzaXplKSB7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5nZXQoc2l6ZSk7XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSkubWF0Y2hlcztcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIG1hdGNoZXMgdG8gYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLCBlaXRoZXIgJ3NtYWxsIG9ubHknIG9yICdzbWFsbCcuIE9taXR0aW5nICdvbmx5JyBmYWxscyBiYWNrIHRvIHVzaW5nIGF0TGVhc3QoKSBtZXRob2QuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCBkb2VzIG5vdC5cbiAgICovXG4gIGlzKHNpemUpIHtcbiAgICBzaXplID0gc2l6ZS50cmltKCkuc3BsaXQoJyAnKTtcbiAgICBpZihzaXplLmxlbmd0aCA+IDEgJiYgc2l6ZVsxXSA9PT0gJ29ubHknKSB7XG4gICAgICBpZihzaXplWzBdID09PSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpKSByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuYXRMZWFzdChzaXplWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZWRpYSBxdWVyeSBvZiBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfG51bGx9IC0gVGhlIG1lZGlhIHF1ZXJ5IG9mIHRoZSBicmVha3BvaW50LCBvciBgbnVsbGAgaWYgdGhlIGJyZWFrcG9pbnQgZG9lc24ndCBleGlzdC5cbiAgICovXG4gIGdldChzaXplKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJpZXMpIHtcbiAgICAgIGlmKHRoaXMucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG4gICAgICAgIGlmIChzaXplID09PSBxdWVyeS5uYW1lKSByZXR1cm4gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cbiAgICovXG4gIF9nZXRDdXJyZW50U2l6ZSgpIHtcbiAgICB2YXIgbWF0Y2hlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5xdWVyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG5cbiAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShxdWVyeS52YWx1ZSkubWF0Y2hlcykge1xuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG1hdGNoZWQubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXRjaGVyKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLm1lZGlhcXVlcnknLCAoKSA9PiB7XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xuXG4gICAgICBpZiAobmV3U2l6ZSAhPT0gY3VycmVudFNpemUpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5ld1NpemU7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xuICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgW25ld1NpemUsIGN1cnJlbnRTaXplXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cbi8vIEF1dGhvcnMgJiBjb3B5cmlnaHQgKGMpIDIwMTI6IFNjb3R0IEplaGwsIFBhdWwgSXJpc2gsIE5pY2hvbGFzIFpha2FzLCBEYXZpZCBLbmlnaHQuIER1YWwgTUlUL0JTRCBsaWNlbnNlXG53aW5kb3cubWF0Y2hNZWRpYSB8fCAod2luZG93Lm1hdGNoTWVkaWEgPSBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XG5cbiAgLy8gRm9yIHRob3NlIHRoYXQgZG9uJ3Qgc3VwcG9ydCBtYXRjaE1lZGl1bVxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyksXG4gICAgc2NyaXB0ICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xuXG4gICAgc3R5bGUudHlwZSAgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcblxuICAgIHNjcmlwdCAmJiBzY3JpcHQucGFyZW50Tm9kZSAmJiBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XG5cbiAgICAvLyAnc3R5bGUuY3VycmVudFN0eWxlJyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICd3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZScgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcblxuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xuICAgICAgICB2YXIgdGV4dCA9IGBAbWVkaWEgJHttZWRpYX17ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfWA7XG5cbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZXN0IGlmIG1lZGlhIHF1ZXJ5IGlzIHRydWUgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIGluZm8ud2lkdGggPT09ICcxcHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihtZWRpYSkge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcbiAgICAgIG1lZGlhOiBtZWRpYSB8fCAnYWxsJ1xuICAgIH07XG4gIH1cbn0oKSk7XG5cbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcbmZ1bmN0aW9uIHBhcnNlU3R5bGVUb09iamVjdChzdHIpIHtcbiAgdmFyIHN0eWxlT2JqZWN0ID0ge307XG5cbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3RyID0gc3RyLnRyaW0oKS5zbGljZSgxLCAtMSk7IC8vIGJyb3dzZXJzIHJlLXF1b3RlIHN0cmluZyBzdHlsZSB2YWx1ZXNcblxuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0eWxlT2JqZWN0ID0gc3RyLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHJldCwgcGFyYW0pIHtcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICAgIHZhciBrZXkgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsID0gcGFydHNbMV07XG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cbiAgICAvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgICB2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sIHt9KTtcblxuICByZXR1cm4gc3R5bGVPYmplY3Q7XG59XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNb3Rpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1vdGlvblxuICovXG5cbmNvbnN0IGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbmNvbnN0IGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG5jb25zdCBNb3Rpb24gPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIE1vdmUoZHVyYXRpb24sIGVsZW0sIGZuKXtcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcbiAgLy8gY29uc29sZS5sb2coJ2NhbGxlZCcpO1xuXG4gIGlmIChkdXJhdGlvbiA9PT0gMCkge1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xuICAgIGlmKCFzdGFydCkgc3RhcnQgPSB0cztcbiAgICAvLyBjb25zb2xlLmxvZyhzdGFydCwgdHMpO1xuICAgIHByb2cgPSB0cyAtIHN0YXJ0O1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuXG4gICAgaWYocHJvZyA8IGR1cmF0aW9uKXsgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSwgZWxlbSk7IH1cbiAgICBlbHNle1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW0pO1xuICAgICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgfVxuICB9XG4gIGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUpO1xufVxuXG4vKipcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb3IgSFRNTCBvYmplY3QgdG8gYW5pbWF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhbmltYXRpb24gLSBDU1MgY2xhc3MgdG8gdXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcblxuICBlbGVtZW50XG4gICAgLmFkZENsYXNzKGFuaW1hdGlvbilcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnRcbiAgICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnJylcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoZWxlbWVudCksIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7aW5pdENsYXNzfSAke2FjdGl2ZUNsYXNzfSAke2FuaW1hdGlvbn1gKTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk1vdmUgPSBNb3ZlO1xuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTmVzdCA9IHtcbiAgRmVhdGhlcihtZW51LCB0eXBlID0gJ3pmJykge1xuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XG5cbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykuYXR0cih7J3JvbGUnOiAnbWVudWl0ZW0nfSksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIGl0ZW1zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcblxuICAgICAgaWYgKCRzdWIubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtXG4gICAgICAgICAgLmFkZENsYXNzKGhhc1N1YkNsYXNzKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJGl0ZW0uY2hpbGRyZW4oJ2E6Zmlyc3QnKS50ZXh0KClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOb3RlOiAgRHJpbGxkb3ducyBiZWhhdmUgZGlmZmVyZW50bHkgaW4gaG93IHRoZXkgaGlkZSwgYW5kIHNvIG5lZWRcbiAgICAgICAgICAvLyBhZGRpdGlvbmFsIGF0dHJpYnV0ZXMuICBXZSBzaG91bGQgbG9vayBpZiB0aGlzIHBvc3NpYmx5IG92ZXItZ2VuZXJhbGl6ZWRcbiAgICAgICAgICAvLyB1dGlsaXR5IChOZXN0KSBpcyBhcHByb3ByaWF0ZSB3aGVuIHdlIHJld29yayBtZW51cyBpbiA2LjRcbiAgICAgICAgICBpZih0eXBlID09PSAnZHJpbGxkb3duJykge1xuICAgICAgICAgICAgJGl0ZW0uYXR0cih7J2FyaWEtZXhwYW5kZWQnOiBmYWxzZX0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAkc3ViXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2RhdGEtc3VibWVudSc6ICcnLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgaWYodHlwZSA9PT0gJ2RyaWxsZG93bicpIHtcbiAgICAgICAgICAkc3ViLmF0dHIoeydhcmlhLWhpZGRlbic6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkge1xuICAgICAgICAkaXRlbS5hZGRDbGFzcyhgaXMtc3VibWVudS1pdGVtICR7c3ViSXRlbUNsYXNzfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIEJ1cm4obWVudSwgdHlwZSkge1xuICAgIHZhciAvL2l0ZW1zID0gbWVudS5maW5kKCdsaScpLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51XG4gICAgICAuZmluZCgnPmxpLCAubWVudSwgLm1lbnUgPiBsaScpXG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7c3ViTWVudUNsYXNzfSAke3N1Ykl0ZW1DbGFzc30gJHtoYXNTdWJDbGFzc30gaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUgaXMtYWN0aXZlYClcbiAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyggICAgICBtZW51LmZpbmQoJy4nICsgc3ViTWVudUNsYXNzICsgJywgLicgKyBzdWJJdGVtQ2xhc3MgKyAnLCAuaGFzLXN1Ym1lbnUsIC5pcy1zdWJtZW51LWl0ZW0sIC5zdWJtZW51LCBbZGF0YS1zdWJtZW51XScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVDbGFzcyhzdWJNZW51Q2xhc3MgKyAnICcgKyBzdWJJdGVtQ2xhc3MgKyAnIGhhcy1zdWJtZW51IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51JylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpKTtcbiAgICAvLyBpdGVtcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgLy8gICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgIC8vICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcbiAgICAvLyAgIGlmKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaXMtc3VibWVudS1pdGVtICcgKyBzdWJJdGVtQ2xhc3MpO1xuICAgIC8vICAgfVxuICAgIC8vICAgaWYoJHN1Yi5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaGFzLXN1Ym1lbnUnKTtcbiAgICAvLyAgICAgJHN1Yi5yZW1vdmVDbGFzcygnc3VibWVudSAnICsgc3ViTWVudUNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk5lc3QgPSBOZXN0O1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmZ1bmN0aW9uIFRpbWVyKGVsZW0sIG9wdGlvbnMsIGNiKSB7XG4gIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24sLy9vcHRpb25zIGlzIGFuIG9iamVjdCBmb3IgZWFzaWx5IGFkZGluZyBmZWF0dXJlcyBsYXRlci5cbiAgICAgIG5hbWVTcGFjZSA9IE9iamVjdC5rZXlzKGVsZW0uZGF0YSgpKVswXSB8fCAndGltZXInLFxuICAgICAgcmVtYWluID0gLTEsXG4gICAgICBzdGFydCxcbiAgICAgIHRpbWVyO1xuXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcblxuICB0aGlzLnJlc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICByZW1haW4gPSAtMTtcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHRoaXMuc3RhcnQoKTtcbiAgfVxuXG4gIHRoaXMuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG4gICAgLy8gaWYoIWVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICByZW1haW4gPSByZW1haW4gPD0gMCA/IGR1cmF0aW9uIDogcmVtYWluO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgZmFsc2UpO1xuICAgIHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGlmKG9wdGlvbnMuaW5maW5pdGUpe1xuICAgICAgICBfdGhpcy5yZXN0YXJ0KCk7Ly9yZXJ1biB0aGUgdGltZXIuXG4gICAgICB9XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9LCByZW1haW4pO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJzdGFydC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxuXG4gIHRoaXMucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gdHJ1ZTtcbiAgICAvL2lmKGVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIHRydWUpO1xuICAgIHZhciBlbmQgPSBEYXRlLm5vdygpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiAtIChlbmQgLSBzdGFydCk7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnBhdXNlZC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1bnMgYSBjYWxsYmFjayBmdW5jdGlvbiB3aGVuIGltYWdlcyBhcmUgZnVsbHkgbG9hZGVkLlxuICogQHBhcmFtIHtPYmplY3R9IGltYWdlcyAtIEltYWdlKHMpIHRvIGNoZWNrIGlmIGxvYWRlZC5cbiAqIEBwYXJhbSB7RnVuY30gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gaW1hZ2UgaXMgZnVsbHkgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBvbkltYWdlc0xvYWRlZChpbWFnZXMsIGNhbGxiYWNrKXtcbiAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgdW5sb2FkZWQgPSBpbWFnZXMubGVuZ3RoO1xuXG4gIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICBpbWFnZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAvLyBDaGVjayBpZiBpbWFnZSBpcyBsb2FkZWRcbiAgICBpZiAodGhpcy5jb21wbGV0ZSB8fCAodGhpcy5yZWFkeVN0YXRlID09PSA0KSB8fCAodGhpcy5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgLy8gRm9yY2UgbG9hZCB0aGUgaW1hZ2VcbiAgICBlbHNlIHtcbiAgICAgIC8vIGZpeCBmb3IgSUUuIFNlZSBodHRwczovL2Nzcy10cmlja3MuY29tL3NuaXBwZXRzL2pxdWVyeS9maXhpbmctbG9hZC1pbi1pZS1mb3ItY2FjaGVkLWltYWdlcy9cbiAgICAgIHZhciBzcmMgPSAkKHRoaXMpLmF0dHIoJ3NyYycpO1xuICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBzcmMgKyAnPycgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkpKTtcbiAgICAgICQodGhpcykub25lKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHNpbmdsZUltYWdlTG9hZGVkKCkge1xuICAgIHVubG9hZGVkLS07XG4gICAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxufVxuXG5Gb3VuZGF0aW9uLlRpbWVyID0gVGltZXI7XG5Gb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkID0gb25JbWFnZXNMb2FkZWQ7XG5cbn0oalF1ZXJ5KTtcbiIsIi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipXb3JrIGluc3BpcmVkIGJ5IG11bHRpcGxlIGpxdWVyeSBzd2lwZSBwbHVnaW5zKipcbi8vKipEb25lIGJ5IFlvaGFpIEFyYXJhdCAqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbihmdW5jdGlvbigkKSB7XG5cbiAgJC5zcG90U3dpcGUgPSB7XG4gICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICBlbmFibGVkOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgcHJldmVudERlZmF1bHQ6IGZhbHNlLFxuICAgIG1vdmVUaHJlc2hvbGQ6IDc1LFxuICAgIHRpbWVUaHJlc2hvbGQ6IDIwMFxuICB9O1xuXG4gIHZhciAgIHN0YXJ0UG9zWCxcbiAgICAgICAgc3RhcnRQb3NZLFxuICAgICAgICBzdGFydFRpbWUsXG4gICAgICAgIGVsYXBzZWRUaW1lLFxuICAgICAgICBpc01vdmluZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XG4gICAgLy8gIGFsZXJ0KHRoaXMpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKTtcbiAgICBpc01vdmluZyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaE1vdmUoZSkge1xuICAgIGlmICgkLnNwb3RTd2lwZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICBpZihpc01vdmluZykge1xuICAgICAgdmFyIHggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICB2YXIgeSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIHZhciBkeCA9IHN0YXJ0UG9zWCAtIHg7XG4gICAgICB2YXIgZHkgPSBzdGFydFBvc1kgLSB5O1xuICAgICAgdmFyIGRpcjtcbiAgICAgIGVsYXBzZWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWU7XG4gICAgICBpZihNYXRoLmFicyhkeCkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAgIGRpciA9IGR4ID4gMCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgICB9XG4gICAgICAvLyBlbHNlIGlmKE1hdGguYWJzKGR5KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgIC8vICAgZGlyID0gZHkgPiAwID8gJ2Rvd24nIDogJ3VwJztcbiAgICAgIC8vIH1cbiAgICAgIGlmKGRpcikge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIG9uVG91Y2hFbmQuY2FsbCh0aGlzKTtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzd2lwZScsIGRpcikudHJpZ2dlcihgc3dpcGUke2Rpcn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xuICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHN0YXJ0UG9zWCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHN0YXJ0UG9zWSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIGlzTW92aW5nID0gdHJ1ZTtcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciAmJiB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCk7XG4gIH1cblxuICAkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7IHNldHVwOiBpbml0IH07XG5cbiAgJC5lYWNoKFsnbGVmdCcsICd1cCcsICdkb3duJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcbiAgICAkLmV2ZW50LnNwZWNpYWxbYHN3aXBlJHt0aGlzfWBdID0geyBzZXR1cDogZnVuY3Rpb24oKXtcbiAgICAgICQodGhpcykub24oJ3N3aXBlJywgJC5ub29wKTtcbiAgICB9IH07XG4gIH0pO1xufSkoalF1ZXJ5KTtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNZXRob2QgZm9yIGFkZGluZyBwc3VlZG8gZHJhZyBldmVudHMgdG8gZWxlbWVudHMgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiFmdW5jdGlvbigkKXtcbiAgJC5mbi5hZGRUb3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgJChlbCkuYmluZCgndG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vd2UgcGFzcyB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0IGJlY2F1c2UgdGhlIGpRdWVyeSBldmVudFxuICAgICAgICAvL29iamVjdCBpcyBub3JtYWxpemVkIHRvIHczYyBzcGVjcyBhbmQgZG9lcyBub3QgcHJvdmlkZSB0aGUgVG91Y2hMaXN0XG4gICAgICAgIGhhbmRsZVRvdWNoKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGhhbmRsZVRvdWNoID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgdmFyIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcyxcbiAgICAgICAgICBmaXJzdCA9IHRvdWNoZXNbMF0sXG4gICAgICAgICAgZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIHRvdWNoc3RhcnQ6ICdtb3VzZWRvd24nLFxuICAgICAgICAgICAgdG91Y2htb3ZlOiAnbW91c2Vtb3ZlJyxcbiAgICAgICAgICAgIHRvdWNoZW5kOiAnbW91c2V1cCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHR5cGUgPSBldmVudFR5cGVzW2V2ZW50LnR5cGVdLFxuICAgICAgICAgIHNpbXVsYXRlZEV2ZW50XG4gICAgICAgIDtcblxuICAgICAgaWYoJ01vdXNlRXZlbnQnIGluIHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93Lk1vdXNlRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBuZXcgd2luZG93Lk1vdXNlRXZlbnQodHlwZSwge1xuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAnY2FuY2VsYWJsZSc6IHRydWUsXG4gICAgICAgICAgJ3NjcmVlblgnOiBmaXJzdC5zY3JlZW5YLFxuICAgICAgICAgICdzY3JlZW5ZJzogZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAnY2xpZW50WCc6IGZpcnN0LmNsaWVudFgsXG4gICAgICAgICAgJ2NsaWVudFknOiBmaXJzdC5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudCcpO1xuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsIGZpcnN0LnNjcmVlblgsIGZpcnN0LnNjcmVlblksIGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFksIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLypsZWZ0Ki8sIG51bGwpO1xuICAgICAgfVxuICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuICAgIH07XG4gIH07XG59KGpRdWVyeSk7XG5cblxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqRnJvbSB0aGUgalF1ZXJ5IE1vYmlsZSBMaWJyYXJ5Kipcbi8vKipuZWVkIHRvIHJlY3JlYXRlIGZ1bmN0aW9uYWxpdHkqKlxuLy8qKmFuZCB0cnkgdG8gaW1wcm92ZSBpZiBwb3NzaWJsZSoqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyogUmVtb3ZpbmcgdGhlIGpRdWVyeSBmdW5jdGlvbiAqKioqXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuKGZ1bmN0aW9uKCAkLCB3aW5kb3csIHVuZGVmaW5lZCApIHtcblxuXHR2YXIgJGRvY3VtZW50ID0gJCggZG9jdW1lbnQgKSxcblx0XHQvLyBzdXBwb3J0VG91Y2ggPSAkLm1vYmlsZS5zdXBwb3J0LnRvdWNoLFxuXHRcdHRvdWNoU3RhcnRFdmVudCA9ICd0b3VjaHN0YXJ0Jy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiLFxuXHRcdHRvdWNoU3RvcEV2ZW50ID0gJ3RvdWNoZW5kJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCIsXG5cdFx0dG91Y2hNb3ZlRXZlbnQgPSAndG91Y2htb3ZlJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG5cblx0Ly8gc2V0dXAgbmV3IGV2ZW50IHNob3J0Y3V0c1xuXHQkLmVhY2goICggXCJ0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCBcIiArXG5cdFx0XCJzd2lwZSBzd2lwZWxlZnQgc3dpcGVyaWdodFwiICkuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXG5cdFx0JC5mblsgbmFtZSBdID0gZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0cmV0dXJuIGZuID8gdGhpcy5iaW5kKCBuYW1lLCBmbiApIDogdGhpcy50cmlnZ2VyKCBuYW1lICk7XG5cdFx0fTtcblxuXHRcdC8vIGpRdWVyeSA8IDEuOFxuXHRcdGlmICggJC5hdHRyRm4gKSB7XG5cdFx0XHQkLmF0dHJGblsgbmFtZSBdID0gdHJ1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRyaWdnZXJDdXN0b21FdmVudCggb2JqLCBldmVudFR5cGUsIGV2ZW50LCBidWJibGUgKSB7XG5cdFx0dmFyIG9yaWdpbmFsVHlwZSA9IGV2ZW50LnR5cGU7XG5cdFx0ZXZlbnQudHlwZSA9IGV2ZW50VHlwZTtcblx0XHRpZiAoIGJ1YmJsZSApIHtcblx0XHRcdCQuZXZlbnQudHJpZ2dlciggZXZlbnQsIHVuZGVmaW5lZCwgb2JqICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQuZXZlbnQuZGlzcGF0Y2guY2FsbCggb2JqLCBldmVudCApO1xuXHRcdH1cblx0XHRldmVudC50eXBlID0gb3JpZ2luYWxUeXBlO1xuXHR9XG5cblx0Ly8gYWxzbyBoYW5kbGVzIHRhcGhvbGRcblxuXHQvLyBBbHNvIGhhbmRsZXMgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0XG5cdCQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHtcblxuXHRcdC8vIE1vcmUgdGhhbiB0aGlzIGhvcml6b250YWwgZGlzcGxhY2VtZW50LCBhbmQgd2Ugd2lsbCBzdXBwcmVzcyBzY3JvbGxpbmcuXG5cdFx0c2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZDogMzAsXG5cblx0XHQvLyBNb3JlIHRpbWUgdGhhbiB0aGlzLCBhbmQgaXQgaXNuJ3QgYSBzd2lwZS5cblx0XHRkdXJhdGlvblRocmVzaG9sZDogMTAwMCxcblxuXHRcdC8vIFN3aXBlIGhvcml6b250YWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbW9yZSB0aGFuIHRoaXMuXG5cdFx0aG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdC8vIFN3aXBlIHZlcnRpY2FsIGRpc3BsYWNlbWVudCBtdXN0IGJlIGxlc3MgdGhhbiB0aGlzLlxuXHRcdHZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Z2V0TG9jYXRpb246IGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHR2YXIgd2luUGFnZVggPSB3aW5kb3cucGFnZVhPZmZzZXQsXG5cdFx0XHRcdHdpblBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuXHRcdFx0XHR4ID0gZXZlbnQuY2xpZW50WCxcblx0XHRcdFx0eSA9IGV2ZW50LmNsaWVudFk7XG5cblx0XHRcdGlmICggZXZlbnQucGFnZVkgPT09IDAgJiYgTWF0aC5mbG9vciggeSApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVkgKSB8fFxuXHRcdFx0XHRldmVudC5wYWdlWCA9PT0gMCAmJiBNYXRoLmZsb29yKCB4ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIGlPUzQgY2xpZW50WC9jbGllbnRZIGhhdmUgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGhhdmUgYmVlblxuXHRcdFx0XHQvLyBpbiBwYWdlWC9wYWdlWS4gV2hpbGUgcGFnZVgvcGFnZS8gaGF2ZSB0aGUgdmFsdWUgMFxuXHRcdFx0XHR4ID0geCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0geSAtIHdpblBhZ2VZO1xuXHRcdFx0fSBlbHNlIGlmICggeSA8ICggZXZlbnQucGFnZVkgLSB3aW5QYWdlWSkgfHwgeCA8ICggZXZlbnQucGFnZVggLSB3aW5QYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIFNvbWUgQW5kcm9pZCBicm93c2VycyBoYXZlIHRvdGFsbHkgYm9ndXMgdmFsdWVzIGZvciBjbGllbnRYL1lcblx0XHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcvem9vbWluZyBhIHBhZ2UuIERldGVjdGFibGUgc2luY2UgY2xpZW50WC9jbGllbnRZXG5cdFx0XHRcdC8vIHNob3VsZCBuZXZlciBiZSBzbWFsbGVyIHRoYW4gcGFnZVgvcGFnZVkgbWludXMgcGFnZSBzY3JvbGxcblx0XHRcdFx0eCA9IGV2ZW50LnBhZ2VYIC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSBldmVudC5wYWdlWSAtIHdpblBhZ2VZO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiB4LFxuXHRcdFx0XHR5OiB5XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXSxcblx0XHRcdFx0XHRcdG9yaWdpbjogJCggZXZlbnQudGFyZ2V0IClcblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlU3dpcGU6IGZ1bmN0aW9uKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApIHtcblx0XHRcdGlmICggc3RvcC50aW1lIC0gc3RhcnQudGltZSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5kdXJhdGlvblRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDEgXSAtIHN0b3AuY29vcmRzWyAxIF0gKSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS52ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkICkge1xuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gc3RhcnQuY29vcmRzWzBdID4gc3RvcC5jb29yZHNbIDAgXSA/IFwic3dpcGVsZWZ0XCIgOiBcInN3aXBlcmlnaHRcIjtcblxuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIFwic3dpcGVcIiwgJC5FdmVudCggXCJzd2lwZVwiLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9KSwgdHJ1ZSApO1xuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIGRpcmVjdGlvbiwkLkV2ZW50KCBkaXJlY3Rpb24sIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0gKSwgdHJ1ZSApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdH0sXG5cblx0XHQvLyBUaGlzIHNlcnZlcyBhcyBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgYXQgbW9zdCBvbmUgc3dpcGUgZXZlbnQgZXZlbnQgaXNcblx0XHQvLyBpbiB3b3JrIGF0IGFueSBnaXZlbiB0aW1lXG5cdFx0ZXZlbnRJblByb2dyZXNzOiBmYWxzZSxcblxuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsXG5cdFx0XHRcdHRoaXNPYmplY3QgPSB0aGlzLFxuXHRcdFx0XHQkdGhpcyA9ICQoIHRoaXNPYmplY3QgKSxcblx0XHRcdFx0Y29udGV4dCA9IHt9O1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSB0aGUgZXZlbnRzIGRhdGEgZm9yIHRoaXMgZWxlbWVudCBhbmQgYWRkIHRoZSBzd2lwZSBjb250ZXh0XG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoICFldmVudHMgKSB7XG5cdFx0XHRcdGV2ZW50cyA9IHsgbGVuZ3RoOiAwIH07XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIsIGV2ZW50cyApO1xuXHRcdFx0fVxuXHRcdFx0ZXZlbnRzLmxlbmd0aCsrO1xuXHRcdFx0ZXZlbnRzLnN3aXBlID0gY29udGV4dDtcblxuXHRcdFx0Y29udGV4dC5zdGFydCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblxuXHRcdFx0XHQvLyBCYWlsIGlmIHdlJ3JlIGFscmVhZHkgd29ya2luZyBvbiBhIHN3aXBlIGV2ZW50XG5cdFx0XHRcdGlmICggJC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IHRydWU7XG5cblx0XHRcdFx0dmFyIHN0b3AsXG5cdFx0XHRcdFx0c3RhcnQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RhcnQoIGV2ZW50ICksXG5cdFx0XHRcdFx0b3JpZ1RhcmdldCA9IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRlbWl0dGVkID0gZmFsc2U7XG5cblx0XHRcdFx0Y29udGV4dC5tb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGlmICggIXN0YXJ0IHx8IGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHN0b3AgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RvcCggZXZlbnQgKTtcblx0XHRcdFx0XHRpZiAoICFlbWl0dGVkICkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5oYW5kbGVTd2lwZSggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKTtcblx0XHRcdFx0XHRcdGlmICggZW1pdHRlZCApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBwcmV2ZW50IHNjcm9sbGluZ1xuXHRcdFx0XHRcdGlmICggTWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQgKSB7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb250ZXh0LnN0b3AgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0XHRcdGNvbnRleHQubW92ZSA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JGRvY3VtZW50Lm9uKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlIClcblx0XHRcdFx0XHQub25lKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHR9O1xuXHRcdFx0JHRoaXMub24oIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLCBjb250ZXh0O1xuXG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoIGV2ZW50cyApIHtcblx0XHRcdFx0Y29udGV4dCA9IGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZGVsZXRlIGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZXZlbnRzLmxlbmd0aC0tO1xuXHRcdFx0XHRpZiAoIGV2ZW50cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRcdFx0JC5yZW1vdmVEYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggY29udGV4dCApIHtcblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0YXJ0ICkge1xuXHRcdFx0XHRcdCQoIHRoaXMgKS5vZmYoIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5tb3ZlICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RvcCApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdCQuZWFjaCh7XG5cdFx0c3dpcGVsZWZ0OiBcInN3aXBlLmxlZnRcIixcblx0XHRzd2lwZXJpZ2h0OiBcInN3aXBlLnJpZ2h0XCJcblx0fSwgZnVuY3Rpb24oIGV2ZW50LCBzb3VyY2VFdmVudCApIHtcblxuXHRcdCQuZXZlbnQuc3BlY2lhbFsgZXZlbnQgXSA9IHtcblx0XHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLmJpbmQoIHNvdXJjZUV2ZW50LCAkLm5vb3AgKTtcblx0XHRcdH0sXG5cdFx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS51bmJpbmQoIHNvdXJjZUV2ZW50ICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59KSggalF1ZXJ5LCB0aGlzICk7XG4qL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4gIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGAke3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgIGluIHdpbmRvdykge1xuICAgICAgcmV0dXJuIHdpbmRvd1tgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYF07XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn0oKSk7XG5cbmNvbnN0IHRyaWdnZXJzID0gKGVsLCB0eXBlKSA9PiB7XG4gIGVsLmRhdGEodHlwZSkuc3BsaXQoJyAnKS5mb3JFYWNoKGlkID0+IHtcbiAgICAkKGAjJHtpZH1gKVsgdHlwZSA9PT0gJ2Nsb3NlJyA/ICd0cmlnZ2VyJyA6ICd0cmlnZ2VySGFuZGxlciddKGAke3R5cGV9LnpmLnRyaWdnZXJgLCBbZWxdKTtcbiAgfSk7XG59O1xuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1vcGVuXSB3aWxsIHJldmVhbCBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLW9wZW5dJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICdvcGVuJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zZV0gd2lsbCBjbG9zZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbi8vIElmIHVzZWQgd2l0aG91dCBhIHZhbHVlIG9uIFtkYXRhLWNsb3NlXSwgdGhlIGV2ZW50IHdpbGwgYnViYmxlLCBhbGxvd2luZyBpdCB0byBjbG9zZSBhIHBhcmVudCBjb21wb25lbnQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1jbG9zZV0nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCdjbG9zZScpO1xuICBpZiAoaWQpIHtcbiAgICB0cmlnZ2VycygkKHRoaXMpLCAnY2xvc2UnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlLnpmLnRyaWdnZXInKTtcbiAgfVxufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtdG9nZ2xlXSB3aWxsIHRvZ2dsZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZV0nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ3RvZ2dsZScpO1xuICB9IGVsc2Uge1xuICAgICQodGhpcykudHJpZ2dlcigndG9nZ2xlLnpmLnRyaWdnZXInKTtcbiAgfVxufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2FibGVdIHdpbGwgcmVzcG9uZCB0byBjbG9zZS56Zi50cmlnZ2VyIGV2ZW50cy5cbiQoZG9jdW1lbnQpLm9uKCdjbG9zZS56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NhYmxlXScsIGZ1bmN0aW9uKGUpe1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBsZXQgYW5pbWF0aW9uID0gJCh0aGlzKS5kYXRhKCdjbG9zYWJsZScpO1xuXG4gIGlmKGFuaW1hdGlvbiAhPT0gJycpe1xuICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoJCh0aGlzKSwgYW5pbWF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gICAgfSk7XG4gIH1lbHNle1xuICAgICQodGhpcykuZmFkZU91dCgpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICB9XG59KTtcblxuJChkb2N1bWVudCkub24oJ2ZvY3VzLnpmLnRyaWdnZXIgYmx1ci56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZS1mb2N1c10nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUtZm9jdXMnKTtcbiAgJChgIyR7aWR9YCkudHJpZ2dlckhhbmRsZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJywgWyQodGhpcyldKTtcbn0pO1xuXG4vKipcbiogRmlyZXMgb25jZSBhZnRlciBhbGwgb3RoZXIgc2NyaXB0cyBoYXZlIGxvYWRlZFxuKiBAZnVuY3Rpb25cbiogQHByaXZhdGVcbiovXG4kKHdpbmRvdykub24oJ2xvYWQnLCAoKSA9PiB7XG4gIGNoZWNrTGlzdGVuZXJzKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lcnMoKSB7XG4gIGV2ZW50c0xpc3RlbmVyKCk7XG4gIHJlc2l6ZUxpc3RlbmVyKCk7XG4gIHNjcm9sbExpc3RlbmVyKCk7XG4gIG11dGF0ZUxpc3RlbmVyKCk7XG4gIGNsb3NlbWVMaXN0ZW5lcigpO1xufVxuXG4vLyoqKioqKioqIG9ubHkgZmlyZXMgdGhpcyBmdW5jdGlvbiBvbmNlIG9uIGxvYWQsIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRvIHdhdGNoICoqKioqKioqXG5mdW5jdGlvbiBjbG9zZW1lTGlzdGVuZXIocGx1Z2luTmFtZSkge1xuICB2YXIgeWV0aUJveGVzID0gJCgnW2RhdGEteWV0aS1ib3hdJyksXG4gICAgICBwbHVnTmFtZXMgPSBbJ2Ryb3Bkb3duJywgJ3Rvb2x0aXAnLCAncmV2ZWFsJ107XG5cbiAgaWYocGx1Z2luTmFtZSl7XG4gICAgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5wdXNoKHBsdWdpbk5hbWUpO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGx1Z2luTmFtZVswXSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLmNvbmNhdChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsdWdpbiBuYW1lcyBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gIH1cbiAgaWYoeWV0aUJveGVzLmxlbmd0aCl7XG4gICAgbGV0IGxpc3RlbmVycyA9IHBsdWdOYW1lcy5tYXAoKG5hbWUpID0+IHtcbiAgICAgIHJldHVybiBgY2xvc2VtZS56Zi4ke25hbWV9YDtcbiAgICB9KS5qb2luKCcgJyk7XG5cbiAgICAkKHdpbmRvdykub2ZmKGxpc3RlbmVycykub24obGlzdGVuZXJzLCBmdW5jdGlvbihlLCBwbHVnaW5JZCl7XG4gICAgICBsZXQgcGx1Z2luID0gZS5uYW1lc3BhY2Uuc3BsaXQoJy4nKVswXTtcbiAgICAgIGxldCBwbHVnaW5zID0gJChgW2RhdGEtJHtwbHVnaW59XWApLm5vdChgW2RhdGEteWV0aS1ib3g9XCIke3BsdWdpbklkfVwiXWApO1xuXG4gICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IF90aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBfdGhpcy50cmlnZ2VySGFuZGxlcignY2xvc2UuemYudHJpZ2dlcicsIFtfdGhpc10pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzaXplTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1yZXNpemVdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Jlc2l6ZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSByZXNpemUgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJyZXNpemVcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCByZXNpemUgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXNjcm9sbF0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLnRyaWdnZXInKVxuICAgIC5vbignc2Nyb2xsLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKHRpbWVyKXsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHNjcm9sbCBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInNjcm9sbFwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHNjcm9sbCBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIG11dGF0ZUxpc3RlbmVyKGRlYm91bmNlKSB7XG4gICAgbGV0ICRub2RlcyA9ICQoJ1tkYXRhLW11dGF0ZV0nKTtcbiAgICBpZiAoJG5vZGVzLmxlbmd0aCAmJiBNdXRhdGlvbk9ic2VydmVyKXtcblx0XHRcdC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBtdXRhdGUgZXZlbnRcbiAgICAgIC8vbm8gSUUgOSBvciAxMFxuXHRcdFx0JG5vZGVzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0ICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG5cdFx0XHR9KTtcbiAgICB9XG4gfVxuXG5mdW5jdGlvbiBldmVudHNMaXN0ZW5lcigpIHtcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaXplXSwgW2RhdGEtc2Nyb2xsXSwgW2RhdGEtbXV0YXRlXScpO1xuXG4gIC8vZWxlbWVudCBjYWxsYmFja1xuICB2YXIgbGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiA9IGZ1bmN0aW9uIChtdXRhdGlvblJlY29yZHNMaXN0KSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQobXV0YXRpb25SZWNvcmRzTGlzdFswXS50YXJnZXQpO1xuXG5cdCAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgICAgc3dpdGNoIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnR5cGUpIHtcblxuICAgICAgICBjYXNlIFwiYXR0cmlidXRlc1wiOlxuICAgICAgICAgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJzY3JvbGxcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuXHRcdCAgfVxuXHRcdCAgaWYgKCR0YXJnZXQuYXR0cihcImRhdGEtZXZlbnRzXCIpID09PSBcInJlc2l6ZVwiICYmIG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0uYXR0cmlidXRlTmFtZSA9PT0gXCJkYXRhLWV2ZW50c1wiKSB7XG5cdFx0ICBcdCR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuXHRcdCAgIH1cblx0XHQgIGlmIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwic3R5bGVcIikge1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcblx0XHQgIH1cblx0XHQgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgXCJjaGlsZExpc3RcIjpcblx0XHQgICR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIikuYXR0cihcImRhdGEtZXZlbnRzXCIsXCJtdXRhdGVcIik7XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgLy9ub3RoaW5nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbiAgICAgIC8vZm9yIGVhY2ggZWxlbWVudCB0aGF0IG5lZWRzIHRvIGxpc3RlbiBmb3IgcmVzaXppbmcsIHNjcm9sbGluZywgb3IgbXV0YXRpb24gYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgICBlbGVtZW50T2JzZXJ2ZXIub2JzZXJ2ZShub2Rlc1tpXSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFtcImRhdGEtZXZlbnRzXCIsIFwic3R5bGVcIl0gfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBbUEhdXG4vLyBGb3VuZGF0aW9uLkNoZWNrV2F0Y2hlcnMgPSBjaGVja1dhdGNoZXJzO1xuRm91bmRhdGlvbi5JSGVhcllvdSA9IGNoZWNrTGlzdGVuZXJzO1xuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XG4vLyBGb3VuZGF0aW9uLklGZWVsWW91ID0gY2xvc2VtZUxpc3RlbmVyO1xuXG59KGpRdWVyeSk7XG5cbi8vIGZ1bmN0aW9uIGRvbU11dGF0aW9uT2JzZXJ2ZXIoZGVib3VuY2UpIHtcbi8vICAgLy8gISEhIFRoaXMgaXMgY29taW5nIHNvb24gYW5kIG5lZWRzIG1vcmUgd29yazsgbm90IGFjdGl2ZSAgISEhIC8vXG4vLyAgIHZhciB0aW1lcixcbi8vICAgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1tdXRhdGVdJyk7XG4vLyAgIC8vXG4vLyAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbi8vICAgICAvLyB2YXIgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4vLyAgICAgLy8gICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbi8vICAgICAvLyAgIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgLy8gICAgIGlmIChwcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJyBpbiB3aW5kb3cpIHtcbi8vICAgICAvLyAgICAgICByZXR1cm4gd2luZG93W3ByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInXTtcbi8vICAgICAvLyAgICAgfVxuLy8gICAgIC8vICAgfVxuLy8gICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuLy8gICAgIC8vIH0oKSk7XG4vL1xuLy9cbi8vICAgICAvL2ZvciB0aGUgYm9keSwgd2UgbmVlZCB0byBsaXN0ZW4gZm9yIGFsbCBjaGFuZ2VzIGVmZmVjdGluZyB0aGUgc3R5bGUgYW5kIGNsYXNzIGF0dHJpYnV0ZXNcbi8vICAgICB2YXIgYm9keU9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoYm9keU11dGF0aW9uKTtcbi8vICAgICBib2R5T2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6dHJ1ZSwgYXR0cmlidXRlRmlsdGVyOltcInN0eWxlXCIsIFwiY2xhc3NcIl19KTtcbi8vXG4vL1xuLy8gICAgIC8vYm9keSBjYWxsYmFja1xuLy8gICAgIGZ1bmN0aW9uIGJvZHlNdXRhdGlvbihtdXRhdGUpIHtcbi8vICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBtdXRhdGlvbiBldmVudFxuLy8gICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cbi8vXG4vLyAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgIGJvZHlPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4vLyAgICAgICAgICQoJ1tkYXRhLW11dGF0ZV0nKS5hdHRyKCdkYXRhLWV2ZW50cycsXCJtdXRhdGVcIik7XG4vLyAgICAgICB9LCBkZWJvdW5jZSB8fCAxNTApO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFiaWRlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hYmlkZVxuICovXG5cbmNsYXNzIEFiaWRlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWJpZGUjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEFiaWRlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBYmlkZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBBYmlkZSBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgQWJpZGUgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQsIHRleHRhcmVhLCBzZWxlY3QnKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgQWJpZGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuYWJpZGUnKVxuICAgICAgLm9uKCdyZXNldC56Zi5hYmlkZScsICgpID0+IHtcbiAgICAgICAgdGhpcy5yZXNldEZvcm0oKTtcbiAgICAgIH0pXG4gICAgICAub24oJ3N1Ym1pdC56Zi5hYmlkZScsICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVGb3JtKCk7XG4gICAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudmFsaWRhdGVPbiA9PT0gJ2ZpZWxkQ2hhbmdlJykge1xuICAgICAgdGhpcy4kaW5wdXRzXG4gICAgICAgIC5vZmYoJ2NoYW5nZS56Zi5hYmlkZScpXG4gICAgICAgIC5vbignY2hhbmdlLnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmxpdmVWYWxpZGF0ZSkge1xuICAgICAgdGhpcy4kaW5wdXRzXG4gICAgICAgIC5vZmYoJ2lucHV0LnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdpbnB1dC56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52YWxpZGF0ZU9uQmx1cikge1xuICAgICAgdGhpcy4kaW5wdXRzXG4gICAgICAgIC5vZmYoJ2JsdXIuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2JsdXIuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBBYmlkZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIG9yIG5vdCBhIGZvcm0gZWxlbWVudCBoYXMgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBhbmQgaWYgaXQncyBjaGVja2VkIG9yIG5vdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICByZXF1aXJlZENoZWNrKCRlbCkge1xuICAgIGlmICghJGVsLmF0dHIoJ3JlcXVpcmVkJykpIHJldHVybiB0cnVlO1xuXG4gICAgdmFyIGlzR29vZCA9IHRydWU7XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIGlzR29vZCA9ICRlbFswXS5jaGVja2VkO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFyIG9wdCA9ICRlbC5maW5kKCdvcHRpb246c2VsZWN0ZWQnKTtcbiAgICAgICAgaWYgKCFvcHQubGVuZ3RoIHx8ICFvcHQudmFsKCkpIGlzR29vZCA9IGZhbHNlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYoISRlbC52YWwoKSB8fCAhJGVsLnZhbCgpLmxlbmd0aCkgaXNHb29kID0gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzR29vZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYXNlZCBvbiAkZWwsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB3aXRoIHNlbGVjdG9yIGluIHRoaXMgb3JkZXI6XG4gICAqIDEuIFRoZSBlbGVtZW50J3MgZGlyZWN0IHNpYmxpbmcoJ3MpLlxuICAgKiAzLiBUaGUgZWxlbWVudCdzIHBhcmVudCdzIGNoaWxkcmVuLlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyBmb3IgbXVsdGlwbGUgZm9ybSBlcnJvcnMgcGVyIGlucHV0LCB0aG91Z2ggaWYgbm9uZSBhcmUgZm91bmQsIG5vIGZvcm0gZXJyb3JzIHdpbGwgYmUgc2hvd24uXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyByZWZlcmVuY2UgdG8gZmluZCB0aGUgZm9ybSBlcnJvciBzZWxlY3Rvci5cbiAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IG9iamVjdCB3aXRoIHRoZSBzZWxlY3Rvci5cbiAgICovXG4gIGZpbmRGb3JtRXJyb3IoJGVsKSB7XG4gICAgdmFyICRlcnJvciA9ICRlbC5zaWJsaW5ncyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuXG4gICAgaWYgKCEkZXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZXJyb3IgPSAkZWwucGFyZW50KCkuZmluZCh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiAkZXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoaXMgb3JkZXI6XG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kTGFiZWwoJGVsKSB7XG4gICAgdmFyIGlkID0gJGVsWzBdLmlkO1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLiRlbGVtZW50LmZpbmQoYGxhYmVsW2Zvcj1cIiR7aWR9XCJdYCk7XG5cbiAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAkZWwuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGxhYmVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2V0IG9mIGxhYmVscyBhc3NvY2lhdGVkIHdpdGggYSBzZXQgb2YgcmFkaW8gZWxzIGluIHRoaXMgb3JkZXJcbiAgICogMi4gVGhlIDxsYWJlbD4gd2l0aCB0aGUgYXR0cmlidXRlIGBbZm9yPVwic29tZUlucHV0SWRcIl1gXG4gICAqIDMuIFRoZSBgLmNsb3Nlc3QoKWAgPGxhYmVsPlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIGZpbmRSYWRpb0xhYmVscygkZWxzKSB7XG4gICAgdmFyIGxhYmVscyA9ICRlbHMubWFwKChpLCBlbCkgPT4ge1xuICAgICAgdmFyIGlkID0gZWwuaWQ7XG4gICAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgJGxhYmVsID0gJChlbCkuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAkbGFiZWxbMF07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gJChsYWJlbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIENTUyBlcnJvciBjbGFzcyBhcyBzcGVjaWZpZWQgYnkgdGhlIEFiaWRlIHNldHRpbmdzIHRvIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIGNsYXNzIHRvXG4gICAqL1xuICBhZGRFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgdmFyICRsYWJlbCA9IHRoaXMuZmluZExhYmVsKCRlbCk7XG4gICAgdmFyICRmb3JtRXJyb3IgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVsKTtcblxuICAgIGlmICgkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAkbGFiZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZm9ybUVycm9yLmFkZENsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLmF0dHIoJ2RhdGEtaW52YWxpZCcsICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgQ1NTIGVycm9yIGNsYXNzZXMgZXRjIGZyb20gYW4gZW50aXJlIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICpcbiAgICovXG5cbiAgcmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMoZ3JvdXBOYW1lKSB7XG4gICAgdmFyICRlbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyICRsYWJlbHMgPSB0aGlzLmZpbmRSYWRpb0xhYmVscygkZWxzKTtcbiAgICB2YXIgJGZvcm1FcnJvcnMgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVscyk7XG5cbiAgICBpZiAoJGxhYmVscy5sZW5ndGgpIHtcbiAgICAgICRsYWJlbHMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3JzLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvcnMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyBmcm9tIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byByZW1vdmUgdGhlIGNsYXNzIGZyb21cbiAgICovXG4gIHJlbW92ZUVycm9yQ2xhc3NlcygkZWwpIHtcbiAgICAvLyByYWRpb3MgbmVlZCB0byBjbGVhciBhbGwgb2YgdGhlIGVsc1xuICAgIGlmKCRlbFswXS50eXBlID09ICdyYWRpbycpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKCRlbC5hdHRyKCduYW1lJykpO1xuICAgIH1cblxuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIHRvIGZpbmQgaW5wdXRzIGFuZCBwcm9jZWVkcyB0byB2YWxpZGF0ZSB0aGVtIGluIHdheXMgc3BlY2lmaWMgdG8gdGhlaXIgdHlwZVxuICAgKiBAZmlyZXMgQWJpZGUjaW52YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjdmFsaWRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYW4gSFRNTCBpbnB1dFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZ29vZFRvR28gLSBJZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LlxuICAgKi9cbiAgdmFsaWRhdGVJbnB1dCgkZWwpIHtcbiAgICB2YXIgY2xlYXJSZXF1aXJlID0gdGhpcy5yZXF1aXJlZENoZWNrKCRlbCksXG4gICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlLFxuICAgICAgICBjdXN0b21WYWxpZGF0b3IgPSB0cnVlLFxuICAgICAgICB2YWxpZGF0b3IgPSAkZWwuYXR0cignZGF0YS12YWxpZGF0b3InKSxcbiAgICAgICAgZXF1YWxUbyA9IHRydWU7XG5cbiAgICAvLyBkb24ndCB2YWxpZGF0ZSBpZ25vcmVkIGlucHV0cyBvciBoaWRkZW4gaW5wdXRzXG4gICAgaWYgKCRlbC5pcygnW2RhdGEtYWJpZGUtaWdub3JlXScpIHx8ICRlbC5pcygnW3R5cGU9XCJoaWRkZW5cIl0nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlUmFkaW8oJGVsLmF0dHIoJ25hbWUnKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVUZXh0KCRlbCk7XG4gICAgfVxuXG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdGhpcy5tYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3IsICRlbC5hdHRyKCdyZXF1aXJlZCcpKTtcbiAgICB9XG5cbiAgICBpZiAoJGVsLmF0dHIoJ2RhdGEtZXF1YWx0bycpKSB7XG4gICAgICBlcXVhbFRvID0gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnMuZXF1YWxUbygkZWwpO1xuICAgIH1cblxuXG4gICAgdmFyIGdvb2RUb0dvID0gW2NsZWFyUmVxdWlyZSwgdmFsaWRhdGVkLCBjdXN0b21WYWxpZGF0b3IsIGVxdWFsVG9dLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbiAgICB2YXIgbWVzc2FnZSA9IChnb29kVG9HbyA/ICd2YWxpZCcgOiAnaW52YWxpZCcpICsgJy56Zi5hYmlkZSc7XG5cbiAgICBpZiAoZ29vZFRvR28pIHtcbiAgICAgIC8vIFJlLXZhbGlkYXRlIGlucHV0cyB0aGF0IGRlcGVuZCBvbiB0aGlzIG9uZSB3aXRoIGVxdWFsdG9cbiAgICAgIGNvbnN0IGRlcGVuZGVudEVsZW1lbnRzID0gdGhpcy4kZWxlbWVudC5maW5kKGBbZGF0YS1lcXVhbHRvPVwiJHskZWwuYXR0cignaWQnKX1cIl1gKTtcbiAgICAgIGlmIChkZXBlbmRlbnRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgbGV0IF90aGlzID0gdGhpcztcbiAgICAgICAgZGVwZW5kZW50RWxlbWVudHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJCh0aGlzKS52YWwoKSkge1xuICAgICAgICAgICAgX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXNbZ29vZFRvR28gPyAncmVtb3ZlRXJyb3JDbGFzc2VzJyA6ICdhZGRFcnJvckNsYXNzZXMnXSgkZWwpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaW5wdXQgaXMgZG9uZSBjaGVja2luZyBmb3IgdmFsaWRhdGlvbi4gRXZlbnQgdHJpZ2dlciBpcyBlaXRoZXIgYHZhbGlkLnpmLmFiaWRlYCBvciBgaW52YWxpZC56Zi5hYmlkZWBcbiAgICAgKiBUcmlnZ2VyIGluY2x1ZGVzIHRoZSBET00gZWxlbWVudCBvZiB0aGUgaW5wdXQuXG4gICAgICogQGV2ZW50IEFiaWRlI3ZhbGlkXG4gICAgICogQGV2ZW50IEFiaWRlI2ludmFsaWRcbiAgICAgKi9cbiAgICAkZWwudHJpZ2dlcihtZXNzYWdlLCBbJGVsXSk7XG5cbiAgICByZXR1cm4gZ29vZFRvR287XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSBhbmQgaWYgdGhlcmUgYXJlIGFueSBpbnZhbGlkIGlucHV0cywgaXQgd2lsbCBkaXNwbGF5IHRoZSBmb3JtIGVycm9yIGVsZW1lbnRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IG5vRXJyb3IgLSB0cnVlIGlmIG5vIGVycm9ycyB3ZXJlIGRldGVjdGVkLi4uXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtdmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1pbnZhbGlkXG4gICAqL1xuICB2YWxpZGF0ZUZvcm0oKSB7XG4gICAgdmFyIGFjYyA9IFtdO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRpbnB1dHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGFjYy5wdXNoKF90aGlzLnZhbGlkYXRlSW5wdXQoJCh0aGlzKSkpO1xuICAgIH0pO1xuXG4gICAgdmFyIG5vRXJyb3IgPSBhY2MuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAobm9FcnJvciA/ICdub25lJyA6ICdibG9jaycpKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGZvcm0gaXMgZmluaXNoZWQgdmFsaWRhdGluZy4gRXZlbnQgdHJpZ2dlciBpcyBlaXRoZXIgYGZvcm12YWxpZC56Zi5hYmlkZWAgb3IgYGZvcm1pbnZhbGlkLnpmLmFiaWRlYC5cbiAgICAgKiBUcmlnZ2VyIGluY2x1ZGVzIHRoZSBlbGVtZW50IG9mIHRoZSBmb3JtLlxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybWludmFsaWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoKG5vRXJyb3IgPyAnZm9ybXZhbGlkJyA6ICdmb3JtaW52YWxpZCcpICsgJy56Zi5hYmlkZScsIFt0aGlzLiRlbGVtZW50XSk7XG5cbiAgICByZXR1cm4gbm9FcnJvcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSB0ZXh0IGlucHV0IGlzIHZhbGlkIGJhc2VkIG9uIHRoZSBwYXR0ZXJuIHNwZWNpZmllZCBpbiB0aGUgYXR0cmlidXRlLiBJZiBubyBtYXRjaGluZyBwYXR0ZXJuIGlzIGZvdW5kLCByZXR1cm5zIHRydWUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYSB0ZXh0IGlucHV0IEhUTUwgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0dGVybiAtIHN0cmluZyB2YWx1ZSBvZiBvbmUgb2YgdGhlIFJlZ0V4IHBhdHRlcm5zIGluIEFiaWRlLm9wdGlvbnMucGF0dGVybnNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgdmFsdWUgbWF0Y2hlcyB0aGUgcGF0dGVybiBzcGVjaWZpZWRcbiAgICovXG4gIHZhbGlkYXRlVGV4dCgkZWwsIHBhdHRlcm4pIHtcbiAgICAvLyBBIHBhdHRlcm4gY2FuIGJlIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uLCBvciBpdCB3aWxsIGJlIGluZmVyZWQgZnJvbSB0aGUgaW5wdXQncyBcInBhdHRlcm5cIiBhdHRyaWJ1dGUsIG9yIGl0J3MgXCJ0eXBlXCIgYXR0cmlidXRlXG4gICAgcGF0dGVybiA9IChwYXR0ZXJuIHx8ICRlbC5hdHRyKCdwYXR0ZXJuJykgfHwgJGVsLmF0dHIoJ3R5cGUnKSk7XG4gICAgdmFyIGlucHV0VGV4dCA9ICRlbC52YWwoKTtcbiAgICB2YXIgdmFsaWQgPSBmYWxzZTtcblxuICAgIGlmIChpbnB1dFRleHQubGVuZ3RoKSB7XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQgaXMgaW4gQWJpZGUncyBsaXN0IG9mIHBhdHRlcm5zLCB0aGVuIHRlc3QgdGhhdCByZWdleHBcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF0dGVybnMuaGFzT3duUHJvcGVydHkocGF0dGVybikpIHtcbiAgICAgICAgdmFsaWQgPSB0aGlzLm9wdGlvbnMucGF0dGVybnNbcGF0dGVybl0udGVzdChpbnB1dFRleHQpO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gbmFtZSBpc24ndCBhbHNvIHRoZSB0eXBlIGF0dHJpYnV0ZSBvZiB0aGUgZmllbGQsIHRoZW4gdGVzdCBpdCBhcyBhIHJlZ2V4cFxuICAgICAgZWxzZSBpZiAocGF0dGVybiAhPT0gJGVsLmF0dHIoJ3R5cGUnKSkge1xuICAgICAgICB2YWxpZCA9IG5ldyBSZWdFeHAocGF0dGVybikudGVzdChpbnB1dFRleHQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQW4gZW1wdHkgZmllbGQgaXMgdmFsaWQgaWYgaXQncyBub3QgcmVxdWlyZWRcbiAgICBlbHNlIGlmICghJGVsLnByb3AoJ3JlcXVpcmVkJykpIHtcbiAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHJhZGlvIGlucHV0IGlzIHZhbGlkIGJhc2VkIG9uIHdoZXRoZXIgb3Igbm90IGl0IGlzIHJlcXVpcmVkIGFuZCBzZWxlY3RlZC4gQWx0aG91Z2ggdGhlIGZ1bmN0aW9uIHRhcmdldHMgYSBzaW5nbGUgYDxpbnB1dD5gLCBpdCB2YWxpZGF0ZXMgYnkgY2hlY2tpbmcgdGhlIGByZXF1aXJlZGAgYW5kIGBjaGVja2VkYCBwcm9wZXJ0aWVzIG9mIGFsbCByYWRpbyBidXR0b25zIGluIGl0cyBncm91cC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXQgbGVhc3Qgb25lIHJhZGlvIGlucHV0IGhhcyBiZWVuIHNlbGVjdGVkIChpZiBpdCdzIHJlcXVpcmVkKVxuICAgKi9cbiAgdmFsaWRhdGVSYWRpbyhncm91cE5hbWUpIHtcbiAgICAvLyBJZiBhdCBsZWFzdCBvbmUgcmFkaW8gaW4gdGhlIGdyb3VwIGhhcyB0aGUgYHJlcXVpcmVkYCBhdHRyaWJ1dGUsIHRoZSBncm91cCBpcyBjb25zaWRlcmVkIHJlcXVpcmVkXG4gICAgLy8gUGVyIFczQyBzcGVjLCBhbGwgcmFkaW8gYnV0dG9ucyBpbiBhIGdyb3VwIHNob3VsZCBoYXZlIGByZXF1aXJlZGAsIGJ1dCB3ZSdyZSBiZWluZyBuaWNlXG4gICAgdmFyICRncm91cCA9IHRoaXMuJGVsZW1lbnQuZmluZChgOnJhZGlvW25hbWU9XCIke2dyb3VwTmFtZX1cIl1gKTtcbiAgICB2YXIgdmFsaWQgPSBmYWxzZSwgcmVxdWlyZWQgPSBmYWxzZTtcblxuICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgcmVxdWlyZWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSByZXF1aXJlZFxuICAgICRncm91cC5lYWNoKChpLCBlKSA9PiB7XG4gICAgICBpZiAoJChlKS5hdHRyKCdyZXF1aXJlZCcpKSB7XG4gICAgICAgIHJlcXVpcmVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZighcmVxdWlyZWQpIHZhbGlkPXRydWU7XG5cbiAgICBpZiAoIXZhbGlkKSB7XG4gICAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHZhbGlkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgY2hlY2tlZFxuICAgICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgICAgaWYgKCQoZSkucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZhbGlkO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgYSBzZWxlY3RlZCBpbnB1dCBwYXNzZXMgYSBjdXN0b20gdmFsaWRhdGlvbiBmdW5jdGlvbi4gTXVsdGlwbGUgdmFsaWRhdGlvbnMgY2FuIGJlIHVzZWQsIGlmIHBhc3NlZCB0byB0aGUgZWxlbWVudCB3aXRoIGBkYXRhLXZhbGlkYXRvcj1cImZvbyBiYXIgYmF6XCJgIGluIGEgc3BhY2Ugc2VwYXJhdGVkIGxpc3RlZC5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBpbnB1dCBlbGVtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmFsaWRhdG9ycyAtIGEgc3RyaW5nIG9mIGZ1bmN0aW9uIG5hbWVzIG1hdGNoaW5nIGZ1bmN0aW9ucyBpbiB0aGUgQWJpZGUub3B0aW9ucy52YWxpZGF0b3JzIG9iamVjdC5cbiAgICogQHBhcmFtIHtCb29sZWFufSByZXF1aXJlZCAtIHNlbGYgZXhwbGFuYXRvcnk/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgdmFsaWRhdGlvbnMgcGFzc2VkLlxuICAgKi9cbiAgbWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9ycywgcmVxdWlyZWQpIHtcbiAgICByZXF1aXJlZCA9IHJlcXVpcmVkID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgdmFyIGNsZWFyID0gdmFsaWRhdG9ycy5zcGxpdCgnICcpLm1hcCgodikgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy52YWxpZGF0b3JzW3ZdKCRlbCwgcmVxdWlyZWQsICRlbC5wYXJlbnQoKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsZWFyLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgZm9ybSBpbnB1dHMgYW5kIHN0eWxlc1xuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXJlc2V0XG4gICAqL1xuICByZXNldEZvcm0oKSB7XG4gICAgdmFyICRmb3JtID0gdGhpcy4kZWxlbWVudCxcbiAgICAgICAgb3B0cyA9IHRoaXMub3B0aW9ucztcblxuICAgICQoYC4ke29wdHMubGFiZWxFcnJvckNsYXNzfWAsICRmb3JtKS5ub3QoJ3NtYWxsJykucmVtb3ZlQ2xhc3Mob3B0cy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgICQoYC4ke29wdHMuaW5wdXRFcnJvckNsYXNzfWAsICRmb3JtKS5ub3QoJ3NtYWxsJykucmVtb3ZlQ2xhc3Mob3B0cy5pbnB1dEVycm9yQ2xhc3MpO1xuICAgICQoYCR7b3B0cy5mb3JtRXJyb3JTZWxlY3Rvcn0uJHtvcHRzLmZvcm1FcnJvckNsYXNzfWApLnJlbW92ZUNsYXNzKG9wdHMuZm9ybUVycm9yQ2xhc3MpO1xuICAgICRmb3JtLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgJCgnOmlucHV0JywgJGZvcm0pLm5vdCgnOmJ1dHRvbiwgOnN1Ym1pdCwgOnJlc2V0LCA6aGlkZGVuLCA6cmFkaW8sIDpjaGVja2JveCwgW2RhdGEtYWJpZGUtaWdub3JlXScpLnZhbCgnJykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgJCgnOmlucHV0OnJhZGlvJywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6Y2hlY2tib3gnLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGZvcm0gaGFzIGJlZW4gcmVzZXQuXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm1yZXNldFxuICAgICAqL1xuICAgICRmb3JtLnRyaWdnZXIoJ2Zvcm1yZXNldC56Zi5hYmlkZScsIFskZm9ybV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBSZW1vdmVzIGVycm9yIHN0eWxlcyBhbmQgY2xhc3NlcyBmcm9tIGVsZW1lbnRzLCB3aXRob3V0IHJlc2V0dGluZyB0aGVpciB2YWx1ZXMuXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9mZignLmFiaWRlJylcbiAgICAgIC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKVxuICAgICAgICAuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcblxuICAgIHRoaXMuJGlucHV0c1xuICAgICAgLm9mZignLmFiaWRlJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5yZW1vdmVFcnJvckNsYXNzZXMoJCh0aGlzKSk7XG4gICAgICB9KTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5BYmlkZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGV2ZW50IHRvIHZhbGlkYXRlIGlucHV0cy4gQ2hlY2tib3hlcyBhbmQgcmFkaW9zIHZhbGlkYXRlIGltbWVkaWF0ZWx5LlxuICAgKiBSZW1vdmUgb3IgY2hhbmdlIHRoaXMgdmFsdWUgZm9yIG1hbnVhbCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdmaWVsZENoYW5nZSdcbiAgICovXG4gIHZhbGlkYXRlT246ICdmaWVsZENoYW5nZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXQgbGFiZWxzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1pbnZhbGlkLWxhYmVsJ1xuICAgKi9cbiAgbGFiZWxFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1sYWJlbCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXRzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1pbnZhbGlkLWlucHV0J1xuICAgKi9cbiAgaW5wdXRFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1pbnB1dCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHNlbGVjdG9yIHRvIHVzZSB0byB0YXJnZXQgRm9ybSBFcnJvcnMgZm9yIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnLmZvcm0tZXJyb3InXG4gICAqL1xuICBmb3JtRXJyb3JTZWxlY3RvcjogJy5mb3JtLWVycm9yJyxcblxuICAvKipcbiAgICogQ2xhc3MgYWRkZWQgdG8gRm9ybSBFcnJvcnMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLXZpc2libGUnXG4gICAqL1xuICBmb3JtRXJyb3JDbGFzczogJ2lzLXZpc2libGUnLFxuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSB0ZXh0IGlucHV0cyBvbiBhbnkgdmFsdWUgY2hhbmdlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBsaXZlVmFsaWRhdGU6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSBpbnB1dHMgb24gYmx1ci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgdmFsaWRhdGVPbkJsdXI6IGZhbHNlLFxuXG4gIHBhdHRlcm5zOiB7XG4gICAgYWxwaGEgOiAvXlthLXpBLVpdKyQvLFxuICAgIGFscGhhX251bWVyaWMgOiAvXlthLXpBLVowLTldKyQvLFxuICAgIGludGVnZXIgOiAvXlstK10/XFxkKyQvLFxuICAgIG51bWJlciA6IC9eWy0rXT9cXGQqKD86W1xcLlxcLF1cXGQrKT8kLyxcblxuICAgIC8vIGFtZXgsIHZpc2EsIGRpbmVyc1xuICAgIGNhcmQgOiAvXig/OjRbMC05XXsxMn0oPzpbMC05XXszfSk/fDVbMS01XVswLTldezE0fXw2KD86MDExfDVbMC05XVswLTldKVswLTldezEyfXwzWzQ3XVswLTldezEzfXwzKD86MFswLTVdfFs2OF1bMC05XSlbMC05XXsxMX18KD86MjEzMXwxODAwfDM1XFxkezN9KVxcZHsxMX0pJC8sXG4gICAgY3Z2IDogL14oWzAtOV0pezMsNH0kLyxcblxuICAgIC8vIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3N0YXRlcy1vZi10aGUtdHlwZS1hdHRyaWJ1dGUuaHRtbCN2YWxpZC1lLW1haWwtYWRkcmVzc1xuICAgIGVtYWlsIDogL15bYS16QS1aMC05LiEjJCUmJyorXFwvPT9eX2B7fH1+LV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykrJC8sXG5cbiAgICB1cmwgOiAvXihodHRwcz98ZnRwfGZpbGV8c3NoKTpcXC9cXC8oKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OikqQCk/KCgoXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pKXwoKChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuKSsoKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4/KSg6XFxkKik/KShcXC8oKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKyhcXC8oKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSopPyk/KFxcPygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8W1xcdUUwMDAtXFx1RjhGRl18XFwvfFxcPykqKT8oXFwjKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxcXC98XFw/KSopPyQvLFxuICAgIC8vIGFiYy5kZVxuICAgIGRvbWFpbiA6IC9eKFthLXpBLVowLTldKFthLXpBLVowLTlcXC1dezAsNjF9W2EtekEtWjAtOV0pP1xcLikrW2EtekEtWl17Miw4fSQvLFxuXG4gICAgZGF0ZXRpbWUgOiAvXihbMC0yXVswLTldezN9KVxcLShbMC0xXVswLTldKVxcLShbMC0zXVswLTldKVQoWzAtNV1bMC05XSlcXDooWzAtNV1bMC05XSlcXDooWzAtNV1bMC05XSkoWnwoW1xcLVxcK10oWzAtMV1bMC05XSlcXDowMCkpJC8sXG4gICAgLy8gWVlZWS1NTS1ERFxuICAgIGRhdGUgOiAvKD86MTl8MjApWzAtOV17Mn0tKD86KD86MFsxLTldfDFbMC0yXSktKD86MFsxLTldfDFbMC05XXwyWzAtOV0pfCg/Oig/ITAyKSg/OjBbMS05XXwxWzAtMl0pLSg/OjMwKSl8KD86KD86MFsxMzU3OF18MVswMl0pLTMxKSkkLyxcbiAgICAvLyBISDpNTTpTU1xuICAgIHRpbWUgOiAvXigwWzAtOV18MVswLTldfDJbMC0zXSkoOlswLTVdWzAtOV0pezJ9JC8sXG4gICAgZGF0ZUlTTyA6IC9eXFxkezR9W1xcL1xcLV1cXGR7MSwyfVtcXC9cXC1dXFxkezEsMn0kLyxcbiAgICAvLyBNTS9ERC9ZWVlZXG4gICAgbW9udGhfZGF5X3llYXIgOiAvXigwWzEtOV18MVswMTJdKVstIFxcLy5dKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl1cXGR7NH0kLyxcbiAgICAvLyBERC9NTS9ZWVlZXG4gICAgZGF5X21vbnRoX3llYXIgOiAvXigwWzEtOV18WzEyXVswLTldfDNbMDFdKVstIFxcLy5dKDBbMS05XXwxWzAxMl0pWy0gXFwvLl1cXGR7NH0kLyxcblxuICAgIC8vICNGRkYgb3IgI0ZGRkZGRlxuICAgIGNvbG9yIDogL14jPyhbYS1mQS1GMC05XXs2fXxbYS1mQS1GMC05XXszfSkkL1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcHRpb25hbCB2YWxpZGF0aW9uIGZ1bmN0aW9ucyB0byBiZSB1c2VkLiBgZXF1YWxUb2AgYmVpbmcgdGhlIG9ubHkgZGVmYXVsdCBpbmNsdWRlZCBmdW5jdGlvbi5cbiAgICogRnVuY3Rpb25zIHNob3VsZCByZXR1cm4gb25seSBhIGJvb2xlYW4gaWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC4gRnVuY3Rpb25zIGFyZSBnaXZlbiB0aGUgZm9sbG93aW5nIGFyZ3VtZW50czpcbiAgICogZWwgOiBUaGUgalF1ZXJ5IGVsZW1lbnQgdG8gdmFsaWRhdGUuXG4gICAqIHJlcXVpcmVkIDogQm9vbGVhbiB2YWx1ZSBvZiB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGJlIHByZXNlbnQgb3Igbm90LlxuICAgKiBwYXJlbnQgOiBUaGUgZGlyZWN0IHBhcmVudCBvZiB0aGUgaW5wdXQuXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHZhbGlkYXRvcnM6IHtcbiAgICBlcXVhbFRvOiBmdW5jdGlvbiAoZWwsIHJlcXVpcmVkLCBwYXJlbnQpIHtcbiAgICAgIHJldHVybiAkKGAjJHtlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKX1gKS52YWwoKSA9PT0gZWwudmFsKCk7XG4gICAgfVxuICB9XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBYmlkZSwgJ0FiaWRlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBY2NvcmRpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBBY2NvcmRpb24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gYSBwbGFpbiBvYmplY3Qgd2l0aCBzZXR0aW5ncyB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FjY29yZGlvbicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbicsIHtcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxuICAgICAgJ1NQQUNFJzogJ3RvZ2dsZScsXG4gICAgICAnQVJST1dfRE9XTic6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIGJ5IGFuaW1hdGluZyB0aGUgcHJlc2V0IGFjdGl2ZSBwYW5lKHMpLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdyb2xlJywgJ3RhYmxpc3QnKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJyk7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oaWR4LCBlbCkge1xuICAgICAgdmFyICRlbCA9ICQoZWwpLFxuICAgICAgICAgICRjb250ZW50ID0gJGVsLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKSxcbiAgICAgICAgICBpZCA9ICRjb250ZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjY29yZGlvbicpLFxuICAgICAgICAgIGxpbmtJZCA9IGVsLmlkIHx8IGAke2lkfS1sYWJlbGA7XG5cbiAgICAgICRlbC5maW5kKCdhOmZpcnN0JykuYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdpZCc6IGxpbmtJZCxcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgICRjb250ZW50LmF0dHIoeydyb2xlJzogJ3RhYnBhbmVsJywgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZCwgJ2FyaWEtaGlkZGVuJzogdHJ1ZSwgJ2lkJzogaWR9KTtcbiAgICB9KTtcbiAgICB2YXIgJGluaXRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgaWYoJGluaXRBY3RpdmUubGVuZ3RoKXtcbiAgICAgIHRoaXMuZG93bigkaW5pdEFjdGl2ZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgYWNjb3JkaW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKTtcbiAgICAgIHZhciAkdGFiQ29udGVudCA9ICRlbGVtLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICAgIGlmICgkdGFiQ29udGVudC5sZW5ndGgpIHtcbiAgICAgICAgJGVsZW0uY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbiBrZXlkb3duLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgICAub24oJ2NsaWNrLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcbiAgICAgICAgfSkub24oJ2tleWRvd24uemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbicsIHtcbiAgICAgICAgICAgIHRvZ2dsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkdGFiQ29udGVudCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLm5leHQoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ucHJldigpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgc2VsZWN0ZWQgY29udGVudCBwYW5lJ3Mgb3Blbi9jbG9zZSBzdGF0ZS5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBwYW5lIHRvIHRvZ2dsZSAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KSB7XG4gICAgaWYoJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHBhbmUgdG8gb3BlbiAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZpcnN0VGltZSAtIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIHJlZmxvdyBzaG91bGQgaGFwcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rvd25cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkb3duKCR0YXJnZXQsIGZpcnN0VGltZSkge1xuICAgICR0YXJnZXRcbiAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsIGZhbHNlKVxuICAgICAgLnBhcmVudCgnW2RhdGEtdGFiLWNvbnRlbnRdJylcbiAgICAgIC5hZGRCYWNrKClcbiAgICAgIC5wYXJlbnQoKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCAmJiAhZmlyc3RUaW1lKSB7XG4gICAgICB2YXIgJGN1cnJlbnRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCRjdXJyZW50QWN0aXZlLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnVwKCRjdXJyZW50QWN0aXZlLm5vdCgkdGFyZ2V0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHRhcmdldC5zbGlkZURvd24odGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICgpID0+IHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAqIEBldmVudCBBY2NvcmRpb24jZG93blxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICB9KTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICAnYXJpYS1leHBhbmRlZCc6IHRydWUsXG4gICAgICAnYXJpYS1zZWxlY3RlZCc6IHRydWVcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gdGFiIHRvIGNsb3NlIChgLmFjY29yZGlvbi1jb250ZW50YCkuXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jdXBcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyICRhdW50cyA9ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoKCF0aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgJiYgISRhdW50cy5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHx8ICEkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb24jdXBcbiAgICAgICAgICovXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvLyB9KTtcblxuICAgICR0YXJnZXQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKVxuICAgICAgICAgICAucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rlc3Ryb3llZFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10YWItY29udGVudF0nKS5zdG9wKHRydWUpLnNsaWRlVXAoMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignLnpmLmFjY29yZGlvbicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkFjY29yZGlvbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYW4gYWNjb3JkaW9uIHBhbmUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgYWNjb3JkaW9uIHRvIGhhdmUgbXVsdGlwbGUgb3BlbiBwYW5lcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlFeHBhbmQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBjbG9zZSBhbGwgcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFsbG93QWxsQ2xvc2VkOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbiwgJ0FjY29yZGlvbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIEFjY29yZGlvbk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb25NZW51Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uTWVudScsIHtcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxuICAgICAgJ1NQQUNFJzogJ3RvZ2dsZScsXG4gICAgICAnQVJST1dfUklHSFQnOiAnb3BlbicsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdjbG9zZScsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlQWxsJ1xuICAgIH0pO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIG1lbnUgYnkgaGlkaW5nIGFsbCBuZXN0ZWQgbWVudXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykubm90KCcuaXMtYWN0aXZlJykuc2xpZGVVcCgwKTsvLy5maW5kKCdhJykuY3NzKCdwYWRkaW5nLWxlZnQnLCAnMXJlbScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAncm9sZSc6ICdtZW51JyxcbiAgICAgICdhcmlhLW11bHRpc2VsZWN0YWJsZSc6IHRoaXMub3B0aW9ucy5tdWx0aU9wZW5cbiAgICB9KTtcblxuICAgIHRoaXMuJG1lbnVMaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuJG1lbnVMaW5rcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbGlua0lkID0gdGhpcy5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2MtbWVudS1saW5rJyksXG4gICAgICAgICAgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSxcbiAgICAgICAgICBzdWJJZCA9ICRzdWJbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUnKSxcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRzdWIuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgJGVsZW0uYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogc3ViSWQsXG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ21lbnVpdGVtJyxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcbiAgICAgICRzdWIuYXR0cih7XG4gICAgICAgICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWQsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ3JvbGUnOiAnbWVudScsXG4gICAgICAgICdpZCc6IHN1YklkXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgaW5pdFBhbmVzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJyk7XG4gICAgaWYoaW5pdFBhbmVzLmxlbmd0aCl7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgaW5pdFBhbmVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgX3RoaXMuZG93bigkKHRoaXMpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkc3VibWVudSA9ICQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG5cbiAgICAgIGlmICgkc3VibWVudS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpLm9uKCdjbGljay56Zi5hY2NvcmRpb25NZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIF90aGlzLnRvZ2dsZSgkc3VibWVudSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbm1lbnUnLCBmdW5jdGlvbihlKXtcbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQsXG4gICAgICAgICAgJHRhcmdldCA9ICRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcblxuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5maW5kKCdsaTpmaXJzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmZpcnN0LWNoaWxkJykpIHsgLy8gaXMgZmlyc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHByZXZFbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBpZiBwcmV2aW91cyBlbGVtZW50IGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkcHJldkVsZW1lbnQucGFyZW50cygnbGknKS5maW5kKCdsaTpsYXN0LWNoaWxkJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6bGFzdC1jaGlsZCcpKSB7IC8vIGlzIGxhc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLm5leHQoJ2xpJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICAgIF90aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICAgICAgICAkdGFyZ2V0LmZpbmQoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0Lmxlbmd0aCAmJiAhJHRhcmdldC5pcygnOmhpZGRlbicpKSB7IC8vIGNsb3NlIGFjdGl2ZSBzdWIgb2YgdGhpcyBpdGVtXG4gICAgICAgICAgICBfdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHsgLy8gY2xvc2UgY3VycmVudGx5IG9wZW4gc3ViXG4gICAgICAgICAgICBfdGhpcy51cCgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuaGlkZUFsbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTsvLy5hdHRyKCd0YWJpbmRleCcsIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcGFuZXMgb2YgdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgaGlkZUFsbCgpIHtcbiAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNob3dBbGwoKSB7XG4gICAgdGhpcy5kb3duKHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZSBzdGF0ZSBvZiBhIHN1Ym1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIHRoZSBzdWJtZW51IHRvIHRvZ2dsZVxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpe1xuICAgIGlmKCEkdGFyZ2V0LmlzKCc6YW5pbWF0ZWQnKSkge1xuICAgICAgaWYgKCEkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBzdWItbWVudSBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBvcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNkb3duXG4gICAqL1xuICBkb3duKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5tdWx0aU9wZW4pIHtcbiAgICAgIHRoaXMudXAodGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJykubm90KCR0YXJnZXQucGFyZW50c1VudGlsKHRoaXMuJGVsZW1lbnQpLmFkZCgkdGFyZ2V0KSkpO1xuICAgIH1cblxuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSlcbiAgICAgIC5wYXJlbnQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcblxuICAgICAgLy9Gb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkdGFyZ2V0LnNsaWRlRG93bihfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSNkb3duXG4gICAgICAgICAgICovXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignZG93bi56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgICAgfSk7XG4gICAgICAvL30pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuIEFsbCBzdWItbWVudXMgaW5zaWRlIHRoZSB0YXJnZXQgd2lsbCBiZSBjbG9zZWQgYXMgd2VsbC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBjbG9zZS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjdXBcbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpe1xuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb25NZW51I3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgIH0pO1xuICAgIC8vfSk7XG5cbiAgICB2YXIgJG1lbnVzID0gJHRhcmdldC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAoMCkuYWRkQmFjaygpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAkbWVudXMucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhY2NvcmRpb24gbWVudS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZGVzdHJveWVkXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZURvd24oMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhIHN1Ym1lbnUgaW4gbXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgbXVsdGlPcGVuOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWNjb3JkaW9uTWVudSwgJ0FjY29yZGlvbk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyaWxsZG93biBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJpbGxkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5uZXN0XG4gKi9cblxuY2xhc3MgRHJpbGxkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcmlsbGRvd24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJpbGxkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcmlsbGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcmlsbGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAnZG93bicsXG4gICAgICAnU0hJRlRfVEFCJzogJ3VwJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBkcmlsbGRvd24gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zIG9mIGVsZW1lbnRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50JykuY2hpbGRyZW4oJ2EnKTtcbiAgICB0aGlzLiRzdWJtZW51cyA9IHRoaXMuJHN1Ym1lbnVBbmNob3JzLnBhcmVudCgnbGknKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykubm90KCcuanMtZHJpbGxkb3duLWJhY2snKS5hdHRyKCdyb2xlJywgJ21lbnVpdGVtJykuZmluZCgnYScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnLCAodGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLWRyaWxsZG93bicpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2RyaWxsZG93bicpKSk7XG5cbiAgICB0aGlzLl9wcmVwYXJlTWVudSgpO1xuICAgIHRoaXMuX3JlZ2lzdGVyRXZlbnRzKCk7XG5cbiAgICB0aGlzLl9rZXlib2FyZEV2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIHByZXBhcmVzIGRyaWxsZG93biBtZW51IGJ5IHNldHRpbmcgYXR0cmlidXRlcyB0byBsaW5rcyBhbmQgZWxlbWVudHNcbiAgICogc2V0cyBhIG1pbiBoZWlnaHQgdG8gcHJldmVudCBjb250ZW50IGp1bXBpbmdcbiAgICogd3JhcHMgdGhlIGVsZW1lbnQgaWYgbm90IGFscmVhZHkgd3JhcHBlZFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9wcmVwYXJlTWVudSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vIGlmKCF0aGlzLm9wdGlvbnMuaG9sZE9wZW4pe1xuICAgIC8vICAgdGhpcy5fbWVudUxpbmtFdmVudHMoKTtcbiAgICAvLyB9XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRsaW5rID0gJCh0aGlzKTtcbiAgICAgIHZhciAkc3ViID0gJGxpbmsucGFyZW50KCk7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLnBhcmVudExpbmspe1xuICAgICAgICAkbGluay5jbG9uZSgpLnByZXBlbmRUbygkc3ViLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpKS53cmFwKCc8bGkgY2xhc3M9XCJpcy1zdWJtZW51LXBhcmVudC1pdGVtIGlzLXN1Ym1lbnUtaXRlbSBpcy1kcmlsbGRvd24tc3VibWVudS1pdGVtXCIgcm9sZT1cIm1lbnUtaXRlbVwiPjwvbGk+Jyk7XG4gICAgICB9XG4gICAgICAkbGluay5kYXRhKCdzYXZlZEhyZWYnLCAkbGluay5hdHRyKCdocmVmJykpLnJlbW92ZUF0dHIoJ2hyZWYnKS5hdHRyKCd0YWJpbmRleCcsIDApO1xuICAgICAgJGxpbmsuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogMCxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICBfdGhpcy5fZXZlbnRzKCRsaW5rKTtcbiAgICB9KTtcbiAgICB0aGlzLiRzdWJtZW51cy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJG1lbnUgPSAkKHRoaXMpLFxuICAgICAgICAgICRiYWNrID0gJG1lbnUuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrJyk7XG4gICAgICBpZighJGJhY2subGVuZ3RoKXtcbiAgICAgICAgc3dpdGNoIChfdGhpcy5vcHRpb25zLmJhY2tCdXR0b25Qb3NpdGlvbikge1xuICAgICAgICAgIGNhc2UgXCJib3R0b21cIjpcbiAgICAgICAgICAgICRtZW51LmFwcGVuZChfdGhpcy5vcHRpb25zLmJhY2tCdXR0b24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcInRvcFwiOlxuICAgICAgICAgICAgJG1lbnUucHJlcGVuZChfdGhpcy5vcHRpb25zLmJhY2tCdXR0b24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJVbnN1cHBvcnRlZCBiYWNrQnV0dG9uUG9zaXRpb24gdmFsdWUgJ1wiICsgX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uUG9zaXRpb24gKyBcIidcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF90aGlzLl9iYWNrKCRtZW51KTtcbiAgICB9KTtcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkge1xuICAgICAgdGhpcy4kc3VibWVudXMuYWRkQ2xhc3MoJ2RyaWxsZG93bi1zdWJtZW51LWNvdmVyLXByZXZpb3VzJyk7XG4gICAgfVxuXG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSAkKHRoaXMub3B0aW9ucy53cmFwcGVyKS5hZGRDbGFzcygnaXMtZHJpbGxkb3duJyk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZUhlaWdodCkgdGhpcy4kd3JhcHBlci5hZGRDbGFzcygnYW5pbWF0ZS1oZWlnaHQnKTtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LndyYXAodGhpcy4kd3JhcHBlcikucGFyZW50KCkuY3NzKHRoaXMuX2dldE1heERpbXMoKSk7XG4gICAgfVxuICB9XG5cbiAgX3Jlc2l6ZSgpIHtcbiAgICB0aGlzLiR3cmFwcGVyLmNzcyh7J21heC13aWR0aCc6ICdub25lJywgJ21pbi1oZWlnaHQnOiAnbm9uZSd9KTtcbiAgICAvLyBfZ2V0TWF4RGltcyBoYXMgc2lkZSBlZmZlY3RzIChib28pIGJ1dCBjYWxsaW5nIGl0IHNob3VsZCB1cGRhdGUgYWxsIG90aGVyIG5lY2Vzc2FyeSBoZWlnaHRzICYgd2lkdGhzXG4gICAgdGhpcy4kd3JhcHBlci5jc3ModGhpcy5fZ2V0TWF4RGltcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIGVsZW1lbnRzIGluIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgbWVudSBpdGVtIHRvIGFkZCBoYW5kbGVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZigkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ2xpJykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZihlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkKXtcbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgX3RoaXMuX3Nob3coJGVsZW0ucGFyZW50KCdsaScpKTtcblxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xuICAgICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cdCAgdGhpcy4kZWxlbWVudC5vbignbXV0YXRlbWUuemYudHJpZ2dlcicsIHRoaXMuX3Jlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBtZW51IGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZ2lzdGVyRXZlbnRzKCkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5zY3JvbGxUb3Ape1xuICAgICAgdGhpcy5fYmluZEhhbmRsZXIgPSB0aGlzLl9zY3JvbGxUb3AuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ29wZW4uemYuZHJpbGxkb3duIGhpZGUuemYuZHJpbGxkb3duIGNsb3NlZC56Zi5kcmlsbGRvd24nLHRoaXMuX2JpbmRIYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2Nyb2xsIHRvIFRvcCBvZiBFbGVtZW50IG9yIGRhdGEtc2Nyb2xsLXRvcC1lbGVtZW50XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAqL1xuICBfc2Nyb2xsVG9wKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICRzY3JvbGxUb3BFbGVtZW50ID0gX3RoaXMub3B0aW9ucy5zY3JvbGxUb3BFbGVtZW50IT0nJz8kKF90aGlzLm9wdGlvbnMuc2Nyb2xsVG9wRWxlbWVudCk6X3RoaXMuJGVsZW1lbnQsXG4gICAgICAgIHNjcm9sbFBvcyA9IHBhcnNlSW50KCRzY3JvbGxUb3BFbGVtZW50Lm9mZnNldCgpLnRvcCtfdGhpcy5vcHRpb25zLnNjcm9sbFRvcE9mZnNldCk7XG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nLGZ1bmN0aW9uKCl7XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBhZnRlciB0aGUgbWVudSBoYXMgc2Nyb2xsZWRcbiAgICAgICAgKiBAZXZlbnQgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAgICAgICovXG4gICAgICBpZih0aGlzPT09JCgnaHRtbCcpWzBdKV90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Njcm9sbG1lLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5ZG93biBldmVudCBsaXN0ZW5lciB0byBgbGlgJ3MgaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2V5Ym9hcmRFdmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJG1lbnVJdGVtcy5hZGQodGhpcy4kZWxlbWVudC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2sgPiBhLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbSA+IGEnKSkub24oJ2tleWRvd24uemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJykuY2hpbGRyZW4oJ2EnKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJpbGxkb3duJywge1xuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9iYWNrKCk7XG4gICAgICAgICAgLy9fdGhpcy4kbWVudUl0ZW1zLmZpcnN0KCkuZm9jdXMoKTsgLy8gZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRtZW51SXRlbXMpKSB7IC8vIG5vdCBtZW51IGl0ZW0gbWVhbnMgYmFjayBidXR0b25cbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIG9wZW4gZWxlbWVudHMsIGFuZCByZXR1cm5zIHRvIHJvb3QgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXG4gICAqL1xuICBfaGlkZUFsbCgpIHtcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLnBhcmVudCgpLmNsb3Nlc3QoJ3VsJykuZGF0YSgnY2FsY0hlaWdodCcpfSk7XG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xuICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgfSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGZ1bGx5IGNsb3NlZC5cbiAgICAgICAgICogQGV2ZW50IERyaWxsZG93biNjbG9zZWRcbiAgICAgICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYuZHJpbGxkb3duJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciBmb3IgZWFjaCBgYmFja2AgYnV0dG9uLCBhbmQgY2xvc2VzIG9wZW4gbWVudXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2JhY2tcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gYWRkIGBiYWNrYCBldmVudC5cbiAgICovXG4gIF9iYWNrKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xuICAgICRlbGVtLmNoaWxkcmVuKCcuanMtZHJpbGxkb3duLWJhY2snKVxuICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ21vdXNldXAgb24gYmFjaycpO1xuICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc3VibWVudSwgY2FsbCBzaG93XG4gICAgICAgIGxldCBwYXJlbnRTdWJNZW51ID0gJGVsZW0ucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XG4gICAgICAgIGlmIChwYXJlbnRTdWJNZW51Lmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KHBhcmVudFN1Yk1lbnUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVyIHRvIG1lbnUgaXRlbXMgdy9vIHN1Ym1lbnVzIHRvIGNsb3NlIG9wZW4gbWVudXMgb24gY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21lbnVMaW5rRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm5vdCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpXG4gICAgICAgIC5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNvcGVuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gb3BlbiwgaS5lLiB0aGUgYGxpYCB0YWcuXG4gICAqL1xuICBfc2hvdygkZWxlbSkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgICRlbGVtLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5hZGRDbGFzcygnaXMtYWN0aXZlJykuYXR0cignYXJpYS1oaWRkZW4nLCBmYWxzZSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgb3BlbmVkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcbiAgfTtcblxuICAvKipcbiAgICogSGlkZXMgYSBzdWJtZW51XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2hpZGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gaGlkZSwgaS5lLiB0aGUgYHVsYCB0YWcuXG4gICAqL1xuICBfaGlkZSgkZWxlbSkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLnBhcmVudCgpLmNsb3Nlc3QoJ3VsJykuZGF0YSgnY2FsY0hlaWdodCcpfSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5wYXJlbnQoJ2xpJykuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAkZWxlbS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpLmFkZENsYXNzKCdpcy1jbG9zaW5nJylcbiAgICAkZWxlbS5hZGRDbGFzcygnaXMtY2xvc2luZycpXG4gICAgICAgICAub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xuICAgICAgICAgICAkZWxlbS5ibHVyKCk7XG4gICAgICAgICB9KTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBzdWJtZW51IGhhcyBjbG9zZWQuXG4gICAgICogQGV2ZW50IERyaWxsZG93biNoaWRlXG4gICAgICovXG4gICAgJGVsZW0udHJpZ2dlcignaGlkZS56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyB0aHJvdWdoIHRoZSBuZXN0ZWQgbWVudXMgdG8gY2FsY3VsYXRlIHRoZSBtaW4taGVpZ2h0LCBhbmQgbWF4LXdpZHRoIGZvciB0aGUgbWVudS5cbiAgICogUHJldmVudHMgY29udGVudCBqdW1waW5nLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9nZXRNYXhEaW1zKCkge1xuICAgIHZhciAgbWF4SGVpZ2h0ID0gMCwgcmVzdWx0ID0ge30sIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRzdWJtZW51cy5hZGQodGhpcy4kZWxlbWVudCkuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIG51bU9mRWxlbXMgPSAkKHRoaXMpLmNoaWxkcmVuKCdsaScpLmxlbmd0aDtcbiAgICAgIHZhciBoZWlnaHQgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMpLmhlaWdodDtcbiAgICAgIG1heEhlaWdodCA9IGhlaWdodCA+IG1heEhlaWdodCA/IGhlaWdodCA6IG1heEhlaWdodDtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkge1xuICAgICAgICAkKHRoaXMpLmRhdGEoJ2NhbGNIZWlnaHQnLGhlaWdodCk7XG4gICAgICAgIGlmICghJCh0aGlzKS5oYXNDbGFzcygnaXMtZHJpbGxkb3duLXN1Ym1lbnUnKSkgcmVzdWx0WydoZWlnaHQnXSA9IGhlaWdodDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgcmVzdWx0WydtaW4taGVpZ2h0J10gPSBgJHttYXhIZWlnaHR9cHhgO1xuXG4gICAgcmVzdWx0WydtYXgtd2lkdGgnXSA9IGAke3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGh9cHhgO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgRHJpbGxkb3duIE1lbnVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5zY3JvbGxUb3ApIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYuZHJpbGxkb3duJyx0aGlzLl9iaW5kSGFuZGxlcik7XG4gICAgdGhpcy5faGlkZUFsbCgpO1xuXHQgIHRoaXMuJGVsZW1lbnQub2ZmKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuICAgIHRoaXMuJGVsZW1lbnQudW53cmFwKClcbiAgICAgICAgICAgICAgICAgLmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaywgLmlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0nKS5yZW1vdmUoKVxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnLmlzLWFjdGl2ZSwgLmlzLWNsb3NpbmcsIC5pcy1kcmlsbGRvd24tc3VibWVudScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZyBpcy1kcmlsbGRvd24tc3VibWVudScpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCdbZGF0YS1zdWJtZW51XScpLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIHRhYmluZGV4IHJvbGUnKTtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJHN1Ym1lbnVzLnJlbW92ZUNsYXNzKCdkcmlsbGRvd24tc3VibWVudS1jb3Zlci1wcmV2aW91cycpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdhJykuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRsaW5rID0gJCh0aGlzKTtcbiAgICAgICRsaW5rLnJlbW92ZUF0dHIoJ3RhYmluZGV4Jyk7XG4gICAgICBpZigkbGluay5kYXRhKCdzYXZlZEhyZWYnKSl7XG4gICAgICAgICRsaW5rLmF0dHIoJ2hyZWYnLCAkbGluay5kYXRhKCdzYXZlZEhyZWYnKSkucmVtb3ZlRGF0YSgnc2F2ZWRIcmVmJyk7XG4gICAgICB9ZWxzZXsgcmV0dXJuOyB9XG4gICAgfSk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5EcmlsbGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCBmb3IgSlMgZ2VuZXJhdGVkIGJhY2sgYnV0dG9uLiBQcmVwZW5kZWQgIG9yIGFwcGVuZGVkIChzZWUgYmFja0J1dHRvblBvc2l0aW9uKSB0byBzdWJtZW51IGxpc3RzIGFuZCBkZWxldGVkIG9uIGBkZXN0cm95YCBtZXRob2QsICdqcy1kcmlsbGRvd24tYmFjaycgY2xhc3MgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxsaT48XFxhPkJhY2s8XFwvYT48XFwvbGk+J1xuICAgKi9cbiAgYmFja0J1dHRvbjogJzxsaSBjbGFzcz1cImpzLWRyaWxsZG93bi1iYWNrXCI+PGEgdGFiaW5kZXg9XCIwXCI+QmFjazwvYT48L2xpPicsXG4gIC8qKlxuICAgKiBQb3NpdGlvbiB0aGUgYmFjayBidXR0b24gZWl0aGVyIGF0IHRoZSB0b3Agb3IgYm90dG9tIG9mIGRyaWxsZG93biBzdWJtZW51cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBib3R0b21cbiAgICovXG4gIGJhY2tCdXR0b25Qb3NpdGlvbjogJ3RvcCcsXG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCB0byB3cmFwIGRyaWxsZG93biBtZW51LiBVc2UgYSBjbGFzcyBuYW1lIGZvciBpbmRlcGVuZGVudCBzdHlsaW5nOyB0aGUgSlMgYXBwbGllZCBjbGFzczogYGlzLWRyaWxsZG93bmAgaXMgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxkaXYgY2xhc3M9XCJpcy1kcmlsbGRvd25cIj48XFwvZGl2PidcbiAgICovXG4gIHdyYXBwZXI6ICc8ZGl2PjwvZGl2PicsXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBwYXJlbnQgbGluayB0byB0aGUgc3VibWVudS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgcGFyZW50TGluazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byByZXR1cm4gdG8gcm9vdCBsaXN0IG9uIGJvZHkgY2xpY2suXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGNsb3NlT25DbGljazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byBhdXRvIGFkanVzdCBoZWlnaHQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGF1dG9IZWlnaHQ6IGZhbHNlLFxuICAvKipcbiAgICogQW5pbWF0ZSB0aGUgYXV0byBhZGp1c3QgaGVpZ2h0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbmltYXRlSGVpZ2h0OiBmYWxzZSxcbiAgLyoqXG4gICAqIFNjcm9sbCB0byB0aGUgdG9wIG9mIHRoZSBtZW51IGFmdGVyIG9wZW5pbmcgYSBzdWJtZW51IG9yIG5hdmlnYXRpbmcgYmFjayB1c2luZyB0aGUgbWVudSBiYWNrIGJ1dHRvblxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBzY3JvbGxUb3A6IGZhbHNlLFxuICAvKipcbiAgICogU3RyaW5nIGpxdWVyeSBzZWxlY3RvciAoZm9yIGV4YW1wbGUgJ2JvZHknKSBvZiBlbGVtZW50IHRvIHRha2Ugb2Zmc2V0KCkudG9wIGZyb20sIGlmIGVtcHR5IHN0cmluZyB0aGUgZHJpbGxkb3duIG1lbnUgb2Zmc2V0KCkudG9wIGlzIHRha2VuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJydcbiAgICovXG4gIHNjcm9sbFRvcEVsZW1lbnQ6ICcnLFxuICAvKipcbiAgICogU2Nyb2xsVG9wIG9mZnNldFxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwMFxuICAgKi9cbiAgc2Nyb2xsVG9wT2Zmc2V0OiAwLFxuICAvKipcbiAgICogU2Nyb2xsIGFuaW1hdGlvbiBkdXJhdGlvblxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cbiAgYW5pbWF0aW9uRHVyYXRpb246IDUwMCxcbiAgLyoqXG4gICAqIFNjcm9sbCBhbmltYXRpb24gZWFzaW5nXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3N3aW5nJ1xuICAgKi9cbiAgYW5pbWF0aW9uRWFzaW5nOiAnc3dpbmcnXG4gIC8vIGhvbGRPcGVuOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyaWxsZG93biwgJ0RyaWxsZG93bicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJvcGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIERyb3Bkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcm9wZG93bi5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93bi5cbiAgICogICAgICAgIE9iamVjdCBzaG91bGQgYmUgb2YgdGhlIGRyb3Bkb3duIHBhbmVsLCByYXRoZXIgdGhhbiBpdHMgYW5jaG9yLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyb3Bkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBzZXR0aW5nL2NoZWNraW5nIG9wdGlvbnMgYW5kIGF0dHJpYnV0ZXMsIGFkZGluZyBoZWxwZXIgdmFyaWFibGVzLCBhbmQgc2F2aW5nIHRoZSBhbmNob3IuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLXRvZ2dsZT1cIiR7JGlkfVwiXWApLmxlbmd0aCA/ICQoYFtkYXRhLXRvZ2dsZT1cIiR7JGlkfVwiXWApIDogJChgW2RhdGEtb3Blbj1cIiR7JGlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogJGlkLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZVxuXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMucGFyZW50Q2xhc3Mpe1xuICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcuJyArIHRoaXMub3B0aW9ucy5wYXJlbnRDbGFzcyk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRwYXJlbnQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6ICd0cnVlJyxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2RhdGEtcmVzaXplJzogJGlkLFxuICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IHRoaXMuJGFuY2hvclswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdkZC1hbmNob3InKVxuICAgIH0pO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBkZXRlcm1pbmUgY3VycmVudCBvcmllbnRhdGlvbiBvZiBkcm9wZG93biBwYW5lLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHJldHVybnMge1N0cmluZ30gcG9zaXRpb24gLSBzdHJpbmcgdmFsdWUgb2YgYSBwb3NpdGlvbiBjbGFzcy5cbiAgICovXG4gIGdldFBvc2l0aW9uQ2xhc3MoKSB7XG4gICAgdmFyIHZlcnRpY2FsUG9zaXRpb24gPSB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHRvcHxsZWZ0fHJpZ2h0fGJvdHRvbSkvZyk7XG4gICAgICAgIHZlcnRpY2FsUG9zaXRpb24gPSB2ZXJ0aWNhbFBvc2l0aW9uID8gdmVydGljYWxQb3NpdGlvblswXSA6ICcnO1xuICAgIHZhciBob3Jpem9udGFsUG9zaXRpb24gPSAvZmxvYXQtKFxcUyspLy5leGVjKHRoaXMuJGFuY2hvclswXS5jbGFzc05hbWUpO1xuICAgICAgICBob3Jpem9udGFsUG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb25bMV0gOiAnJztcbiAgICB2YXIgcG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb24gKyAnICcgKyB2ZXJ0aWNhbFBvc2l0aW9uIDogdmVydGljYWxQb3NpdGlvbjtcblxuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIHRoZSBkcm9wZG93biBwYW5lcyBvcmllbnRhdGlvbiBieSBhZGRpbmcvcmVtb3ZpbmcgcG9zaXRpb25pbmcgY2xhc3Nlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uIGNsYXNzIHRvIHJlbW92ZS5cbiAgICovXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcbiAgICAvL2RlZmF1bHQsIHRyeSBzd2l0Y2hpbmcgdG8gb3Bwb3NpdGUgc2lkZVxuICAgIGlmKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygndG9wJyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxuICAgIGVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHBvc2l0aW9uIGFuZCBvcmllbnRhdGlvbiBvZiB0aGUgZHJvcGRvd24gcGFuZSwgY2hlY2tzIGZvciBjb2xsaXNpb25zLlxuICAgKiBSZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgaWYgYSBjb2xsaXNpb24gaXMgZGV0ZWN0ZWQsIHdpdGggYSBuZXcgcG9zaXRpb24gY2xhc3MuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFBvc2l0aW9uKCkge1xuICAgIGlmKHRoaXMuJGFuY2hvci5hdHRyKCdhcmlhLWV4cGFuZGVkJykgPT09ICdmYWxzZScpeyByZXR1cm4gZmFsc2U7IH1cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKSxcbiAgICAgICAgJGVsZURpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGVsZW1lbnQpLFxuICAgICAgICAkYW5jaG9yRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kYW5jaG9yKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcbiAgICAgICAgcGFyYW0gPSAoZGlyZWN0aW9uID09PSAndG9wJykgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIG9mZnNldCA9IChwYXJhbSA9PT0gJ2hlaWdodCcpID8gdGhpcy5vcHRpb25zLnZPZmZzZXQgOiB0aGlzLm9wdGlvbnMuaE9mZnNldDtcblxuICAgIGlmKCgkZWxlRGltcy53aWR0aCA+PSAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKSB8fCAoIXRoaXMuY291bnRlciAmJiAhRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCB0aGlzLiRwYXJlbnQpKSl7XG4gICAgICB2YXIgbmV3V2lkdGggPSAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoLFxuICAgICAgICAgIHBhcmVudEhPZmZzZXQgPSAwO1xuICAgICAgaWYodGhpcy4kcGFyZW50KXtcbiAgICAgICAgdmFyICRwYXJlbnREaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRwYXJlbnQpLFxuICAgICAgICAgICAgcGFyZW50SE9mZnNldCA9ICRwYXJlbnREaW1zLm9mZnNldC5sZWZ0O1xuICAgICAgICBpZiAoJHBhcmVudERpbXMud2lkdGggPCBuZXdXaWR0aCl7XG4gICAgICAgICAgbmV3V2lkdGggPSAkcGFyZW50RGltcy53aWR0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMuJGVsZW1lbnQsIHRoaXMuJGFuY2hvciwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQgKyBwYXJlbnRIT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgICAgJ3dpZHRoJzogbmV3V2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsIHBvc2l0aW9uLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcblxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMuJGVsZW1lbnQsIHRoaXMuJHBhcmVudCwgdHJ1ZSkgJiYgdGhpcy5jb3VudGVyKXtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIGVsZW1lbnQgdXRpbGl6aW5nIHRoZSB0cmlnZ2VycyB1dGlsaXR5IGxpYnJhcnkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9zZXRQb3NpdGlvbi5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXIpe1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBib2R5RGF0YSA9ICQoJ2JvZHknKS5kYXRhKCk7XG4gICAgICAgIGlmKHR5cGVvZihib2R5RGF0YS53aGF0aW5wdXQpID09PSAndW5kZWZpbmVkJyB8fCBib2R5RGF0YS53aGF0aW5wdXQgPT09ICdtb3VzZScpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCB0cnVlKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICB9KTtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5ob3ZlclBhbmUpe1xuICAgICAgICB0aGlzLiRlbGVtZW50Lm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIGZhbHNlKTtcbiAgICAgICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiRhbmNob3IuYWRkKHRoaXMuJGVsZW1lbnQpLm9uKCdrZXlkb3duLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oZSkge1xuXG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyksXG4gICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZShfdGhpcy4kZWxlbWVudCk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcm9wZG93bicsIHtcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCR0YXJnZXQuaXMoX3RoaXMuJGFuY2hvcikpIHtcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLm5vdCh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgIF90aGlzID0gdGhpcztcbiAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpXG4gICAgICAgICAgLm9uKCdjbGljay56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgaWYoX3RoaXMuJGFuY2hvci5pcyhlLnRhcmdldCkgfHwgX3RoaXMuJGFuY2hvci5maW5kKGUudGFyZ2V0KS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAkYm9keS5vZmYoJ2NsaWNrLnpmLmRyb3Bkb3duJyk7XG4gICAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGRyb3Bkb3duIHBhbmUsIGFuZCBmaXJlcyBhIGJ1YmJsaW5nIGV2ZW50IHRvIGNsb3NlIG90aGVyIGRyb3Bkb3ducy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNjbG9zZW1lXG4gICAqIEBmaXJlcyBEcm9wZG93biNzaG93XG4gICAqL1xuICBvcGVuKCkge1xuICAgIC8vIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLyoqXG4gICAgICogRmlyZXMgdG8gY2xvc2Ugb3RoZXIgb3BlbiBkcm9wZG93bnNcbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jY2xvc2VtZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5kcm9wZG93bicsIHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKSk7XG4gICAgdGhpcy4kYW5jaG9yLmFkZENsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcbiAgICAvLyB0aGlzLiRlbGVtZW50Lyouc2hvdygpKi87XG4gICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcbiAgICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgIHZhciAkZm9jdXNhYmxlID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgaWYoJGZvY3VzYWJsZS5sZW5ndGgpe1xuICAgICAgICAkZm9jdXNhYmxlLmVxKDApLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayl7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnRyYXBGb2N1cyh0aGlzLiRlbGVtZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBvbmNlIHRoZSBkcm9wZG93biBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93biNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9wZW4gZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNoaWRlXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZighdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XG5cbiAgICB0aGlzLiRhbmNob3IucmVtb3ZlQ2xhc3MoJ2hvdmVyJylcbiAgICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG5cbiAgICBpZih0aGlzLmNsYXNzQ2hhbmdlZCl7XG4gICAgICB2YXIgY3VyUG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgICAgaWYoY3VyUG9zaXRpb25DbGFzcyl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoY3VyUG9zaXRpb25DbGFzcyk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzKVxuICAgICAgICAgIC8qLmhpZGUoKSovLmNzcyh7aGVpZ2h0OiAnJywgd2lkdGg6ICcnfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICAgIHRoaXMudXNlZFBvc2l0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMpIHtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVsZWFzZUZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBkcm9wZG93biBwYW5lJ3MgdmlzaWJpbGl0eS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIGlmKHRoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicpKSByZXR1cm47XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGRyb3Bkb3duLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyJykuaGlkZSgpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56Zi5kcm9wZG93bicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkRyb3Bkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQ2xhc3MgdGhhdCBkZXNpZ25hdGVzIGJvdW5kaW5nIGNvbnRhaW5lciBvZiBEcm9wZG93biAoRGVmYXVsdDogd2luZG93KVxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdkcm9wZG93bi1wYXJlbnQnXG4gICAqL1xuICBwYXJlbnRDbGFzczogbnVsbCxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjUwLFxuICAvKipcbiAgICogQWxsb3cgc3VibWVudXMgdG8gb3BlbiBvbiBob3ZlciBldmVudHNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgaG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogRG9uJ3QgY2xvc2UgZHJvcGRvd24gd2hlbiBob3ZlcmluZyBvdmVyIGRyb3Bkb3duIHBhbmVcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBob3ZlclBhbmU6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgdk9mZnNldDogMSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIGhPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGFkanVzdCBvcGVuIHBvc2l0aW9uLiBKUyB3aWxsIHRlc3QgYW5kIGZpbGwgdGhpcyBpbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHRyYXAgZm9jdXMgdG8gdGhlIGRyb3Bkb3duIHBhbmUgaWYgb3BlbmVkIHdpdGgga2V5Ym9hcmQgY29tbWFuZHMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHRyYXBGb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHNldCBmb2N1cyB0byB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnQgd2l0aGluIHRoZSBwYW5lLCByZWdhcmRsZXNzIG9mIG1ldGhvZCBvZiBvcGVuaW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keSB0byBjbG9zZSB0aGUgZHJvcGRvd24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGNsb3NlT25DbGljazogZmFsc2Vcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyb3Bkb3duLCAnRHJvcGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJvcGRvd24tbWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIERyb3Bkb3duTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIERyb3Bkb3duTWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bk1lbnUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdkcm9wZG93bicpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duTWVudScsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiwgYW5kIGNhbGxzIF9wcmVwYXJlTWVudVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzdWJzID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKCdmaXJzdC1zdWInKTtcblxuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdbcm9sZT1cIm1lbnVpdGVtXCJdJyk7XG4gICAgdGhpcy4kdGFicy5maW5kKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51JykuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnZlcnRpY2FsQ2xhc3MpO1xuXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLnJpZ2h0Q2xhc3MpIHx8IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdyaWdodCcgfHwgRm91bmRhdGlvbi5ydGwoKSB8fCB0aGlzLiRlbGVtZW50LnBhcmVudHMoJy50b3AtYmFyLXJpZ2h0JykuaXMoJyonKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmFsaWdubWVudCA9ICdyaWdodCc7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1sZWZ0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YnMuYWRkQ2xhc3MoJ29wZW5zLXJpZ2h0Jyk7XG4gICAgfVxuICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9O1xuXG4gIF9pc1ZlcnRpY2FsKCkge1xuICAgIHJldHVybiB0aGlzLiR0YWJzLmNzcygnZGlzcGxheScpID09PSAnYmxvY2snO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGVsZW1lbnRzIHdpdGhpbiB0aGUgbWVudVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHwgKHR5cGVvZiB3aW5kb3cub250b3VjaHN0YXJ0ICE9PSAndW5kZWZpbmVkJyksXG4gICAgICAgIHBhckNsYXNzID0gJ2lzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JztcblxuICAgIC8vIHVzZWQgZm9yIG9uQ2xpY2sgYW5kIGluIHRoZSBrZXlib2FyZCBoYW5kbGVyc1xuICAgIHZhciBoYW5kbGVDbGlja0ZuID0gZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsIGAuJHtwYXJDbGFzc31gKSxcbiAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyksXG4gICAgICAgICAgaGFzQ2xpY2tlZCA9ICRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKTtcblxuICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICBpZiAoaGFzQ2xpY2tlZCkge1xuICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgfHwgKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbiAmJiAhaGFzVG91Y2gpIHx8IChfdGhpcy5vcHRpb25zLmZvcmNlRm9sbG93ICYmIGhhc1RvdWNoKSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIF90aGlzLl9zaG93KCRzdWIpO1xuICAgICAgICAgICRlbGVtLmFkZCgkZWxlbS5wYXJlbnRzVW50aWwoX3RoaXMuJGVsZW1lbnQsIGAuJHtwYXJDbGFzc31gKSkuYXR0cignZGF0YS1pcy1jbGljaycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuIHx8IGhhc1RvdWNoKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBMZWFmIGVsZW1lbnQgQ2xpY2tzXG4gICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2tJbnNpZGUpe1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdjbGljay56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZighaGFzU3ViKXtcbiAgICAgICAgICBfdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XG5cbiAgICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICAgIGNsZWFyVGltZW91dCgkZWxlbS5kYXRhKCdfZGVsYXknKSk7XG4gICAgICAgICAgJGVsZW0uZGF0YSgnX2RlbGF5Jywgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KCRlbGVtLmRhdGEoJ19kZWxheScpKTtcbiAgICAgICAgICAkZWxlbS5kYXRhKCdfZGVsYXknLCBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuY2xvc2luZ1RpbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuJG1lbnVJdGVtcy5vbigna2V5ZG93bi56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ1tyb2xlPVwibWVudWl0ZW1cIl0nKSxcbiAgICAgICAgICBpc1RhYiA9IF90aGlzLiR0YWJzLmluZGV4KCRlbGVtZW50KSA+IC0xLFxuICAgICAgICAgICRlbGVtZW50cyA9IGlzVGFiID8gX3RoaXMuJHRhYnMgOiAkZWxlbWVudC5zaWJsaW5ncygnbGknKS5hZGQoJGVsZW1lbnQpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGkrMSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIG5leHRTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghJGVsZW1lbnQuaXMoJzpsYXN0LWNoaWxkJykpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJldlNpYmxpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHByZXZFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSwgb3BlblN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJHN1YiA9ICRlbGVtZW50LmNoaWxkcmVuKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG4gICAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KCRzdWIpO1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ2xpID4gYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICAgIH0sIGNsb3NlU3ViID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vaWYgKCRlbGVtZW50LmlzKCc6Zmlyc3QtY2hpbGQnKSkge1xuICAgICAgICB2YXIgY2xvc2UgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpO1xuICAgICAgICBjbG9zZS5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIF90aGlzLl9oaWRlKGNsb3NlKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvL31cbiAgICAgIH07XG4gICAgICB2YXIgZnVuY3Rpb25zID0ge1xuICAgICAgICBvcGVuOiBvcGVuU3ViLFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoX3RoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIF90aGlzLiRtZW51SXRlbXMuZmluZCgnYTpmaXJzdCcpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmIChpc1RhYikge1xuICAgICAgICBpZiAoX3RoaXMuX2lzVmVydGljYWwoKSkgeyAvLyB2ZXJ0aWNhbCBtZW51XG4gICAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogb3BlblN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGhvcml6b250YWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBwcmV2aW91czogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIGRvd246IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICBwcmV2aW91czogY2xvc2VTdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd25NZW51JywgZnVuY3Rpb25zKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXG4gICAgICAgICAub24oJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgdmFyICRsaW5rID0gX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCk7XG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgZHJvcGRvd24gcGFuZSwgYW5kIGNoZWNrcyBmb3IgY29sbGlzaW9ucyBmaXJzdC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xuICAgKi9cbiAgX3Nob3coJHN1Yikge1xuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICByZXR1cm4gJChlbCkuZmluZCgkc3ViKS5sZW5ndGggPiAwO1xuICAgIH0pKTtcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLl9oaWRlKCRzaWJzLCBpZHgpO1xuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLmFkZENsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB2YXIgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgIGlmICghY2xlYXIpIHtcbiAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICctcmlnaHQnIDogJy1sZWZ0JyxcbiAgICAgICAgICAkcGFyZW50TGkgPSAkc3ViLnBhcmVudCgnLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xuICAgICAgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgICAgaWYgKCFjbGVhcikge1xuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJycpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBuZXcgZHJvcGRvd24gcGFuZSBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bm1lbnUnLCBbJHN1Yl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc2luZ2xlLCBjdXJyZW50bHkgb3BlbiBkcm9wZG93biBwYW5lLCBpZiBwYXNzZWQgYSBwYXJhbWV0ZXIsIG90aGVyd2lzZSwgaGlkZXMgZXZlcnl0aGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gaGlkZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlICR0YWJzIGNvbGxlY3Rpb24gdG8gaGlkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hpZGUoJGVsZW0sIGlkeCkge1xuICAgIHZhciAkdG9DbG9zZTtcbiAgICBpZiAoJGVsZW0gJiYgJGVsZW0ubGVuZ3RoKSB7XG4gICAgICAkdG9DbG9zZSA9ICRlbGVtO1xuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kdGFicy5ub3QoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgcmV0dXJuIGkgPT09IGlkeDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcbiAgICB9XG4gICAgdmFyIHNvbWV0aGluZ1RvQ2xvc2UgPSAkdG9DbG9zZS5oYXNDbGFzcygnaXMtYWN0aXZlJykgfHwgJHRvQ2xvc2UuZmluZCgnLmlzLWFjdGl2ZScpLmxlbmd0aCA+IDA7XG5cbiAgICBpZiAoc29tZXRoaW5nVG9DbG9zZSkge1xuICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtYWN0aXZlJykuYWRkKCR0b0Nsb3NlKS5hdHRyKHtcbiAgICAgICAgJ2RhdGEtaXMtY2xpY2snOiBmYWxzZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAkdG9DbG9zZS5maW5kKCd1bC5qcy1kcm9wZG93bi1hY3RpdmUnKS5yZW1vdmVDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJyk7XG5cbiAgICAgIGlmICh0aGlzLmNoYW5nZWQgfHwgJHRvQ2xvc2UuZmluZCgnb3BlbnMtaW5uZXInKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JztcbiAgICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGQoJHRvQ2xvc2UpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGBvcGVucy1pbm5lciBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYG9wZW5zLSR7b2xkQ2xhc3N9YCk7XG4gICAgICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvcGVuIG1lbnVzIGFyZSBjbG9zZWQuXG4gICAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I2hpZGVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3dubWVudScsIFskdG9DbG9zZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm9mZignLnpmLmRyb3Bkb3dubWVudScpLnJlbW92ZUF0dHIoJ2RhdGEtaXMtY2xpY2snKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2lzLXJpZ2h0LWFycm93IGlzLWxlZnQtYXJyb3cgaXMtZG93bi1hcnJvdyBvcGVucy1yaWdodCBvcGVucy1sZWZ0IG9wZW5zLWlubmVyJyk7XG4gICAgJChkb2N1bWVudC5ib2R5KS5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRHJvcGRvd25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRGlzYWxsb3dzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgc3VibWVudXNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZUhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBhdXRvbWF0aWNhbGx5IGNsb3NlIG9uIGEgbW91c2VsZWF2ZSBldmVudCwgaWYgbm90IGNsaWNrZWQgb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvY2xvc2U6IHRydWUsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogNTAsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gb3Blbi9yZW1haW4gb3BlbiBvbiBwYXJlbnQgY2xpY2sgZXZlbnQuIEFsbG93cyBjdXJzb3IgdG8gbW92ZSBhd2F5IGZyb20gbWVudS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja09wZW46IGZhbHNlLFxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgY2xvc2luZyBhIHN1Ym1lbnUgb24gYSBtb3VzZWxlYXZlIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cblxuICBjbG9zaW5nVGltZTogNTAwLFxuICAvKipcbiAgICogUG9zaXRpb24gb2YgdGhlIG1lbnUgcmVsYXRpdmUgdG8gd2hhdCBkaXJlY3Rpb24gdGhlIHN1Ym1lbnVzIHNob3VsZCBvcGVuLiBIYW5kbGVkIGJ5IEpTLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdsZWZ0J1xuICAgKi9cbiAgYWxpZ25tZW50OiAnbGVmdCcsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gdGhlIGJvZHkgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIGxlYWYgYW5jaG9yIGxpbmtzIHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGlja0luc2lkZTogdHJ1ZSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndmVydGljYWwnXG4gICAqL1xuICB2ZXJ0aWNhbENsYXNzOiAndmVydGljYWwnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2FsaWduLXJpZ2h0J1xuICAgKi9cbiAgcmlnaHRDbGFzczogJ2FsaWduLXJpZ2h0JyxcbiAgLyoqXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZvcmNlRm9sbG93OiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd25NZW51LCAnRHJvcGRvd25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBFcXVhbGl6ZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmVxdWFsaXplclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgZXF1YWxpemVyIGNvbnRhaW5zIGltYWdlc1xuICovXG5cbmNsYXNzIEVxdWFsaXplciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEVxdWFsaXplciBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcbiAgICB2YXIgJHdhdGNoZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsaXplci13YXRjaD1cIiR7ZXFJZH1cIl1gKTtcblxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1yZXNpemUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cdHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQucGFyZW50c1VudGlsKGRvY3VtZW50LmJvZHksICdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcbiAgICAgIG9uUmVzaXplTWVCb3VuZDogdGhpcy5fb25SZXNpemVNZS5iaW5kKHRoaXMpLFxuICAgICAgb25Qb3N0RXF1YWxpemVkQm91bmQ6IHRoaXMuX29uUG9zdEVxdWFsaXplZC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHZhciBpbWdzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICB2YXIgdG9vU21hbGw7XG4gICAgaWYodGhpcy5vcHRpb25zLmVxdWFsaXplT24pe1xuICAgICAgdG9vU21hbGwgPSB0aGlzLl9jaGVja01RKCk7XG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICB9XG4gICAgaWYoKHRvb1NtYWxsICE9PSB1bmRlZmluZWQgJiYgdG9vU21hbGwgPT09IGZhbHNlKSB8fCB0b29TbWFsbCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGlmKGltZ3MubGVuZ3RoKXtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fcmVmbG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzIGlmIHRoZSBicmVha3BvaW50IGlzIHRvbyBzbWFsbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXVzZUV2ZW50cygpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZih7XG4gICAgICAnLnpmLmVxdWFsaXplcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQsXG5cdCAgJ211dGF0ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHJlc2l6ZW1lLnpmLnRyaWdnZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25SZXNpemVNZShlKSB7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyBwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUG9zdEVxdWFsaXplZChlKSB7XG4gICAgaWYoZS50YXJnZXQgIT09IHRoaXMuJGVsZW1lbnRbMF0peyB0aGlzLl9yZWZsb3coKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcblx0ICB0aGlzLiRlbGVtZW50Lm9uKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcbiAgICB9XG4gICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTVEoKSB7XG4gICAgdmFyIHRvb1NtYWxsID0gIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuZXF1YWxpemVPbik7XG4gICAgaWYodG9vU21hbGwpe1xuICAgICAgaWYodGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICB9XG4gICAgfWVsc2V7XG4gICAgICBpZighdGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0b29TbWFsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIG5vb3AgdmVyc2lvbiBmb3IgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tpbGxzd2l0Y2goKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEVxdWFsaXplciB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgaWYoIXRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uU3RhY2spe1xuICAgICAgaWYodGhpcy5faXNTdGFja2VkKCkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmVxdWFsaXplQnlSb3cpIHtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0c0J5Um93KHRoaXMuYXBwbHlIZWlnaHRCeVJvdy5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0cyh0aGlzLmFwcGx5SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYW51YWxseSBkZXRlcm1pbmVzIGlmIHRoZSBmaXJzdCAyIGVsZW1lbnRzIGFyZSAqTk9UKiBzdGFja2VkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2lzU3RhY2tlZCgpIHtcbiAgICBpZiAoIXRoaXMuJHdhdGNoZWRbMF0gfHwgIXRoaXMuJHdhdGNoZWRbMV0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4kd2F0Y2hlZFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgIT09IHRoaXMuJHdhdGNoZWRbMV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqL1xuICBnZXRIZWlnaHRzKGNiKSB7XG4gICAgdmFyIGhlaWdodHMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgaGVpZ2h0cy5wdXNoKHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG4gICAgY2IoaGVpZ2h0cyk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKi9cbiAgZ2V0SGVpZ2h0c0J5Um93KGNiKSB7XG4gICAgdmFyIGxhc3RFbFRvcE9mZnNldCA9ICh0aGlzLiR3YXRjaGVkLmxlbmd0aCA/IHRoaXMuJHdhdGNoZWQuZmlyc3QoKS5vZmZzZXQoKS50b3AgOiAwKSxcbiAgICAgICAgZ3JvdXBzID0gW10sXG4gICAgICAgIGdyb3VwID0gMDtcbiAgICAvL2dyb3VwIGJ5IFJvd1xuICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgLy9tYXliZSBjb3VsZCB1c2UgdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRUb3BcbiAgICAgIHZhciBlbE9mZnNldFRvcCA9ICQodGhpcy4kd2F0Y2hlZFtpXSkub2Zmc2V0KCkudG9wO1xuICAgICAgaWYgKGVsT2Zmc2V0VG9wIT1sYXN0RWxUb3BPZmZzZXQpIHtcbiAgICAgICAgZ3JvdXArKztcbiAgICAgICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgICAgICBsYXN0RWxUb3BPZmZzZXQ9ZWxPZmZzZXRUb3A7XG4gICAgICB9XG4gICAgICBncm91cHNbZ3JvdXBdLnB1c2goW3RoaXMuJHdhdGNoZWRbaV0sdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHRdKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMCwgbG4gPSBncm91cHMubGVuZ3RoOyBqIDwgbG47IGorKykge1xuICAgICAgdmFyIGhlaWdodHMgPSAkKGdyb3Vwc1tqXSkubWFwKGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzWzFdOyB9KS5nZXQoKTtcbiAgICAgIHZhciBtYXggICAgICAgICA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgICAgZ3JvdXBzW2pdLnB1c2gobWF4KTtcbiAgICB9XG4gICAgY2IoZ3JvdXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdFxuICAgKiBAcGFyYW0ge2FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0KGhlaWdodHMpIHtcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcblxuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCBtYXgpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3QgYnkgcm93XG4gICAqIEBwYXJhbSB7YXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRyb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHRCeVJvdyhncm91cHMpIHtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZ3JvdXBzLmxlbmd0aDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgdmFyIGdyb3Vwc0lMZW5ndGggPSBncm91cHNbaV0ubGVuZ3RoLFxuICAgICAgICAgIG1heCA9IGdyb3Vwc1tpXVtncm91cHNJTGVuZ3RoIC0gMV07XG4gICAgICBpZiAoZ3JvdXBzSUxlbmd0aDw9Mikge1xuICAgICAgICAkKGdyb3Vwc1tpXVswXVswXSkuY3NzKHsnaGVpZ2h0JzonYXV0byd9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgcGVyIHJvdyBhcmUgYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICAgIGZvciAodmFyIGogPSAwLCBsZW5KID0gKGdyb3Vwc0lMZW5ndGgtMSk7IGogPCBsZW5KIDsgaisrKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldW2pdWzBdKS5jc3MoeydoZWlnaHQnOm1heH0pO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBwZXIgcm93IGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRXF1YWxpemVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gd2hlbiBzdGFja2VkIG9uIHNtYWxsZXIgc2NyZWVucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBlcXVhbGl6ZU9uU3RhY2s6IGZhbHNlLFxuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gcm93IGJ5IHJvdy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXG4gIC8qKlxuICAgKiBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSB0aGUgcGx1Z2luIHNob3VsZCBlcXVhbGl6ZSBoZWlnaHRzIG9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBlcXVhbGl6ZU9uOiAnJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEVxdWFsaXplciwgJ0VxdWFsaXplcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmludGVyY2hhbmdlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICovXG5cbmNsYXNzIEludGVyY2hhbmdlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgSW50ZXJjaGFuZ2UuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEludGVyY2hhbmdlLmRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnJ1bGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnSW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5fYWRkQnJlYWtwb2ludHMoKTtcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBJbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLmludGVyY2hhbmdlJywgRm91bmRhdGlvbi51dGlsLnRocm90dGxlKCgpID0+IHtcbiAgICAgIHRoaXMuX3JlZmxvdygpO1xuICAgIH0sIDUwKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgSW50ZXJjaGFuZ2UgdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB2YXIgbWF0Y2g7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlLCBidXQgb25seSBzYXZlIHRoZSBsYXN0IG1hdGNoXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBpZih0aGlzLnJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBydWxlID0gdGhpcy5ydWxlc1tpXTtcbiAgICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHJ1bGUucXVlcnkpLm1hdGNoZXMpIHtcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgRm91bmRhdGlvbiBicmVha3BvaW50cyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgb2JqZWN0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCcmVha3BvaW50cygpIHtcbiAgICBmb3IgKHZhciBpIGluIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XG4gICAgICAgIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeS5uYW1lXSA9IHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIEludGVyY2hhbmdlIGVsZW1lbnQgZm9yIHRoZSBwcm92aWRlZCBtZWRpYSBxdWVyeSArIGNvbnRlbnQgcGFpcmluZ3NcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0aGF0IGlzIGFuIEludGVyY2hhbmdlIGluc3RhbmNlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gc2NlbmFyaW9zIC0gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGhhdmUgJ21xJyBhbmQgJ3BhdGgnIGtleXMgd2l0aCBjb3JyZXNwb25kaW5nIGtleXNcbiAgICovXG4gIF9nZW5lcmF0ZVJ1bGVzKGVsZW1lbnQpIHtcbiAgICB2YXIgcnVsZXNMaXN0ID0gW107XG4gICAgdmFyIHJ1bGVzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ydWxlcykge1xuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJykubWF0Y2goL1xcWy4qP1xcXS9nKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XG4gICAgICBpZihydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2ldLnNsaWNlKDEsIC0xKS5zcGxpdCgnLCAnKTtcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gcnVsZVtydWxlLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XG4gICAgICAgICAgcXVlcnkgPSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVsZXNMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBydWxlc0xpc3Q7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAtIFBhdGggdG8gdGhlIGltYWdlIG9yIEhUTUwgcGFydGlhbC5cbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAqL1xuICByZXBsYWNlKHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XG5cbiAgICAvLyBSZXBsYWNpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3NyYycsIHBhdGgpLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pXG4gICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXG4gICAgZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwuKGdpZnxqcGd8anBlZ3xwbmd8c3ZnfHRpZmYpKFs/I10uKik/L2kpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7ICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybCgnK3BhdGgrJyknIH0pXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBIVE1MXG4gICAgZWxzZSB7XG4gICAgICAkLmdldChwYXRoLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5odG1sKHJlc3BvbnNlKVxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgICAgICAkKHJlc3BvbnNlKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gY29udGVudCBpbiBhbiBJbnRlcmNoYW5nZSBlbGVtZW50IGlzIGRvbmUgYmVpbmcgbG9hZGVkLlxuICAgICAqIEBldmVudCBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgICAqL1xuICAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBpbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIC8vVE9ETyB0aGlzLlxuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkludGVyY2hhbmdlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgcnVsZXM6IG51bGxcbn07XG5cbkludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFUyA9IHtcbiAgJ2xhbmRzY2FwZSc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gICdwb3J0cmFpdCc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgJ3JldGluYSc6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oSW50ZXJjaGFuZ2UsICdJbnRlcmNoYW5nZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogTWFnZWxsYW4gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1hZ2VsbGFuXG4gKi9cblxuY2xhc3MgTWFnZWxsYW4ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBNYWdlbGxhbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBNYWdlbGxhbiNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIE1hZ2VsbGFuLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5jYWxjUG9pbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdNYWdlbGxhbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNYWdlbGxhbiBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ21hZ2VsbGFuJyk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiR0YXJnZXRzID0gJCgnW2RhdGEtbWFnZWxsYW4tdGFyZ2V0XScpO1xuICAgIHRoaXMuJGxpbmtzID0gdGhpcy4kZWxlbWVudC5maW5kKCdhJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdkYXRhLXJlc2l6ZSc6IGlkLFxuICAgICAgJ2RhdGEtc2Nyb2xsJzogaWQsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuICAgIHRoaXMuJGFjdGl2ZSA9ICQoKTtcbiAgICB0aGlzLnNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBhbiBhcnJheSBvZiBwaXhlbCB2YWx1ZXMgdGhhdCBhcmUgdGhlIGRlbWFyY2F0aW9uIGxpbmVzIGJldHdlZW4gbG9jYXRpb25zIG9uIHRoZSBwYWdlLlxuICAgKiBDYW4gYmUgaW52b2tlZCBpZiBuZXcgZWxlbWVudHMgYXJlIGFkZGVkIG9yIHRoZSBzaXplIG9mIGEgbG9jYXRpb24gY2hhbmdlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBjYWxjUG9pbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5LFxuICAgICAgICBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICB0aGlzLndpbkhlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgod2luZG93LmlubmVySGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCkpO1xuICAgIHRoaXMuZG9jSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heChib2R5LnNjcm9sbEhlaWdodCwgYm9keS5vZmZzZXRIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0LCBodG1sLnNjcm9sbEhlaWdodCwgaHRtbC5vZmZzZXRIZWlnaHQpKTtcblxuICAgIHRoaXMuJHRhcmdldHMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICR0YXIgPSAkKHRoaXMpLFxuICAgICAgICAgIHB0ID0gTWF0aC5yb3VuZCgkdGFyLm9mZnNldCgpLnRvcCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkKTtcbiAgICAgICR0YXIudGFyZ2V0UG9pbnQgPSBwdDtcbiAgICAgIF90aGlzLnBvaW50cy5wdXNoKHB0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIE1hZ2VsbGFuLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAkYm9keSA9ICQoJ2h0bWwsIGJvZHknKSxcbiAgICAgICAgb3B0cyA9IHtcbiAgICAgICAgICBkdXJhdGlvbjogX3RoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgICAgICBlYXNpbmc6ICAgX3RoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmdcbiAgICAgICAgfTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkJywgZnVuY3Rpb24oKXtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgICBpZihsb2NhdGlvbi5oYXNoKXtcbiAgICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyhsb2NhdGlvbi5oYXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3RoaXMuY2FsY1BvaW50cygpO1xuICAgICAgX3RoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMucmVmbG93LmJpbmQodGhpcyksXG4gICAgICAnc2Nyb2xsbWUuemYudHJpZ2dlcic6IHRoaXMuX3VwZGF0ZUFjdGl2ZS5iaW5kKHRoaXMpXG4gICAgfSkub24oJ2NsaWNrLnpmLm1hZ2VsbGFuJywgJ2FbaHJlZl49XCIjXCJdJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBhcnJpdmFsICAgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyhhcnJpdmFsKTtcbiAgICAgIH0pO1xuICAgICQod2luZG93KS5vbigncG9wc3RhdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKSB7XG4gICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKHdpbmRvdy5sb2NhdGlvbi5oYXNoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0byBzY3JvbGwgdG8gYSBnaXZlbiBsb2NhdGlvbiBvbiB0aGUgcGFnZS5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvYyAtIGEgcHJvcGVybHkgZm9ybWF0dGVkIGpRdWVyeSBpZCBzZWxlY3Rvci4gRXhhbXBsZTogJyNmb28nXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2Nyb2xsVG9Mb2MobG9jKSB7XG4gICAgLy8gRG8gbm90aGluZyBpZiB0YXJnZXQgZG9lcyBub3QgZXhpc3QgdG8gcHJldmVudCBlcnJvcnNcbiAgICBpZiAoISQobG9jKS5sZW5ndGgpIHtyZXR1cm4gZmFsc2U7fVxuICAgIHRoaXMuX2luVHJhbnNpdGlvbiA9IHRydWU7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsUG9zID0gTWF0aC5yb3VuZCgkKGxvYykub2Zmc2V0KCkudG9wIC0gdGhpcy5vcHRpb25zLnRocmVzaG9sZCAvIDIgLSB0aGlzLm9wdGlvbnMuYmFyT2Zmc2V0KTtcblxuICAgICQoJ2h0bWwsIGJvZHknKS5zdG9wKHRydWUpLmFuaW1hdGUoXG4gICAgICB7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sXG4gICAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nLFxuICAgICAgZnVuY3Rpb24oKSB7X3RoaXMuX2luVHJhbnNpdGlvbiA9IGZhbHNlOyBfdGhpcy5fdXBkYXRlQWN0aXZlKCl9XG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBNYWdlbGxhbiB1cG9uIERPTSBjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICByZWZsb3coKSB7XG4gICAgdGhpcy5jYWxjUG9pbnRzKCk7XG4gICAgdGhpcy5fdXBkYXRlQWN0aXZlKCk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgdmlzaWJpbGl0eSBvZiBhbiBhY3RpdmUgbG9jYXRpb24gbGluaywgYW5kIHVwZGF0ZXMgdGhlIHVybCBoYXNoIGZvciB0aGUgcGFnZSwgaWYgZGVlcExpbmtpbmcgZW5hYmxlZC5cbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBNYWdlbGxhbiN1cGRhdGVcbiAgICovXG4gIF91cGRhdGVBY3RpdmUoLypldnQsIGVsZW0sIHNjcm9sbFBvcyovKSB7XG4gICAgaWYodGhpcy5faW5UcmFuc2l0aW9uKSB7cmV0dXJuO31cbiAgICB2YXIgd2luUG9zID0gLypzY3JvbGxQb3MgfHwqLyBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKSxcbiAgICAgICAgY3VySWR4O1xuXG4gICAgaWYod2luUG9zICsgdGhpcy53aW5IZWlnaHQgPT09IHRoaXMuZG9jSGVpZ2h0KXsgY3VySWR4ID0gdGhpcy5wb2ludHMubGVuZ3RoIC0gMTsgfVxuICAgIGVsc2UgaWYod2luUG9zIDwgdGhpcy5wb2ludHNbMF0peyBjdXJJZHggPSB1bmRlZmluZWQ7IH1cbiAgICBlbHNle1xuICAgICAgdmFyIGlzRG93biA9IHRoaXMuc2Nyb2xsUG9zIDwgd2luUG9zLFxuICAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgICBjdXJWaXNpYmxlID0gdGhpcy5wb2ludHMuZmlsdGVyKGZ1bmN0aW9uKHAsIGkpe1xuICAgICAgICAgICAgcmV0dXJuIGlzRG93biA/IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCA8PSB3aW5Qb3MgOiBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCA8PSB3aW5Qb3M7XG4gICAgICAgICAgfSk7XG4gICAgICBjdXJJZHggPSBjdXJWaXNpYmxlLmxlbmd0aCA/IGN1clZpc2libGUubGVuZ3RoIC0gMSA6IDA7XG4gICAgfVxuXG4gICAgdGhpcy4kYWN0aXZlLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG4gICAgdGhpcy4kYWN0aXZlID0gdGhpcy4kbGlua3MuZmlsdGVyKCdbaHJlZj1cIiMnICsgdGhpcy4kdGFyZ2V0cy5lcShjdXJJZHgpLmRhdGEoJ21hZ2VsbGFuLXRhcmdldCcpICsgJ1wiXScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgdmFyIGhhc2ggPSBcIlwiO1xuICAgICAgaWYoY3VySWR4ICE9IHVuZGVmaW5lZCl7XG4gICAgICAgIGhhc2ggPSB0aGlzLiRhY3RpdmVbMF0uZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICB9XG4gICAgICBpZihoYXNoICE9PSB3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgICBpZih3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpe1xuICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxQb3MgPSB3aW5Qb3M7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiBtYWdlbGxhbiBpcyBmaW5pc2hlZCB1cGRhdGluZyB0byB0aGUgbmV3IGFjdGl2ZSBlbGVtZW50LlxuICAgICAqIEBldmVudCBNYWdlbGxhbiN1cGRhdGVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwZGF0ZS56Zi5tYWdlbGxhbicsIFt0aGlzLiRhY3RpdmVdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBNYWdlbGxhbiBhbmQgcmVzZXRzIHRoZSB1cmwgb2YgdGhlIHdpbmRvdy5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYubWFnZWxsYW4nKVxuICAgICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzfWApLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgdmFyIGhhc2ggPSB0aGlzLiRhY3RpdmVbMF0uZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaC5yZXBsYWNlKGhhc2gsICcnKTtcbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuTWFnZWxsYW4uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSwgaW4gbXMsIHRoZSBhbmltYXRlZCBzY3JvbGxpbmcgc2hvdWxkIHRha2UgYmV0d2VlbiBsb2NhdGlvbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxuICAvKipcbiAgICogQW5pbWF0aW9uIHN0eWxlIHRvIHVzZSB3aGVuIHNjcm9sbGluZyBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZWFzZS1pbi1vdXQnXG4gICAqL1xuICBhbmltYXRpb25FYXNpbmc6ICdsaW5lYXInLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyB0byB1c2UgYXMgYSBtYXJrZXIgZm9yIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIHRocmVzaG9sZDogNTAsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBhY3RpdmUgbG9jYXRpb25zIGxpbmsgb24gdGhlIG1hZ2VsbGFuIGNvbnRhaW5lci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnYWN0aXZlJ1xuICAgKi9cbiAgYWN0aXZlQ2xhc3M6ICdhY3RpdmUnLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBzY3JpcHQgdG8gbWFuaXB1bGF0ZSB0aGUgdXJsIG9mIHRoZSBjdXJyZW50IHBhZ2UsIGFuZCBpZiBzdXBwb3J0ZWQsIGFsdGVyIHRoZSBoaXN0b3J5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGRlZXBMaW5raW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gb2Zmc2V0IHRoZSBzY3JvbGwgb2YgdGhlIHBhZ2Ugb24gaXRlbSBjbGljayBpZiB1c2luZyBhIHN0aWNreSBuYXYgYmFyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1XG4gICAqL1xuICBiYXJPZmZzZXQ6IDBcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE1hZ2VsbGFuLCAnTWFnZWxsYW4nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE9mZkNhbnZhcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ub2ZmY2FudmFzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKi9cblxuY2xhc3MgT2ZmQ2FudmFzIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb2ZmLWNhbnZhcyB3cmFwcGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIE9mZkNhbnZhcyNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBpbml0aWFsaXplLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIE9mZkNhbnZhcy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gJCgpO1xuICAgIHRoaXMuJHRyaWdnZXJzID0gJCgpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT2ZmQ2FudmFzJylcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdPZmZDYW52YXMnLCB7XG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG9mZi1jYW52YXMgd3JhcHBlciBieSBhZGRpbmcgdGhlIGV4aXQgb3ZlcmxheSAoaWYgbmVlZGVkKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoYGlzLXRyYW5zaXRpb24tJHt0aGlzLm9wdGlvbnMudHJhbnNpdGlvbn1gKTtcblxuICAgIC8vIEZpbmQgdHJpZ2dlcnMgdGhhdCBhZmZlY3QgdGhpcyBlbGVtZW50IGFuZCBhZGQgYXJpYS1leHBhbmRlZCB0byB0aGVtXG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKGRvY3VtZW50KVxuICAgICAgLmZpbmQoJ1tkYXRhLW9wZW49XCInK2lkKydcIl0sIFtkYXRhLWNsb3NlPVwiJytpZCsnXCJdLCBbZGF0YS10b2dnbGU9XCInK2lkKydcIl0nKVxuICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG5cbiAgICAvLyBBZGQgYW4gb3ZlcmxheSBvdmVyIHRoZSBjb250ZW50IGlmIG5lY2Vzc2FyeVxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHZhciBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICB2YXIgb3ZlcmxheVBvc2l0aW9uID0gJCh0aGlzLiRlbGVtZW50KS5jc3MoXCJwb3NpdGlvblwiKSA9PT0gJ2ZpeGVkJyA/ICdpcy1vdmVybGF5LWZpeGVkJyA6ICdpcy1vdmVybGF5LWFic29sdXRlJztcbiAgICAgIG92ZXJsYXkuc2V0QXR0cmlidXRlKCdjbGFzcycsICdqcy1vZmYtY2FudmFzLW92ZXJsYXkgJyArIG92ZXJsYXlQb3NpdGlvbik7XG4gICAgICB0aGlzLiRvdmVybGF5ID0gJChvdmVybGF5KTtcbiAgICAgIGlmKG92ZXJsYXlQb3NpdGlvbiA9PT0gJ2lzLW92ZXJsYXktZml4ZWQnKSB7XG4gICAgICAgICQoJ2JvZHknKS5hcHBlbmQodGhpcy4kb3ZlcmxheSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLiRlbGVtZW50LnNpYmxpbmdzKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykuYXBwZW5kKHRoaXMuJG92ZXJsYXkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5pc1JldmVhbGVkID0gdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgfHwgbmV3IFJlZ0V4cCh0aGlzLm9wdGlvbnMucmV2ZWFsQ2xhc3MsICdnJykudGVzdCh0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgPT09IHRydWUpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5yZXZlYWxPbiA9IHRoaXMub3B0aW9ucy5yZXZlYWxPbiB8fCB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHJldmVhbC1mb3ItbWVkaXVtfHJldmVhbC1mb3ItbGFyZ2UpL2cpWzBdLnNwbGl0KCctJylbMl07XG4gICAgICB0aGlzLl9zZXRNUUNoZWNrZXIoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUgPT09IHRydWUpIHtcbiAgICAgIHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSA9IHBhcnNlRmxvYXQod2luZG93LmdldENvbXB1dGVkU3R5bGUoJCgnW2RhdGEtb2ZmLWNhbnZhc10nKVswXSkudHJhbnNpdGlvbkR1cmF0aW9uKSAqIDEwMDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gdGhlIG9mZi1jYW52YXMgd3JhcHBlciBhbmQgdGhlIGV4aXQgb3ZlcmxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJykub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ2tleWRvd24uemYub2ZmY2FudmFzJzogdGhpcy5faGFuZGxlS2V5Ym9hcmQuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgPT09IHRydWUpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gdGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID8gdGhpcy4kb3ZlcmxheSA6ICQoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKTtcbiAgICAgICR0YXJnZXQub24oeydjbGljay56Zi5vZmZjYW52YXMnOiB0aGlzLmNsb3NlLmJpbmQodGhpcyl9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBldmVudCBsaXN0ZW5lciBmb3IgZWxlbWVudHMgdGhhdCB3aWxsIHJldmVhbCBhdCBjZXJ0YWluIGJyZWFrcG9pbnRzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldE1RQ2hlY2tlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChfdGhpcy5vcHRpb25zLnJldmVhbE9uKSkge1xuICAgICAgICBfdGhpcy5yZXZlYWwodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfdGhpcy5yZXZlYWwoZmFsc2UpO1xuICAgICAgfVxuICAgIH0pLm9uZSgnbG9hZC56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChfdGhpcy5vcHRpb25zLnJldmVhbE9uKSkge1xuICAgICAgICBfdGhpcy5yZXZlYWwodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgcmV2ZWFsaW5nL2hpZGluZyB0aGUgb2ZmLWNhbnZhcyBhdCBicmVha3BvaW50cywgbm90IHRoZSBzYW1lIGFzIG9wZW4uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSZXZlYWxlZCAtIHRydWUgaWYgZWxlbWVudCBzaG91bGQgYmUgcmV2ZWFsZWQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgcmV2ZWFsKGlzUmV2ZWFsZWQpIHtcbiAgICB2YXIgJGNsb3NlciA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJyk7XG4gICAgaWYgKGlzUmV2ZWFsZWQpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHRoaXMuaXNSZXZlYWxlZCA9IHRydWU7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZignb3Blbi56Zi50cmlnZ2VyIHRvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gICAgICBpZiAoJGNsb3Nlci5sZW5ndGgpIHsgJGNsb3Nlci5oaWRlKCk7IH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pc1JldmVhbGVkID0gZmFsc2U7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcylcbiAgICAgIH0pO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7XG4gICAgICAgICRjbG9zZXIuc2hvdygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBzY3JvbGxpbmcgb2YgdGhlIGJvZHkgd2hlbiBvZmZjYW52YXMgaXMgb3BlbiBvbiBtb2JpbGUgU2FmYXJpIGFuZCBvdGhlciB0cm91Ymxlc29tZSBicm93c2Vycy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zdG9wU2Nyb2xsaW5nKGV2ZW50KSB7XG4gIFx0cmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBvZmYtY2FudmFzIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSB0cmlnZ2VyIC0gZWxlbWVudCB0aGF0IHRyaWdnZXJlZCB0aGUgb2ZmLWNhbnZhcyB0byBvcGVuLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI29wZW5lZFxuICAgKi9cbiAgb3BlbihldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodHJpZ2dlcikge1xuICAgICAgdGhpcy4kbGFzdFRyaWdnZXIgPSB0cmlnZ2VyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZm9yY2VUbyA9PT0gJ3RvcCcpIHtcbiAgICAgIHdpbmRvdy5zY3JvbGxUbygwLCAwKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5mb3JjZVRvID09PSAnYm90dG9tJykge1xuICAgICAgd2luZG93LnNjcm9sbFRvKDAsZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI29wZW5lZFxuICAgICAqL1xuICAgIF90aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcblxuICAgIHRoaXMuJHRyaWdnZXJzLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAndHJ1ZScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKVxuICAgICAgICAudHJpZ2dlcignb3BlbmVkLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgLy8gSWYgYGNvbnRlbnRTY3JvbGxgIGlzIHNldCB0byBmYWxzZSwgYWRkIGNsYXNzIGFuZCBkaXNhYmxlIHNjcm9sbGluZyBvbiB0b3VjaCBkZXZpY2VzLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudFNjcm9sbCA9PT0gZmFsc2UpIHtcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygnaXMtb2ZmLWNhbnZhcy1vcGVuJykub24oJ3RvdWNobW92ZScsIHRoaXMuX3N0b3BTY3JvbGxpbmcpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSAmJiB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2lzLWNsb3NhYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCh0aGlzLiRlbGVtZW50KSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLiRlbGVtZW50LmZpbmQoJ2EsIGJ1dHRvbicpLmVxKDApLmZvY3VzKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cyA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5zaWJsaW5ncygnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLmF0dHIoJ3RhYmluZGV4JywgJy0xJyk7XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnRyYXBGb2N1cyh0aGlzLiRlbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvZmYtY2FudmFzIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNiIHRvIGZpcmUgYWZ0ZXIgY2xvc3VyZS5cbiAgICogQGZpcmVzIE9mZkNhbnZhcyNjbG9zZWRcbiAgICovXG4gIGNsb3NlKGNiKSB7XG4gICAgaWYgKCF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdpcy1vcGVuJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbnMuXG4gICAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgICAgICovXG4gICAgICAgIC50cmlnZ2VyKCdjbG9zZWQuemYub2ZmY2FudmFzJyk7XG5cbiAgICAvLyBJZiBgY29udGVudFNjcm9sbGAgaXMgc2V0IHRvIGZhbHNlLCByZW1vdmUgY2xhc3MgYW5kIHJlLWVuYWJsZSBzY3JvbGxpbmcgb24gdG91Y2ggZGV2aWNlcy5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRTY3JvbGwgPT09IGZhbHNlKSB7XG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLW9mZi1jYW52YXMtb3BlbicpLm9mZigndG91Y2htb3ZlJywgdGhpcy5fc3RvcFNjcm9sbGluZyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50T3ZlcmxheSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnaXMtdmlzaWJsZScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrID09PSB0cnVlICYmIHRoaXMub3B0aW9ucy5jb250ZW50T3ZlcmxheSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnaXMtY2xvc2FibGUnKTtcbiAgICB9XG5cbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cyA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5zaWJsaW5ncygnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLnJlbW92ZUF0dHIoJ3RhYmluZGV4Jyk7XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlbGVhc2VGb2N1cyh0aGlzLiRlbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW4gb3IgY2xvc2VkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICovXG4gIHRvZ2dsZShldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpIHtcbiAgICAgIHRoaXMuY2xvc2UoZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMub3BlbihldmVudCwgdHJpZ2dlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMga2V5Ym9hcmQgaW5wdXQgd2hlbiBkZXRlY3RlZC4gV2hlbiB0aGUgZXNjYXBlIGtleSBpcyBwcmVzc2VkLCB0aGUgb2ZmLWNhbnZhcyBtZW51IGNsb3NlcywgYW5kIGZvY3VzIGlzIHJlc3RvcmVkIHRvIHRoZSBlbGVtZW50IHRoYXQgb3BlbmVkIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVLZXlib2FyZChlKSB7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ09mZkNhbnZhcycsIHtcbiAgICAgIGNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgdGhpcy4kbGFzdFRyaWdnZXIuZm9jdXMoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgaGFuZGxlZDogKCkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIG9mZmNhbnZhcyBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKTtcbiAgICB0aGlzLiRvdmVybGF5Lm9mZignLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9mZkNhbnZhcy5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFsbG93IHRoZSB1c2VyIHRvIGNsaWNrIG91dHNpZGUgb2YgdGhlIG1lbnUgdG8gY2xvc2UgaXQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIG92ZXJsYXkgb24gdG9wIG9mIGBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjb250ZW50T3ZlcmxheTogdHJ1ZSxcblxuICAvKipcbiAgICogRW5hYmxlL2Rpc2FibGUgc2Nyb2xsaW5nIG9mIHRoZSBtYWluIGNvbnRlbnQgd2hlbiBhbiBvZmYgY2FudmFzIHBhbmVsIGlzIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY29udGVudFNjcm9sbDogdHJ1ZSxcblxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgaW4gbXMgdGhlIG9wZW4gYW5kIGNsb3NlIHRyYW5zaXRpb24gcmVxdWlyZXMuIElmIG5vbmUgc2VsZWN0ZWQsIHB1bGxzIGZyb20gYm9keSBzdHlsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIHRyYW5zaXRpb25UaW1lOiAwLFxuXG4gIC8qKlxuICAgKiBUeXBlIG9mIHRyYW5zaXRpb24gZm9yIHRoZSBvZmZjYW52YXMgbWVudS4gT3B0aW9ucyBhcmUgJ3B1c2gnLCAnZGV0YWNoZWQnIG9yICdzbGlkZScuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgcHVzaFxuICAgKi9cbiAgdHJhbnNpdGlvbjogJ3B1c2gnLFxuXG4gIC8qKlxuICAgKiBGb3JjZSB0aGUgcGFnZSB0byBzY3JvbGwgdG8gdG9wIG9yIGJvdHRvbSBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRvcFxuICAgKi9cbiAgZm9yY2VUbzogbnVsbCxcblxuICAvKipcbiAgICogQWxsb3cgdGhlIG9mZmNhbnZhcyB0byByZW1haW4gb3BlbiBmb3IgY2VydGFpbiBicmVha3BvaW50cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgaXNSZXZlYWxlZDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEJyZWFrcG9pbnQgYXQgd2hpY2ggdG8gcmV2ZWFsLiBKUyB3aWxsIHVzZSBhIFJlZ0V4cCB0byB0YXJnZXQgc3RhbmRhcmQgY2xhc3NlcywgaWYgY2hhbmdpbmcgY2xhc3NuYW1lcywgcGFzcyB5b3VyIGNsYXNzIHdpdGggdGhlIGByZXZlYWxDbGFzc2Agb3B0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcbiAgICovXG4gIHJldmVhbE9uOiBudWxsLFxuXG4gIC8qKlxuICAgKiBGb3JjZSBmb2N1cyB0byB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uIElmIHRydWUsIHdpbGwgZm9jdXMgdGhlIG9wZW5pbmcgdHJpZ2dlciBvbiBjbG9zZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvRm9jdXM6IHRydWUsXG5cbiAgLyoqXG4gICAqIENsYXNzIHVzZWQgdG8gZm9yY2UgYW4gb2ZmY2FudmFzIHRvIHJlbWFpbiBvcGVuLiBGb3VuZGF0aW9uIGRlZmF1bHRzIGZvciB0aGlzIGFyZSBgcmV2ZWFsLWZvci1sYXJnZWAgJiBgcmV2ZWFsLWZvci1tZWRpdW1gLlxuICAgKiBAb3B0aW9uXG4gICAqIFRPRE8gaW1wcm92ZSB0aGUgcmVnZXggdGVzdGluZyBmb3IgdGhpcy5cbiAgICogQGV4YW1wbGUgcmV2ZWFsLWZvci1sYXJnZVxuICAgKi9cbiAgcmV2ZWFsQ2xhc3M6ICdyZXZlYWwtZm9yLScsXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIG9wdGlvbmFsIGZvY3VzIHRyYXBwaW5nIHdoZW4gb3BlbmluZyBhbiBvZmZjYW52YXMuIFNldHMgdGFiaW5kZXggb2YgW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XSB0byAtMSBmb3IgYWNjZXNzaWJpbGl0eSBwdXJwb3Nlcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihPZmZDYW52YXMsICdPZmZDYW52YXMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE9yYml0IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vcmJpdFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxuICovXG5cbmNsYXNzIE9yYml0IHtcbiAgLyoqXG4gICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvcmJpdCBjYXJvdXNlbC5cbiAgKiBAY2xhc3NcbiAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIE9yYml0IENhcm91c2VsLlxuICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIE9yYml0LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPcmJpdCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09yYml0Jywge1xuICAgICAgJ2x0cic6IHtcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIH0sXG4gICAgICAncnRsJzoge1xuICAgICAgICAnQVJST1dfTEVGVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ3ByZXZpb3VzJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMsIHNldHRpbmcgYXR0cmlidXRlcywgYW5kIHN0YXJ0aW5nIHRoZSBhbmltYXRpb24uXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gQFRPRE86IGNvbnNpZGVyIGRpc2N1c3Npb24gb24gUFIgIzkyNzggYWJvdXQgRE9NIHBvbGx1dGlvbiBieSBjaGFuZ2VTbGlkZVxuICAgIHRoaXMuX3Jlc2V0KCk7XG5cbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3N9YCk7XG4gICAgdGhpcy4kc2xpZGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKTtcblxuICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKSxcbiAgICAgICAgaW5pdEFjdGl2ZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ29yYml0Jyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuXG4gICAgaWYgKCFpbml0QWN0aXZlLmxlbmd0aCkge1xuICAgICAgdGhpcy4kc2xpZGVzLmVxKDApLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5hZGRDbGFzcygnbm8tbW90aW9udWknKTtcbiAgICB9XG5cbiAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmVwYXJlRm9yT3JiaXQoKTsvL2hlaGVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgIHRoaXMuX2xvYWRCdWxsZXRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmIHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmdlb1N5bmMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHsgLy8gYWxsb3cgd3JhcHBlciB0byBiZSBmb2N1c2FibGUgdG8gZW5hYmxlIGFycm93IG5hdmlnYXRpb25cbiAgICAgIHRoaXMuJHdyYXBwZXIuYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDcmVhdGVzIGEgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgYnVsbGV0cywgaWYgdGhleSBhcmUgYmVpbmcgdXNlZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfbG9hZEJ1bGxldHMoKSB7XG4gICAgdGhpcy4kYnVsbGV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKS5maW5kKCdidXR0b24nKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgYSBgdGltZXJgIG9iamVjdCBvbiB0aGUgb3JiaXQsIGFuZCBzdGFydHMgdGhlIGNvdW50ZXIgZm9yIHRoZSBuZXh0IHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBnZW9TeW5jKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50aW1lciA9IG5ldyBGb3VuZGF0aW9uLlRpbWVyKFxuICAgICAgdGhpcy4kZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgZHVyYXRpb246IHRoaXMub3B0aW9ucy50aW1lckRlbGF5LFxuICAgICAgICBpbmZpbml0ZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB0aGlzLnRpbWVyLnN0YXJ0KCk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHdyYXBwZXIgYW5kIHNsaWRlIGhlaWdodHMgZm9yIHRoZSBvcmJpdC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfcHJlcGFyZUZvck9yYml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fc2V0V3JhcHBlckhlaWdodCgpO1xuICB9XG5cbiAgLyoqXG4gICogQ2FsdWxhdGVzIHRoZSBoZWlnaHQgb2YgZWFjaCBzbGlkZSBpbiB0aGUgY29sbGVjdGlvbiwgYW5kIHVzZXMgdGhlIHRhbGxlc3Qgb25lIGZvciB0aGUgd3JhcHBlciBoZWlnaHQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSB3aGVuIGNvbXBsZXRlLlxuICAqL1xuICBfc2V0V3JhcHBlckhlaWdodChjYikgey8vcmV3cml0ZSB0aGlzIHRvIGBmb3JgIGxvb3BcbiAgICB2YXIgbWF4ID0gMCwgdGVtcCwgY291bnRlciA9IDAsIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXNsaWRlJywgY291bnRlcik7XG5cbiAgICAgIGlmIChfdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpWzBdICE9PSBfdGhpcy4kc2xpZGVzLmVxKGNvdW50ZXIpWzBdKSB7Ly9pZiBub3QgdGhlIGFjdGl2ZSBzbGlkZSwgc2V0IGNzcyBwb3NpdGlvbiBhbmQgZGlzcGxheSBwcm9wZXJ0eVxuICAgICAgICAkKHRoaXMpLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnbm9uZSd9KTtcbiAgICAgIH1cbiAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgY291bnRlcisrO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvdW50ZXIgPT09IHRoaXMuJHNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHdyYXBwZXIuY3NzKHsnaGVpZ2h0JzogbWF4fSk7IC8vb25seSBjaGFuZ2UgdGhlIHdyYXBwZXIgaGVpZ2h0IHByb3BlcnR5IG9uY2UuXG4gICAgICBpZihjYikge2NiKG1heCk7fSAvL2ZpcmUgY2FsbGJhY2sgd2l0aCBtYXggaGVpZ2h0IGRpbWVuc2lvbi5cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHRoZSBtYXgtaGVpZ2h0IG9mIGVhY2ggc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3NldFNsaWRlSGVpZ2h0KGhlaWdodCkge1xuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5jc3MoJ21heC1oZWlnaHQnLCBoZWlnaHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gYmFzaWNhbGx5IGV2ZXJ5dGhpbmcgd2l0aGluIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy8qKk5vdyB1c2luZyBjdXN0b20gZXZlbnQgLSB0aGFua3MgdG86KipcbiAgICAvLyoqICAgICAgWW9oYWkgQXJhcmF0IG9mIFRvcm9udG8gICAgICAqKlxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy9cbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnJlc2l6ZW1lLnpmLnRyaWdnZXInKS5vbih7XG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX3ByZXBhcmVGb3JPcmJpdC5iaW5kKHRoaXMpXG4gICAgfSlcbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zd2lwZSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub2ZmKCdzd2lwZWxlZnQuemYub3JiaXQgc3dpcGVyaWdodC56Zi5vcmJpdCcpXG4gICAgICAgIC5vbignc3dpcGVsZWZ0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICB9KS5vbignc3dpcGVyaWdodC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub24oJ2NsaWNrLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJywgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICAgIF90aGlzLnRpbWVyW190aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gJ3BhdXNlJyA6ICdzdGFydCddKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF1c2VPbkhvdmVyKSB7XG4gICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2VlbnRlci56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMudGltZXIucGF1c2UoKTtcbiAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSkge1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5zdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubmF2QnV0dG9ucykge1xuICAgICAgICB2YXIgJGNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubmV4dENsYXNzfSwgLiR7dGhpcy5vcHRpb25zLnByZXZDbGFzc31gKTtcbiAgICAgICAgJGNvbnRyb2xzLmF0dHIoJ3RhYmluZGV4JywgMClcbiAgICAgICAgLy9hbHNvIG5lZWQgdG8gaGFuZGxlIGVudGVyL3JldHVybiBhbmQgc3BhY2ViYXIga2V5IHByZXNzZXNcbiAgICAgICAgLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuXHQgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSgkKHRoaXMpLmhhc0NsYXNzKF90aGlzLm9wdGlvbnMubmV4dENsYXNzKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgdGhpcy4kYnVsbGV0cy5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoL2lzLWFjdGl2ZS9nLnRlc3QodGhpcy5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfS8vaWYgdGhpcyBpcyBhY3RpdmUsIGtpY2sgb3V0IG9mIGZ1bmN0aW9uLlxuICAgICAgICAgIHZhciBpZHggPSAkKHRoaXMpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgbHRyID0gaWR4ID4gX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgICRzbGlkZSA9IF90aGlzLiRzbGlkZXMuZXEoaWR4KTtcblxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGx0ciwgJHNsaWRlLCBpZHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7XG4gICAgICAgIHRoaXMuJHdyYXBwZXIuYWRkKHRoaXMuJGJ1bGxldHMpLm9uKCdrZXlkb3duLnpmLm9yYml0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnT3JiaXQnLCB7XG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIGlmIGJ1bGxldCBpcyBmb2N1c2VkLCBtYWtlIHN1cmUgZm9jdXMgbW92ZXNcbiAgICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKF90aGlzLiRidWxsZXRzKSkge1xuICAgICAgICAgICAgICAgIF90aGlzLiRidWxsZXRzLmZpbHRlcignLmlzLWFjdGl2ZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBPcmJpdCBzbyBpdCBjYW4gYmUgcmVpbml0aWFsaXplZFxuICAgKi9cbiAgX3Jlc2V0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHRoZXJlIGFyZSBubyBzbGlkZXMgKGZpcnN0IHJ1bilcbiAgICBpZiAodHlwZW9mIHRoaXMuJHNsaWRlcyA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuICAgICAgLy8gUmVtb3ZlIG9sZCBldmVudHNcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKVxuXG4gICAgICAvLyBSZXN0YXJ0IHRpbWVyIGlmIGF1dG9QbGF5IGlzIGVuYWJsZWRcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc2V0IGFsbCBzbGlkZGVzXG4gICAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbihlbCkge1xuICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWFjdGl2ZSBpcy1pbicpXG4gICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpXG4gICAgICAgICAgLmhpZGUoKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTaG93IHRoZSBmaXJzdCBzbGlkZVxuICAgICAgdGhpcy4kc2xpZGVzLmZpcnN0KCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLnNob3coKTtcblxuICAgICAgLy8gVHJpZ2dlcnMgd2hlbiB0aGUgc2xpZGUgaGFzIGZpbmlzaGVkIGFuaW1hdGluZ1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFt0aGlzLiRzbGlkZXMuZmlyc3QoKV0pO1xuXG4gICAgICAvLyBTZWxlY3QgZmlyc3QgYnVsbGV0IGlmIGJ1bGxldHMgYXJlIHByZXNlbnRcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKDApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENoYW5nZXMgdGhlIGN1cnJlbnQgc2xpZGUgdG8gYSBuZXcgb25lLlxuICAqIEBmdW5jdGlvblxuICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNMVFIgLSBmbGFnIGlmIHRoZSBzbGlkZSBzaG91bGQgbW92ZSBsZWZ0IHRvIHJpZ2h0LlxuICAqIEBwYXJhbSB7alF1ZXJ5fSBjaG9zZW5TbGlkZSAtIHRoZSBqUXVlcnkgZWxlbWVudCBvZiB0aGUgc2xpZGUgdG8gc2hvdyBuZXh0LCBpZiBvbmUgaXMgc2VsZWN0ZWQuXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgbmV3IHNsaWRlIGluIGl0cyBjb2xsZWN0aW9uLCBpZiBvbmUgY2hvc2VuLlxuICAqIEBmaXJlcyBPcmJpdCNzbGlkZWNoYW5nZVxuICAqL1xuICBjaGFuZ2VTbGlkZShpc0xUUiwgY2hvc2VuU2xpZGUsIGlkeCkge1xuICAgIGlmICghdGhpcy4kc2xpZGVzKSB7cmV0dXJuOyB9IC8vIERvbid0IGZyZWFrIG91dCBpZiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGNsZWFudXBcbiAgICB2YXIgJGN1clNsaWRlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLmVxKDApO1xuXG4gICAgaWYgKC9tdWkvZy50ZXN0KCRjdXJTbGlkZVswXS5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfSAvL2lmIHRoZSBzbGlkZSBpcyBjdXJyZW50bHkgYW5pbWF0aW5nLCBraWNrIG91dCBvZiB0aGUgZnVuY3Rpb25cblxuICAgIHZhciAkZmlyc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5maXJzdCgpLFxuICAgICRsYXN0U2xpZGUgPSB0aGlzLiRzbGlkZXMubGFzdCgpLFxuICAgIGRpckluID0gaXNMVFIgPyAnUmlnaHQnIDogJ0xlZnQnLFxuICAgIGRpck91dCA9IGlzTFRSID8gJ0xlZnQnIDogJ1JpZ2h0JyxcbiAgICBfdGhpcyA9IHRoaXMsXG4gICAgJG5ld1NsaWRlO1xuXG4gICAgaWYgKCFjaG9zZW5TbGlkZSkgeyAvL21vc3Qgb2YgdGhlIHRpbWUsIHRoaXMgd2lsbCBiZSBhdXRvIHBsYXllZCBvciBjbGlja2VkIGZyb20gdGhlIG5hdkJ1dHRvbnMuXG4gICAgICAkbmV3U2xpZGUgPSBpc0xUUiA/IC8vaWYgd3JhcHBpbmcgZW5hYmxlZCwgY2hlY2sgdG8gc2VlIGlmIHRoZXJlIGlzIGEgYG5leHRgIG9yIGBwcmV2YCBzaWJsaW5nLCBpZiBub3QsIHNlbGVjdCB0aGUgZmlyc3Qgb3IgbGFzdCBzbGlkZSB0byBmaWxsIGluLiBpZiB3cmFwcGluZyBub3QgZW5hYmxlZCwgYXR0ZW1wdCB0byBzZWxlY3QgYG5leHRgIG9yIGBwcmV2YCwgaWYgdGhlcmUncyBub3RoaW5nIHRoZXJlLCB0aGUgZnVuY3Rpb24gd2lsbCBraWNrIG91dCBvbiBuZXh0IHN0ZXAuIENSQVpZIE5FU1RFRCBURVJOQVJJRVMhISEhIVxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGZpcnN0U2xpZGUgOiAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpLy9waWNrIG5leHQgc2xpZGUgaWYgbW92aW5nIGxlZnQgdG8gcmlnaHRcbiAgICAgIDpcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRsYXN0U2xpZGUgOiAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpOy8vcGljayBwcmV2IHNsaWRlIGlmIG1vdmluZyByaWdodCB0byBsZWZ0XG4gICAgfSBlbHNlIHtcbiAgICAgICRuZXdTbGlkZSA9IGNob3NlblNsaWRlO1xuICAgIH1cblxuICAgIGlmICgkbmV3U2xpZGUubGVuZ3RoKSB7XG4gICAgICAvKipcbiAgICAgICogVHJpZ2dlcnMgYmVmb3JlIHRoZSBuZXh0IHNsaWRlIHN0YXJ0cyBhbmltYXRpbmcgaW4gYW5kIG9ubHkgaWYgYSBuZXh0IHNsaWRlIGhhcyBiZWVuIGZvdW5kLlxuICAgICAgKiBAZXZlbnQgT3JiaXQjYmVmb3Jlc2xpZGVjaGFuZ2VcbiAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2JlZm9yZXNsaWRlY2hhbmdlLnpmLm9yYml0JywgWyRjdXJTbGlkZSwgJG5ld1NsaWRlXSk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICBpZHggPSBpZHggfHwgdGhpcy4kc2xpZGVzLmluZGV4KCRuZXdTbGlkZSk7IC8vZ3JhYiBpbmRleCB0byB1cGRhdGUgYnVsbGV0c1xuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKGlkeCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudXNlTVVJICYmICF0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKFxuICAgICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlJykuY3NzKHsncG9zaXRpb24nOiAnYWJzb2x1dGUnLCAndG9wJzogMH0pLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbUluRnJvbSR7ZGlySW59YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRuZXdTbGlkZS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ2Jsb2NrJ30pXG4gICAgICAgICAgICAuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KFxuICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltT3V0VG8ke2Rpck91dH1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpO1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhX3RoaXMudGltZXIuaXNQYXVzZWQpe1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2RvIHN0dWZmP1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKS5oaWRlKCk7XG4gICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlIGlzLWluJykuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpLnNob3coKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhdGhpcy50aW1lci5pc1BhdXNlZCkge1xuICAgICAgICAgIHRoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgLyoqXG4gICAgKiBUcmlnZ2VycyB3aGVuIHRoZSBzbGlkZSBoYXMgZmluaXNoZWQgYW5pbWF0aW5nIGluLlxuICAgICogQGV2ZW50IE9yYml0I3NsaWRlY2hhbmdlXG4gICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbJG5ld1NsaWRlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogVXBkYXRlcyB0aGUgYWN0aXZlIHN0YXRlIG9mIHRoZSBidWxsZXRzLCBpZiBkaXNwbGF5ZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNsaWRlLlxuICAqL1xuICBfdXBkYXRlQnVsbGV0cyhpZHgpIHtcbiAgICB2YXIgJG9sZEJ1bGxldCA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKVxuICAgIC5maW5kKCcuaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLmJsdXIoKSxcbiAgICBzcGFuID0gJG9sZEJ1bGxldC5maW5kKCdzcGFuOmxhc3QnKS5kZXRhY2goKSxcbiAgICAkbmV3QnVsbGV0ID0gdGhpcy4kYnVsbGV0cy5lcShpZHgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hcHBlbmQoc3Bhbik7XG4gIH1cblxuICAvKipcbiAgKiBEZXN0cm95cyB0aGUgY2Fyb3VzZWwgYW5kIGhpZGVzIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKS5lbmQoKS5oaWRlKCk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9yYml0LmRlZmF1bHRzID0ge1xuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gbG9vayBmb3IgYW5kIGxvYWRCdWxsZXRzLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGJ1bGxldHM6IHRydWUsXG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBhcHBseSBldmVudCBsaXN0ZW5lcnMgdG8gbmF2IGJ1dHRvbnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBuYXZCdXR0b25zOiB0cnVlLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1yaWdodCdcbiAgKi9cbiAgYW5pbUluRnJvbVJpZ2h0OiAnc2xpZGUtaW4tcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICovXG4gIGFuaW1PdXRUb1JpZ2h0OiAnc2xpZGUtb3V0LXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgKlxuICAqL1xuICBhbmltSW5Gcm9tTGVmdDogJ3NsaWRlLWluLWxlZnQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtbGVmdCdcbiAgKi9cbiAgYW5pbU91dFRvTGVmdDogJ3NsaWRlLW91dC1sZWZ0JyxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGF1dG9tYXRpY2FsbHkgYW5pbWF0ZSBvbiBwYWdlIGxvYWQuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYXV0b1BsYXk6IHRydWUsXG4gIC8qKlxuICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgYmV0d2VlbiBzbGlkZSB0cmFuc2l0aW9uc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSA1MDAwXG4gICovXG4gIHRpbWVyRGVsYXk6IDUwMDAsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBpbmZpbml0ZWx5IGxvb3AgdGhyb3VnaCB0aGUgc2xpZGVzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgaW5maW5pdGVXcmFwOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIE9yYml0IHNsaWRlcyB0byBiaW5kIHRvIHN3aXBlIGV2ZW50cyBmb3IgbW9iaWxlLCByZXF1aXJlcyBhbiBhZGRpdGlvbmFsIHV0aWwgbGlicmFyeVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHN3aXBlOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIHRpbWluZyBmdW5jdGlvbiB0byBwYXVzZSBhbmltYXRpb24gb24gaG92ZXIuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgcGF1c2VPbkhvdmVyOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYmluZCBrZXlib2FyZCBldmVudHMgdG8gdGhlIHNsaWRlciwgdG8gYW5pbWF0ZSBmcmFtZXMgd2l0aCBhcnJvdyBrZXlzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYWNjZXNzaWJsZTogdHJ1ZSxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGFpbmVyIG9mIE9yYml0XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1jb250YWluZXInXG4gICovXG4gIGNvbnRhaW5lckNsYXNzOiAnb3JiaXQtY29udGFpbmVyJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byBpbmRpdmlkdWFsIHNsaWRlcy5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXNsaWRlJ1xuICAqL1xuICBzbGlkZUNsYXNzOiAnb3JiaXQtc2xpZGUnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBidWxsZXQgY29udGFpbmVyLiBZb3UncmUgd2VsY29tZS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LWJ1bGxldHMnXG4gICovXG4gIGJveE9mQnVsbGV0czogJ29yYml0LWJ1bGxldHMnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgbmV4dGAgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1uZXh0J1xuICAqL1xuICBuZXh0Q2xhc3M6ICdvcmJpdC1uZXh0JyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYHByZXZpb3VzYCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXByZXZpb3VzJ1xuICAqL1xuICBwcmV2Q2xhc3M6ICdvcmJpdC1wcmV2aW91cycsXG4gIC8qKlxuICAqIEJvb2xlYW4gdG8gZmxhZyB0aGUganMgdG8gdXNlIG1vdGlvbiB1aSBjbGFzc2VzIG9yIG5vdC4gRGVmYXVsdCB0byB0cnVlIGZvciBiYWNrd2FyZHMgY29tcGF0YWJpbGl0eS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICB1c2VNVUk6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihPcmJpdCwgJ09yYml0Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5hY2NvcmRpb25NZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcm9wZG93bi1tZW51XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZU1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS1tZW51Jyk7XG4gICAgdGhpcy5jdXJyZW50TXEgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlTWVudScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNZW51IGJ5IHBhcnNpbmcgdGhlIGNsYXNzZXMgZnJvbSB0aGUgJ2RhdGEtUmVzcG9uc2l2ZU1lbnUnIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICAvLyBUaGUgZmlyc3QgdGltZSBhbiBJbnRlcmNoYW5nZSBwbHVnaW4gaXMgaW5pdGlhbGl6ZWQsIHRoaXMucnVsZXMgaXMgY29udmVydGVkIGZyb20gYSBzdHJpbmcgb2YgXCJjbGFzc2VzXCIgdG8gYW4gb2JqZWN0IG9mIHJ1bGVzXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bGVzID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IHJ1bGVzVHJlZSA9IHt9O1xuXG4gICAgICAvLyBQYXJzZSBydWxlcyBmcm9tIFwiY2xhc3Nlc1wiIHB1bGxlZCBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICBsZXQgcnVsZXMgPSB0aGlzLnJ1bGVzLnNwbGl0KCcgJyk7XG5cbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBldmVyeSBydWxlIGZvdW5kXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBydWxlID0gcnVsZXNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgbGV0IHJ1bGVTaXplID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVswXSA6ICdzbWFsbCc7XG4gICAgICAgIGxldCBydWxlUGx1Z2luID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVsxXSA6IHJ1bGVbMF07XG5cbiAgICAgICAgaWYgKE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dICE9PSBudWxsKSB7XG4gICAgICAgICAgcnVsZXNUcmVlW3J1bGVTaXplXSA9IE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMucnVsZXMgPSBydWxlc1RyZWU7XG4gICAgfVxuXG4gICAgaWYgKCEkLmlzRW1wdHlPYmplY3QodGhpcy5ydWxlcykpIHtcbiAgICAgIHRoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfVxuICAgIC8vIEFkZCBkYXRhLW11dGF0ZSBzaW5jZSBjaGlsZHJlbiBtYXkgbmVlZCBpdC5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtbXV0YXRlJywgKHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdyZXNwb25zaXZlLW1lbnUnKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICAgIC8vICQod2luZG93KS5vbigncmVzaXplLnpmLlJlc3BvbnNpdmVNZW51JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgc2NyZWVuIHdpZHRoIGFnYWluc3QgYXZhaWxhYmxlIG1lZGlhIHF1ZXJpZXMuIElmIHRoZSBtZWRpYSBxdWVyeSBoYXMgY2hhbmdlZCwgYW5kIHRoZSBwbHVnaW4gbmVlZGVkIGhhcyBjaGFuZ2VkLCB0aGUgcGx1Z2lucyB3aWxsIHN3YXAgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01lZGlhUXVlcmllcygpIHtcbiAgICB2YXIgbWF0Y2hlZE1xLCBfdGhpcyA9IHRoaXM7XG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSBhbmQgZmluZCB0aGUgbGFzdCBtYXRjaGluZyBydWxlXG4gICAgJC5lYWNoKHRoaXMucnVsZXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KGtleSkpIHtcbiAgICAgICAgbWF0Y2hlZE1xID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm8gbWF0Y2g/IE5vIGRpY2VcbiAgICBpZiAoIW1hdGNoZWRNcSkgcmV0dXJuO1xuXG4gICAgLy8gUGx1Z2luIGFscmVhZHkgaW5pdGlhbGl6ZWQ/IFdlIGdvb2RcbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luIGluc3RhbmNlb2YgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbikgcmV0dXJuO1xuXG4gICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBsdWdpbi1zcGVjaWZpYyBDU1MgY2xhc3Nlc1xuICAgICQuZWFjaChNZW51UGx1Z2lucywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModmFsdWUuY3NzQ2xhc3MpO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRoZSBDU1MgY2xhc3MgZm9yIHRoZSBuZXcgcGx1Z2luXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLnJ1bGVzW21hdGNoZWRNcV0uY3NzQ2xhc3MpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBuZXcgcGx1Z2luXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbikgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVNZW51Jyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVNZW51LmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICBkcm9wZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJvcGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJvcGRvd24tbWVudSddIHx8IG51bGxcbiAgfSxcbiBkcmlsbGRvd246IHtcbiAgICBjc3NDbGFzczogJ2RyaWxsZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcmlsbGRvd24nXSB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uLW1lbnUnLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snYWNjb3JkaW9uLW1lbnUnXSB8fCBudWxsXG4gIH1cbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlTWVudSwgJ1Jlc3BvbnNpdmVNZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlVG9nZ2xlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlVG9nZ2xlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVGFiIEJhci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCB0YWIgYmFyIGZ1bmN0aW9uYWxpdHkgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWIgYmFyIGJ5IGZpbmRpbmcgdGhlIHRhcmdldCBlbGVtZW50LCB0b2dnbGluZyBlbGVtZW50LCBhbmQgcnVubmluZyB1cGRhdGUoKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgdGFyZ2V0SUQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtdG9nZ2xlJyk7XG4gICAgaWYgKCF0YXJnZXRJRCkge1xuICAgICAgY29uc29sZS5lcnJvcignWW91ciB0YWIgYmFyIG5lZWRzIGFuIElEIG9mIGEgTWVudSBhcyB0aGUgdmFsdWUgb2YgZGF0YS10YWItYmFyLicpO1xuICAgIH1cblxuICAgIHRoaXMuJHRhcmdldE1lbnUgPSAkKGAjJHt0YXJnZXRJRH1gKTtcbiAgICB0aGlzLiR0b2dnbGVyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10b2dnbGVdJyk7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIHRoaXMub3B0aW9ucywgdGhpcy4kdGFyZ2V0TWVudS5kYXRhKCkpO1xuXG4gICAgLy8gSWYgdGhleSB3ZXJlIHNldCwgcGFyc2UgdGhlIGFuaW1hdGlvbiBjbGFzc2VzXG4gICAgaWYodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIGxldCBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XG5cbiAgICAgIHRoaXMuYW5pbWF0aW9uSW4gPSBpbnB1dFswXTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhlIHRhYiBiYXIgdG8gd29yay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLl91cGRhdGVNcUhhbmRsZXIgPSB0aGlzLl91cGRhdGUuYmluZCh0aGlzKTtcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcblxuICAgIHRoaXMuJHRvZ2dsZXIub24oJ2NsaWNrLnpmLnJlc3BvbnNpdmVUb2dnbGUnLCB0aGlzLnRvZ2dsZU1lbnUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5IHRvIGRldGVybWluZSBpZiB0aGUgdGFiIGJhciBzaG91bGQgYmUgdmlzaWJsZSBvciBoaWRkZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZSgpIHtcbiAgICAvLyBNb2JpbGVcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LmhpZGUoKTtcbiAgICB9XG5cbiAgICAvLyBEZXNrdG9wXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUoKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuc2hvdygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyLiBUaGUgdG9nZ2xlIG9ubHkgaGFwcGVucyBpZiB0aGUgc2NyZWVuIGlzIHNtYWxsIGVub3VnaCB0byBhbGxvdyBpdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICovXG4gIHRvZ2dsZU1lbnUoKSB7XG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIGlmICh0aGlzLiR0YXJnZXRNZW51LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kdGFyZ2V0TWVudSwgdGhpcy5hbmltYXRpb25JbiwgKCkgPT4ge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyIHRvZ2dsZXMuXG4gICAgICAgICAgICAgKiBAZXZlbnQgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndG9nZ2xlZC56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgICAgICAgICB0aGlzLiR0YXJnZXRNZW51LmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kdGFyZ2V0TWVudSwgdGhpcy5hbmltYXRpb25PdXQsICgpID0+IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhciB0b2dnbGVzLlxuICAgICAgICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy4kdGFyZ2V0TWVudS50b2dnbGUoMCk7XG4gICAgICAgIHRoaXMuJHRhcmdldE1lbnUuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhciB0b2dnbGVzLlxuICAgICAgICAgKiBAZXZlbnQgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIHRoaXMuJHRvZ2dsZXIub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuXG4gICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGJyZWFrcG9pbnQgYWZ0ZXIgd2hpY2ggdGhlIG1lbnUgaXMgYWx3YXlzIHNob3duLCBhbmQgdGhlIHRhYiBiYXIgaXMgaGlkZGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBoaWRlRm9yOiAnbWVkaXVtJyxcblxuICAvKipcbiAgICogVG8gZGVjaWRlIGlmIHRoZSB0b2dnbGUgc2hvdWxkIGJlIGFuaW1hdGVkIG9yIG5vdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYW5pbWF0ZTogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlVG9nZ2xlLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmV2ZWFsIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXZlYWxcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uIGlmIHVzaW5nIGFuaW1hdGlvbnNcbiAqL1xuXG5jbGFzcyBSZXZlYWwge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBSZXZlYWwuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmV2ZWFsLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmV2ZWFsJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignUmV2ZWFsJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZGFsIGJ5IGFkZGluZyB0aGUgb3ZlcmxheSBhbmQgY2xvc2UgYnV0dG9ucywgKGlmIHNlbGVjdGVkKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FjaGVkID0ge21xOiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuY3VycmVudH07XG4gICAgdGhpcy5pc01vYmlsZSA9IG1vYmlsZVNuaWZmKCk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApLmxlbmd0aCA/ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkgOiAkKGBbZGF0YS10b2dnbGU9XCIke3RoaXMuaWR9XCJdYCk7XG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xuICAgICAgJ2FyaWEtY29udHJvbHMnOiB0aGlzLmlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuIHx8IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Z1bGwnKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gPSB0cnVlO1xuICAgICAgdGhpcy5vcHRpb25zLm92ZXJsYXkgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5ICYmICF0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5ID0gdGhpcy5fbWFrZU92ZXJsYXkodGhpcy5pZCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAnZGlhbG9nJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgJ2RhdGEteWV0aS1ib3gnOiB0aGlzLmlkLFxuICAgICAgICAnZGF0YS1yZXNpemUnOiB0aGlzLmlkXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKHRoaXMuJG92ZXJsYXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKCQodGhpcy5vcHRpb25zLmFwcGVuZFRvKSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd3aXRob3V0LW92ZXJsYXknKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluayAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCBgIyR7dGhpcy5pZH1gKSkge1xuICAgICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5yZXZlYWwnLCB0aGlzLm9wZW4uYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb3ZlcmxheSBkaXYgdG8gZGlzcGxheSBiZWhpbmQgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21ha2VPdmVybGF5KCkge1xuICAgIHJldHVybiAkKCc8ZGl2PjwvZGl2PicpXG4gICAgICAuYWRkQ2xhc3MoJ3JldmVhbC1vdmVybGF5JylcbiAgICAgIC5hcHBlbmRUbyh0aGlzLm9wdGlvbnMuYXBwZW5kVG8pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgcG9zaXRpb24gb2YgbW9kYWxcbiAgICogVE9ETzogIEZpZ3VyZSBvdXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBjYWNoZSB0aGVzZSB2YWx1ZXMgb3IgaWYgaXQgZG9lc24ndCBtYXR0ZXJcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVQb3NpdGlvbigpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKTtcbiAgICB2YXIgb3V0ZXJXaWR0aCA9ICQod2luZG93KS53aWR0aCgpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLiRlbGVtZW50Lm91dGVySGVpZ2h0KCk7XG4gICAgdmFyIG91dGVySGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIHZhciBsZWZ0LCB0b3A7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCgob3V0ZXJXaWR0aCAtIHdpZHRoKSAvIDIsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy5oT2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudk9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBpZiAoaGVpZ2h0ID4gb3V0ZXJIZWlnaHQpIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoTWF0aC5taW4oMTAwLCBvdXRlckhlaWdodCAvIDEwKSwgMTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoKG91dGVySGVpZ2h0IC0gaGVpZ2h0KSAvIDQsIDEwKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdG9wID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLnZPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe3RvcDogdG9wICsgJ3B4J30pO1xuICAgIC8vIG9ubHkgd29ycnkgYWJvdXQgbGVmdCBpZiB3ZSBkb24ndCBoYXZlIGFuIG92ZXJsYXkgb3Igd2UgaGF2ZWEgIGhvcml6b250YWwgb2Zmc2V0LFxuICAgIC8vIG90aGVyd2lzZSB3ZSdyZSBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZVxuICAgIGlmKCF0aGlzLiRvdmVybGF5IHx8ICh0aGlzLm9wdGlvbnMuaE9mZnNldCAhPT0gJ2F1dG8nKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe2xlZnQ6IGxlZnQgKyAncHgnfSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bWFyZ2luOiAnMHB4J30pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiAoZXZlbnQsICRlbGVtZW50KSA9PiB7XG4gICAgICAgIGlmICgoZXZlbnQudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSkgfHxcbiAgICAgICAgICAgICgkKGV2ZW50LnRhcmdldCkucGFyZW50cygnW2RhdGEtY2xvc2FibGVdJylbMF0gPT09ICRlbGVtZW50KSkgeyAvLyBvbmx5IGNsb3NlIHJldmVhbCB3aGVuIGl0J3MgZXhwbGljaXRseSBjYWxsZWRcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZS5hcHBseSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMgfHwgZS53aGljaCA9PT0gMzIpIHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmIHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5Lm9mZignLnpmLnJldmVhbCcpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHxcbiAgICAgICAgICAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkgfHxcbiAgICAgICAgICAgICEkLmNvbnRhaW5zKGRvY3VtZW50LCBlLnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9uKGBwb3BzdGF0ZS56Zi5yZXZlYWw6JHt0aGlzLmlkfWAsIHRoaXMuX2hhbmRsZVN0YXRlLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIG1vZGFsIG1ldGhvZHMgb24gYmFjay9mb3J3YXJkIGJ1dHRvbiBjbGlja3Mgb3IgYW55IG90aGVyIGV2ZW50IHRoYXQgdHJpZ2dlcnMgcG9wc3RhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlU3RhdGUoZSkge1xuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoICcjJyArIHRoaXMuaWQpICYmICF0aGlzLmlzQWN0aXZlKXsgdGhpcy5vcGVuKCk7IH1cbiAgICBlbHNleyB0aGlzLmNsb3NlKCk7IH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBtb2RhbCBjb250cm9sbGVkIGJ5IGB0aGlzLiRhbmNob3JgLCBhbmQgY2xvc2VzIGFsbCBvdGhlcnMgYnkgZGVmYXVsdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VtZVxuICAgKiBAZmlyZXMgUmV2ZWFsI29wZW5cbiAgICovXG4gIG9wZW4oKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGhhc2ggPSBgIyR7dGhpcy5pZH1gO1xuXG4gICAgICBpZiAod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKSB7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIE1ha2UgZWxlbWVudHMgaW52aXNpYmxlLCBidXQgcmVtb3ZlIGRpc3BsYXk6IG5vbmUgc28gd2UgY2FuIGdldCBzaXplIGFuZCBwb3NpdGlvbmluZ1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJ2hpZGRlbicgfSlcbiAgICAgICAgLnNob3coKVxuICAgICAgICAuc2Nyb2xsVG9wKDApO1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbid9KS5zaG93KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5oaWRlKClcbiAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICcnIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJyd9KS5oaWRlKCk7XG4gICAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYXN0JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnZmFzdCcpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdzbG93JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnc2xvdycpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlwbGVPcGVuZWQpIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBtb2RhbCBvcGVucy5cbiAgICAgICAqIENsb3NlcyBhbnkgb3RoZXIgbW9kYWxzIHRoYXQgYXJlIGN1cnJlbnRseSBvcGVuXG4gICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlbWVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnJldmVhbCcsIHRoaXMuaWQpO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBhZGRSZXZlYWxPcGVuQ2xhc3NlcygpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICBpZighX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpIHtcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICAkKCdodG1sLCBib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4pIHtcbiAgICAgIGZ1bmN0aW9uIGFmdGVyQW5pbWF0aW9uKCl7XG4gICAgICAgIF90aGlzLiRlbGVtZW50XG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZvY3VzKCk7XG4gICAgICAgIGFkZFJldmVhbE9wZW5DbGFzc2VzKCk7XG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQudHJhcEZvY3VzKF90aGlzLiRlbGVtZW50KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kb3ZlcmxheSwgJ2ZhZGUtaW4nKTtcbiAgICAgIH1cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4sICgpID0+IHtcbiAgICAgICAgaWYodGhpcy4kZWxlbWVudCkgeyAvLyBwcm90ZWN0IGFnYWluc3Qgb2JqZWN0IGhhdmluZyBiZWVuIHJlbW92ZWRcbiAgICAgICAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIGFmdGVyQW5pbWF0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuc2hvdygwKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdyh0aGlzLm9wdGlvbnMuc2hvd0RlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgYWNjZXNzaWJpbGl0eVxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICB9KVxuICAgICAgLmZvY3VzKCk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBoYXMgc3VjY2Vzc2Z1bGx5IG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgUmV2ZWFsI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYucmV2ZWFsJyk7XG5cbiAgICBhZGRSZXZlYWxPcGVuQ2xhc3NlcygpO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9leHRyYUhhbmRsZXJzKCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBleHRyYSBldmVudCBoYW5kbGVycyBmb3IgdGhlIGJvZHkgYW5kIHdpbmRvdyBpZiBuZWNlc3NhcnkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXh0cmFIYW5kbGVycygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIGlmKCF0aGlzLiRlbGVtZW50KSB7IHJldHVybjsgfSAvLyBJZiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGNsZWFudXAsIGRvbid0IGZyZWFrIG91dFxuICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgIXRoaXMub3B0aW9ucy5mdWxsU2NyZWVuKSB7XG4gICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fFxuICAgICAgICAgICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSB8fFxuICAgICAgICAgICAgISQuY29udGFpbnMoZG9jdW1lbnQsIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9jayBmb2N1cyB3aXRoaW4gbW9kYWwgd2hpbGUgdGFiYmluZ1xuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpKSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgLy8gc2V0IGZvY3VzIGJhY2sgdG8gYW5jaG9yIGlmIGNsb3NlIGJ1dHRvbiBoYXMgYmVlbiBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0LmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzKSkgeyAvLyBkb250J3QgdHJpZ2dlciBpZiBhY3VhbCBlbGVtZW50IGhhcyBmb2N1cyAoaS5lLiBpbnB1dHMsIGxpbmtzLCAuLi4pXG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZWRcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGlmICghdGhpcy5pc0FjdGl2ZSB8fCAhdGhpcy4kZWxlbWVudC5pcygnOnZpc2libGUnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiBoaWRpbmdcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kb3ZlcmxheSwgJ2ZhZGUtb3V0JywgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKDAsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUodGhpcy5vcHRpb25zLmhpZGVEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gQ29uZGl0aW9uYWxzIHRvIHJlbW92ZSBleHRyYSBldmVudCBsaXN0ZW5lcnMgYWRkZWQgb24gb3BlblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgICQoJ2JvZHknKS5vZmYoJ2NsaWNrLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuXG4gICAgZnVuY3Rpb24gZmluaXNoVXAoKSB7XG4gICAgICBpZiAoX3RoaXMuaXNNb2JpbGUpIHtcbiAgICAgICAgJCgnaHRtbCwgYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgICBpZihfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcykge1xuICAgICAgICAgICQoJ2JvZHknKS5zY3JvbGxUb3AoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpO1xuICAgICAgICAgIF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgIH1cblxuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlbGVhc2VGb2N1cyhfdGhpcy4kZWxlbWVudCk7XG5cbiAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAgIC8qKlxuICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBpcyBkb25lIGNsb3NpbmcuXG4gICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VkXG4gICAgICAqL1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICogUmVzZXRzIHRoZSBtb2RhbCBjb250ZW50XG4gICAgKiBUaGlzIHByZXZlbnRzIGEgcnVubmluZyB2aWRlbyB0byBrZWVwIGdvaW5nIGluIHRoZSBiYWNrZ3JvdW5kXG4gICAgKi9cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc2V0T25DbG9zZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5odG1sKHRoaXMuJGVsZW1lbnQuaHRtbCgpKTtcbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgIGlmIChfdGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSkge1xuICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKCcnLCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZShgIyR7dGhpcy5pZH1gLCAnJykpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcnO1xuICAgICAgIH1cbiAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2VkIHN0YXRlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hcHBlbmRUbygkKHRoaXMub3B0aW9ucy5hcHBlbmRUbykpOyAvLyBtb3ZlICRlbGVtZW50IG91dHNpZGUgb2YgJG92ZXJsYXkgdG8gcHJldmVudCBlcnJvciB1bnJlZ2lzdGVyUGx1Z2luKClcbiAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgpLm9mZigpLnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmhpZGUoKS5vZmYoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYnKTtcbiAgICAkKHdpbmRvdykub2ZmKGAuemYucmV2ZWFsOiR7dGhpcy5pZH1gKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuUmV2ZWFsLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgICovXG4gIGFuaW1hdGlvbkluOiAnJyxcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLW91dC1yaWdodCdcbiAgICovXG4gIGFuaW1hdGlvbk91dDogJycsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIG9wZW5pbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBzaG93RGVsYXk6IDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIGNsb3Npbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBoaWRlRGVsYXk6IDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keS9vdmVybGF5IHRvIGNsb3NlIHRoZSBtb2RhbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGNsb3NlIGlmIHRoZSB1c2VyIHByZXNzZXMgdGhlIGBFU0NBUEVgIGtleS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uRXNjOiB0cnVlLFxuICAvKipcbiAgICogSWYgdHJ1ZSwgYWxsb3dzIG11bHRpcGxlIG1vZGFscyB0byBiZSBkaXNwbGF5ZWQgYXQgb25jZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlwbGVPcGVuZWQ6IGZhbHNlLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGRvd24gZnJvbSB0aGUgdG9wIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgdk9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGluIGZyb20gdGhlIHNpZGUgb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBhdXRvXG4gICAqL1xuICBoT2Zmc2V0OiAnYXV0bycsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGJlIGZ1bGxzY3JlZW4sIGNvbXBsZXRlbHkgYmxvY2tpbmcgb3V0IHRoZSByZXN0IG9mIHRoZSB2aWV3LiBKUyBjaGVja3MgZm9yIHRoaXMgYXMgd2VsbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZnVsbFNjcmVlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBQZXJjZW50YWdlIG9mIHNjcmVlbiBoZWlnaHQgdGhlIG1vZGFsIHNob3VsZCBwdXNoIHVwIGZyb20gdGhlIGJvdHRvbSBvZiB0aGUgdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgYnRtT2Zmc2V0UGN0OiAxMCxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gZ2VuZXJhdGUgYW4gb3ZlcmxheSBkaXYsIHdoaWNoIHdpbGwgY292ZXIgdGhlIHZpZXcgd2hlbiBtb2RhbCBvcGVucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBvdmVybGF5OiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byByZW1vdmUgYW5kIHJlaW5qZWN0IG1hcmt1cCBvbiBjbG9zZS4gU2hvdWxkIGJlIHRydWUgaWYgdXNpbmcgdmlkZW8gZWxlbWVudHMgdy9vIHVzaW5nIHByb3ZpZGVyJ3MgYXBpLCBvdGhlcndpc2UsIHZpZGVvcyB3aWxsIGNvbnRpbnVlIHRvIHBsYXkgaW4gdGhlIGJhY2tncm91bmQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHJlc2V0T25DbG9zZTogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGFsdGVyIHRoZSB1cmwgb24gb3Blbi9jbG9zZSwgYW5kIGFsbG93cyB0aGUgdXNlIG9mIHRoZSBgYmFja2AgYnV0dG9uIHRvIGNsb3NlIG1vZGFscy4gQUxTTywgYWxsb3dzIGEgbW9kYWwgdG8gYXV0by1tYW5pYWNhbGx5IG9wZW4gb24gcGFnZSBsb2FkIElGIHRoZSBoYXNoID09PSB0aGUgbW9kYWwncyB1c2VyLXNldCBpZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlLFxuICAgIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGFwcGVuZCB0byBjdXN0b20gZGl2LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhcHBlbmRUbzogXCJib2R5XCJcblxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJldmVhbCwgJ1JldmVhbCcpO1xuXG5mdW5jdGlvbiBpUGhvbmVTbmlmZigpIHtcbiAgcmV0dXJuIC9pUChhZHxob25lfG9kKS4qT1MvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBhbmRyb2lkU25pZmYoKSB7XG4gIHJldHVybiAvQW5kcm9pZC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIG1vYmlsZVNuaWZmKCkge1xuICByZXR1cm4gaVBob25lU25pZmYoKSB8fCBhbmRyb2lkU25pZmYoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFNsaWRlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc2xpZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxuICovXG5cbmNsYXNzIFNsaWRlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgc2xpZGVyIGNvbnRyb2wuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgc2xpZGVyIGNvbnRyb2wuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU2xpZGVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTbGlkZXInKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdTbGlkZXInLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfVVAnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfRE9XTic6ICdkZWNyZWFzZScsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2luY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfVVAnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19ET1dOJzogJ2RlY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ2luY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0xFRlQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19SSUdIVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpbGl6ZXMgdGhlIHBsdWdpbiBieSByZWFkaW5nL3NldHRpbmcgYXR0cmlidXRlcywgY3JlYXRpbmcgY29sbGVjdGlvbnMgYW5kIHNldHRpbmcgdGhlIGluaXRpYWwgcG9zaXRpb24gb2YgdGhlIGhhbmRsZShzKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQnKTtcbiAgICB0aGlzLmhhbmRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJyk7XG5cbiAgICB0aGlzLiRoYW5kbGUgPSB0aGlzLmhhbmRsZXMuZXEoMCk7XG4gICAgdGhpcy4kaW5wdXQgPSB0aGlzLmlucHV0cy5sZW5ndGggPyB0aGlzLmlucHV0cy5lcSgwKSA6ICQoYCMke3RoaXMuJGhhbmRsZS5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YCk7XG4gICAgdGhpcy4kZmlsbCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWZpbGxdJykuY3NzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICdoZWlnaHQnIDogJ3dpZHRoJywgMCk7XG5cbiAgICB2YXIgaXNEYmwgPSBmYWxzZSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZWQgfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5kaXNhYmxlZCA9IHRydWU7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5wdXRzID0gJCgpLmFkZCh0aGlzLiRpbnB1dCk7XG4gICAgICB0aGlzLm9wdGlvbnMuYmluZGluZyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0SW5pdEF0dHIoMCk7XG5cbiAgICBpZiAodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kaGFuZGxlMiA9IHRoaXMuaGFuZGxlcy5lcSgxKTtcbiAgICAgIHRoaXMuJGlucHV0MiA9IHRoaXMuaW5wdXRzLmxlbmd0aCA+IDEgPyB0aGlzLmlucHV0cy5lcSgxKSA6ICQoYCMke3RoaXMuJGhhbmRsZTIuYXR0cignYXJpYS1jb250cm9scycpfWApO1xuXG4gICAgICBpZiAoIXRoaXMuaW5wdXRzWzFdKSB7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gdGhpcy5pbnB1dHMuYWRkKHRoaXMuJGlucHV0Mik7XG4gICAgICB9XG4gICAgICBpc0RibCA9IHRydWU7XG5cbiAgICAgIC8vIHRoaXMuJGhhbmRsZS50cmlnZ2VySGFuZGxlcignY2xpY2suemYuc2xpZGVyJyk7XG4gICAgICB0aGlzLl9zZXRJbml0QXR0cigxKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaGFuZGxlIHBvc2l0aW9uc1xuICAgIHRoaXMuc2V0SGFuZGxlcygpO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICBzZXRIYW5kbGVzKCkge1xuICAgIGlmKHRoaXMuaGFuZGxlc1sxXSkge1xuICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZSwgdGhpcy5pbnB1dHMuZXEoMCkudmFsKCksIHRydWUsICgpID0+IHtcbiAgICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZTIsIHRoaXMuaW5wdXRzLmVxKDEpLnZhbCgpLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLmlucHV0cy5lcSgwKS52YWwoKSwgdHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgX3JlZmxvdygpIHtcbiAgICB0aGlzLnNldEhhbmRsZXMoKTtcbiAgfVxuICAvKipcbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIGZsb2F0aW5nIHBvaW50ICh0aGUgdmFsdWUpIHRvIGJlIHRyYW5zZm9ybWVkIHVzaW5nIHRvIGEgcmVsYXRpdmUgcG9zaXRpb24gb24gdGhlIHNsaWRlciAodGhlIGludmVyc2Ugb2YgX3ZhbHVlKVxuICAqL1xuICBfcGN0T2ZCYXIodmFsdWUpIHtcbiAgICB2YXIgcGN0T2ZCYXIgPSBwZXJjZW50KHZhbHVlIC0gdGhpcy5vcHRpb25zLnN0YXJ0LCB0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KVxuXG4gICAgc3dpdGNoKHRoaXMub3B0aW9ucy5wb3NpdGlvblZhbHVlRnVuY3Rpb24pIHtcbiAgICBjYXNlIFwicG93XCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX2xvZ1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwibG9nXCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX3Bvd1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gcGN0T2ZCYXIudG9GaXhlZCgyKVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gcGN0T2ZCYXIgLSBmbG9hdGluZyBwb2ludCwgdGhlIHJlbGF0aXZlIHBvc2l0aW9uIG9mIHRoZSBzbGlkZXIgKHR5cGljYWxseSBiZXR3ZWVuIDAtMSkgdG8gYmUgdHJhbnNmb3JtZWQgdG8gYSB2YWx1ZVxuICAqL1xuICBfdmFsdWUocGN0T2ZCYXIpIHtcbiAgICBzd2l0Y2godGhpcy5vcHRpb25zLnBvc2l0aW9uVmFsdWVGdW5jdGlvbikge1xuICAgIGNhc2UgXCJwb3dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fcG93VHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJsb2dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fbG9nVHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgdmFsdWUgPSAodGhpcy5vcHRpb25zLmVuZCAtIHRoaXMub3B0aW9ucy5zdGFydCkgKiBwY3RPZkJhciArIHRoaXMub3B0aW9ucy5zdGFydDtcblxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSBmbG9hdGluZyBwb2ludCAodHlwaWNhbGx5IGJldHdlZW4gMC0xKSB0byBiZSB0cmFuc2Zvcm1lZCB1c2luZyB0aGUgbG9nIGZ1bmN0aW9uXG4gICovXG4gIF9sb2dUcmFuc2Zvcm0odmFsdWUpIHtcbiAgICByZXR1cm4gYmFzZUxvZyh0aGlzLm9wdGlvbnMubm9uTGluZWFyQmFzZSwgKCh2YWx1ZSoodGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UtMSkpKzEpKVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSBmbG9hdGluZyBwb2ludCAodHlwaWNhbGx5IGJldHdlZW4gMC0xKSB0byBiZSB0cmFuc2Zvcm1lZCB1c2luZyB0aGUgcG93ZXIgZnVuY3Rpb25cbiAgKi9cbiAgX3Bvd1RyYW5zZm9ybSh2YWx1ZSkge1xuICAgIHJldHVybiAoTWF0aC5wb3codGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UsIHZhbHVlKSAtIDEpIC8gKHRoaXMub3B0aW9ucy5ub25MaW5lYXJCYXNlIC0gMSlcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc2VsZWN0ZWQgaGFuZGxlIGFuZCBmaWxsIGJhci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaG5kbCAtIHRoZSBzZWxlY3RlZCBoYW5kbGUgdG8gbW92ZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxvY2F0aW9uIC0gZmxvYXRpbmcgcG9pbnQgYmV0d2VlbiB0aGUgc3RhcnQgYW5kIGVuZCB2YWx1ZXMgb2YgdGhlIHNsaWRlciBiYXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uLlxuICAgKiBAZmlyZXMgU2xpZGVyI21vdmVkXG4gICAqIEBmaXJlcyBTbGlkZXIjY2hhbmdlZFxuICAgKi9cbiAgX3NldEhhbmRsZVBvcygkaG5kbCwgbG9jYXRpb24sIG5vSW52ZXJ0LCBjYikge1xuICAgIC8vIGRvbid0IG1vdmUgaWYgdGhlIHNsaWRlciBoYXMgYmVlbiBkaXNhYmxlZCBzaW5jZSBpdHMgaW5pdGlhbGl6YXRpb25cbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9taWdodCBuZWVkIHRvIGFsdGVyIHRoYXQgc2xpZ2h0bHkgZm9yIGJhcnMgdGhhdCB3aWxsIGhhdmUgb2RkIG51bWJlciBzZWxlY3Rpb25zLlxuICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbik7Ly9vbiBpbnB1dCBjaGFuZ2UgZXZlbnRzLCBjb252ZXJ0IHN0cmluZyB0byBudW1iZXIuLi5ncnVtYmxlLlxuXG4gICAgLy8gcHJldmVudCBzbGlkZXIgZnJvbSBydW5uaW5nIG91dCBvZiBib3VuZHMsIGlmIHZhbHVlIGV4Y2VlZHMgdGhlIGxpbWl0cyBzZXQgdGhyb3VnaCBvcHRpb25zLCBvdmVycmlkZSB0aGUgdmFsdWUgdG8gbWluL21heFxuICAgIGlmIChsb2NhdGlvbiA8IHRoaXMub3B0aW9ucy5zdGFydCkgeyBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5zdGFydDsgfVxuICAgIGVsc2UgaWYgKGxvY2F0aW9uID4gdGhpcy5vcHRpb25zLmVuZCkgeyBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5lbmQ7IH1cblxuICAgIHZhciBpc0RibCA9IHRoaXMub3B0aW9ucy5kb3VibGVTaWRlZDtcblxuICAgIGlmIChpc0RibCkgeyAvL3RoaXMgYmxvY2sgaXMgdG8gcHJldmVudCAyIGhhbmRsZXMgZnJvbSBjcm9zc2luZyBlYWNob3RoZXIuIENvdWxkL3Nob3VsZCBiZSBpbXByb3ZlZC5cbiAgICAgIGlmICh0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwKSB7XG4gICAgICAgIHZhciBoMlZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlMi5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uID49IGgyVmFsID8gaDJWYWwgLSB0aGlzLm9wdGlvbnMuc3RlcCA6IGxvY2F0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGgxVmFsID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA8PSBoMVZhbCA/IGgxVmFsICsgdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL3RoaXMgaXMgZm9yIHNpbmdsZS1oYW5kbGVkIHZlcnRpY2FsIHNsaWRlcnMsIGl0IGFkanVzdHMgdGhlIHZhbHVlIHRvIGFjY291bnQgZm9yIHRoZSBzbGlkZXIgYmVpbmcgXCJ1cHNpZGUtZG93blwiXG4gICAgLy9mb3IgY2xpY2sgYW5kIGRyYWcgZXZlbnRzLCBpdCdzIHdlaXJkIGR1ZSB0byB0aGUgc2NhbGUoLTEsIDEpIGNzcyBwcm9wZXJ0eVxuICAgIGlmICh0aGlzLm9wdGlvbnMudmVydGljYWwgJiYgIW5vSW52ZXJ0KSB7XG4gICAgICBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5lbmQgLSBsb2NhdGlvbjtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICB2ZXJ0ID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICBoT3JXID0gdmVydCA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgbE9yVCA9IHZlcnQgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgaGFuZGxlRGltID0gJGhuZGxbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbaE9yV10sXG4gICAgICAgIGVsZW1EaW0gPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxuICAgICAgICAvL3BlcmNlbnRhZ2Ugb2YgYmFyIG1pbi9tYXggdmFsdWUgYmFzZWQgb24gY2xpY2sgb3IgZHJhZyBwb2ludFxuICAgICAgICBwY3RPZkJhciA9IHRoaXMuX3BjdE9mQmFyKGxvY2F0aW9uKSxcbiAgICAgICAgLy9udW1iZXIgb2YgYWN0dWFsIHBpeGVscyB0byBzaGlmdCB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvYnRhaW5lZCBhYm92ZVxuICAgICAgICBweFRvTW92ZSA9IChlbGVtRGltIC0gaGFuZGxlRGltKSAqIHBjdE9mQmFyLFxuICAgICAgICAvL3BlcmNlbnRhZ2Ugb2YgYmFyIHRvIHNoaWZ0IHRoZSBoYW5kbGVcbiAgICAgICAgbW92ZW1lbnQgPSAocGVyY2VudChweFRvTW92ZSwgZWxlbURpbSkgKiAxMDApLnRvRml4ZWQodGhpcy5vcHRpb25zLmRlY2ltYWwpO1xuICAgICAgICAvL2ZpeGluZyB0aGUgZGVjaW1hbCB2YWx1ZSBmb3IgdGhlIGxvY2F0aW9uIG51bWJlciwgaXMgcGFzc2VkIHRvIG90aGVyIG1ldGhvZHMgYXMgYSBmaXhlZCBmbG9hdGluZy1wb2ludCB2YWx1ZVxuICAgICAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24udG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCkpO1xuICAgICAgICAvLyBkZWNsYXJlIGVtcHR5IG9iamVjdCBmb3IgY3NzIGFkanVzdG1lbnRzLCBvbmx5IHVzZWQgd2l0aCAyIGhhbmRsZWQtc2xpZGVyc1xuICAgIHZhciBjc3MgPSB7fTtcblxuICAgIHRoaXMuX3NldFZhbHVlcygkaG5kbCwgbG9jYXRpb24pO1xuXG4gICAgLy8gVE9ETyB1cGRhdGUgdG8gY2FsY3VsYXRlIGJhc2VkIG9uIHZhbHVlcyBzZXQgdG8gcmVzcGVjdGl2ZSBpbnB1dHM/P1xuICAgIGlmIChpc0RibCkge1xuICAgICAgdmFyIGlzTGVmdEhuZGwgPSB0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwLFxuICAgICAgICAgIC8vZW1wdHkgdmFyaWFibGUsIHdpbGwgYmUgdXNlZCBmb3IgbWluLWhlaWdodC93aWR0aCBmb3IgZmlsbCBiYXJcbiAgICAgICAgICBkaW0sXG4gICAgICAgICAgLy9wZXJjZW50YWdlIHcvaCBvZiB0aGUgaGFuZGxlIGNvbXBhcmVkIHRvIHRoZSBzbGlkZXIgYmFyXG4gICAgICAgICAgaGFuZGxlUGN0ID0gIH5+KHBlcmNlbnQoaGFuZGxlRGltLCBlbGVtRGltKSAqIDEwMCk7XG4gICAgICAvL2lmIGxlZnQgaGFuZGxlLCB0aGUgbWF0aCBpcyBzbGlnaHRseSBkaWZmZXJlbnQgdGhhbiBpZiBpdCdzIHRoZSByaWdodCBoYW5kbGUsIGFuZCB0aGUgbGVmdC90b3AgcHJvcGVydHkgbmVlZHMgdG8gYmUgY2hhbmdlZCBmb3IgdGhlIGZpbGwgYmFyXG4gICAgICBpZiAoaXNMZWZ0SG5kbCkge1xuICAgICAgICAvL2xlZnQgb3IgdG9wIHBlcmNlbnRhZ2UgdmFsdWUgdG8gYXBwbHkgdG8gdGhlIGZpbGwgYmFyLlxuICAgICAgICBjc3NbbE9yVF0gPSBgJHttb3ZlbWVudH0lYDtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGRpbSA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlMlswXS5zdHlsZVtsT3JUXSkgLSBtb3ZlbWVudCArIGhhbmRsZVBjdDtcbiAgICAgICAgLy90aGlzIGNhbGxiYWNrIGlzIG5lY2Vzc2FyeSB0byBwcmV2ZW50IGVycm9ycyBhbmQgYWxsb3cgdGhlIHByb3BlciBwbGFjZW1lbnQgYW5kIGluaXRpYWxpemF0aW9uIG9mIGEgMi1oYW5kbGVkIHNsaWRlclxuICAgICAgICAvL3BsdXMsIGl0IG1lYW5zIHdlIGRvbid0IGNhcmUgaWYgJ2RpbScgaXNOYU4gb24gaW5pdCwgaXQgd29uJ3QgYmUgaW4gdGhlIGZ1dHVyZS5cbiAgICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9Ly90aGlzIGlzIG9ubHkgbmVlZGVkIGZvciB0aGUgaW5pdGlhbGl6YXRpb24gb2YgMiBoYW5kbGVkIHNsaWRlcnNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vanVzdCBjYWNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbGVmdC9ib3R0b20gaGFuZGxlJ3MgbGVmdC90b3AgcHJvcGVydHlcbiAgICAgICAgdmFyIGhhbmRsZVBvcyA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlWzBdLnN0eWxlW2xPclRdKTtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuIFVzZSBpc05hTiB0byBwcmV2ZW50IGZhbHNlIHBvc2l0aXZlcyBmb3IgbnVtYmVycyA8PSAwXG4gICAgICAgIC8vYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2YgbW92ZW1lbnQgb2YgdGhlIGhhbmRsZSBiZWluZyBtYW5pcHVsYXRlZCwgbGVzcyB0aGUgb3Bwb3NpbmcgaGFuZGxlJ3MgbGVmdC90b3AgcG9zaXRpb24sIHBsdXMgdGhlIHBlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgaXRzZWxmXG4gICAgICAgIGRpbSA9IG1vdmVtZW50IC0gKGlzTmFOKGhhbmRsZVBvcykgPyAodGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCAtIHRoaXMub3B0aW9ucy5zdGFydCkvKCh0aGlzLm9wdGlvbnMuZW5kLXRoaXMub3B0aW9ucy5zdGFydCkvMTAwKSA6IGhhbmRsZVBvcykgKyBoYW5kbGVQY3Q7XG4gICAgICB9XG4gICAgICAvLyBhc3NpZ24gdGhlIG1pbi1oZWlnaHQvd2lkdGggdG8gb3VyIGNzcyBvYmplY3RcbiAgICAgIGNzc1tgbWluLSR7aE9yV31gXSA9IGAke2RpbX0lYDtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uZSgnZmluaXNoZWQuemYuYW5pbWF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGFuZGxlIGlzIGRvbmUgbW92aW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU2xpZGVyI21vdmVkXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdtb3ZlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgIC8vYmVjYXVzZSB3ZSBkb24ndCBrbm93IGV4YWN0bHkgaG93IHRoZSBoYW5kbGUgd2lsbCBiZSBtb3ZlZCwgY2hlY2sgdGhlIGFtb3VudCBvZiB0aW1lIGl0IHNob3VsZCB0YWtlIHRvIG1vdmUuXG4gICAgdmFyIG1vdmVUaW1lID0gdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpID8gMTAwMC82MCA6IHRoaXMub3B0aW9ucy5tb3ZlVGltZTtcblxuICAgIEZvdW5kYXRpb24uTW92ZShtb3ZlVGltZSwgJGhuZGwsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYWRqdXN0aW5nIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBvZiB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBjYWxjdWxhdGVkIGFib3ZlXG4gICAgICAvLyBpZiBtb3ZlbWVudCBpc05hTiwgdGhhdCBpcyBiZWNhdXNlIHRoZSBzbGlkZXIgaXMgaGlkZGVuIGFuZCB3ZSBjYW5ub3QgZGV0ZXJtaW5lIGhhbmRsZSB3aWR0aCxcbiAgICAgIC8vIGZhbGwgYmFjayB0byBuZXh0IGJlc3QgZ3Vlc3MuXG4gICAgICBpZiAoaXNOYU4obW92ZW1lbnQpKSB7XG4gICAgICAgICRobmRsLmNzcyhsT3JULCBgJHtwY3RPZkJhciAqIDEwMH0lYCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJGhuZGwuY3NzKGxPclQsIGAke21vdmVtZW50fSVgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XG4gICAgICAgIC8vaWYgc2luZ2xlLWhhbmRsZWQsIGEgc2ltcGxlIG1ldGhvZCB0byBleHBhbmQgdGhlIGZpbGwgYmFyXG4gICAgICAgIF90aGlzLiRmaWxsLmNzcyhoT3JXLCBgJHtwY3RPZkJhciAqIDEwMH0lYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL290aGVyd2lzZSwgdXNlIHRoZSBjc3Mgb2JqZWN0IHdlIGNyZWF0ZWQgYWJvdmVcbiAgICAgICAgX3RoaXMuJGZpbGwuY3NzKGNzcyk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHZhbHVlIGhhcyBub3QgYmVlbiBjaGFuZ2UgZm9yIGEgZ2l2ZW4gdGltZS5cbiAgICAgKiBAZXZlbnQgU2xpZGVyI2NoYW5nZWRcbiAgICAgKi9cbiAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XG4gICAgfSwgX3RoaXMub3B0aW9ucy5jaGFuZ2VkRGVsYXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGluaXRpYWwgYXR0cmlidXRlIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlIGN1cnJlbnQgaGFuZGxlL2lucHV0IHRvIHVzZS5cbiAgICovXG4gIF9zZXRJbml0QXR0cihpZHgpIHtcbiAgICB2YXIgaW5pdFZhbCA9IChpZHggPT09IDAgPyB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IDogdGhpcy5vcHRpb25zLmluaXRpYWxFbmQpXG4gICAgdmFyIGlkID0gdGhpcy5pbnB1dHMuZXEoaWR4KS5hdHRyKCdpZCcpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3NsaWRlcicpO1xuICAgIHRoaXMuaW5wdXRzLmVxKGlkeCkuYXR0cih7XG4gICAgICAnaWQnOiBpZCxcbiAgICAgICdtYXgnOiB0aGlzLm9wdGlvbnMuZW5kLFxuICAgICAgJ21pbic6IHRoaXMub3B0aW9ucy5zdGFydCxcbiAgICAgICdzdGVwJzogdGhpcy5vcHRpb25zLnN0ZXBcbiAgICB9KTtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbChpbml0VmFsKTtcbiAgICB0aGlzLmhhbmRsZXMuZXEoaWR4KS5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3NsaWRlcicsXG4gICAgICAnYXJpYS1jb250cm9scyc6IGlkLFxuICAgICAgJ2FyaWEtdmFsdWVtYXgnOiB0aGlzLm9wdGlvbnMuZW5kLFxuICAgICAgJ2FyaWEtdmFsdWVtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXG4gICAgICAnYXJpYS12YWx1ZW5vdyc6IGluaXRWYWwsXG4gICAgICAnYXJpYS1vcmllbnRhdGlvbic6IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCcsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5wdXQgYW5kIGBhcmlhLXZhbHVlbm93YCB2YWx1ZXMgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgLSBmbG9hdGluZyBwb2ludCBvZiB0aGUgbmV3IHZhbHVlLlxuICAgKi9cbiAgX3NldFZhbHVlcygkaGFuZGxlLCB2YWwpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gdGhpcy5oYW5kbGVzLmluZGV4KCRoYW5kbGUpIDogMDtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbCh2YWwpO1xuICAgICRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycsIHZhbCk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBldmVudHMgb24gdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBDYWxjdWxhdGVzIHRoZSBuZXcgbG9jYXRpb24gb2YgdGhlIGN1cnJlbnQgaGFuZGxlLlxuICAgKiBJZiB0aGVyZSBhcmUgdHdvIGhhbmRsZXMgYW5kIHRoZSBiYXIgd2FzIGNsaWNrZWQsIGl0IGRldGVybWluZXMgd2hpY2ggaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZSAtIHRoZSBgZXZlbnRgIG9iamVjdCBwYXNzZWQgZnJvbSB0aGUgbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGNhbGN1bGF0ZSBmb3IsIGlmIHNlbGVjdGVkLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgbnVtYmVyIGZvciB0aGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAqIFRPRE8gY2xlYW4gdGhpcyB1cCwgdGhlcmUncyBhIGxvdCBvZiByZXBlYXRlZCBjb2RlIGJldHdlZW4gdGhpcyBhbmQgdGhlIF9zZXRIYW5kbGVQb3MgZm4uXG4gICAqL1xuICBfaGFuZGxlRXZlbnQoZSwgJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIHZhbHVlLCBoYXNWYWw7XG4gICAgaWYgKCF2YWwpIHsvL2NsaWNrIG9yIGRyYWcgZXZlbnRzXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIHZlcnRpY2FsID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICAgIHBhcmFtID0gdmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgICAgZGlyZWN0aW9uID0gdmVydGljYWwgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgICBldmVudE9mZnNldCA9IHZlcnRpY2FsID8gZS5wYWdlWSA6IGUucGFnZVgsXG4gICAgICAgICAgaGFsZk9mSGFuZGxlID0gdGhpcy4kaGFuZGxlWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3BhcmFtXSAvIDIsXG4gICAgICAgICAgYmFyRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0sXG4gICAgICAgICAgd2luZG93U2Nyb2xsID0gdmVydGljYWwgPyAkKHdpbmRvdykuc2Nyb2xsVG9wKCkgOiAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXG5cbiAgICAgIHZhciBlbGVtT2Zmc2V0ID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKVtkaXJlY3Rpb25dO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHMgZW11bGF0ZWQgYnkgdGhlIHRvdWNoIHV0aWwgZ2l2ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBzY3JlZW4sIGFkZCB3aW5kb3cuc2Nyb2xsIHRvIGV2ZW50IGNvb3JkaW5hdGVzLi4uXG4gICAgICAvLyBiZXN0IHdheSB0byBndWVzcyB0aGlzIGlzIHNpbXVsYXRlZCBpcyBpZiBjbGllbnRZID09IHBhZ2VZXG4gICAgICBpZiAoZS5jbGllbnRZID09PSBlLnBhZ2VZKSB7IGV2ZW50T2Zmc2V0ID0gZXZlbnRPZmZzZXQgKyB3aW5kb3dTY3JvbGw7IH1cbiAgICAgIHZhciBldmVudEZyb21CYXIgPSBldmVudE9mZnNldCAtIGVsZW1PZmZzZXQ7XG4gICAgICB2YXIgYmFyWFk7XG4gICAgICBpZiAoZXZlbnRGcm9tQmFyIDwgMCkge1xuICAgICAgICBiYXJYWSA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RnJvbUJhciA+IGJhckRpbSkge1xuICAgICAgICBiYXJYWSA9IGJhckRpbTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhclhZID0gZXZlbnRGcm9tQmFyO1xuICAgICAgfVxuICAgICAgdmFyIG9mZnNldFBjdCA9IHBlcmNlbnQoYmFyWFksIGJhckRpbSk7XG5cbiAgICAgIHZhbHVlID0gdGhpcy5fdmFsdWUob2Zmc2V0UGN0KTtcblxuICAgICAgLy8gdHVybiBldmVyeXRoaW5nIGFyb3VuZCBmb3IgUlRMLCB5YXkgbWF0aCFcbiAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpICYmICF0aGlzLm9wdGlvbnMudmVydGljYWwpIHt2YWx1ZSA9IHRoaXMub3B0aW9ucy5lbmQgLSB2YWx1ZTt9XG5cbiAgICAgIHZhbHVlID0gX3RoaXMuX2FkanVzdFZhbHVlKG51bGwsIHZhbHVlKTtcbiAgICAgIC8vYm9vbGVhbiBmbGFnIGZvciB0aGUgc2V0SGFuZGxlUG9zIGZuLCBzcGVjaWZpY2FsbHkgZm9yIHZlcnRpY2FsIHNsaWRlcnNcbiAgICAgIGhhc1ZhbCA9IGZhbHNlO1xuXG4gICAgICBpZiAoISRoYW5kbGUpIHsvL2ZpZ3VyZSBvdXQgd2hpY2ggaGFuZGxlIGl0IGlzLCBwYXNzIGl0IHRvIHRoZSBuZXh0IGZ1bmN0aW9uLlxuICAgICAgICB2YXIgZmlyc3RIbmRsUG9zID0gYWJzUG9zaXRpb24odGhpcy4kaGFuZGxlLCBkaXJlY3Rpb24sIGJhclhZLCBwYXJhbSksXG4gICAgICAgICAgICBzZWNuZEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUyLCBkaXJlY3Rpb24sIGJhclhZLCBwYXJhbSk7XG4gICAgICAgICAgICAkaGFuZGxlID0gZmlyc3RIbmRsUG9zIDw9IHNlY25kSG5kbFBvcyA/IHRoaXMuJGhhbmRsZSA6IHRoaXMuJGhhbmRsZTI7XG4gICAgICB9XG5cbiAgICB9IGVsc2Ugey8vY2hhbmdlIGV2ZW50IG9uIGlucHV0XG4gICAgICB2YWx1ZSA9IHRoaXMuX2FkanVzdFZhbHVlKG51bGwsIHZhbCk7XG4gICAgICBoYXNWYWwgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3NldEhhbmRsZVBvcygkaGFuZGxlLCB2YWx1ZSwgaGFzVmFsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RlcyB2YWx1ZSBmb3IgaGFuZGxlIGluIHJlZ2FyZCB0byBzdGVwIHZhbHVlLiByZXR1cm5zIGFkanVzdGVkIHZhbHVlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIHZhbHVlIHRvIGFkanVzdC4gdXNlZCBpZiAkaGFuZGxlIGlzIGZhbHN5XG4gICAqL1xuICBfYWRqdXN0VmFsdWUoJGhhbmRsZSwgdmFsdWUpIHtcbiAgICB2YXIgdmFsLFxuICAgICAgc3RlcCA9IHRoaXMub3B0aW9ucy5zdGVwLFxuICAgICAgZGl2ID0gcGFyc2VGbG9hdChzdGVwLzIpLFxuICAgICAgbGVmdCwgcHJldl92YWwsIG5leHRfdmFsO1xuICAgIGlmICghISRoYW5kbGUpIHtcbiAgICAgIHZhbCA9IHBhcnNlRmxvYXQoJGhhbmRsZS5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhbCA9IHZhbHVlO1xuICAgIH1cbiAgICBsZWZ0ID0gdmFsICUgc3RlcDtcbiAgICBwcmV2X3ZhbCA9IHZhbCAtIGxlZnQ7XG4gICAgbmV4dF92YWwgPSBwcmV2X3ZhbCArIHN0ZXA7XG4gICAgaWYgKGxlZnQgPT09IDApIHtcbiAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICAgIHZhbCA9IHZhbCA+PSBwcmV2X3ZhbCArIGRpdiA/IG5leHRfdmFsIDogcHJldl92YWw7XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgc2xpZGVyIGVsZW1lbnRzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy5fZXZlbnRzRm9ySGFuZGxlKHRoaXMuJGhhbmRsZSk7XG4gICAgaWYodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLl9ldmVudHNGb3JIYW5kbGUodGhpcy4kaGFuZGxlMik7XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgYSBwYXJ0aWN1bGFyIGhhbmRsZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgY3VycmVudCBoYW5kbGUgdG8gYXBwbHkgbGlzdGVuZXJzIHRvLlxuICAgKi9cbiAgX2V2ZW50c0ZvckhhbmRsZSgkaGFuZGxlKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgY3VySGFuZGxlLFxuICAgICAgICB0aW1lcjtcblxuICAgICAgdGhpcy5pbnB1dHMub2ZmKCdjaGFuZ2UuemYuc2xpZGVyJykub24oJ2NoYW5nZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBpZHggPSBfdGhpcy5pbnB1dHMuaW5kZXgoJCh0aGlzKSk7XG4gICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy5oYW5kbGVzLmVxKGlkeCksICQodGhpcykudmFsKCkpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tTZWxlY3QpIHtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ2NsaWNrLnpmLnNsaWRlcicpLm9uKCdjbGljay56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJykpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgICBpZiAoISQoZS50YXJnZXQpLmlzKCdbZGF0YS1zbGlkZXItaGFuZGxlXScpKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xuICAgICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgX3RoaXMuJGhhbmRsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlKSB7XG4gICAgICB0aGlzLmhhbmRsZXMuYWRkVG91Y2goKTtcblxuICAgICAgdmFyICRib2R5ID0gJCgnYm9keScpO1xuICAgICAgJGhhbmRsZVxuICAgICAgICAub2ZmKCdtb3VzZWRvd24uemYuc2xpZGVyJylcbiAgICAgICAgLm9uKCdtb3VzZWRvd24uemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICRoYW5kbGUuYWRkQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgX3RoaXMuJGZpbGwuYWRkQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7Ly9cbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycsIHRydWUpO1xuXG4gICAgICAgICAgY3VySGFuZGxlID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuXG4gICAgICAgICAgJGJvZHkub24oJ21vdXNlbW92ZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgY3VySGFuZGxlKTtcblxuICAgICAgICAgIH0pLm9uKCdtb3VzZXVwLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xuXG4gICAgICAgICAgICAkaGFuZGxlLnJlbW92ZUNsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgICAgX3RoaXMuJGZpbGwucmVtb3ZlQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycsIGZhbHNlKTtcblxuICAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZW1vdmUuemYuc2xpZGVyIG1vdXNldXAuemYuc2xpZGVyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLy8gcHJldmVudCBldmVudHMgdHJpZ2dlcmVkIGJ5IHRvdWNoXG4gICAgICAub24oJ3NlbGVjdHN0YXJ0LnpmLnNsaWRlciB0b3VjaG1vdmUuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAkaGFuZGxlLm9mZigna2V5ZG93bi56Zi5zbGlkZXInKS5vbigna2V5ZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgXyRoYW5kbGUgPSAkKHRoaXMpLFxuICAgICAgICAgIGlkeCA9IF90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPyBfdGhpcy5oYW5kbGVzLmluZGV4KF8kaGFuZGxlKSA6IDAsXG4gICAgICAgICAgb2xkVmFsdWUgPSBwYXJzZUZsb2F0KF90aGlzLmlucHV0cy5lcShpZHgpLnZhbCgpKSxcbiAgICAgICAgICBuZXdWYWx1ZTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1NsaWRlcicsIHtcbiAgICAgICAgZGVjcmVhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXA7XG4gICAgICAgIH0sXG4gICAgICAgIGluY3JlYXNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlICsgX3RoaXMub3B0aW9ucy5zdGVwO1xuICAgICAgICB9LFxuICAgICAgICBkZWNyZWFzZV9mYXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlIC0gX3RoaXMub3B0aW9ucy5zdGVwICogMTA7XG4gICAgICAgIH0sXG4gICAgICAgIGluY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIG9ubHkgc2V0IGhhbmRsZSBwb3Mgd2hlbiBldmVudCB3YXMgaGFuZGxlZCBzcGVjaWFsbHlcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX3NldEhhbmRsZVBvcyhfJGhhbmRsZSwgbmV3VmFsdWUsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8qaWYgKG5ld1ZhbHVlKSB7IC8vIGlmIHByZXNzZWQga2V5IGhhcyBzcGVjaWFsIGZ1bmN0aW9uLCB1cGRhdGUgdmFsdWVcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF8kaGFuZGxlLCBuZXdWYWx1ZSk7XG4gICAgICB9Ki9cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgc2xpZGVyIHBsdWdpbi5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5oYW5kbGVzLm9mZignLnpmLnNsaWRlcicpO1xuICAgIHRoaXMuaW5wdXRzLm9mZignLnpmLnNsaWRlcicpO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYuc2xpZGVyJyk7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5TbGlkZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDBcbiAgICovXG4gIHN0YXJ0OiAwLFxuICAvKipcbiAgICogTWF4aW11bSB2YWx1ZSBmb3IgdGhlIHNsaWRlciBzY2FsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMDBcbiAgICovXG4gIGVuZDogMTAwLFxuICAvKipcbiAgICogTWluaW11bSB2YWx1ZSBjaGFuZ2UgcGVyIGNoYW5nZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBzdGVwOiAxLFxuICAvKipcbiAgICogVmFsdWUgYXQgd2hpY2ggdGhlIGhhbmRsZS9pbnB1dCAqKGxlZnQgaGFuZGxlL2ZpcnN0IGlucHV0KSogc2hvdWxkIGJlIHNldCB0byBvbiBpbml0aWFsaXphdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAwXG4gICAqL1xuICBpbml0aWFsU3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgcmlnaHQgaGFuZGxlL3NlY29uZCBpbnB1dCBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwMFxuICAgKi9cbiAgaW5pdGlhbEVuZDogMTAwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBpbnB1dCB0byBiZSBsb2NhdGVkIG91dHNpZGUgdGhlIGNvbnRhaW5lciBhbmQgdmlzaWJsZS4gU2V0IHRvIGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBiaW5kaW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBjbGljay90YXAgb24gdGhlIHNsaWRlciBiYXIgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tTZWxlY3Q6IHRydWUsXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBhbmQgdXNlIHRoZSBgdmVydGljYWxgIGNsYXNzIHRvIGNoYW5nZSBhbGlnbm1lbnQgdG8gdmVydGljYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBkcmFnIHRoZSBzbGlkZXIgaGFuZGxlKHMpIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGRyYWdnYWJsZTogdHJ1ZSxcbiAgLyoqXG4gICAqIERpc2FibGVzIHRoZSBzbGlkZXIgYW5kIHByZXZlbnRzIGV2ZW50IGxpc3RlbmVycyBmcm9tIGJlaW5nIGFwcGxpZWQuIERvdWJsZSBjaGVja2VkIGJ5IEpTIHdpdGggYGRpc2FibGVkQ2xhc3NgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlZDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZSBvZiB0d28gaGFuZGxlcy4gRG91YmxlIGNoZWNrZWQgYnkgdGhlIEpTLiBDaGFuZ2VzIHNvbWUgbG9naWMgaGFuZGxpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRvdWJsZVNpZGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBvdGVudGlhbCBmdXR1cmUgZmVhdHVyZS5cbiAgICovXG4gIC8vIHN0ZXBzOiAxMDAsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdGhlIHBsdWdpbiBzaG91bGQgZ28gdG8gZm9yIGZsb2F0aW5nIHBvaW50IHByZWNpc2lvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyXG4gICAqL1xuICBkZWNpbWFsOiAyLFxuICAvKipcbiAgICogVGltZSBkZWxheSBmb3IgZHJhZ2dlZCBlbGVtZW50cy5cbiAgICovXG4gIC8vIGRyYWdEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBhbmltYXRlIHRoZSBtb3ZlbWVudCBvZiBhIHNsaWRlciBoYW5kbGUgaWYgdXNlciBjbGlja3MvdGFwcyBvbiB0aGUgYmFyLiBOZWVkcyB0byBiZSBtYW51YWxseSBzZXQgaWYgdXBkYXRpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgU2FzcyBzZXR0aW5ncy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIG1vdmVUaW1lOiAyMDAsLy91cGRhdGUgdGhpcyBpZiBjaGFuZ2luZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBzYXNzXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGRpc2FibGVkIHNsaWRlcnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2Rpc2FibGVkJ1xuICAgKi9cbiAgZGlzYWJsZWRDbGFzczogJ2Rpc2FibGVkJyxcbiAgLyoqXG4gICAqIFdpbGwgaW52ZXJ0IHRoZSBkZWZhdWx0IGxheW91dCBmb3IgYSB2ZXJ0aWNhbDxzcGFuIGRhdGEtdG9vbHRpcCB0aXRsZT1cIndobyB3b3VsZCBkbyB0aGlzPz8/XCI+IDwvc3Bhbj5zbGlkZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGludmVydFZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIE1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGBjaGFuZ2VkLnpmLXNsaWRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIGFmdGVyIHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGNoYW5nZWREZWxheTogNTAwLFxuICAvKipcbiAgKiBCYXNldmFsdWUgZm9yIG5vbi1saW5lYXIgc2xpZGVyc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSA1XG4gICovXG4gIG5vbkxpbmVhckJhc2U6IDUsXG4gIC8qKlxuICAqIEJhc2V2YWx1ZSBmb3Igbm9uLWxpbmVhciBzbGlkZXJzLCBwb3NzaWJsZSB2YWx1ZXMgYXJlOiAnbGluZWFyJywgJ3BvdycgJiAnbG9nJy4gUG93IGFuZCBMb2cgdXNlIHRoZSBub25MaW5lYXJCYXNlIHNldHRpbmcuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdsaW5lYXInXG4gICovXG4gIHBvc2l0aW9uVmFsdWVGdW5jdGlvbjogJ2xpbmVhcicsXG59O1xuXG5mdW5jdGlvbiBwZXJjZW50KGZyYWMsIG51bSkge1xuICByZXR1cm4gKGZyYWMgLyBudW0pO1xufVxuZnVuY3Rpb24gYWJzUG9zaXRpb24oJGhhbmRsZSwgZGlyLCBjbGlja1BvcywgcGFyYW0pIHtcbiAgcmV0dXJuIE1hdGguYWJzKCgkaGFuZGxlLnBvc2l0aW9uKClbZGlyXSArICgkaGFuZGxlW3BhcmFtXSgpIC8gMikpIC0gY2xpY2tQb3MpO1xufVxuZnVuY3Rpb24gYmFzZUxvZyhiYXNlLCB2YWx1ZSkge1xuICByZXR1cm4gTWF0aC5sb2codmFsdWUpL01hdGgubG9nKGJhc2UpXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTbGlkZXIsICdTbGlkZXInKTtcblxufShqUXVlcnkpO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogU3RpY2t5IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5zdGlja3lcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICovXG5cbmNsYXNzIFN0aWNreSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgc3RpY2t5IHRoaW5nLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2Ugc3RpY2t5LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbnMgb2JqZWN0IHBhc3NlZCB3aGVuIGNyZWF0aW5nIHRoZSBlbGVtZW50IHByb2dyYW1tYXRpY2FsbHkuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFN0aWNreS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnU3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHN0aWNreSBlbGVtZW50IGJ5IGFkZGluZyBjbGFzc2VzLCBnZXR0aW5nL3NldHRpbmcgZGltZW5zaW9ucywgYnJlYWtwb2ludHMgYW5kIGF0dHJpYnV0ZXNcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdGlja3ktY29udGFpbmVyXScpLFxuICAgICAgICBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc3RpY2t5JyksXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICghJHBhcmVudC5sZW5ndGgpIHtcbiAgICAgIHRoaXMud2FzV3JhcHBlZCA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuJGNvbnRhaW5lciA9ICRwYXJlbnQubGVuZ3RoID8gJHBhcmVudCA6ICQodGhpcy5vcHRpb25zLmNvbnRhaW5lcikud3JhcElubmVyKHRoaXMuJGVsZW1lbnQpO1xuICAgIHRoaXMuJGNvbnRhaW5lci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3MpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3MpXG4gICAgICAgICAgICAgICAgIC5hdHRyKHsnZGF0YS1yZXNpemUnOiBpZH0pO1xuXG4gICAgdGhpcy5zY3JvbGxDb3VudCA9IHRoaXMub3B0aW9ucy5jaGVja0V2ZXJ5O1xuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgICQod2luZG93KS5vbmUoJ2xvYWQuemYuc3RpY2t5JywgZnVuY3Rpb24oKXtcbiAgICAgIC8vV2UgY2FsY3VsYXRlIHRoZSBjb250YWluZXIgaGVpZ2h0IHRvIGhhdmUgY29ycmVjdCB2YWx1ZXMgZm9yIGFuY2hvciBwb2ludHMgb2Zmc2V0IGNhbGN1bGF0aW9uLlxuICAgICAgX3RoaXMuY29udGFpbmVySGVpZ2h0ID0gX3RoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIiA/IDAgOiBfdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICBfdGhpcy4kY29udGFpbmVyLmNzcygnaGVpZ2h0JywgX3RoaXMuY29udGFpbmVySGVpZ2h0KTtcbiAgICAgIF90aGlzLmVsZW1IZWlnaHQgPSBfdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmFuY2hvciAhPT0gJycpe1xuICAgICAgICBfdGhpcy4kYW5jaG9yID0gJCgnIycgKyBfdGhpcy5vcHRpb25zLmFuY2hvcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgX3RoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgICB9XG5cbiAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgc2Nyb2xsKTtcbiAgICAgICAgLy9VbnN0aWNrIHRoZSBlbGVtZW50IHdpbGwgZW5zdXJlIHRoYXQgcHJvcGVyIGNsYXNzZXMgYXJlIHNldC5cbiAgICAgICAgaWYgKCFfdGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgX3RoaXMuX3JlbW92ZVN0aWNreSgoc2Nyb2xsID49IF90aGlzLnRvcFBvaW50KSA/IGZhbHNlIDogdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cyhpZC5zcGxpdCgnLScpLnJldmVyc2UoKS5qb2luKCctJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHVzaW5nIG11bHRpcGxlIGVsZW1lbnRzIGFzIGFuY2hvcnMsIGNhbGN1bGF0ZXMgdGhlIHRvcCBhbmQgYm90dG9tIHBpeGVsIHZhbHVlcyB0aGUgc3RpY2t5IHRoaW5nIHNob3VsZCBzdGljayBhbmQgdW5zdGljayBvbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGFyc2VQb2ludHMoKSB7XG4gICAgdmFyIHRvcCA9IHRoaXMub3B0aW9ucy50b3BBbmNob3IgPT0gXCJcIiA/IDEgOiB0aGlzLm9wdGlvbnMudG9wQW5jaG9yLFxuICAgICAgICBidG0gPSB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yPT0gXCJcIiA/IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgOiB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yLFxuICAgICAgICBwdHMgPSBbdG9wLCBidG1dLFxuICAgICAgICBicmVha3MgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcHRzLmxlbmd0aDsgaSA8IGxlbiAmJiBwdHNbaV07IGkrKykge1xuICAgICAgdmFyIHB0O1xuICAgICAgaWYgKHR5cGVvZiBwdHNbaV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHB0ID0gcHRzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBsYWNlID0gcHRzW2ldLnNwbGl0KCc6JyksXG4gICAgICAgICAgICBhbmNob3IgPSAkKGAjJHtwbGFjZVswXX1gKTtcblxuICAgICAgICBwdCA9IGFuY2hvci5vZmZzZXQoKS50b3A7XG4gICAgICAgIGlmIChwbGFjZVsxXSAmJiBwbGFjZVsxXS50b0xvd2VyQ2FzZSgpID09PSAnYm90dG9tJykge1xuICAgICAgICAgIHB0ICs9IGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrc1tpXSA9IHB0O1xuICAgIH1cblxuXG4gICAgdGhpcy5wb2ludHMgPSBicmVha3M7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBzY3JvbGxpbmcgZWxlbWVudC5cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIC0gcHN1ZWRvLXJhbmRvbSBpZCBmb3IgdW5pcXVlIHNjcm9sbCBldmVudCBsaXN0ZW5lci5cbiAgICovXG4gIF9ldmVudHMoaWQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxMaXN0ZW5lciA9IHRoaXMuc2Nyb2xsTGlzdGVuZXIgPSBgc2Nyb2xsLnpmLiR7aWR9YDtcbiAgICBpZiAodGhpcy5pc09uKSB7IHJldHVybjsgfVxuICAgIGlmICh0aGlzLmNhblN0aWNrKSB7XG4gICAgICB0aGlzLmlzT24gPSB0cnVlO1xuICAgICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcilcbiAgICAgICAgICAgICAgIC5vbihzY3JvbGxMaXN0ZW5lciwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Nyb2xsQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudCA9IF90aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlLCB3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJylcbiAgICAgICAgICAgICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSwgZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY2FuU3RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV90aGlzLmlzT24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9ldmVudHMoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBoYW5kbGVycyBmb3Igc2Nyb2xsIGFuZCBjaGFuZ2UgZXZlbnRzIG9uIGFuY2hvci5cbiAgICogQGZpcmVzIFN0aWNreSNwYXVzZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2Nyb2xsTGlzdGVuZXIgLSB1bmlxdWUsIG5hbWVzcGFjZWQgc2Nyb2xsIGxpc3RlbmVyIGF0dGFjaGVkIHRvIGB3aW5kb3dgXG4gICAqL1xuICBfcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBpcyBwYXVzZWQgZHVlIHRvIHJlc2l6ZSBldmVudCBzaHJpbmtpbmcgdGhlIHZpZXcuXG4gICAgICogQGV2ZW50IFN0aWNreSNwYXVzZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncGF1c2UuemYuc3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGV2ZXJ5IGBzY3JvbGxgIGV2ZW50IGFuZCBvbiBgX2luaXRgXG4gICAqIGZpcmVzIGZ1bmN0aW9ucyBiYXNlZCBvbiBib29sZWFucyBhbmQgY2FjaGVkIHZhbHVlc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGNoZWNrU2l6ZXMgLSB0cnVlIGlmIHBsdWdpbiBzaG91bGQgcmVjYWxjdWxhdGUgc2l6ZXMgYW5kIGJyZWFrcG9pbnRzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gc2Nyb2xsIC0gY3VycmVudCBzY3JvbGwgcG9zaXRpb24gcGFzc2VkIGZyb20gc2Nyb2xsIGV2ZW50IGNiIGZ1bmN0aW9uLiBJZiBub3QgcGFzc2VkLCBkZWZhdWx0cyB0byBgd2luZG93LnBhZ2VZT2Zmc2V0YC5cbiAgICovXG4gIF9jYWxjKGNoZWNrU2l6ZXMsIHNjcm9sbCkge1xuICAgIGlmIChjaGVja1NpemVzKSB7IHRoaXMuX3NldFNpemVzKCk7IH1cblxuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFzY3JvbGwpIHsgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0OyB9XG5cbiAgICBpZiAoc2Nyb2xsID49IHRoaXMudG9wUG9pbnQpIHtcbiAgICAgIGlmIChzY3JvbGwgPD0gdGhpcy5ib3R0b21Qb2ludCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3NldFN0aWNreSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgc3R1Y2suXG4gICAqIEFkZHMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBmaXJlcyBTdGlja3kjc3R1Y2t0b1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTdGlja3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBtcmduID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fTtcblxuICAgIGNzc1ttcmduXSA9IGAke3RoaXMub3B0aW9uc1ttcmduXX1lbWA7XG4gICAgY3NzW3N0aWNrVG9dID0gMDtcbiAgICBjc3Nbbm90U3R1Y2tUb10gPSAnYXV0byc7XG4gICAgdGhpcy5pc1N0dWNrID0gdHJ1ZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke25vdFN0dWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGBwb3NpdGlvbjogZml4ZWQ7YFxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYuc3R1Y2t0bzp0b3BgXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjc3R1Y2t0b1xuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi5zdHVja3RvOiR7c3RpY2tUb31gKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9uKFwidHJhbnNpdGlvbmVuZCB3ZWJraXRUcmFuc2l0aW9uRW5kIG9UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIE1TVHJhbnNpdGlvbkVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9zZXRTaXplcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHVuc3R1Y2suXG4gICAqIFJlbW92ZXMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEFkZHMgb3RoZXIgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNUb3AgLSB0ZWxscyB0aGUgZnVuY3Rpb24gaWYgdGhlICRlbGVtZW50IHNob3VsZCBhbmNob3IgdG8gdGhlIHRvcCBvciBib3R0b20gb2YgaXRzICRhbmNob3IgZWxlbWVudC5cbiAgICogQGZpcmVzIFN0aWNreSN1bnN0dWNrZnJvbVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlbW92ZVN0aWNreShpc1RvcCkge1xuICAgIHZhciBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXG4gICAgICAgIHN0aWNrVG9Ub3AgPSBzdGlja1RvID09PSAndG9wJyxcbiAgICAgICAgY3NzID0ge30sXG4gICAgICAgIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLnBvaW50c1swXSA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodCxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG9Ub3AgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUb1RvcCA/ICdib3R0b20nIDogJ3RvcCcsXG4gICAgICAgIHRvcE9yQm90dG9tID0gaXNUb3AgPyAndG9wJyA6ICdib3R0b20nO1xuXG4gICAgY3NzW21yZ25dID0gMDtcblxuICAgIGNzc1snYm90dG9tJ10gPSAnYXV0byc7XG4gICAgaWYoaXNUb3ApIHtcbiAgICAgIGNzc1sndG9wJ10gPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBjc3NbJ3RvcCddID0gYW5jaG9yUHQ7XG4gICAgfVxuXG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHt0b3BPckJvdHRvbX1gKVxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcbiAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYW5jaG9yZWQuXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi51bnN0dWNrZnJvbTpib3R0b21gXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjdW5zdHVja2Zyb21cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYudW5zdHVja2Zyb206JHt0b3BPckJvdHRvbX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSAkZWxlbWVudCBhbmQgJGNvbnRhaW5lciBzaXplcyBmb3IgcGx1Z2luLlxuICAgKiBDYWxscyBgX3NldEJyZWFrUG9pbnRzYC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24gb2YgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U2l6ZXMoY2IpIHtcbiAgICB0aGlzLmNhblN0aWNrID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmlzKHRoaXMub3B0aW9ucy5zdGlja3lPbik7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxuICAgICAgICBjb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKSxcbiAgICAgICAgcGRuZ2wgPSBwYXJzZUludChjb21wWydwYWRkaW5nLWxlZnQnXSwgMTApLFxuICAgICAgICBwZG5nciA9IHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctcmlnaHQnXSwgMTApO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLmFuY2hvckhlaWdodCA9IHRoaXMuJGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe1xuICAgICAgJ21heC13aWR0aCc6IGAke25ld0VsZW1XaWR0aCAtIHBkbmdsIC0gcGRuZ3J9cHhgXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3Q29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgfHwgdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xuICAgICAgbmV3Q29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICB9XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG4gICAgdGhpcy4kY29udGFpbmVyLmNzcyh7XG4gICAgICBoZWlnaHQ6IG5ld0NvbnRhaW5lckhlaWdodFxuICAgIH0pO1xuICAgIHRoaXMuZWxlbUhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcblxuICAgIGlmICghdGhpcy5pc1N0dWNrKSB7XG4gICAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtYXQtYm90dG9tJykpIHtcbiAgICAgICAgdmFyIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLiRjb250YWluZXIub2Zmc2V0KCkudG9wIDogdGhpcy5hbmNob3JIZWlnaHQpIC0gdGhpcy5lbGVtSGVpZ2h0O1xuICAgICAgICB0aGlzLiRlbGVtZW50LmNzcygndG9wJywgYW5jaG9yUHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3NldEJyZWFrUG9pbnRzKG5ld0NvbnRhaW5lckhlaWdodCwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB1cHBlciBhbmQgbG93ZXIgYnJlYWtwb2ludHMgZm9yIHRoZSBlbGVtZW50IHRvIGJlY29tZSBzdGlja3kvdW5zdGlja3kuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBlbGVtSGVpZ2h0IC0gcHggdmFsdWUgZm9yIHN0aWNreS4kZWxlbWVudCBoZWlnaHQsIGNhbGN1bGF0ZWQgYnkgYF9zZXRTaXplc2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGNvbXBsZXRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0QnJlYWtQb2ludHMoZWxlbUhlaWdodCwgY2IpIHtcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgICAgZWxzZSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cbiAgICB2YXIgbVRvcCA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luVG9wKSxcbiAgICAgICAgbUJ0bSA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luQm90dG9tKSxcbiAgICAgICAgdG9wUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzBdIDogdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCxcbiAgICAgICAgYm90dG9tUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIDogdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCxcbiAgICAgICAgLy8gdG9wUG9pbnQgPSB0aGlzLiRhbmNob3Iub2Zmc2V0KCkudG9wIHx8IHRoaXMucG9pbnRzWzBdLFxuICAgICAgICAvLyBib3R0b21Qb2ludCA9IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQgfHwgdGhpcy5wb2ludHNbMV0sXG4gICAgICAgIHdpbkhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RpY2tUbyA9PT0gJ3RvcCcpIHtcbiAgICAgIHRvcFBvaW50IC09IG1Ub3A7XG4gICAgICBib3R0b21Qb2ludCAtPSAoZWxlbUhlaWdodCArIG1Ub3ApO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICdib3R0b20nKSB7XG4gICAgICB0b3BQb2ludCAtPSAod2luSGVpZ2h0IC0gKGVsZW1IZWlnaHQgKyBtQnRtKSk7XG4gICAgICBib3R0b21Qb2ludCAtPSAod2luSGVpZ2h0IC0gbUJ0bSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vdGhpcyB3b3VsZCBiZSB0aGUgc3RpY2tUbzogYm90aCBvcHRpb24uLi4gdHJpY2t5XG4gICAgfVxuXG4gICAgdGhpcy50b3BQb2ludCA9IHRvcFBvaW50O1xuICAgIHRoaXMuYm90dG9tUG9pbnQgPSBib3R0b21Qb2ludDtcblxuICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBjdXJyZW50IHN0aWNreSBlbGVtZW50LlxuICAgKiBSZXNldHMgdGhlIGVsZW1lbnQgdG8gdGhlIHRvcCBwb3NpdGlvbiBmaXJzdC5cbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMsIEpTLWFkZGVkIGNzcyBwcm9wZXJ0aWVzIGFuZCBjbGFzc2VzLCBhbmQgdW53cmFwcyB0aGUgJGVsZW1lbnQgaWYgdGhlIEpTIGFkZGVkIHRoZSAkY29udGFpbmVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgJHt0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3N9IGlzLWFuY2hvcmVkIGlzLWF0LXRvcGApXG4gICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgIGhlaWdodDogJycsXG4gICAgICAgICAgICAgICAgICAgdG9wOiAnJyxcbiAgICAgICAgICAgICAgICAgICBib3R0b206ICcnLFxuICAgICAgICAgICAgICAgICAgICdtYXgtd2lkdGgnOiAnJ1xuICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJyk7XG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub2ZmKCdjaGFuZ2UuemYuc3RpY2t5Jyk7XG4gICAgfVxuICAgICQod2luZG93KS5vZmYodGhpcy5zY3JvbGxMaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53YXNXcmFwcGVkKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRjb250YWluZXIucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKVxuICAgICAgICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJydcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuU3RpY2t5LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQ3VzdG9taXphYmxlIGNvbnRhaW5lciB0ZW1wbGF0ZS4gQWRkIHlvdXIgb3duIGNsYXNzZXMgZm9yIHN0eWxpbmcgYW5kIHNpemluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnJmx0O2RpdiBkYXRhLXN0aWNreS1jb250YWluZXIgY2xhc3M9XCJzbWFsbC02IGNvbHVtbnNcIiZndDsmbHQ7L2RpdiZndDsnXG4gICAqL1xuICBjb250YWluZXI6ICc8ZGl2IGRhdGEtc3RpY2t5LWNvbnRhaW5lcj48L2Rpdj4nLFxuICAvKipcbiAgICogTG9jYXRpb24gaW4gdGhlIHZpZXcgdGhlIGVsZW1lbnQgc3RpY2tzIHRvLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b3AnXG4gICAqL1xuICBzdGlja1RvOiAndG9wJyxcbiAgLyoqXG4gICAqIElmIGFuY2hvcmVkIHRvIGEgc2luZ2xlIGVsZW1lbnQsIHRoZSBpZCBvZiB0aGF0IGVsZW1lbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZCdcbiAgICovXG4gIGFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSB0b3AgYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6dG9wJ1xuICAgKi9cbiAgdG9wQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIGJvdHRvbSBhbmNob3IuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZDpib3R0b20nXG4gICAqL1xuICBidG1BbmNob3I6ICcnLFxuICAvKipcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIHRvcCBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIG1hcmdpblRvcDogMSxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSBib3R0b20gb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Cb3R0b206IDEsXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IHN0cmluZyB0aGF0IGlzIHRoZSBtaW5pbXVtIHNjcmVlbiBzaXplIGFuIGVsZW1lbnQgc2hvdWxkIGJlY29tZSBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcbiAgICovXG4gIHN0aWNreU9uOiAnbWVkaXVtJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGVsZW1lbnQsIGFuZCByZW1vdmVkIG9uIGRlc3RydWN0aW9uLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3lgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzdGlja3knXG4gICAqL1xuICBzdGlja3lDbGFzczogJ3N0aWNreScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBjb250YWluZXIuIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreS1jb250YWluZXJgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzdGlja3ktY29udGFpbmVyJ1xuICAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdzdGlja3ktY29udGFpbmVyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBzY3JvbGwgZXZlbnRzIGJldHdlZW4gdGhlIHBsdWdpbidzIHJlY2FsY3VsYXRpbmcgc3RpY2t5IHBvaW50cy4gU2V0dGluZyBpdCB0byBgMGAgd2lsbCBjYXVzZSBpdCB0byByZWNhbGMgZXZlcnkgc2Nyb2xsIGV2ZW50LCBzZXR0aW5nIGl0IHRvIGAtMWAgd2lsbCBwcmV2ZW50IHJlY2FsYyBvbiBzY3JvbGwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIGNoZWNrRXZlcnk6IC0xXG59O1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjYWxjdWxhdGUgZW0gdmFsdWVzXG4gKiBAcGFyYW0gTnVtYmVyIHtlbX0gLSBudW1iZXIgb2YgZW0ncyB0byBjYWxjdWxhdGUgaW50byBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZW1DYWxjKGVtKSB7XG4gIHJldHVybiBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBudWxsKS5mb250U2l6ZSwgMTApICogZW07XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTdGlja3ksICdTdGlja3knKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRhYnMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRhYnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlciBpZiB0YWJzIGNvbnRhaW4gaW1hZ2VzXG4gKi9cblxuY2xhc3MgVGFicyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVGFicyNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gdGFicy5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUYWJzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVGFicycpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1RhYnMnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIC8vICdUQUInOiAnbmV4dCcsXG4gICAgICAvLyAnU0hJRlRfVEFCJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWJzIGJ5IHNob3dpbmcgYW5kIGZvY3VzaW5nIChpZiBhdXRvRm9jdXM9dHJ1ZSkgdGhlIHByZXNldCBhY3RpdmUgdGFiLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7J3JvbGUnOiAndGFibGlzdCd9KTtcbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoYCR7X3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCksXG4gICAgICAgICAgaGFzaCA9ICRsaW5rWzBdLmhhc2guc2xpY2UoMSksXG4gICAgICAgICAgbGlua0lkID0gJGxpbmtbMF0uaWQgPyAkbGlua1swXS5pZCA6IGAke2hhc2h9LWxhYmVsYCxcbiAgICAgICAgICAkdGFiQ29udGVudCA9ICQoYCMke2hhc2h9YCk7XG5cbiAgICAgICRlbGVtLmF0dHIoeydyb2xlJzogJ3ByZXNlbnRhdGlvbid9KTtcblxuICAgICAgJGxpbmsuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaGFzaCxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBpc0FjdGl2ZSxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgJHRhYkNvbnRlbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYnBhbmVsJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgaWYoaXNBY3RpdmUgJiYgX3RoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xuICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogJGVsZW0ub2Zmc2V0KCkudG9wIH0sIF90aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2VEZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vdXNlIGJyb3dzZXIgdG8gb3BlbiBhIHRhYiwgaWYgaXQgZXhpc3RzIGluIHRoaXMgdGFic2V0XG4gICAgICBpZiAoX3RoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgICB2YXIgYW5jaG9yID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIC8vbmVlZCBhIGhhc2ggYW5kIGEgcmVsZXZhbnQgYW5jaG9yIGluIHRoaXMgdGFic2V0XG4gICAgICAgIGlmKGFuY2hvci5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgJGxpbmsgPSAkZWxlbS5maW5kKCdbaHJlZj1cIicrYW5jaG9yKydcIl0nKTtcbiAgICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy5zZWxlY3RUYWIoJChhbmNob3IpKTtcblxuICAgICAgICAgICAgLy9yb2xsIHVwIGEgbGl0dGxlIHRvIHNob3cgdGhlIHRpdGxlc1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2UpIHtcbiAgICAgICAgICAgICAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9ICRlbGVtLm9mZnNldCgpO1xuICAgICAgICAgICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHsgc2Nyb2xsVG9wOiBvZmZzZXQudG9wIH0sIF90aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2VEZWxheSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB6cGx1Z2luIGhhcyBkZWVwbGlua2VkIGF0IHBhZ2Vsb2FkXG4gICAgICAgICAgICAgICogQGV2ZW50IFRhYnMjZGVlcGxpbmtcbiAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAkZWxlbS50cmlnZ2VyKCdkZWVwbGluay56Zi50YWJzJywgWyRsaW5rLCAkKGFuY2hvcildKTtcbiAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kdGFiQ29udGVudC5maW5kKCdpbWcnKTtcblxuICAgICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fc2V0SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2V0SGVpZ2h0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLl9hZGRLZXlIYW5kbGVyKCk7XG4gICAgdGhpcy5fYWRkQ2xpY2tIYW5kbGVyKCk7XG4gICAgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyID0gbnVsbDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpO1xuXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJ2NsaWNrLnpmLnRhYnMnKVxuICAgICAgLm9uKCdjbGljay56Zi50YWJzJywgYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCwgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkKHRoaXMpKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5Ym9hcmQgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRLZXlIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSkgcmV0dXJuO1xuXG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMud3JhcE9uS2V5cykge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9IGkgPT09ICRlbGVtZW50cy5sZW5ndGggLTEgPyAkZWxlbWVudHMuZmlyc3QoKSA6ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1RhYnMnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRlbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJG5leHRFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC4gQ29sbGFwc2VzIGFjdGl2ZSB0YWIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIG9wZW4uXG4gICAqIEBmaXJlcyBUYWJzI2NoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCkge1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIGFjdGl2ZSBjbGFzcyBvbiB0YXJnZXQuIENvbGxhcHNlIGlmIGV4aXN0cy5cbiAgICAgKi9cbiAgICBpZiAoJHRhcmdldC5oYXNDbGFzcyhgJHt0aGlzLm9wdGlvbnMubGlua0FjdGl2ZUNsYXNzfWApKSB7XG4gICAgICAgIGlmKHRoaXMub3B0aW9ucy5hY3RpdmVDb2xsYXBzZSkge1xuICAgICAgICAgICAgdGhpcy5fY29sbGFwc2VUYWIoJHRhcmdldCk7XG5cbiAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHpwbHVnaW4gaGFzIHN1Y2Nlc3NmdWxseSBjb2xsYXBzZWQgdGFicy5cbiAgICAgICAgICAgICogQGV2ZW50IFRhYnMjY29sbGFwc2VcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NvbGxhcHNlLnpmLnRhYnMnLCBbJHRhcmdldF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgJG9sZFRhYiA9IHRoaXMuJGVsZW1lbnQuXG4gICAgICAgICAgZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc30uJHt0aGlzLm9wdGlvbnMubGlua0FjdGl2ZUNsYXNzfWApLFxuICAgICAgICAgICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxuICAgICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpO1xuXG4gICAgLy9jbG9zZSBvbGQgdGFiXG4gICAgdGhpcy5fY29sbGFwc2VUYWIoJG9sZFRhYik7XG5cbiAgICAvL29wZW4gbmV3IHRhYlxuICAgIHRoaXMuX29wZW5UYWIoJHRhcmdldCk7XG5cbiAgICAvL2VpdGhlciByZXBsYWNlIG9yIHVwZGF0ZSBicm93c2VyIGhpc3RvcnlcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB2YXIgYW5jaG9yID0gJHRhcmdldC5maW5kKCdhJykuYXR0cignaHJlZicpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnVwZGF0ZUhpc3RvcnkpIHtcbiAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCBhbmNob3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sICcnLCBhbmNob3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQgdGFicy5cbiAgICAgKiBAZXZlbnQgVGFicyNjaGFuZ2VcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZS56Zi50YWJzJywgWyR0YXJnZXQsICR0YXJnZXRDb250ZW50XSk7XG5cbiAgICAvL2ZpcmUgdG8gY2hpbGRyZW4gYSBtdXRhdGlvbiBldmVudFxuICAgICR0YXJnZXRDb250ZW50LmZpbmQoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXIoXCJtdXRhdGVtZS56Zi50cmlnZ2VyXCIpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUYWIgdG8gT3Blbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfb3BlblRhYigkdGFyZ2V0KSB7XG4gICAgICB2YXIgJHRhYkxpbmsgPSAkdGFyZ2V0LmZpbmQoJ1tyb2xlPVwidGFiXCJdJyksXG4gICAgICAgICAgaGFzaCA9ICR0YWJMaW5rWzBdLmhhc2gsXG4gICAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCk7XG5cbiAgICAgICR0YXJnZXQuYWRkQ2xhc3MoYCR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKTtcblxuICAgICAgJHRhYkxpbmsuYXR0cih7J2FyaWEtc2VsZWN0ZWQnOiAndHJ1ZSd9KTtcblxuICAgICAgJHRhcmdldENvbnRlbnRcbiAgICAgICAgLmFkZENsYXNzKGAke3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiAnZmFsc2UnfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGFwc2VzIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIE9wZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2NvbGxhcHNlVGFiKCR0YXJnZXQpIHtcbiAgICB2YXIgJHRhcmdldF9hbmNob3IgPSAkdGFyZ2V0XG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKVxuICAgICAgLmZpbmQoJ1tyb2xlPVwidGFiXCJdJylcbiAgICAgIC5hdHRyKHsgJ2FyaWEtc2VsZWN0ZWQnOiAnZmFsc2UnIH0pO1xuXG4gICAgJChgIyR7JHRhcmdldF9hbmNob3IuYXR0cignYXJpYS1jb250cm9scycpfWApXG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnBhbmVsQWN0aXZlQ2xhc3N9YClcbiAgICAgIC5hdHRyKHsgJ2FyaWEtaGlkZGVuJzogJ3RydWUnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYyBtZXRob2QgZm9yIHNlbGVjdGluZyBhIGNvbnRlbnQgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAcGFyYW0ge2pRdWVyeSB8IFN0cmluZ30gZWxlbSAtIGpRdWVyeSBvYmplY3Qgb3Igc3RyaW5nIG9mIHRoZSBpZCBvZiB0aGUgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNlbGVjdFRhYihlbGVtKSB7XG4gICAgdmFyIGlkU3RyO1xuXG4gICAgaWYgKHR5cGVvZiBlbGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgaWRTdHIgPSBlbGVtWzBdLmlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZFN0ciA9IGVsZW07XG4gICAgfVxuXG4gICAgaWYgKGlkU3RyLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIGlkU3RyID0gYCMke2lkU3RyfWA7XG4gICAgfVxuXG4gICAgdmFyICR0YXJnZXQgPSB0aGlzLiR0YWJUaXRsZXMuZmluZChgW2hyZWY9XCIke2lkU3RyfVwiXWApLnBhcmVudChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcblxuICAgIHRoaXMuX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0KTtcbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGhlaWdodCBvZiBlYWNoIHBhbmVsIHRvIHRoZSBoZWlnaHQgb2YgdGhlIHRhbGxlc3QgcGFuZWwuXG4gICAqIElmIGVuYWJsZWQgaW4gb3B0aW9ucywgZ2V0cyBjYWxsZWQgb24gbWVkaWEgcXVlcnkgY2hhbmdlLlxuICAgKiBJZiBsb2FkaW5nIGNvbnRlbnQgdmlhIGV4dGVybmFsIHNvdXJjZSwgY2FuIGJlIGNhbGxlZCBkaXJlY3RseSBvciB3aXRoIF9yZWZsb3cuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEhlaWdodCgpIHtcbiAgICB2YXIgbWF4ID0gMDtcbiAgICB0aGlzLiR0YWJDb250ZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5jc3MoJ2hlaWdodCcsICcnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBwYW5lbCA9ICQodGhpcyksXG4gICAgICAgICAgICBpc0FjdGl2ZSA9IHBhbmVsLmhhc0NsYXNzKGAke3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApO1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbicsICdkaXNwbGF5JzogJ2Jsb2NrJ30pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRlbXAgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcblxuICAgICAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICAgICAgcGFuZWwuY3NzKHtcbiAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJycsXG4gICAgICAgICAgICAnZGlzcGxheSc6ICcnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXggPSB0ZW1wID4gbWF4ID8gdGVtcCA6IG1heDtcbiAgICAgIH0pXG4gICAgICAuY3NzKCdoZWlnaHQnLCBgJHttYXh9cHhgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhbiB0YWJzLlxuICAgKiBAZmlyZXMgVGFicyNkZXN0cm95ZWRcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YClcbiAgICAgIC5vZmYoJy56Zi50YWJzJykuaGlkZSgpLmVuZCgpXG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5oaWRlKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICBpZiAodGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyICE9IG51bGwpIHtcbiAgICAgICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRhYnMuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBwYW5lIHNwZWNpZmllZCBieSBoYXNoIGFuY2hvclxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkZWVwTGluazogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFkanVzdCB0aGUgZGVlcCBsaW5rIHNjcm9sbCB0byBtYWtlIHN1cmUgdGhlIHRvcCBvZiB0aGUgdGFiIHBhbmVsIGlzIHZpc2libGVcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGVlcExpbmtTbXVkZ2U6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbmltYXRpb24gdGltZSAobXMpIGZvciB0aGUgZGVlcCBsaW5rIGFkanVzdG1lbnRcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAzMDBcbiAgICovXG4gIGRlZXBMaW5rU211ZGdlRGVsYXk6IDMwMCxcblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBicm93c2VyIGhpc3Rvcnkgd2l0aCB0aGUgb3BlbiB0YWJcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgdXBkYXRlSGlzdG9yeTogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgd2luZG93IHRvIHNjcm9sbCB0byBjb250ZW50IG9mIGFjdGl2ZSBwYW5lIG9uIGxvYWQgaWYgc2V0IHRvIHRydWUuXG4gICAqIE5vdCByZWNvbW1lbmRlZCBpZiBtb3JlIHRoYW4gb25lIHRhYiBwYW5lbCBwZXIgcGFnZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiBmYWxzZSxcblxuICAvKipcbiAgICogQWxsb3dzIGtleWJvYXJkIGlucHV0IHRvICd3cmFwJyBhcm91bmQgdGhlIHRhYiBsaW5rcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICB3cmFwT25LZXlzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRhYiBjb250ZW50IHBhbmVzIHRvIG1hdGNoIGhlaWdodHMgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG1hdGNoSGVpZ2h0OiBmYWxzZSxcblxuICAvKipcbiAgICogQWxsb3dzIGFjdGl2ZSB0YWJzIHRvIGNvbGxhcHNlIHdoZW4gY2xpY2tlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYWN0aXZlQ29sbGFwc2U6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGBsaWAncyBpbiB0YWIgbGluayBsaXN0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0YWJzLXRpdGxlJ1xuICAgKi9cbiAgbGlua0NsYXNzOiAndGFicy10aXRsZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGFjdGl2ZSBgbGlgIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLWFjdGl2ZSdcbiAgICovXG4gIGxpbmtBY3RpdmVDbGFzczogJ2lzLWFjdGl2ZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRlbnQgY29udGFpbmVycy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndGFicy1wYW5lbCdcbiAgICovXG4gIHBhbmVsQ2xhc3M6ICd0YWJzLXBhbmVsJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGNvbnRlbnQgY29udGFpbmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1hY3RpdmUnXG4gICAqL1xuICBwYW5lbEFjdGl2ZUNsYXNzOiAnaXMtYWN0aXZlJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRhYnMsICdUYWJzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb2dnbGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b2dnbGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvZ2dsZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUb2dnbGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvZ2dsZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvZ2dsZXIuZGVmYXVsdHMsIGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLmNsYXNzTmFtZSA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9nZ2xlcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBUb2dnbGVyIHBsdWdpbiBieSBwYXJzaW5nIHRoZSB0b2dnbGUgY2xhc3MgZnJvbSBkYXRhLXRvZ2dsZXIsIG9yIGFuaW1hdGlvbiBjbGFzc2VzIGZyb20gZGF0YS1hbmltYXRlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpbnB1dDtcbiAgICAvLyBQYXJzZSBhbmltYXRpb24gY2xhc3NlcyBpZiB0aGV5IHdlcmUgc2V0XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XG5cbiAgICAgIHRoaXMuYW5pbWF0aW9uSW4gPSBpbnB1dFswXTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCBwYXJzZSB0b2dnbGUgY2xhc3NcbiAgICBlbHNlIHtcbiAgICAgIGlucHV0ID0gdGhpcy4kZWxlbWVudC5kYXRhKCd0b2dnbGVyJyk7XG4gICAgICAvLyBBbGxvdyBmb3IgYSAuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZ1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBpbnB1dFswXSA9PT0gJy4nID8gaW5wdXQuc2xpY2UoMSkgOiBpbnB1dDtcbiAgICB9XG5cbiAgICAvLyBBZGQgQVJJQSBhdHRyaWJ1dGVzIHRvIHRyaWdnZXJzXG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZDtcbiAgICAkKGBbZGF0YS1vcGVuPVwiJHtpZH1cIl0sIFtkYXRhLWNsb3NlPVwiJHtpZH1cIl0sIFtkYXRhLXRvZ2dsZT1cIiR7aWR9XCJdYClcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuICAgIC8vIElmIHRoZSB0YXJnZXQgaXMgaGlkZGVuLCBhZGQgYXJpYS1oaWRkZW5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykgPyBmYWxzZSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIHRvZ2dsZSB0cmlnZ2VyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ3RvZ2dsZS56Zi50cmlnZ2VyJykub24oJ3RvZ2dsZS56Zi50cmlnZ2VyJywgdGhpcy50b2dnbGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgdGFyZ2V0IGNsYXNzIG9uIHRoZSB0YXJnZXQgZWxlbWVudC4gQW4gZXZlbnQgaXMgZmlyZWQgZnJvbSB0aGUgb3JpZ2luYWwgdHJpZ2dlciBkZXBlbmRpbmcgb24gaWYgdGhlIHJlc3VsdGFudCBzdGF0ZSB3YXMgXCJvblwiIG9yIFwib2ZmXCIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvZmZcbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICB0aGlzWyB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA/ICdfdG9nZ2xlQW5pbWF0ZScgOiAnX3RvZ2dsZUNsYXNzJ10oKTtcbiAgfVxuXG4gIF90b2dnbGVDbGFzcygpIHtcbiAgICB0aGlzLiRlbGVtZW50LnRvZ2dsZUNsYXNzKHRoaXMuY2xhc3NOYW1lKTtcblxuICAgIHZhciBpc09uID0gdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG4gICAgaWYgKGlzT24pIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGhhcyB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvblxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29mZlxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlQVJJQShpc09uKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gIH1cblxuICBfdG9nZ2xlQW5pbWF0ZSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uSW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQSh0cnVlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvbi56Zi50b2dnbGVyJyk7XG4gICAgICAgIHRoaXMuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25PdXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQShmYWxzZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICAgICAgdGhpcy5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgX3VwZGF0ZUFSSUEoaXNPbikge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIGlzT24gPyB0cnVlIDogZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiBUb2dnbGVyIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50b2dnbGVyJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvZ2dsZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUZWxscyB0aGUgcGx1Z2luIGlmIHRoZSBlbGVtZW50IHNob3VsZCBhbmltYXRlZCB3aGVuIHRvZ2dsZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9nZ2xlciwgJ1RvZ2dsZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvb2x0aXAgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvb2x0aXBcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb29sdGlwIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBUb29sdGlwLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvb2x0aXAjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIGEgdG9vbHRpcCB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvYmplY3QgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvb2x0aXAuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRvb2x0aXAgYnkgc2V0dGluZyB0aGUgY3JlYXRpbmcgdGhlIHRpcCBlbGVtZW50LCBhZGRpbmcgaXQncyB0ZXh0LCBzZXR0aW5nIHByaXZhdGUgdmFyaWFibGVzIGFuZCBzZXR0aW5nIGF0dHJpYnV0ZXMgb24gdGhlIGFuY2hvci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlbGVtSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICd0b29sdGlwJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzIHx8IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zLnRpcFRleHQgPSB0aGlzLm9wdGlvbnMudGlwVGV4dCB8fCB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZSA/ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKSA6IHRoaXMuX2J1aWxkVGVtcGxhdGUoZWxlbUlkKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dIdG1sKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC5odG1sKHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC50ZXh0KHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAndGl0bGUnOiAnJyxcbiAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogZWxlbUlkLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXG4gICAgICAnZGF0YS10b2dnbGUnOiBlbGVtSWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiBlbGVtSWRcbiAgICB9KS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMudHJpZ2dlckNsYXNzKTtcblxuICAgIC8vaGVscGVyIHZhcmlhYmxlcyB0byB0cmFjayBtb3ZlbWVudCBvbiBjb2xsaXNpb25zXG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogR3JhYnMgdGhlIGN1cnJlbnQgcG9zaXRpb25pbmcgY2xhc3MsIGlmIHByZXNlbnQsIGFuZCByZXR1cm5zIHRoZSB2YWx1ZSBvciBhbiBlbXB0eSBzdHJpbmcuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0UG9zaXRpb25DbGFzcyhlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50KSB7IHJldHVybiAnJzsgfVxuICAgIC8vIHZhciBwb3NpdGlvbiA9IGVsZW1lbnQuYXR0cignY2xhc3MnKS5tYXRjaCgvdG9wfGxlZnR8cmlnaHQvZyk7XG4gICAgdmFyIHBvc2l0aW9uID0gZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goL1xcYih0b3B8bGVmdHxyaWdodClcXGIvZyk7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gPyBwb3NpdGlvblswXSA6ICcnO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcbiAgLyoqXG4gICAqIGJ1aWxkcyB0aGUgdG9vbHRpcCBlbGVtZW50LCBhZGRzIGF0dHJpYnV0ZXMsIGFuZCByZXR1cm5zIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9idWlsZFRlbXBsYXRlKGlkKSB7XG4gICAgdmFyIHRlbXBsYXRlQ2xhc3NlcyA9IChgJHt0aGlzLm9wdGlvbnMudG9vbHRpcENsYXNzfSAke3RoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzfSAke3RoaXMub3B0aW9ucy50ZW1wbGF0ZUNsYXNzZXN9YCkudHJpbSgpO1xuICAgIHZhciAkdGVtcGxhdGUgPSAgJCgnPGRpdj48L2Rpdj4nKS5hZGRDbGFzcyh0ZW1wbGF0ZUNsYXNzZXMpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndG9vbHRpcCcsXG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2UsXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICByZXR1cm4gJHRlbXBsYXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uaW5nIGNsYXNzIHRvIHRyeVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xuXG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygndG9wJyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldHMgdGhlIHBvc2l0aW9uIGNsYXNzIG9mIGFuIGVsZW1lbnQgYW5kIHJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB1bnRpbCB0aGVyZSBhcmUgbm8gbW9yZSBwb3NzaWJsZSBwb3NpdGlvbnMgdG8gYXR0ZW1wdCwgb3IgdGhlIHRvb2x0aXAgZWxlbWVudCBpcyBubyBsb25nZXIgY29sbGlkaW5nLlxuICAgKiBpZiB0aGUgdG9vbHRpcCBpcyBsYXJnZXIgdGhhbiB0aGUgc2NyZWVuIHdpZHRoLCBkZWZhdWx0IHRvIGZ1bGwgd2lkdGggLSBhbnkgdXNlciBzZWxlY3RlZCBtYXJnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkdGlwRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQsXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICgoJHRpcERpbXMud2lkdGggPj0gJHRpcERpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkpKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgIC8vIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6ICRhbmNob3JEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCdjZW50ZXIgJyArIChwb3NpdGlvbiB8fCAnYm90dG9tJyksIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xuXG4gICAgd2hpbGUoIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkgJiYgdGhpcy5jb3VudGVyKSB7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHJldmVhbHMgdGhlIHRvb2x0aXAsIGFuZCBmaXJlcyBhbiBldmVudCB0byBjbG9zZSBhbnkgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNjbG9zZW1lXG4gICAqIEBmaXJlcyBUb29sdGlwI3Nob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd09uICE9PSAnYWxsJyAmJiAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmlzKHRoaXMub3B0aW9ucy5zaG93T24pKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKCdUaGUgc2NyZWVuIGlzIHRvbyBzbWFsbCB0byBkaXNwbGF5IHRoaXMgdG9vbHRpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuc2hvdygpO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBhbGwgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYudG9vbHRpcCcsIHRoaXMudGVtcGxhdGUuYXR0cignaWQnKSk7XG5cblxuICAgIHRoaXMudGVtcGxhdGUuYXR0cih7XG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2VcbiAgICB9KTtcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy50ZW1wbGF0ZSk7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuaGlkZSgpLmNzcygndmlzaWJpbGl0eScsICcnKS5mYWRlSW4odGhpcy5vcHRpb25zLmZhZGVJbkR1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxuICAgICAqIEBldmVudCBUb29sdGlwI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBjdXJyZW50IHRvb2x0aXAsIGFuZCByZXNldHMgdGhlIHBvc2l0aW9uaW5nIGNsYXNzIGlmIGl0IHdhcyBjaGFuZ2VkIGR1ZSB0byBjb2xsaXNpb25cbiAgICogQGZpcmVzIFRvb2x0aXAjaGlkZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZVxuICAgIH0pLmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVPdXREdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgaWYgKF90aGlzLmNsYXNzQ2hhbmdlZCkge1xuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxuICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhfdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyhfdGhpcy50ZW1wbGF0ZSkpXG4gICAgICAgICAgICAgLmFkZENsYXNzKF90aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICBfdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgICAgX3RoaXMuY291bnRlciA9IDQ7XG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogZmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBoaWRkZW5cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNoaWRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgdGhlIHRvb2x0aXAgYW5kIGl0cyBhbmNob3JcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICR0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXIuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICBpZiAoIWlzRm9jdXMgfHwgKF90aGlzLmlzQ2xpY2sgJiYgIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xuICAgICAgICAgIC8vIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoKF90aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyIHx8ICFfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpKSAmJiAhX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRm9yVG91Y2gpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgX3RoaXMuaXNBY3RpdmUgPyBfdGhpcy5oaWRlKCkgOiBfdGhpcy5zaG93KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAvLyAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSB0cnVlO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxuICAgICAgICAgIC8vIGEgcmVhbCBmb2N1cywgb3RoZXJ3aXNlIG9uIGhvdmVyIGFuZCBjb21lIGJhY2sgd2UgZ2V0IGJhZCBiZWhhdmlvclxuICAgICAgICAgIGlmKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyBpc0ZvY3VzID0gZmFsc2U7IH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICB9KVxuXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgYSB0b2dnbGUgbWV0aG9kLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhdGljIHNob3coKSAmIGhpZGUoKSBmdW5jdGlvbnNcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgdG9vbHRpcCwgcmVtb3ZlcyB0ZW1wbGF0ZSBlbGVtZW50IGZyb20gdGhlIHZpZXcuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXG4gICAgICAgICAgICAgICAgIC5vZmYoJy56Zi50cmlnZ2VyIC56Zi50b29sdGlwJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwIHRvcCByaWdodCBsZWZ0JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtZGVzY3JpYmVkYnkgYXJpYS1oYXNwb3B1cCBkYXRhLWRpc2FibGUtaG92ZXIgZGF0YS1yZXNpemUgZGF0YS10b2dnbGUgZGF0YS10b29sdGlwIGRhdGEteWV0aS1ib3gnKTtcblxuICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlKCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9vbHRpcC5kZWZhdWx0cyA9IHtcbiAgZGlzYWJsZUZvclRvdWNoOiBmYWxzZSxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBiZWZvcmUgYSB0b29sdGlwIHNob3VsZCBvcGVuIG9uIGhvdmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDIwMFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIGludG8gdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxNTBcbiAgICovXG4gIGZhZGVJbkR1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgb3V0IG9mIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTUwXG4gICAqL1xuICBmYWRlT3V0RHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIERpc2FibGVzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgdGhlIHRvb2x0aXAgaWYgc2V0IHRvIHRydWVcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZUhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIE9wdGlvbmFsIGFkZHRpb25hbCBjbGFzc2VzIHRvIGFwcGx5IHRvIHRoZSB0b29sdGlwIHRlbXBsYXRlIG9uIGluaXQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ215LWNvb2wtdGlwLWNsYXNzJ1xuICAgKi9cbiAgdGVtcGxhdGVDbGFzc2VzOiAnJyxcbiAgLyoqXG4gICAqIE5vbi1vcHRpb25hbCBjbGFzcyBhZGRlZCB0byB0b29sdGlwIHRlbXBsYXRlcy4gRm91bmRhdGlvbiBkZWZhdWx0IGlzICd0b29sdGlwJy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9vbHRpcCdcbiAgICovXG4gIHRvb2x0aXBDbGFzczogJ3Rvb2x0aXAnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgdG9vbHRpcCBhbmNob3IgZWxlbWVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaGFzLXRpcCdcbiAgICovXG4gIHRyaWdnZXJDbGFzczogJ2hhcy10aXAnLFxuICAvKipcbiAgICogTWluaW11bSBicmVha3BvaW50IHNpemUgYXQgd2hpY2ggdG8gb3BlbiB0aGUgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc21hbGwnXG4gICAqL1xuICBzaG93T246ICdzbWFsbCcsXG4gIC8qKlxuICAgKiBDdXN0b20gdGVtcGxhdGUgdG8gYmUgdXNlZCB0byBnZW5lcmF0ZSBtYXJrdXAgZm9yIHRvb2x0aXAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgY2xhc3M9XCJ0b29sdGlwXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgdGVtcGxhdGU6ICcnLFxuICAvKipcbiAgICogVGV4dCBkaXNwbGF5ZWQgaW4gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnU29tZSBjb29sIHNwYWNlIGZhY3QgaGVyZS4nXG4gICAqL1xuICB0aXBUZXh0OiAnJyxcbiAgdG91Y2hDbG9zZVRleHQ6ICdUYXAgdG8gY2xvc2UuJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdG9vbHRpcCB0byByZW1haW4gb3BlbiBpZiB0cmlnZ2VyZWQgd2l0aCBhIGNsaWNrIG9yIHRvdWNoIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrT3BlbjogdHJ1ZSxcbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgcG9zaXRpb25pbmcgY2xhc3Nlcywgc2V0IGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b3AnXG4gICAqL1xuICBwb3NpdGlvbkNsYXNzOiAnJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgcHVzaCBhd2F5IGZyb20gdGhlIGFuY2hvciBvbiB0aGUgWSBheGlzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICB2T2Zmc2V0OiAxMCxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgcHVzaCBhd2F5IGZyb20gdGhlIGFuY2hvciBvbiB0aGUgWCBheGlzLCBpZiBhbGlnbmVkIHRvIGEgc2lkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMlxuICAgKi9cbiAgaE9mZnNldDogMTIsXG4gICAgLyoqXG4gICAqIEFsbG93IEhUTUwgaW4gdG9vbHRpcC4gV2FybmluZzogSWYgeW91IGFyZSBsb2FkaW5nIHVzZXItZ2VuZXJhdGVkIGNvbnRlbnQgaW50byB0b29sdGlwcyxcbiAgICogYWxsb3dpbmcgSFRNTCBtYXkgb3BlbiB5b3Vyc2VsZiB1cCB0byBYU1MgYXR0YWNrcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYWxsb3dIdG1sOiBmYWxzZVxufTtcblxuLyoqXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcbiAqL1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9vbHRpcCwgJ1Rvb2x0aXAnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVBY2NvcmRpb25UYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlQWNjb3JkaW9uVGFic1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi50YWJzXG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgYWNjb3JkaW9uIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtYWNjb3JkaW9uLXRhYnMnKTtcbiAgICB0aGlzLmN1cnJlbnRNcSA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbnVsbDtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuYXR0cignaWQnKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcsRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAncmVzcG9uc2l2ZWFjY29yZGlvbnRhYnMnKSk7XG4gICAgfTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVBY2NvcmRpb25UYWJzJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1lbnUgYnkgcGFyc2luZyB0aGUgY2xhc3NlcyBmcm9tIHRoZSAnZGF0YS1yZXNwb25zaXZlLWFjY29yZGlvbi10YWJzJyBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xuICAgIGlmICh0eXBlb2YgdGhpcy5ydWxlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBydWxlc1RyZWUgPSB7fTtcblxuICAgICAgLy8gUGFyc2UgcnVsZXMgZnJvbSBcImNsYXNzZXNcIiBwdWxsZWQgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgbGV0IHJ1bGVzID0gdGhpcy5ydWxlcy5zcGxpdCgnICcpO1xuXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZXZlcnkgcnVsZSBmb3VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGxldCBydWxlU2l6ZSA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMF0gOiAnc21hbGwnO1xuICAgICAgICBsZXQgcnVsZVBsdWdpbiA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMV0gOiBydWxlWzBdO1xuXG4gICAgICAgIGlmIChNZW51UGx1Z2luc1tydWxlUGx1Z2luXSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJ1bGVzVHJlZVtydWxlU2l6ZV0gPSBNZW51UGx1Z2luc1tydWxlUGx1Z2luXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xuICAgIH1cblxuICAgIHRoaXMuX2dldEFsbE9wdGlvbnMoKTtcblxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XG4gICAgICB0aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRBbGxPcHRpb25zKCkge1xuICAgIC8vZ2V0IGFsbCBkZWZhdWx0cyBhbmQgb3B0aW9uc1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgX3RoaXMuYWxsT3B0aW9ucyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBNZW51UGx1Z2lucykge1xuICAgICAgaWYgKE1lbnVQbHVnaW5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFyIG9iaiA9IE1lbnVQbHVnaW5zW2tleV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIGR1bW15UGx1Z2luID0gJCgnPHVsPjwvdWw+Jyk7XG4gICAgICAgICAgdmFyIHRtcFBsdWdpbiA9IG5ldyBvYmoucGx1Z2luKGR1bW15UGx1Z2luLF90aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIGZvciAodmFyIGtleUtleSBpbiB0bXBQbHVnaW4ub3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKHRtcFBsdWdpbi5vcHRpb25zLmhhc093blByb3BlcnR5KGtleUtleSkgJiYga2V5S2V5ICE9PSAnemZQbHVnaW4nKSB7XG4gICAgICAgICAgICAgIHZhciBvYmpPYmogPSB0bXBQbHVnaW4ub3B0aW9uc1trZXlLZXldO1xuICAgICAgICAgICAgICBfdGhpcy5hbGxPcHRpb25zW2tleUtleV0gPSBvYmpPYmo7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRtcFBsdWdpbi5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSkge1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBzY3JlZW4gd2lkdGggYWdhaW5zdCBhdmFpbGFibGUgbWVkaWEgcXVlcmllcy4gSWYgdGhlIG1lZGlhIHF1ZXJ5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIHBsdWdpbiBuZWVkZWQgaGFzIGNoYW5nZWQsIHRoZSBwbHVnaW5zIHdpbGwgc3dhcCBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xuICAgIHZhciBtYXRjaGVkTXEsIF90aGlzID0gdGhpcztcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlIGFuZCBmaW5kIHRoZSBsYXN0IG1hdGNoaW5nIHJ1bGVcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3Qoa2V5KSkge1xuICAgICAgICBtYXRjaGVkTXEgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxuICAgIGlmICghbWF0Y2hlZE1xKSByZXR1cm47XG5cbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4gaW5zdGFuY2VvZiB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKSByZXR1cm47XG5cbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXG4gICAgJC5lYWNoKE1lbnVQbHVnaW5zLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh2YWx1ZS5jc3NDbGFzcyk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIENTUyBjbGFzcyBmb3IgdGhlIG5ldyBwbHVnaW5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIG5ldyBwbHVnaW5cbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB7XG4gICAgICAvL2Rvbid0IGtub3cgd2h5IGJ1dCBvbiBuZXN0ZWQgZWxlbWVudHMgZGF0YSB6ZlBsdWdpbiBnZXQncyBsb3N0XG4gICAgICBpZiAoIXRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpICYmIHRoaXMuc3RvcmV6ZkRhdGEpIHRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsdGhpcy5zdG9yZXpmRGF0YSk7XG4gICAgICB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgIH1cbiAgICB0aGlzLl9oYW5kbGVNYXJrdXAodGhpcy5ydWxlc1ttYXRjaGVkTXFdLmNzc0NsYXNzKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gICAgdGhpcy5zdG9yZXpmRGF0YSA9IHRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpO1xuXG4gIH1cblxuICBfaGFuZGxlTWFya3VwKHRvU2V0KXtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLCBmcm9tU3RyaW5nID0gJ2FjY29yZGlvbic7XG4gICAgdmFyICRwYW5lbHMgPSAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9Jyt0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykrJ10nKTtcbiAgICBpZiAoJHBhbmVscy5sZW5ndGgpIGZyb21TdHJpbmcgPSAndGFicyc7XG4gICAgaWYgKGZyb21TdHJpbmcgPT09IHRvU2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIHZhciB0YWJzVGl0bGUgPSBfdGhpcy5hbGxPcHRpb25zLmxpbmtDbGFzcz9fdGhpcy5hbGxPcHRpb25zLmxpbmtDbGFzczondGFicy10aXRsZSc7XG4gICAgdmFyIHRhYnNQYW5lbCA9IF90aGlzLmFsbE9wdGlvbnMucGFuZWxDbGFzcz9fdGhpcy5hbGxPcHRpb25zLnBhbmVsQ2xhc3M6J3RhYnMtcGFuZWwnO1xuXG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVBdHRyKCdyb2xlJyk7XG4gICAgdmFyICRsaUhlYWRzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLicrdGFic1RpdGxlKycsW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJykucmVtb3ZlQ2xhc3ModGFic1RpdGxlKS5yZW1vdmVDbGFzcygnYWNjb3JkaW9uLWl0ZW0nKS5yZW1vdmVBdHRyKCdkYXRhLWFjY29yZGlvbi1pdGVtJyk7XG4gICAgdmFyICRsaUhlYWRzQSA9ICRsaUhlYWRzLmNoaWxkcmVuKCdhJykucmVtb3ZlQ2xhc3MoJ2FjY29yZGlvbi10aXRsZScpO1xuXG4gICAgaWYgKGZyb21TdHJpbmcgPT09ICd0YWJzJykge1xuICAgICAgJHBhbmVscyA9ICRwYW5lbHMuY2hpbGRyZW4oJy4nK3RhYnNQYW5lbCkucmVtb3ZlQ2xhc3ModGFic1BhbmVsKS5yZW1vdmVBdHRyKCdyb2xlJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxhYmVsbGVkYnknKTtcbiAgICAgICRwYW5lbHMuY2hpbGRyZW4oJ2EnKS5yZW1vdmVBdHRyKCdyb2xlJykucmVtb3ZlQXR0cignYXJpYS1jb250cm9scycpLnJlbW92ZUF0dHIoJ2FyaWEtc2VsZWN0ZWQnKTtcbiAgICB9ZWxzZXtcbiAgICAgICRwYW5lbHMgPSAkbGlIZWFkcy5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJykucmVtb3ZlQ2xhc3MoJ2FjY29yZGlvbi1jb250ZW50Jyk7XG4gICAgfTtcblxuICAgICRwYW5lbHMuY3NzKHtkaXNwbGF5OicnLHZpc2liaWxpdHk6Jyd9KTtcbiAgICAkbGlIZWFkcy5jc3Moe2Rpc3BsYXk6JycsdmlzaWJpbGl0eTonJ30pO1xuICAgIGlmICh0b1NldCA9PT0gJ2FjY29yZGlvbicpIHtcbiAgICAgICRwYW5lbHMuZWFjaChmdW5jdGlvbihrZXksdmFsdWUpe1xuICAgICAgICAkKHZhbHVlKS5hcHBlbmRUbygkbGlIZWFkcy5nZXQoa2V5KSkuYWRkQ2xhc3MoJ2FjY29yZGlvbi1jb250ZW50JykuYXR0cignZGF0YS10YWItY29udGVudCcsJycpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKS5jc3Moe2hlaWdodDonJ30pO1xuICAgICAgICAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9JytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKyddJykuYWZ0ZXIoJzxkaXYgaWQ9XCJ0YWJzLXBsYWNlaG9sZGVyLScrX3RoaXMuJGVsZW1lbnQuYXR0cignaWQnKSsnXCI+PC9kaXY+JykucmVtb3ZlKCk7XG4gICAgICAgICRsaUhlYWRzLmFkZENsYXNzKCdhY2NvcmRpb24taXRlbScpLmF0dHIoJ2RhdGEtYWNjb3JkaW9uLWl0ZW0nLCcnKTtcbiAgICAgICAgJGxpSGVhZHNBLmFkZENsYXNzKCdhY2NvcmRpb24tdGl0bGUnKTtcbiAgICAgIH0pO1xuICAgIH1lbHNlIGlmICh0b1NldCA9PT0gJ3RhYnMnKXtcbiAgICAgIHZhciAkdGFic0NvbnRlbnQgPSAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9JytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKyddJyk7XG4gICAgICB2YXIgJHBsYWNlaG9sZGVyID0gJCgnI3RhYnMtcGxhY2Vob2xkZXItJytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcbiAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICR0YWJzQ29udGVudCA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJzLWNvbnRlbnRcIj48L2Rpdj4nKS5pbnNlcnRBZnRlcigkcGxhY2Vob2xkZXIpLmF0dHIoJ2RhdGEtdGFicy1jb250ZW50JyxfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcbiAgICAgICAgJHBsYWNlaG9sZGVyLnJlbW92ZSgpO1xuICAgICAgfWVsc2V7XG4gICAgICAgICR0YWJzQ29udGVudCA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJzLWNvbnRlbnRcIj48L2Rpdj4nKS5pbnNlcnRBZnRlcihfdGhpcy4kZWxlbWVudCkuYXR0cignZGF0YS10YWJzLWNvbnRlbnQnLF90aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgICAgfTtcbiAgICAgICRwYW5lbHMuZWFjaChmdW5jdGlvbihrZXksdmFsdWUpe1xuICAgICAgICB2YXIgdGVtcFZhbHVlID0gJCh2YWx1ZSkuYXBwZW5kVG8oJHRhYnNDb250ZW50KS5hZGRDbGFzcyh0YWJzUGFuZWwpO1xuICAgICAgICB2YXIgaGFzaCA9ICRsaUhlYWRzQS5nZXQoa2V5KS5oYXNoLnNsaWNlKDEpO1xuICAgICAgICB2YXIgaWQgPSAkKHZhbHVlKS5hdHRyKCdpZCcpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjY29yZGlvbicpO1xuICAgICAgICBpZiAoaGFzaCAhPT0gaWQpIHtcbiAgICAgICAgICBpZiAoaGFzaCAhPT0gJycpIHtcbiAgICAgICAgICAgICQodmFsdWUpLmF0dHIoJ2lkJyxoYXNoKTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGhhc2ggPSBpZDtcbiAgICAgICAgICAgICQodmFsdWUpLmF0dHIoJ2lkJyxoYXNoKTtcbiAgICAgICAgICAgICQoJGxpSGVhZHNBLmdldChrZXkpKS5hdHRyKCdocmVmJywkKCRsaUhlYWRzQS5nZXQoa2V5KSkuYXR0cignaHJlZicpLnJlcGxhY2UoJyMnLCcnKSsnIycraGFzaCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGlzQWN0aXZlID0gJCgkbGlIZWFkcy5nZXQoa2V5KSkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICBpZiAoaXNBY3RpdmUpIHtcbiAgICAgICAgICB0ZW1wVmFsdWUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICAkbGlIZWFkcy5hZGRDbGFzcyh0YWJzVGl0bGUpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4pIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVBY2NvcmRpb25UYWJzJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVBY2NvcmRpb25UYWJzLmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICB0YWJzOiB7XG4gICAgY3NzQ2xhc3M6ICd0YWJzJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnMudGFicyB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnMuYWNjb3JkaW9uIHx8IG51bGxcbiAgfVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVBY2NvcmRpb25UYWJzLCAnUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cpXG4gICAgRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG59KSgpO1xuXG52YXIgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG4vLyBGaW5kIHRoZSByaWdodCBcInRyYW5zaXRpb25lbmRcIiBldmVudCBmb3IgdGhpcyBicm93c2VyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gIH1cbiAgdmFyIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cmFuc2l0aW9uc1t0XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgaWYgKGVuZEV2ZW50ID09PSBudWxsKSB7XG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XG4gICAgY2IoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuICBlbGVtZW50LmFkZENsYXNzKGFuaW1hdGlvbik7XG4gIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudC5jc3MoJ3RyYW5zaXRpb24nLCAnJyk7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZSgndHJhbnNpdGlvbmVuZCcsIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoaW5pdENsYXNzICsgJyAnICsgYWN0aXZlQ2xhc3MgKyAnICcgKyBhbmltYXRpb24pO1xuICB9XG59XG5cbnZhciBNb3Rpb25VSSA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cbiIsIi8vIGdGb3JtcyB2YWxpZGF0aW9uXG4oZnVuY3Rpb24oJCkge1xuXHRpZiAoJCgnLmdmb3JtX3dyYXBwZXInKS5sZW5ndGgpIHtcblx0XHR2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG5cdFx0JGJvZHkub24oJ2NsaWNrJywgJ2lucHV0LHRleHRhcmVhJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRoaWRlRXJyb3JzKCQodGhpcykpO1xuXHRcdH0pO1xuXHRcdCRib2R5Lm9uKCdjbGljaycsICcudmFsaWRhdGlvbl9tZXNzYWdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMpLmhpZGUoKTtcblx0XHRcdGhpZGVFcnJvcnMoJCh0aGlzKSk7XG5cdFx0fSk7XG5cdH1cblx0ZnVuY3Rpb24gaGlkZUVycm9ycygkZWwpIHtcblx0XHQkZWwuY2xvc2VzdCgnbGkuZ2ZpZWxkX2Vycm9yJykucmVtb3ZlQ2xhc3MoJ2dmaWVsZF9lcnJvcicpO1xuXHRcdCRlbC5jbG9zZXN0KCdkaXYuZ2lucHV0X2NvbnRhaW5lcicpLm5leHQoJ2Rpdi52YWxpZGF0aW9uX21lc3NhZ2UnKS5oaWRlKCk7XG5cdH1cbn0pKGpRdWVyeSk7XG4iLCJqUXVlcnkoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcbiIsIi8qIFN0aWNreSBGb290ZXIgKi9cblxuKGZ1bmN0aW9uKCQpIHtcblxuICB2YXIgJGZvb3RlciA9ICQoJyNmb290ZXItY29udGFpbmVyJyk7IC8vIG9ubHkgc2VhcmNoIG9uY2VcblxuICAkKHdpbmRvdykuYmluZCgnbG9hZCByZXNpemUgb3JpZW50YXRpb25DaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgcG9zID0gJGZvb3Rlci5wb3NpdGlvbigpLFxuICAgICAgICBoZWlnaHQgPSAoJCh3aW5kb3cpLmhlaWdodCgpIC0gcG9zLnRvcCkgLSAoJGZvb3Rlci5oZWlnaHQoKSAtMSk7XG5cbiAgICBpZiAoaGVpZ2h0ID4gMCkge1xuICAgICAgICRmb290ZXIuY3NzKCdtYXJnaW4tdG9wJywgaGVpZ2h0KTtcbiAgICB9XG5cbiAgfSk7XG5cbn0pKGpRdWVyeSk7XG4iLG51bGxdfQ==
