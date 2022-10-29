/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/3d-view-controls/camera.js":
/*!*************************************************!*\
  !*** ./node_modules/3d-view-controls/camera.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = createCamera

var now         = __webpack_require__(/*! right-now */ "./node_modules/right-now/browser.js")
var createView  = __webpack_require__(/*! 3d-view */ "./node_modules/3d-view/view.js")
var mouseChange = __webpack_require__(/*! mouse-change */ "./node_modules/mouse-change/mouse-listen.js")
var mouseWheel  = __webpack_require__(/*! mouse-wheel */ "./node_modules/mouse-wheel/wheel.js")
var mouseOffset = __webpack_require__(/*! mouse-event-offset */ "./node_modules/mouse-event-offset/index.js")
var hasPassive  = __webpack_require__(/*! has-passive-events */ "./node_modules/has-passive-events/index.js")

function createCamera(element, options) {
  element = element || document.body
  options = options || {}

  var limits  = [ 0.01, Infinity ]
  if('distanceLimits' in options) {
    limits[0] = options.distanceLimits[0]
    limits[1] = options.distanceLimits[1]
  }
  if('zoomMin' in options) {
    limits[0] = options.zoomMin
  }
  if('zoomMax' in options) {
    limits[1] = options.zoomMax
  }

  var view = createView({
    center: options.center || [0,0,0],
    up:     options.up     || [0,1,0],
    eye:    options.eye    || [0,0,10],
    mode:   options.mode   || 'orbit',
    distanceLimits: limits
  })

  var pmatrix = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  var distance = 0.0
  var width   = element.clientWidth
  var height  = element.clientHeight

  var camera = {
    view:               view,
    element:            element,
    delay:              options.delay          || 16,
    rotateSpeed:        options.rotateSpeed    || 1,
    zoomSpeed:          options.zoomSpeed      || 1,
    translateSpeed:     options.translateSpeed || 1,
    flipX:              !!options.flipX,
    flipY:              !!options.flipY,
    modes:              view.modes,
    tick: function() {
      var t = now()
      var delay = this.delay
      view.idle(t-delay)
      view.flush(t-(100+delay*2))
      var ctime = t - 2 * delay
      view.recalcMatrix(ctime)
      var allEqual = true
      var matrix = view.computedMatrix
      for(var i=0; i<16; ++i) {
        allEqual = allEqual && (pmatrix[i] === matrix[i])
        pmatrix[i] = matrix[i]
      }
      var sizeChanged =
          element.clientWidth === width &&
          element.clientHeight === height
      width  = element.clientWidth
      height = element.clientHeight
      if(allEqual) {
        return !sizeChanged
      }
      distance = Math.exp(view.computedRadius[0])
      return true
    },
    lookAt: function(center, eye, up) {
      view.lookAt(view.lastT(), center, eye, up)
    },
    rotate: function(pitch, yaw, roll) {
      view.rotate(view.lastT(), pitch, yaw, roll)
    },
    pan: function(dx, dy, dz) {
      view.pan(view.lastT(), dx, dy, dz)
    },
    translate: function(dx, dy, dz) {
      view.translate(view.lastT(), dx, dy, dz)
    }
  }

  Object.defineProperties(camera, {
    matrix: {
      get: function() {
        return view.computedMatrix
      },
      set: function(mat) {
        view.setMatrix(view.lastT(), mat)
        return view.computedMatrix
      },
      enumerable: true
    },
    mode: {
      get: function() {
        return view.getMode()
      },
      set: function(mode) {
        view.setMode(mode)
        return view.getMode()
      },
      enumerable: true
    },
    center: {
      get: function() {
        return view.computedCenter
      },
      set: function(ncenter) {
        view.lookAt(view.lastT(), ncenter)
        return view.computedCenter
      },
      enumerable: true
    },
    eye: {
      get: function() {
        return view.computedEye
      },
      set: function(neye) {
        view.lookAt(view.lastT(), null, neye)
        return view.computedEye
      },
      enumerable: true
    },
    up: {
      get: function() {
        return view.computedUp
      },
      set: function(nup) {
        view.lookAt(view.lastT(), null, null, nup)
        return view.computedUp
      },
      enumerable: true
    },
    distance: {
      get: function() {
        return distance
      },
      set: function(d) {
        view.setDistance(view.lastT(), d)
        return d
      },
      enumerable: true
    },
    distanceLimits: {
      get: function() {
        return view.getDistanceLimits(limits)
      },
      set: function(v) {
        view.setDistanceLimits(v)
        return v
      },
      enumerable: true
    }
  })

  element.addEventListener('contextmenu', function(ev) {
    ev.preventDefault()
    return false
  })

  var lastX = 0, lastY = 0, lastMods = {shift: false, control: false, alt: false, meta: false}
  mouseChange(element, handleInteraction)

  //enable simple touch interactions
  element.addEventListener('touchstart', function (ev) {
    var xy = mouseOffset(ev.changedTouches[0], element)
    handleInteraction(0, xy[0], xy[1], lastMods)
    handleInteraction(1, xy[0], xy[1], lastMods)

    ev.preventDefault()
  }, hasPassive ? {passive: false} : false)

  element.addEventListener('touchmove', function (ev) {
    var xy = mouseOffset(ev.changedTouches[0], element)
    handleInteraction(1, xy[0], xy[1], lastMods)

    ev.preventDefault()
  }, hasPassive ? {passive: false} : false)

  element.addEventListener('touchend', function (ev) {
    var xy = mouseOffset(ev.changedTouches[0], element)
    handleInteraction(0, lastX, lastY, lastMods)

    ev.preventDefault()
  }, hasPassive ? {passive: false} : false)

  function handleInteraction (buttons, x, y, mods) {
    var scale = 1.0 / element.clientHeight
    var dx    = scale * (x - lastX)
    var dy    = scale * (y - lastY)

    var flipX = camera.flipX ? 1 : -1
    var flipY = camera.flipY ? 1 : -1

    var drot  = Math.PI * camera.rotateSpeed

    var t = now()

    if(buttons & 1) {
      if(mods.shift) {
        view.rotate(t, 0, 0, -dx * drot)
      } else {
        view.rotate(t, flipX * drot * dx, -flipY * drot * dy, 0)
      }
    } else if(buttons & 2) {
      view.pan(t, -camera.translateSpeed * dx * distance, camera.translateSpeed * dy * distance, 0)
    } else if(buttons & 4) {
      var kzoom = camera.zoomSpeed * dy / window.innerHeight * (t - view.lastT()) * 50.0
      view.pan(t, 0, 0, distance * (Math.exp(kzoom) - 1))
    }

    lastX = x
    lastY = y
    lastMods = mods
  }

  mouseWheel(element, function(dx, dy, dz) {
    var flipX = camera.flipX ? 1 : -1
    var flipY = camera.flipY ? 1 : -1
    var t = now()
    if(Math.abs(dx) > Math.abs(dy)) {
      view.rotate(t, 0, 0, -dx * flipX * Math.PI * camera.rotateSpeed / window.innerWidth)
    } else {
      var kzoom = camera.zoomSpeed * flipY * dy / window.innerHeight * (t - view.lastT()) / 100.0
      view.pan(t, 0, 0, distance * (Math.exp(kzoom) - 1))
    }
  }, true)

  return camera
}


/***/ }),

/***/ "./node_modules/3d-view/view.js":
/*!**************************************!*\
  !*** ./node_modules/3d-view/view.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = createViewController

var createTurntable = __webpack_require__(/*! turntable-camera-controller */ "./node_modules/turntable-camera-controller/turntable.js")
var createOrbit     = __webpack_require__(/*! orbit-camera-controller */ "./node_modules/orbit-camera-controller/orbit.js")
var createMatrix    = __webpack_require__(/*! matrix-camera-controller */ "./node_modules/matrix-camera-controller/matrix.js")

function ViewController(controllers, mode) {
  this._controllerNames = Object.keys(controllers)
  this._controllerList = this._controllerNames.map(function(n) {
    return controllers[n]
  })
  this._mode   = mode
  this._active = controllers[mode]
  if(!this._active) {
    this._mode   = 'turntable'
    this._active = controllers.turntable
  }
  this.modes = this._controllerNames
  this.computedMatrix = this._active.computedMatrix
  this.computedEye    = this._active.computedEye
  this.computedUp     = this._active.computedUp
  this.computedCenter = this._active.computedCenter
  this.computedRadius = this._active.computedRadius
}

var proto = ViewController.prototype

var COMMON_METHODS = [
  ['flush', 1],
  ['idle', 1],
  ['lookAt', 4],
  ['rotate', 4],
  ['pan', 4],
  ['translate', 4],
  ['setMatrix', 2],
  ['setDistanceLimits', 2],
  ['setDistance', 2]
]

COMMON_METHODS.forEach(function(method) {
  var name = method[0]
  var argNames = []
  for(var i=0; i<method[1]; ++i) {
    argNames.push('a'+i)
  }
  var code = 'var cc=this._controllerList;for(var i=0;i<cc.length;++i){cc[i].'+method[0]+'('+argNames.join()+')}'
  proto[name] = Function.apply(null, argNames.concat(code))
})

proto.recalcMatrix = function(t) {
  this._active.recalcMatrix(t)
}

proto.getDistance = function(t) {
  return this._active.getDistance(t)
}
proto.getDistanceLimits = function(out) {
  return this._active.getDistanceLimits(out)
}

proto.lastT = function() {
  return this._active.lastT()
}

proto.setMode = function(mode) {
  if(mode === this._mode) {
    return
  }
  var idx = this._controllerNames.indexOf(mode)
  if(idx < 0) {
    return
  }
  var prev  = this._active
  var next  = this._controllerList[idx]
  var lastT = Math.max(prev.lastT(), next.lastT())

  prev.recalcMatrix(lastT)
  next.setMatrix(lastT, prev.computedMatrix)
  
  this._active = next
  this._mode   = mode

  //Update matrix properties
  this.computedMatrix = this._active.computedMatrix
  this.computedEye    = this._active.computedEye
  this.computedUp     = this._active.computedUp
  this.computedCenter = this._active.computedCenter
  this.computedRadius = this._active.computedRadius
}

proto.getMode = function() {
  return this._mode
}

function createViewController(options) {
  options = options || {}

  var eye       = options.eye    || [0,0,1]
  var center    = options.center || [0,0,0]
  var up        = options.up     || [0,1,0]
  var limits    = options.distanceLimits || [0, Infinity]
  var mode      = options.mode   || 'turntable'

  var turntable = createTurntable()
  var orbit     = createOrbit()
  var matrix    = createMatrix()

  turntable.setDistanceLimits(limits[0], limits[1])
  turntable.lookAt(0, eye, center, up)
  orbit.setDistanceLimits(limits[0], limits[1])
  orbit.lookAt(0, eye, center, up)
  matrix.setDistanceLimits(limits[0], limits[1])
  matrix.lookAt(0, eye, center, up)

  return new ViewController({
    turntable: turntable,
    orbit: orbit,
    matrix: matrix
  }, mode)
}

/***/ }),

/***/ "./node_modules/binary-search-bounds/search-bounds.js":
/*!************************************************************!*\
  !*** ./node_modules/binary-search-bounds/search-bounds.js ***!
  \************************************************************/
/***/ ((module) => {

"use strict";


function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"]
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){")
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
    }
  } else {
    code.push(";if(", predicate, "){i=m;")
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}")
  } else {
    code.push("h=m-1}else{l=m+1}")
  }
  code.push("}")
  if(earlyOut) {
    code.push("return -1};")
  } else {
    code.push("return i};")
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut),
  compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut),
  compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(a.shape){\
if(typeof(c)==='function'){\
return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
}else{\
return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
}}else{\
if(typeof(c)==='function'){\
return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
}}}\
return dispatchBsearch", suffix].join(""))
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
}


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/site.css":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/site.css ***!
  \************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/cssWithMappingToString.js */ "./node_modules/css-loader/dist/runtime/cssWithMappingToString.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, "body {\n   background-color: black;\n   color: white;\n}\n\n.grid {\n    display: grid;\n    height: calc(100vh - 20px);\n    grid-template-columns: repeat(8, 1fr);\n    grid-template-rows: 100%;\n }\n .grid1 {\n    display: grid;\n    height: 35px;\n    grid-template-columns: repeat(8, 1fr);\n    grid-template-rows: 35px;\n }\n .item1 {\n    grid-column: 1/3;\n }\n .item2 {\n    grid-column: 3/9;\n }\n .item3 {\n    grid-column: 1/4;\n }\n .item4 {\n    grid-column: 4/8;\n }\n\n select, input[type=\"text\"]{\n    width:100%;\n    height:22px;\n    box-sizing:border-box;\n }", "",{"version":3,"sources":["webpack://./src/site.css"],"names":[],"mappings":"AAAA;GACG,uBAAuB;GACvB,YAAY;AACf;;AAEA;IACI,aAAa;IACb,0BAA0B;IAC1B,qCAAqC;IACrC,wBAAwB;CAC3B;CACA;IACG,aAAa;IACb,YAAY;IACZ,qCAAqC;IACrC,wBAAwB;CAC3B;CACA;IACG,gBAAgB;CACnB;CACA;IACG,gBAAgB;CACnB;CACA;IACG,gBAAgB;CACnB;CACA;IACG,gBAAgB;CACnB;;CAEA;IACG,UAAU;IACV,WAAW;IACX,qBAAqB;CACxB","sourcesContent":["body {\n   background-color: black;\n   color: white;\n}\n\n.grid {\n    display: grid;\n    height: calc(100vh - 20px);\n    grid-template-columns: repeat(8, 1fr);\n    grid-template-rows: 100%;\n }\n .grid1 {\n    display: grid;\n    height: 35px;\n    grid-template-columns: repeat(8, 1fr);\n    grid-template-rows: 35px;\n }\n .item1 {\n    grid-column: 1/3;\n }\n .item2 {\n    grid-column: 3/9;\n }\n .item3 {\n    grid-column: 1/4;\n }\n .item4 {\n    grid-column: 4/8;\n }\n\n select, input[type=\"text\"]{\n    width:100%;\n    height:22px;\n    box-sizing:border-box;\n }"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item);

      if (item[2]) {
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join("");
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === "string") {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, ""]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/cssWithMappingToString.js":
/*!************************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/cssWithMappingToString.js ***!
  \************************************************************************/
/***/ ((module) => {

"use strict";


function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

module.exports = function cssWithMappingToString(item) {
  var _item = _slicedToArray(item, 4),
      content = _item[1],
      cssMapping = _item[3];

  if (typeof btoa === "function") {
    // eslint-disable-next-line no-undef
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || "").concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join("\n");
  }

  return [content].join("\n");
};

/***/ }),

/***/ "./node_modules/cubic-hermite/hermite.js":
/*!***********************************************!*\
  !*** ./node_modules/cubic-hermite/hermite.js ***!
  \***********************************************/
/***/ ((module) => {

"use strict";


function dcubicHermite(p0, v0, p1, v1, t, f) {
  var dh00 = 6*t*t-6*t,
      dh10 = 3*t*t-4*t + 1,
      dh01 = -6*t*t+6*t,
      dh11 = 3*t*t-2*t
  if(p0.length) {
    if(!f) {
      f = new Array(p0.length)
    }
    for(var i=p0.length-1; i>=0; --i) {
      f[i] = dh00*p0[i] + dh10*v0[i] + dh01*p1[i] + dh11*v1[i]
    }
    return f
  }
  return dh00*p0 + dh10*v0 + dh01*p1[i] + dh11*v1
}

function cubicHermite(p0, v0, p1, v1, t, f) {
  var ti  = (t-1), t2 = t*t, ti2 = ti*ti,
      h00 = (1+2*t)*ti2,
      h10 = t*ti2,
      h01 = t2*(3-2*t),
      h11 = t2*ti
  if(p0.length) {
    if(!f) {
      f = new Array(p0.length)
    }
    for(var i=p0.length-1; i>=0; --i) {
      f[i] = h00*p0[i] + h10*v0[i] + h01*p1[i] + h11*v1[i]
    }
    return f
  }
  return h00*p0 + h10*v0 + h01*p1 + h11*v1
}

module.exports = cubicHermite
module.exports.derivative = dcubicHermite

/***/ }),

/***/ "./node_modules/filtered-vector/fvec.js":
/*!**********************************************!*\
  !*** ./node_modules/filtered-vector/fvec.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = createFilteredVector

var cubicHermite = __webpack_require__(/*! cubic-hermite */ "./node_modules/cubic-hermite/hermite.js")
var bsearch = __webpack_require__(/*! binary-search-bounds */ "./node_modules/binary-search-bounds/search-bounds.js")

function clamp(lo, hi, x) {
  return Math.min(hi, Math.max(lo, x))
}

function FilteredVector(state0, velocity0, t0) {
  this.dimension  = state0.length
  this.bounds     = [ new Array(this.dimension), new Array(this.dimension) ]
  for(var i=0; i<this.dimension; ++i) {
    this.bounds[0][i] = -Infinity
    this.bounds[1][i] = Infinity
  }
  this._state     = state0.slice().reverse()
  this._velocity  = velocity0.slice().reverse()
  this._time      = [ t0 ]
  this._scratch   = [ state0.slice(), state0.slice(), state0.slice(), state0.slice(), state0.slice() ]
}

var proto = FilteredVector.prototype

proto.flush = function(t) {
  var idx = bsearch.gt(this._time, t) - 1
  if(idx <= 0) {
    return
  }
  this._time.splice(0, idx)
  this._state.splice(0, idx * this.dimension)
  this._velocity.splice(0, idx * this.dimension)
}

proto.curve = function(t) {
  var time      = this._time
  var n         = time.length
  var idx       = bsearch.le(time, t)
  var result    = this._scratch[0]
  var state     = this._state
  var velocity  = this._velocity
  var d         = this.dimension
  var bounds    = this.bounds
  if(idx < 0) {
    var ptr = d-1
    for(var i=0; i<d; ++i, --ptr) {
      result[i] = state[ptr]
    }
  } else if(idx >= n-1) {
    var ptr = state.length-1
    var tf = t - time[n-1]
    for(var i=0; i<d; ++i, --ptr) {
      result[i] = state[ptr] + tf * velocity[ptr]
    }
  } else {
    var ptr = d * (idx+1) - 1
    var t0  = time[idx]
    var t1  = time[idx+1]
    var dt  = (t1 - t0) || 1.0
    var x0  = this._scratch[1]
    var x1  = this._scratch[2]
    var v0  = this._scratch[3]
    var v1  = this._scratch[4]
    var steady = true
    for(var i=0; i<d; ++i, --ptr) {
      x0[i] = state[ptr]
      v0[i] = velocity[ptr] * dt
      x1[i] = state[ptr+d]
      v1[i] = velocity[ptr+d] * dt
      steady = steady && (x0[i] === x1[i] && v0[i] === v1[i] && v0[i] === 0.0)
    }
    if(steady) {
      for(var i=0; i<d; ++i) {
        result[i] = x0[i]
      }
    } else {
      cubicHermite(x0, v0, x1, v1, (t-t0)/dt, result)
    }
  }
  var lo = bounds[0]
  var hi = bounds[1]
  for(var i=0; i<d; ++i) {
    result[i] = clamp(lo[i], hi[i], result[i])
  }
  return result
}

proto.dcurve = function(t) {
  var time     = this._time
  var n        = time.length
  var idx      = bsearch.le(time, t)
  var result   = this._scratch[0]
  var state    = this._state
  var velocity = this._velocity
  var d        = this.dimension
  if(idx >= n-1) {
    var ptr = state.length-1
    var tf = t - time[n-1]
    for(var i=0; i<d; ++i, --ptr) {
      result[i] = velocity[ptr]
    }
  } else {
    var ptr = d * (idx+1) - 1
    var t0 = time[idx]
    var t1 = time[idx+1]
    var dt = (t1 - t0) || 1.0
    var x0 = this._scratch[1]
    var x1 = this._scratch[2]
    var v0 = this._scratch[3]
    var v1 = this._scratch[4]
    var steady = true
    for(var i=0; i<d; ++i, --ptr) {
      x0[i] = state[ptr]
      v0[i] = velocity[ptr] * dt
      x1[i] = state[ptr+d]
      v1[i] = velocity[ptr+d] * dt
      steady = steady && (x0[i] === x1[i] && v0[i] === v1[i] && v0[i] === 0.0)
    }
    if(steady) {
      for(var i=0; i<d; ++i) {
        result[i] = 0.0
      }
    } else {
      cubicHermite.derivative(x0, v0, x1, v1, (t-t0)/dt, result)
      for(var i=0; i<d; ++i) {
        result[i] /= dt
      }
    }
  }
  return result
}

proto.lastT = function() {
  var time = this._time
  return time[time.length-1]
}

proto.stable = function() {
  var velocity = this._velocity
  var ptr = velocity.length
  for(var i=this.dimension-1; i>=0; --i) {
    if(velocity[--ptr]) {
      return false
    }
  }
  return true
}

proto.jump = function(t) {
  var t0 = this.lastT()
  var d  = this.dimension
  if(t < t0 || arguments.length !== d+1) {
    return
  }
  var state     = this._state
  var velocity  = this._velocity
  var ptr       = state.length-this.dimension
  var bounds    = this.bounds
  var lo        = bounds[0]
  var hi        = bounds[1]
  this._time.push(t0, t)
  for(var j=0; j<2; ++j) {
    for(var i=0; i<d; ++i) {
      state.push(state[ptr++])
      velocity.push(0)
    }
  }
  this._time.push(t)
  for(var i=d; i>0; --i) {
    state.push(clamp(lo[i-1], hi[i-1], arguments[i]))
    velocity.push(0)
  }
}

proto.push = function(t) {
  var t0 = this.lastT()
  var d  = this.dimension
  if(t < t0 || arguments.length !== d+1) {
    return
  }
  var state     = this._state
  var velocity  = this._velocity
  var ptr       = state.length-this.dimension
  var dt        = t - t0
  var bounds    = this.bounds
  var lo        = bounds[0]
  var hi        = bounds[1]
  var sf        = (dt > 1e-6) ? 1/dt : 0
  this._time.push(t)
  for(var i=d; i>0; --i) {
    var xc = clamp(lo[i-1], hi[i-1], arguments[i])
    state.push(xc)
    velocity.push((xc - state[ptr++]) * sf)
  }
}

proto.set = function(t) {
  var d = this.dimension
  if(t < this.lastT() || arguments.length !== d+1) {
    return
  }
  var state     = this._state
  var velocity  = this._velocity
  var bounds    = this.bounds
  var lo        = bounds[0]
  var hi        = bounds[1]
  this._time.push(t)
  for(var i=d; i>0; --i) {
    state.push(clamp(lo[i-1], hi[i-1], arguments[i]))
    velocity.push(0)
  }
}

proto.move = function(t) {
  var t0 = this.lastT()
  var d  = this.dimension
  if(t <= t0 || arguments.length !== d+1) {
    return
  }
  var state    = this._state
  var velocity = this._velocity
  var statePtr = state.length - this.dimension
  var bounds   = this.bounds
  var lo       = bounds[0]
  var hi       = bounds[1]
  var dt       = t - t0
  var sf       = (dt > 1e-6) ? 1/dt : 0.0
  this._time.push(t)
  for(var i=d; i>0; --i) {
    var dx = arguments[i]
    state.push(clamp(lo[i-1], hi[i-1], state[statePtr++] + dx))
    velocity.push(dx * sf)
  }
}

proto.idle = function(t) {
  var t0 = this.lastT()
  if(t < t0) {
    return
  }
  var d        = this.dimension
  var state    = this._state
  var velocity = this._velocity
  var statePtr = state.length-d
  var bounds   = this.bounds
  var lo       = bounds[0]
  var hi       = bounds[1]
  var dt       = t - t0
  this._time.push(t)
  for(var i=d-1; i>=0; --i) {
    state.push(clamp(lo[i], hi[i], state[statePtr] + dt * velocity[statePtr]))
    velocity.push(0)
    statePtr += 1
  }
}

function getZero(d) {
  var result = new Array(d)
  for(var i=0; i<d; ++i) {
    result[i] = 0.0
  }
  return result
}

function createFilteredVector(initState, initVelocity, initTime) {
  switch(arguments.length) {
    case 0:
      return new FilteredVector([0], [0], 0)
    case 1:
      if(typeof initState === 'number') {
        var zero = getZero(initState)
        return new FilteredVector(zero, zero, 0)
      } else {
        return new FilteredVector(initState, getZero(initState.length), 0)
      }
    case 2:
      if(typeof initVelocity === 'number') {
        var zero = getZero(initState.length)
        return new FilteredVector(initState, zero, +initVelocity)
      } else {
        initTime = 0
      }
    case 3:
      if(initState.length !== initVelocity.length) {
        throw new Error('state and velocity lengths must match')
      }
      return new FilteredVector(initState, initVelocity, initTime)
  }
}


/***/ }),

/***/ "./node_modules/gl-mat4/clone.js":
/*!***************************************!*\
  !*** ./node_modules/gl-mat4/clone.js ***!
  \***************************************/
/***/ ((module) => {

module.exports = clone;

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
function clone(a) {
    var out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/create.js":
/*!****************************************!*\
  !*** ./node_modules/gl-mat4/create.js ***!
  \****************************************/
/***/ ((module) => {

module.exports = create;

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/determinant.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-mat4/determinant.js ***!
  \*********************************************/
/***/ ((module) => {

module.exports = determinant;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/***/ }),

/***/ "./node_modules/gl-mat4/fromQuat.js":
/*!******************************************!*\
  !*** ./node_modules/gl-mat4/fromQuat.js ***!
  \******************************************/
/***/ ((module) => {

module.exports = fromQuat;

/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/fromRotationTranslation.js":
/*!*********************************************************!*\
  !*** ./node_modules/gl-mat4/fromRotationTranslation.js ***!
  \*********************************************************/
/***/ ((module) => {

module.exports = fromRotationTranslation;

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/identity.js":
/*!******************************************!*\
  !*** ./node_modules/gl-mat4/identity.js ***!
  \******************************************/
/***/ ((module) => {

module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/invert.js":
/*!****************************************!*\
  !*** ./node_modules/gl-mat4/invert.js ***!
  \****************************************/
/***/ ((module) => {

module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/lookAt.js":
/*!****************************************!*\
  !*** ./node_modules/gl-mat4/lookAt.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var identity = __webpack_require__(/*! ./identity */ "./node_modules/gl-mat4/identity.js");

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/multiply.js":
/*!******************************************!*\
  !*** ./node_modules/gl-mat4/multiply.js ***!
  \******************************************/
/***/ ((module) => {

module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/rotate.js":
/*!****************************************!*\
  !*** ./node_modules/gl-mat4/rotate.js ***!
  \****************************************/
/***/ ((module) => {

module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/rotateX.js":
/*!*****************************************!*\
  !*** ./node_modules/gl-mat4/rotateX.js ***!
  \*****************************************/
/***/ ((module) => {

module.exports = rotateX;

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateX(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/rotateY.js":
/*!*****************************************!*\
  !*** ./node_modules/gl-mat4/rotateY.js ***!
  \*****************************************/
/***/ ((module) => {

module.exports = rotateY;

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateY(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/rotateZ.js":
/*!*****************************************!*\
  !*** ./node_modules/gl-mat4/rotateZ.js ***!
  \*****************************************/
/***/ ((module) => {

module.exports = rotateZ;

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateZ(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/scale.js":
/*!***************************************!*\
  !*** ./node_modules/gl-mat4/scale.js ***!
  \***************************************/
/***/ ((module) => {

module.exports = scale;

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/translate.js":
/*!*******************************************!*\
  !*** ./node_modules/gl-mat4/translate.js ***!
  \*******************************************/
/***/ ((module) => {

module.exports = translate;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/***/ }),

/***/ "./node_modules/gl-mat4/transpose.js":
/*!*******************************************!*\
  !*** ./node_modules/gl-mat4/transpose.js ***!
  \*******************************************/
/***/ ((module) => {

module.exports = transpose;

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function transpose(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};

/***/ }),

/***/ "./node_modules/gl-matrix/esm/common.js":
/*!**********************************************!*\
  !*** ./node_modules/gl-matrix/esm/common.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ARRAY_TYPE": () => (/* binding */ ARRAY_TYPE),
/* harmony export */   "EPSILON": () => (/* binding */ EPSILON),
/* harmony export */   "RANDOM": () => (/* binding */ RANDOM),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "setMatrixArrayType": () => (/* binding */ setMatrixArrayType),
/* harmony export */   "toRadian": () => (/* binding */ toRadian)
/* harmony export */ });
/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */

function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}
var degree = Math.PI / 180;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */

function toRadian(a) {
  return a * degree;
}
/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */

function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/***/ }),

/***/ "./node_modules/gl-matrix/esm/index.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/index.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "glMatrix": () => (/* reexport module object */ _common_js__WEBPACK_IMPORTED_MODULE_0__),
/* harmony export */   "mat2": () => (/* reexport module object */ _mat2_js__WEBPACK_IMPORTED_MODULE_1__),
/* harmony export */   "mat2d": () => (/* reexport module object */ _mat2d_js__WEBPACK_IMPORTED_MODULE_2__),
/* harmony export */   "mat3": () => (/* reexport module object */ _mat3_js__WEBPACK_IMPORTED_MODULE_3__),
/* harmony export */   "mat4": () => (/* reexport module object */ _mat4_js__WEBPACK_IMPORTED_MODULE_4__),
/* harmony export */   "quat": () => (/* reexport module object */ _quat_js__WEBPACK_IMPORTED_MODULE_5__),
/* harmony export */   "quat2": () => (/* reexport module object */ _quat2_js__WEBPACK_IMPORTED_MODULE_6__),
/* harmony export */   "vec2": () => (/* reexport module object */ _vec2_js__WEBPACK_IMPORTED_MODULE_7__),
/* harmony export */   "vec3": () => (/* reexport module object */ _vec3_js__WEBPACK_IMPORTED_MODULE_8__),
/* harmony export */   "vec4": () => (/* reexport module object */ _vec4_js__WEBPACK_IMPORTED_MODULE_9__)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony import */ var _mat2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mat2.js */ "./node_modules/gl-matrix/esm/mat2.js");
/* harmony import */ var _mat2d_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mat2d.js */ "./node_modules/gl-matrix/esm/mat2d.js");
/* harmony import */ var _mat3_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mat3.js */ "./node_modules/gl-matrix/esm/mat3.js");
/* harmony import */ var _mat4_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./mat4.js */ "./node_modules/gl-matrix/esm/mat4.js");
/* harmony import */ var _quat_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./quat.js */ "./node_modules/gl-matrix/esm/quat.js");
/* harmony import */ var _quat2_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./quat2.js */ "./node_modules/gl-matrix/esm/quat2.js");
/* harmony import */ var _vec2_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./vec2.js */ "./node_modules/gl-matrix/esm/vec2.js");
/* harmony import */ var _vec3_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./vec3.js */ "./node_modules/gl-matrix/esm/vec3.js");
/* harmony import */ var _vec4_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./vec4.js */ "./node_modules/gl-matrix/esm/vec4.js");












/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat2.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat2.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LDU": () => (/* binding */ LDU),
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "adjoint": () => (/* binding */ adjoint),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "determinant": () => (/* binding */ determinant),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "frob": () => (/* binding */ frob),
/* harmony export */   "fromRotation": () => (/* binding */ fromRotation),
/* harmony export */   "fromScaling": () => (/* binding */ fromScaling),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "multiplyScalar": () => (/* binding */ multiplyScalar),
/* harmony export */   "multiplyScalarAndAdd": () => (/* binding */ multiplyScalarAndAdd),
/* harmony export */   "rotate": () => (/* binding */ rotate),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "transpose": () => (/* binding */ transpose)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2x2 Matrix
 * @module mat2
 */

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Create a new mat2 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out A new 2x2 matrix
 */

function fromValues(m00, m01, m10, m11) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Set the components of a mat2 to the given values
 *
 * @param {mat2} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out
 */

function set(out, m00, m01, m10, m11) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache
  // some values
  if (out === a) {
    var a1 = a[1];
    out[1] = a[2];
    out[2] = a1;
  } else {
    out[0] = a[0];
    out[1] = a[2];
    out[2] = a[1];
    out[3] = a[3];
  }

  return out;
}
/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3]; // Calculate the determinant

  var det = a0 * a3 - a2 * a1;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = a3 * det;
  out[1] = -a1 * det;
  out[2] = -a2 * det;
  out[3] = a0 * det;
  return out;
}
/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function adjoint(out, a) {
  // Caching this value is nessecary if out == a
  var a0 = a[0];
  out[0] = a[3];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a0;
  return out;
}
/**
 * Calculates the determinant of a mat2
 *
 * @param {ReadonlyMat2} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  return a[0] * a[3] - a[2] * a[1];
}
/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  return out;
}
/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */

function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  return out;
}
/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to rotate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/

function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.rotate(dest, dest, rad);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.scale(dest, dest, vec);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat2} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2
 *
 * @param {ReadonlyMat2} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns Frobenius norm of a mat2
 *
 * @param {ReadonlyMat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3]);
}
/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {ReadonlyMat2} L the lower triangular matrix
 * @param {ReadonlyMat2} D the diagonal matrix
 * @param {ReadonlyMat2} U the upper triangular matrix
 * @param {ReadonlyMat2} a the input matrix to factorize
 */

function LDU(L, D, U, a) {
  L[2] = a[2] / a[0];
  U[0] = a[0];
  U[1] = a[1];
  U[3] = a[3] - L[2] * U[1];
  return [L, D, U];
}
/**
 * Adds two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat2} a The first matrix.
 * @param {ReadonlyMat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat2} a The first matrix.
 * @param {ReadonlyMat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two mat2's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2} out the receiving vector
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Alias for {@link mat2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat2.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat2d.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat2d.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "determinant": () => (/* binding */ determinant),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "frob": () => (/* binding */ frob),
/* harmony export */   "fromRotation": () => (/* binding */ fromRotation),
/* harmony export */   "fromScaling": () => (/* binding */ fromScaling),
/* harmony export */   "fromTranslation": () => (/* binding */ fromTranslation),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "multiplyScalar": () => (/* binding */ multiplyScalar),
/* harmony export */   "multiplyScalarAndAdd": () => (/* binding */ multiplyScalarAndAdd),
/* harmony export */   "rotate": () => (/* binding */ rotate),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "translate": () => (/* binding */ translate)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2x3 Matrix
 * @module mat2d
 * @description
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, b,
 *  c, d,
 *  tx, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, b, 0,
 *  c, d, 0,
 *  tx, ty, 1]
 * </pre>
 * The last column is ignored so the array is shorter and operations are faster.
 */

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(6);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[4] = 0;
    out[5] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {ReadonlyMat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(6);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {mat2d} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Create a new mat2d with the given values
 *
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} A new mat2d
 */

function fromValues(a, b, c, d, tx, ty) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(6);
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Set the components of a mat2d to the given values
 *
 * @param {mat2d} out the receiving matrix
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} out
 */

function set(out, a, b, c, d, tx, ty) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {mat2d} out
 */

function invert(out, a) {
  var aa = a[0],
      ab = a[1],
      ac = a[2],
      ad = a[3];
  var atx = a[4],
      aty = a[5];
  var det = aa * ad - ab * ac;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = ad * det;
  out[1] = -ab * det;
  out[2] = -ac * det;
  out[3] = aa * det;
  out[4] = (ac * aty - ad * atx) * det;
  out[5] = (ab * atx - aa * aty) * det;
  return out;
}
/**
 * Calculates the determinant of a mat2d
 *
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  return a[0] * a[3] - a[1] * a[2];
}
/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  out[4] = a0 * b4 + a2 * b5 + a4;
  out[5] = a1 * b4 + a3 * b5 + a5;
  return out;
}
/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */

function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to translate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/

function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to translate
 * @param {ReadonlyVec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/

function translate(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0;
  out[1] = a1;
  out[2] = a2;
  out[3] = a3;
  out[4] = a0 * v0 + a2 * v1 + a4;
  out[5] = a1 * v0 + a3 * v1 + a5;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.rotate(dest, dest, rad);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.scale(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat2d} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.translate(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {ReadonlyVec2} v Translation vector
 * @returns {mat2d} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = v[0];
  out[5] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2d
 *
 * @param {ReadonlyMat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat2d(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ")";
}
/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {ReadonlyMat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], 1);
}
/**
 * Adds two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2d} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  return out;
}
/**
 * Adds two mat2d's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2d} out the receiving vector
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2d} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat2d} a The first matrix.
 * @param {ReadonlyMat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat2d} a The first matrix.
 * @param {ReadonlyMat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5));
}
/**
 * Alias for {@link mat2d.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat2d.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat3.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat3.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "adjoint": () => (/* binding */ adjoint),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "determinant": () => (/* binding */ determinant),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "frob": () => (/* binding */ frob),
/* harmony export */   "fromMat2d": () => (/* binding */ fromMat2d),
/* harmony export */   "fromMat4": () => (/* binding */ fromMat4),
/* harmony export */   "fromQuat": () => (/* binding */ fromQuat),
/* harmony export */   "fromRotation": () => (/* binding */ fromRotation),
/* harmony export */   "fromScaling": () => (/* binding */ fromScaling),
/* harmony export */   "fromTranslation": () => (/* binding */ fromTranslation),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "multiplyScalar": () => (/* binding */ multiplyScalar),
/* harmony export */   "multiplyScalarAndAdd": () => (/* binding */ multiplyScalarAndAdd),
/* harmony export */   "normalFromMat4": () => (/* binding */ normalFromMat4),
/* harmony export */   "projection": () => (/* binding */ projection),
/* harmony export */   "rotate": () => (/* binding */ rotate),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "translate": () => (/* binding */ translate),
/* harmony export */   "transpose": () => (/* binding */ transpose)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(9);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {ReadonlyMat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */

function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(9);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Create a new mat3 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} A new mat3
 */

function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set the components of a mat3 to the given values
 *
 * @param {mat3} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} out
 */

function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }

  return out;
}
/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20; // Calculate the determinant

  var det = a00 * b01 + a01 * b11 + a02 * b21;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  out[0] = a11 * a22 - a12 * a21;
  out[1] = a02 * a21 - a01 * a22;
  out[2] = a01 * a12 - a02 * a11;
  out[3] = a12 * a20 - a10 * a22;
  out[4] = a00 * a22 - a02 * a20;
  out[5] = a02 * a10 - a00 * a12;
  out[6] = a10 * a21 - a11 * a20;
  out[7] = a01 * a20 - a00 * a21;
  out[8] = a00 * a11 - a01 * a10;
  return out;
}
/**
 * Calculates the determinant of a mat3
 *
 * @param {ReadonlyMat3} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
}
/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b00 = b[0],
      b01 = b[1],
      b02 = b[2];
  var b10 = b[3],
      b11 = b[4],
      b12 = b[5];
  var b20 = b[6],
      b21 = b[7],
      b22 = b[8];
  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;
  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;
  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
}
/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to translate
 * @param {ReadonlyVec2} v vector to translate by
 * @returns {mat3} out
 */

function translate(out, a, v) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      x = v[0],
      y = v[1];
  out[0] = a00;
  out[1] = a01;
  out[2] = a02;
  out[3] = a10;
  out[4] = a11;
  out[5] = a12;
  out[6] = x * a00 + y * a10 + a20;
  out[7] = x * a01 + y * a11 + a21;
  out[8] = x * a02 + y * a12 + a22;
  return out;
}
/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */

function rotate(out, a, rad) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c * a00 + s * a10;
  out[1] = c * a01 + s * a11;
  out[2] = c * a02 + s * a12;
  out[3] = c * a10 - s * a00;
  out[4] = c * a11 - s * a01;
  out[5] = c * a12 - s * a02;
  out[6] = a20;
  out[7] = a21;
  out[8] = a22;
  return out;
}
/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to rotate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1];
  out[0] = x * a[0];
  out[1] = x * a[1];
  out[2] = x * a[2];
  out[3] = y * a[3];
  out[4] = y * a[4];
  out[5] = y * a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.translate(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyVec2} v Translation vector
 * @returns {mat3} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = v[0];
  out[7] = v[1];
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.rotate(dest, dest, rad);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = -s;
  out[4] = c;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.scale(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat3} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = v[1];
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to copy
 * @returns {mat3} out
 **/

function fromMat2d(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = 0;
  out[3] = a[2];
  out[4] = a[3];
  out[5] = 0;
  out[6] = a[4];
  out[7] = a[5];
  out[8] = 1;
  return out;
}
/**
 * Calculates a 3x3 matrix from the given quaternion
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat3} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[3] = yx - wz;
  out[6] = zx + wy;
  out[1] = yx + wz;
  out[4] = 1 - xx - zz;
  out[7] = zy - wx;
  out[2] = zx - wy;
  out[5] = zy + wx;
  out[8] = 1 - xx - yy;
  return out;
}
/**
 * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyMat4} a Mat4 to derive the normal matrix from
 *
 * @returns {mat3} out
 */

function normalFromMat4(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  return out;
}
/**
 * Generates a 2D projection matrix with the given bounds
 *
 * @param {mat3} out mat3 frustum matrix will be written into
 * @param {number} width Width of your gl context
 * @param {number} height Height of gl context
 * @returns {mat3} out
 */

function projection(out, width, height) {
  out[0] = 2 / width;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = -2 / height;
  out[5] = 0;
  out[6] = -1;
  out[7] = 1;
  out[8] = 1;
  return out;
}
/**
 * Returns a string representation of a mat3
 *
 * @param {ReadonlyMat3} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
}
/**
 * Returns Frobenius norm of a mat3
 *
 * @param {ReadonlyMat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
}
/**
 * Adds two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat3} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  return out;
}
/**
 * Adds two mat3's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat3} out the receiving vector
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat3} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat3} a The first matrix.
 * @param {ReadonlyMat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat3} a The first matrix.
 * @param {ReadonlyMat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7],
      a8 = a[8];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7],
      b8 = b[8];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8));
}
/**
 * Alias for {@link mat3.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat3.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat4.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat4.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "adjoint": () => (/* binding */ adjoint),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "determinant": () => (/* binding */ determinant),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "frob": () => (/* binding */ frob),
/* harmony export */   "fromQuat": () => (/* binding */ fromQuat),
/* harmony export */   "fromQuat2": () => (/* binding */ fromQuat2),
/* harmony export */   "fromRotation": () => (/* binding */ fromRotation),
/* harmony export */   "fromRotationTranslation": () => (/* binding */ fromRotationTranslation),
/* harmony export */   "fromRotationTranslationScale": () => (/* binding */ fromRotationTranslationScale),
/* harmony export */   "fromRotationTranslationScaleOrigin": () => (/* binding */ fromRotationTranslationScaleOrigin),
/* harmony export */   "fromScaling": () => (/* binding */ fromScaling),
/* harmony export */   "fromTranslation": () => (/* binding */ fromTranslation),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "fromXRotation": () => (/* binding */ fromXRotation),
/* harmony export */   "fromYRotation": () => (/* binding */ fromYRotation),
/* harmony export */   "fromZRotation": () => (/* binding */ fromZRotation),
/* harmony export */   "frustum": () => (/* binding */ frustum),
/* harmony export */   "getRotation": () => (/* binding */ getRotation),
/* harmony export */   "getScaling": () => (/* binding */ getScaling),
/* harmony export */   "getTranslation": () => (/* binding */ getTranslation),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "lookAt": () => (/* binding */ lookAt),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "multiplyScalar": () => (/* binding */ multiplyScalar),
/* harmony export */   "multiplyScalarAndAdd": () => (/* binding */ multiplyScalarAndAdd),
/* harmony export */   "ortho": () => (/* binding */ ortho),
/* harmony export */   "perspective": () => (/* binding */ perspective),
/* harmony export */   "perspectiveFromFieldOfView": () => (/* binding */ perspectiveFromFieldOfView),
/* harmony export */   "rotate": () => (/* binding */ rotate),
/* harmony export */   "rotateX": () => (/* binding */ rotateX),
/* harmony export */   "rotateY": () => (/* binding */ rotateY),
/* harmony export */   "rotateZ": () => (/* binding */ rotateZ),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "targetTo": () => (/* binding */ targetTo),
/* harmony export */   "translate": () => (/* binding */ translate),
/* harmony export */   "transpose": () => (/* binding */ transpose)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(16);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */

function fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */

function set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Scaling vector
 * @returns {mat4} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function fromRotation(out, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;

  if (len < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c; // Perform rotation-specific matrix multiplication

  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromRotationTranslation(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 from a dual quat.
 *
 * @param {mat4} out Matrix
 * @param {ReadonlyQuat2} a Dual Quaternion
 * @returns {mat4} mat4 receiving operation result
 */

function fromQuat2(out, a) {
  var translation = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw; //Only scale if it makes sense

  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }

  fromRotationTranslation(out, a, translation);
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @param {ReadonlyVec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */

function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspective(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function perspectiveFromFieldOfView(out, fov, near, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  out[4] = 0.0;
  out[5] = yScale;
  out[6] = 0.0;
  out[7] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near - far);
  out[11] = -1.0;
  out[12] = 0.0;
  out[13] = 0.0;
  out[14] = far * near / (near - far);
  out[15] = 0.0;
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function ortho(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON && Math.abs(eyey - centery) < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON && Math.abs(eyez - centerz) < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
/**
 * Returns a string representation of a mat4
 *
 * @param {ReadonlyMat4} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
/**
 * Returns Frobenius norm of a mat4
 *
 * @param {ReadonlyMat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
}
/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  out[9] = a[9] + b[9] * scale;
  out[10] = a[10] + b[10] * scale;
  out[11] = a[11] + b[11] * scale;
  out[12] = a[12] + b[12] * scale;
  out[13] = a[13] + b[13] * scale;
  out[14] = a[14] + b[14] * scale;
  out[15] = a[15] + b[15] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var a8 = a[8],
      a9 = a[9],
      a10 = a[10],
      a11 = a[11];
  var a12 = a[12],
      a13 = a[13],
      a14 = a[14],
      a15 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  var b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  var b8 = b[8],
      b9 = b[9],
      b10 = b[10],
      b11 = b[11];
  var b12 = b[12],
      b13 = b[13],
      b14 = b[14],
      b15 = b[15];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15));
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat4.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/quat.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/quat.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "calculateW": () => (/* binding */ calculateW),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "conjugate": () => (/* binding */ conjugate),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "exp": () => (/* binding */ exp),
/* harmony export */   "fromEuler": () => (/* binding */ fromEuler),
/* harmony export */   "fromMat3": () => (/* binding */ fromMat3),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "getAngle": () => (/* binding */ getAngle),
/* harmony export */   "getAxisAngle": () => (/* binding */ getAxisAngle),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "ln": () => (/* binding */ ln),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "pow": () => (/* binding */ pow),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "rotateX": () => (/* binding */ rotateX),
/* harmony export */   "rotateY": () => (/* binding */ rotateY),
/* harmony export */   "rotateZ": () => (/* binding */ rotateZ),
/* harmony export */   "rotationTo": () => (/* binding */ rotationTo),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "setAxes": () => (/* binding */ setAxes),
/* harmony export */   "setAxisAngle": () => (/* binding */ setAxisAngle),
/* harmony export */   "slerp": () => (/* binding */ slerp),
/* harmony export */   "sqlerp": () => (/* binding */ sqlerp),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "str": () => (/* binding */ str)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony import */ var _mat3_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mat3.js */ "./node_modules/gl-matrix/esm/mat3.js");
/* harmony import */ var _vec3_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./vec3.js */ "./node_modules/gl-matrix/esm/vec3.js");
/* harmony import */ var _vec4_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./vec4.js */ "./node_modules/gl-matrix/esm/vec4.js");




/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */

function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Gets the rotation axis and angle for a given
 *  quaternion. If a quaternion is created with
 *  setAxisAngle, this method will return the same
 *  values as providied in the original parameter list
 *  OR functionally equivalent values.
 * Example: The quaternion formed by axis [0, 0, 1] and
 *  angle -90 is the same as the quaternion formed by
 *  [0, 0, 1] and 270. This method favors the latter.
 * @param  {vec3} out_axis  Vector receiving the axis of rotation
 * @param  {ReadonlyQuat} q     Quaternion to be decomposed
 * @return {Number}     Angle, in radians, of the rotation
 */

function getAxisAngle(out_axis, q) {
  var rad = Math.acos(q[3]) * 2.0;
  var s = Math.sin(rad / 2.0);

  if (s > _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    out_axis[0] = q[0] / s;
    out_axis[1] = q[1] / s;
    out_axis[2] = q[2] / s;
  } else {
    // If s is zero, return any axis (no rotation - axis does not matter)
    out_axis[0] = 1;
    out_axis[1] = 0;
    out_axis[2] = 0;
  }

  return rad;
}
/**
 * Gets the angular distance between two unit quaternions
 *
 * @param  {ReadonlyQuat} a     Origin unit quaternion
 * @param  {ReadonlyQuat} b     Destination unit quaternion
 * @return {Number}     Angle, in radians, between the two quaternions
 */

function getAngle(a, b) {
  var dotproduct = dot(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}
/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {quat} out
 */

function multiply(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateX(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + aw * bx;
  out[1] = ay * bw + az * bx;
  out[2] = az * bw - ay * bx;
  out[3] = aw * bw - ax * bx;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateY(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var by = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw - az * by;
  out[1] = ay * bw + aw * by;
  out[2] = az * bw + ax * by;
  out[3] = aw * bw - ay * by;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateZ(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bz = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + ay * bz;
  out[1] = ay * bw - ax * bz;
  out[2] = az * bw + aw * bz;
  out[3] = aw * bw - az * bz;
  return out;
}
/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate W component of
 * @returns {quat} out
 */

function calculateW(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
  return out;
}
/**
 * Calculate the exponential of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @returns {quat} out
 */

function exp(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var et = Math.exp(w);
  var s = r > 0 ? et * Math.sin(r) / r : 0;
  out[0] = x * s;
  out[1] = y * s;
  out[2] = z * s;
  out[3] = et * Math.cos(r);
  return out;
}
/**
 * Calculate the natural logarithm of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @returns {quat} out
 */

function ln(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var t = r > 0 ? Math.atan2(r, w) / r : 0;
  out[0] = x * t;
  out[1] = y * t;
  out[2] = z * t;
  out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
  return out;
}
/**
 * Calculate the scalar power of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @param {Number} b amount to scale the quaternion by
 * @returns {quat} out
 */

function pow(out, a, b) {
  ln(out, a);
  scale(out, out, b);
  exp(out, out);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Generates a random unit quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */

function random(out) {
  // Implementation of http://planning.cs.uiuc.edu/node198.html
  // TODO: Calling random 3 times is probably not the fastest solution
  var u1 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM();
  var u2 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM();
  var u3 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM();
  var sqrt1MinusU1 = Math.sqrt(1 - u1);
  var sqrtU1 = Math.sqrt(u1);
  out[0] = sqrt1MinusU1 * Math.sin(2.0 * Math.PI * u2);
  out[1] = sqrt1MinusU1 * Math.cos(2.0 * Math.PI * u2);
  out[2] = sqrtU1 * Math.sin(2.0 * Math.PI * u3);
  out[3] = sqrtU1 * Math.cos(2.0 * Math.PI * u3);
  return out;
}
/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate inverse of
 * @returns {quat} out
 */

function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
  var invDot = dot ? 1.0 / dot : 0; // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

  out[0] = -a0 * invDot;
  out[1] = -a1 * invDot;
  out[2] = -a2 * invDot;
  out[3] = a3 * invDot;
  return out;
}
/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate conjugate of
 * @returns {quat} out
 */

function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Creates a quaternion from the given euler angle x, y, z.
 *
 * @param {quat} out the receiving quaternion
 * @param {x} Angle to rotate around X axis in degrees.
 * @param {y} Angle to rotate around Y axis in degrees.
 * @param {z} Angle to rotate around Z axis in degrees.
 * @returns {quat} out
 * @function
 */

function fromEuler(out, x, y, z) {
  var halfToRad = 0.5 * Math.PI / 180.0;
  x *= halfToRad;
  y *= halfToRad;
  z *= halfToRad;
  var sx = Math.sin(x);
  var cx = Math.cos(x);
  var sy = Math.sin(y);
  var cy = Math.cos(y);
  var sz = Math.sin(z);
  var cz = Math.cos(z);
  out[0] = sx * cy * cz - cx * sy * sz;
  out[1] = cx * sy * cz + sx * cy * sz;
  out[2] = cx * cy * sz - sx * sy * cz;
  out[3] = cx * cy * cz + sx * sy * sz;
  return out;
}
/**
 * Returns a string representation of a quatenion
 *
 * @param {ReadonlyQuat} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {ReadonlyQuat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */

var clone = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.clone;
/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */

var fromValues = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.fromValues;
/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the source quaternion
 * @returns {quat} out
 * @function
 */

var copy = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.copy;
/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */

var set = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.set;
/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {quat} out
 * @function
 */

var add = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.add;
/**
 * Alias for {@link quat.multiply}
 * @function
 */

var mul = multiply;
/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {ReadonlyQuat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */

var scale = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.scale;
/**
 * Calculates the dot product of two quat's
 *
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */

var dot = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.dot;
/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 * @function
 */

var lerp = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.lerp;
/**
 * Calculates the length of a quat
 *
 * @param {ReadonlyQuat} a vector to calculate length of
 * @returns {Number} length of a
 */

var length = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.length;
/**
 * Alias for {@link quat.length}
 * @function
 */

var len = length;
/**
 * Calculates the squared length of a quat
 *
 * @param {ReadonlyQuat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

var squaredLength = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.squaredLength;
/**
 * Alias for {@link quat.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.normalize;
/**
 * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyQuat} a The first quaternion.
 * @param {ReadonlyQuat} b The second quaternion.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

var exactEquals = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.exactEquals;
/**
 * Returns whether or not the quaternions have approximately the same elements in the same position.
 *
 * @param {ReadonlyQuat} a The first vector.
 * @param {ReadonlyQuat} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

var equals = _vec4_js__WEBPACK_IMPORTED_MODULE_1__.equals;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

var rotationTo = function () {
  var tmpvec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__.create();
  var xUnitVec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__.fromValues(1, 0, 0);
  var yUnitVec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__.fromValues(0, 1, 0);
  return function (out, a, b) {
    var dot = _vec3_js__WEBPACK_IMPORTED_MODULE_2__.dot(a, b);

    if (dot < -0.999999) {
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__.cross(tmpvec3, xUnitVec3, a);
      if (_vec3_js__WEBPACK_IMPORTED_MODULE_2__.len(tmpvec3) < 0.000001) _vec3_js__WEBPACK_IMPORTED_MODULE_2__.cross(tmpvec3, yUnitVec3, a);
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__.normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__.cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot;
      return normalize(out, out);
    }
  };
}();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

var sqlerp = function () {
  var temp1 = create();
  var temp2 = create();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

var setAxes = function () {
  var matr = _mat3_js__WEBPACK_IMPORTED_MODULE_3__.create();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize(out, fromMat3(out, matr));
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/quat2.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/quat2.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "conjugate": () => (/* binding */ conjugate),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "fromMat4": () => (/* binding */ fromMat4),
/* harmony export */   "fromRotation": () => (/* binding */ fromRotation),
/* harmony export */   "fromRotationTranslation": () => (/* binding */ fromRotationTranslation),
/* harmony export */   "fromRotationTranslationValues": () => (/* binding */ fromRotationTranslationValues),
/* harmony export */   "fromTranslation": () => (/* binding */ fromTranslation),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "getDual": () => (/* binding */ getDual),
/* harmony export */   "getReal": () => (/* binding */ getReal),
/* harmony export */   "getTranslation": () => (/* binding */ getTranslation),
/* harmony export */   "identity": () => (/* binding */ identity),
/* harmony export */   "invert": () => (/* binding */ invert),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "rotateAroundAxis": () => (/* binding */ rotateAroundAxis),
/* harmony export */   "rotateByQuatAppend": () => (/* binding */ rotateByQuatAppend),
/* harmony export */   "rotateByQuatPrepend": () => (/* binding */ rotateByQuatPrepend),
/* harmony export */   "rotateX": () => (/* binding */ rotateX),
/* harmony export */   "rotateY": () => (/* binding */ rotateY),
/* harmony export */   "rotateZ": () => (/* binding */ rotateZ),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "setDual": () => (/* binding */ setDual),
/* harmony export */   "setReal": () => (/* binding */ setReal),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "translate": () => (/* binding */ translate)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony import */ var _quat_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./quat.js */ "./node_modules/gl-matrix/esm/quat.js");
/* harmony import */ var _mat4_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mat4.js */ "./node_modules/gl-matrix/esm/mat4.js");



/**
 * Dual Quaternion<br>
 * Format: [real, dual]<br>
 * Quaternion format: XYZW<br>
 * Make sure to have normalized dual quaternions, otherwise the functions may not work as intended.<br>
 * @module quat2
 */

/**
 * Creates a new identity dual quat
 *
 * @returns {quat2} a new dual quaternion [real -> rotation, dual -> translation]
 */

function create() {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(8);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    dq[0] = 0;
    dq[1] = 0;
    dq[2] = 0;
    dq[4] = 0;
    dq[5] = 0;
    dq[6] = 0;
    dq[7] = 0;
  }

  dq[3] = 1;
  return dq;
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {ReadonlyQuat2} a dual quaternion to clone
 * @returns {quat2} new dual quaternion
 * @function
 */

function clone(a) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(8);
  dq[0] = a[0];
  dq[1] = a[1];
  dq[2] = a[2];
  dq[3] = a[3];
  dq[4] = a[4];
  dq[5] = a[5];
  dq[6] = a[6];
  dq[7] = a[7];
  return dq;
}
/**
 * Creates a new dual quat initialized with the given values
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} new dual quaternion
 * @function
 */

function fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  dq[4] = x2;
  dq[5] = y2;
  dq[6] = z2;
  dq[7] = w2;
  return dq;
}
/**
 * Creates a new dual quat from the given values (quat and translation)
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component (translation)
 * @param {Number} y2 Y component (translation)
 * @param {Number} z2 Z component (translation)
 * @returns {quat2} new dual quaternion
 * @function
 */

function fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  var ax = x2 * 0.5,
      ay = y2 * 0.5,
      az = z2 * 0.5;
  dq[4] = ax * w1 + ay * z1 - az * y1;
  dq[5] = ay * w1 + az * x1 - ax * z1;
  dq[6] = az * w1 + ax * y1 - ay * x1;
  dq[7] = -ax * x1 - ay * y1 - az * z1;
  return dq;
}
/**
 * Creates a dual quat from a quaternion and a translation
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyQuat} q a normalized quaternion
 * @param {ReadonlyVec3} t tranlation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromRotationTranslation(out, q, t) {
  var ax = t[0] * 0.5,
      ay = t[1] * 0.5,
      az = t[2] * 0.5,
      bx = q[0],
      by = q[1],
      bz = q[2],
      bw = q[3];
  out[0] = bx;
  out[1] = by;
  out[2] = bz;
  out[3] = bw;
  out[4] = ax * bw + ay * bz - az * by;
  out[5] = ay * bw + az * bx - ax * bz;
  out[6] = az * bw + ax * by - ay * bx;
  out[7] = -ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Creates a dual quat from a translation
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyVec3} t translation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromTranslation(out, t) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = t[0] * 0.5;
  out[5] = t[1] * 0.5;
  out[6] = t[2] * 0.5;
  out[7] = 0;
  return out;
}
/**
 * Creates a dual quat from a quaternion
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyQuat} q the quaternion
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromRotation(out, q) {
  out[0] = q[0];
  out[1] = q[1];
  out[2] = q[2];
  out[3] = q[3];
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Creates a new dual quat from a matrix (4x4)
 *
 * @param {quat2} out the dual quaternion
 * @param {ReadonlyMat4} a the matrix
 * @returns {quat2} dual quat receiving operation result
 * @function
 */

function fromMat4(out, a) {
  //TODO Optimize this
  var outer = _quat_js__WEBPACK_IMPORTED_MODULE_1__.create();
  _mat4_js__WEBPACK_IMPORTED_MODULE_2__.getRotation(outer, a);
  var t = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  _mat4_js__WEBPACK_IMPORTED_MODULE_2__.getTranslation(t, a);
  fromRotationTranslation(out, outer, t);
  return out;
}
/**
 * Copy the values from one dual quat to another
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the source dual quaternion
 * @returns {quat2} out
 * @function
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  return out;
}
/**
 * Set a dual quat to the identity dual quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @returns {quat2} out
 */

function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Set the components of a dual quat to the given values
 *
 * @param {quat2} out the receiving quaternion
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} out
 * @function
 */

function set(out, x1, y1, z1, w1, x2, y2, z2, w2) {
  out[0] = x1;
  out[1] = y1;
  out[2] = z1;
  out[3] = w1;
  out[4] = x2;
  out[5] = y2;
  out[6] = z2;
  out[7] = w2;
  return out;
}
/**
 * Gets the real part of a dual quat
 * @param  {quat} out real part
 * @param  {ReadonlyQuat2} a Dual Quaternion
 * @return {quat} real part
 */

var getReal = _quat_js__WEBPACK_IMPORTED_MODULE_1__.copy;
/**
 * Gets the dual part of a dual quat
 * @param  {quat} out dual part
 * @param  {ReadonlyQuat2} a Dual Quaternion
 * @return {quat} dual part
 */

function getDual(out, a) {
  out[0] = a[4];
  out[1] = a[5];
  out[2] = a[6];
  out[3] = a[7];
  return out;
}
/**
 * Set the real component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat} q a quaternion representing the real part
 * @returns {quat2} out
 * @function
 */

var setReal = _quat_js__WEBPACK_IMPORTED_MODULE_1__.copy;
/**
 * Set the dual component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat} q a quaternion representing the dual part
 * @returns {quat2} out
 * @function
 */

function setDual(out, q) {
  out[4] = q[0];
  out[5] = q[1];
  out[6] = q[2];
  out[7] = q[3];
  return out;
}
/**
 * Gets the translation of a normalized dual quat
 * @param  {vec3} out translation
 * @param  {ReadonlyQuat2} a Dual Quaternion to be decomposed
 * @return {vec3} translation
 */

function getTranslation(out, a) {
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3];
  out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
  out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
  out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  return out;
}
/**
 * Translates a dual quat by the given vector
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {quat2} out
 */

function translate(out, a, v) {
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3],
      bx1 = v[0] * 0.5,
      by1 = v[1] * 0.5,
      bz1 = v[2] * 0.5,
      ax2 = a[4],
      ay2 = a[5],
      az2 = a[6],
      aw2 = a[7];
  out[0] = ax1;
  out[1] = ay1;
  out[2] = az1;
  out[3] = aw1;
  out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
  out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
  out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
  out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
  return out;
}
/**
 * Rotates a dual quat around the X axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateX(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__.rotateX(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Y axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateY(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__.rotateY(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Z axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateZ(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__.rotateZ(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (a * q)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {ReadonlyQuat} q quaternion to rotate by
 * @returns {quat2} out
 */

function rotateByQuatAppend(out, a, q) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  out[0] = ax * qw + aw * qx + ay * qz - az * qy;
  out[1] = ay * qw + aw * qy + az * qx - ax * qz;
  out[2] = az * qw + aw * qz + ax * qy - ay * qx;
  out[3] = aw * qw - ax * qx - ay * qy - az * qz;
  ax = a[4];
  ay = a[5];
  az = a[6];
  aw = a[7];
  out[4] = ax * qw + aw * qx + ay * qz - az * qy;
  out[5] = ay * qw + aw * qy + az * qx - ax * qz;
  out[6] = az * qw + aw * qz + ax * qy - ay * qx;
  out[7] = aw * qw - ax * qx - ay * qy - az * qz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (q * a)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat} q quaternion to rotate by
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @returns {quat2} out
 */

function rotateByQuatPrepend(out, q, a) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      bx = a[0],
      by = a[1],
      bz = a[2],
      bw = a[3];
  out[0] = qx * bw + qw * bx + qy * bz - qz * by;
  out[1] = qy * bw + qw * by + qz * bx - qx * bz;
  out[2] = qz * bw + qw * bz + qx * by - qy * bx;
  out[3] = qw * bw - qx * bx - qy * by - qz * bz;
  bx = a[4];
  by = a[5];
  bz = a[6];
  bw = a[7];
  out[4] = qx * bw + qw * bx + qy * bz - qz * by;
  out[5] = qy * bw + qw * by + qz * bx - qx * bz;
  out[6] = qz * bw + qw * bz + qx * by - qy * bx;
  out[7] = qw * bw - qx * bx - qy * by - qz * bz;
  return out;
}
/**
 * Rotates a dual quat around a given axis. Does the normalisation automatically
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @param {Number} rad how far the rotation should be
 * @returns {quat2} out
 */

function rotateAroundAxis(out, a, axis, rad) {
  //Special case for rad = 0
  if (Math.abs(rad) < _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) {
    return copy(out, a);
  }

  var axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  rad = rad * 0.5;
  var s = Math.sin(rad);
  var bx = s * axis[0] / axisLength;
  var by = s * axis[1] / axisLength;
  var bz = s * axis[2] / axisLength;
  var bw = Math.cos(rad);
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3];
  out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  out[4] = ax * bw + aw * bx + ay * bz - az * by;
  out[5] = ay * bw + aw * by + az * bx - ax * bz;
  out[6] = az * bw + aw * bz + ax * by - ay * bx;
  out[7] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Adds two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {quat2} out
 * @function
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  return out;
}
/**
 * Multiplies two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {quat2} out
 */

function multiply(out, a, b) {
  var ax0 = a[0],
      ay0 = a[1],
      az0 = a[2],
      aw0 = a[3],
      bx1 = b[4],
      by1 = b[5],
      bz1 = b[6],
      bw1 = b[7],
      ax1 = a[4],
      ay1 = a[5],
      az1 = a[6],
      aw1 = a[7],
      bx0 = b[0],
      by0 = b[1],
      bz0 = b[2],
      bw0 = b[3];
  out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
  out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
  out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
  out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
  out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
  out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
  out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
  out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
  return out;
}
/**
 * Alias for {@link quat2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Scales a dual quat by a scalar number
 *
 * @param {quat2} out the receiving dual quat
 * @param {ReadonlyQuat2} a the dual quat to scale
 * @param {Number} b amount to scale the dual quat by
 * @returns {quat2} out
 * @function
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  return out;
}
/**
 * Calculates the dot product of two dual quat's (The dot product of the real parts)
 *
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */

var dot = _quat_js__WEBPACK_IMPORTED_MODULE_1__.dot;
/**
 * Performs a linear interpolation between two dual quats's
 * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
 *
 * @param {quat2} out the receiving dual quat
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat2} out
 */

function lerp(out, a, b, t) {
  var mt = 1 - t;
  if (dot(a, b) < 0) t = -t;
  out[0] = a[0] * mt + b[0] * t;
  out[1] = a[1] * mt + b[1] * t;
  out[2] = a[2] * mt + b[2] * t;
  out[3] = a[3] * mt + b[3] * t;
  out[4] = a[4] * mt + b[4] * t;
  out[5] = a[5] * mt + b[5] * t;
  out[6] = a[6] * mt + b[6] * t;
  out[7] = a[7] * mt + b[7] * t;
  return out;
}
/**
 * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a dual quat to calculate inverse of
 * @returns {quat2} out
 */

function invert(out, a) {
  var sqlen = squaredLength(a);
  out[0] = -a[0] / sqlen;
  out[1] = -a[1] / sqlen;
  out[2] = -a[2] / sqlen;
  out[3] = a[3] / sqlen;
  out[4] = -a[4] / sqlen;
  out[5] = -a[5] / sqlen;
  out[6] = -a[6] / sqlen;
  out[7] = a[7] / sqlen;
  return out;
}
/**
 * Calculates the conjugate of a dual quat
 * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat2} a quat to calculate conjugate of
 * @returns {quat2} out
 */

function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  out[4] = -a[4];
  out[5] = -a[5];
  out[6] = -a[6];
  out[7] = a[7];
  return out;
}
/**
 * Calculates the length of a dual quat
 *
 * @param {ReadonlyQuat2} a dual quat to calculate length of
 * @returns {Number} length of a
 * @function
 */

var length = _quat_js__WEBPACK_IMPORTED_MODULE_1__.length;
/**
 * Alias for {@link quat2.length}
 * @function
 */

var len = length;
/**
 * Calculates the squared length of a dual quat
 *
 * @param {ReadonlyQuat2} a dual quat to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

var squaredLength = _quat_js__WEBPACK_IMPORTED_MODULE_1__.squaredLength;
/**
 * Alias for {@link quat2.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Normalize a dual quat
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a dual quaternion to normalize
 * @returns {quat2} out
 * @function
 */

function normalize(out, a) {
  var magnitude = squaredLength(a);

  if (magnitude > 0) {
    magnitude = Math.sqrt(magnitude);
    var a0 = a[0] / magnitude;
    var a1 = a[1] / magnitude;
    var a2 = a[2] / magnitude;
    var a3 = a[3] / magnitude;
    var b0 = a[4];
    var b1 = a[5];
    var b2 = a[6];
    var b3 = a[7];
    var a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = (b0 - a0 * a_dot_b) / magnitude;
    out[5] = (b1 - a1 * a_dot_b) / magnitude;
    out[6] = (b2 - a2 * a_dot_b) / magnitude;
    out[7] = (b3 - a3 * a_dot_b) / magnitude;
  }

  return out;
}
/**
 * Returns a string representation of a dual quatenion
 *
 * @param {ReadonlyQuat2} a dual quaternion to represent as a string
 * @returns {String} string representation of the dual quat
 */

function str(a) {
  return "quat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ")";
}
/**
 * Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyQuat2} a the first dual quaternion.
 * @param {ReadonlyQuat2} b the second dual quaternion.
 * @returns {Boolean} true if the dual quaternions are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];
}
/**
 * Returns whether or not the dual quaternions have approximately the same elements in the same position.
 *
 * @param {ReadonlyQuat2} a the first dual quat.
 * @param {ReadonlyQuat2} b the second dual quat.
 * @returns {Boolean} true if the dual quats are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7));
}

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec2.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec2.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "angle": () => (/* binding */ angle),
/* harmony export */   "ceil": () => (/* binding */ ceil),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "cross": () => (/* binding */ cross),
/* harmony export */   "dist": () => (/* binding */ dist),
/* harmony export */   "distance": () => (/* binding */ distance),
/* harmony export */   "div": () => (/* binding */ div),
/* harmony export */   "divide": () => (/* binding */ divide),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "floor": () => (/* binding */ floor),
/* harmony export */   "forEach": () => (/* binding */ forEach),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "inverse": () => (/* binding */ inverse),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "max": () => (/* binding */ max),
/* harmony export */   "min": () => (/* binding */ min),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "negate": () => (/* binding */ negate),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "rotate": () => (/* binding */ rotate),
/* harmony export */   "round": () => (/* binding */ round),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "scaleAndAdd": () => (/* binding */ scaleAndAdd),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "sqrDist": () => (/* binding */ sqrDist),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "squaredDistance": () => (/* binding */ squaredDistance),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "transformMat2": () => (/* binding */ transformMat2),
/* harmony export */   "transformMat2d": () => (/* binding */ transformMat2d),
/* harmony export */   "transformMat3": () => (/* binding */ transformMat3),
/* harmony export */   "transformMat4": () => (/* binding */ transformMat4),
/* harmony export */   "zero": () => (/* binding */ zero)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(2);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {ReadonlyVec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(2);
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */

function fromValues(x, y) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(2);
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the source vector
 * @returns {vec2} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */

function set(out, x, y) {
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}
/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
/**
 * Math.ceil the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to ceil
 * @returns {vec2} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
/**
 * Math.floor the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to floor
 * @returns {vec2} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
/**
 * Math.round the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to round
 * @returns {vec2} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  return out;
}
/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}
/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return x * x + y * y;
}
/**
 * Calculates the length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0],
      y = a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0],
      y = a[1];
  return x * x + y * y;
}
/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to negate
 * @returns {vec2} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to invert
 * @returns {vec2} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}
/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to normalize
 * @returns {vec2} out
 */

function normalize(out, a) {
  var x = a[0],
      y = a[1];
  var len = x * x + y * y;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  return out;
}
/**
 * Calculates the dot product of two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}
/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec2} out
 */

function lerp(out, a, b, t) {
  var ax = a[0],
      ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}
/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2d} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2d(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat3} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat4(out, a, m) {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
/**
 * Rotate a 2D vector
 * @param {vec2} out The receiving vec2
 * @param {ReadonlyVec2} a The vec2 point to rotate
 * @param {ReadonlyVec2} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec2} out
 */

function rotate(out, a, b, rad) {
  //Translate point to the origin
  var p0 = a[0] - b[0],
      p1 = a[1] - b[1],
      sinC = Math.sin(rad),
      cosC = Math.cos(rad); //perform rotation and translate to correct position

  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
/**
 * Get the angle between two 2D vectors
 * @param {ReadonlyVec2} a The first operand
 * @param {ReadonlyVec2} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var x1 = a[0],
      y1 = a[1],
      x2 = b[0],
      y2 = b[1],
      // mag is the product of the magnitudes of a and b
  mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2),
      // mag &&.. short circuits if mag == 0
  cosine = mag && (x1 * x2 + y1 * y2) / mag; // Math.min(Math.max(cosine, -1), 1) clamps the cosine between -1 and 1

  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec2 to zero
 *
 * @param {vec2} out the receiving vector
 * @returns {vec2} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec2} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec2(" + a[0] + ", " + a[1] + ")";
}
/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1];
  var b0 = b[0],
      b1 = b[1];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1));
}
/**
 * Alias for {@link vec2.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec2.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec2.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec2.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec3.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec3.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "angle": () => (/* binding */ angle),
/* harmony export */   "bezier": () => (/* binding */ bezier),
/* harmony export */   "ceil": () => (/* binding */ ceil),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "cross": () => (/* binding */ cross),
/* harmony export */   "dist": () => (/* binding */ dist),
/* harmony export */   "distance": () => (/* binding */ distance),
/* harmony export */   "div": () => (/* binding */ div),
/* harmony export */   "divide": () => (/* binding */ divide),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "floor": () => (/* binding */ floor),
/* harmony export */   "forEach": () => (/* binding */ forEach),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "hermite": () => (/* binding */ hermite),
/* harmony export */   "inverse": () => (/* binding */ inverse),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "max": () => (/* binding */ max),
/* harmony export */   "min": () => (/* binding */ min),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "negate": () => (/* binding */ negate),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "rotateX": () => (/* binding */ rotateX),
/* harmony export */   "rotateY": () => (/* binding */ rotateY),
/* harmony export */   "rotateZ": () => (/* binding */ rotateZ),
/* harmony export */   "round": () => (/* binding */ round),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "scaleAndAdd": () => (/* binding */ scaleAndAdd),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "sqrDist": () => (/* binding */ sqrDist),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "squaredDistance": () => (/* binding */ squaredDistance),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "transformMat3": () => (/* binding */ transformMat3),
/* harmony export */   "transformMat4": () => (/* binding */ transformMat4),
/* harmony export */   "transformQuat": () => (/* binding */ transformQuat),
/* harmony export */   "zero": () => (/* binding */ zero)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues(x, y, z) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the source vector
 * @returns {vec3} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to ceil
 * @returns {vec3} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to floor
 * @returns {vec3} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to round
 * @returns {vec3} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to negate
 * @returns {vec3} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to invert
 * @returns {vec3} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2.0 * Math.PI;
  var z = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {ReadonlyVec3} a The first operand
 * @param {ReadonlyVec3} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec3.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec4.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec4.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => (/* binding */ add),
/* harmony export */   "ceil": () => (/* binding */ ceil),
/* harmony export */   "clone": () => (/* binding */ clone),
/* harmony export */   "copy": () => (/* binding */ copy),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "cross": () => (/* binding */ cross),
/* harmony export */   "dist": () => (/* binding */ dist),
/* harmony export */   "distance": () => (/* binding */ distance),
/* harmony export */   "div": () => (/* binding */ div),
/* harmony export */   "divide": () => (/* binding */ divide),
/* harmony export */   "dot": () => (/* binding */ dot),
/* harmony export */   "equals": () => (/* binding */ equals),
/* harmony export */   "exactEquals": () => (/* binding */ exactEquals),
/* harmony export */   "floor": () => (/* binding */ floor),
/* harmony export */   "forEach": () => (/* binding */ forEach),
/* harmony export */   "fromValues": () => (/* binding */ fromValues),
/* harmony export */   "inverse": () => (/* binding */ inverse),
/* harmony export */   "len": () => (/* binding */ len),
/* harmony export */   "length": () => (/* binding */ length),
/* harmony export */   "lerp": () => (/* binding */ lerp),
/* harmony export */   "max": () => (/* binding */ max),
/* harmony export */   "min": () => (/* binding */ min),
/* harmony export */   "mul": () => (/* binding */ mul),
/* harmony export */   "multiply": () => (/* binding */ multiply),
/* harmony export */   "negate": () => (/* binding */ negate),
/* harmony export */   "normalize": () => (/* binding */ normalize),
/* harmony export */   "random": () => (/* binding */ random),
/* harmony export */   "round": () => (/* binding */ round),
/* harmony export */   "scale": () => (/* binding */ scale),
/* harmony export */   "scaleAndAdd": () => (/* binding */ scaleAndAdd),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "sqrDist": () => (/* binding */ sqrDist),
/* harmony export */   "sqrLen": () => (/* binding */ sqrLen),
/* harmony export */   "squaredDistance": () => (/* binding */ squaredDistance),
/* harmony export */   "squaredLength": () => (/* binding */ squaredLength),
/* harmony export */   "str": () => (/* binding */ str),
/* harmony export */   "sub": () => (/* binding */ sub),
/* harmony export */   "subtract": () => (/* binding */ subtract),
/* harmony export */   "transformMat4": () => (/* binding */ transformMat4),
/* harmony export */   "transformQuat": () => (/* binding */ transformQuat),
/* harmony export */   "zero": () => (/* binding */ zero)
/* harmony export */ });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {ReadonlyVec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */

function fromValues(x, y, z, w) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__.ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the source vector
 * @returns {vec4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */

function set(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
/**
 * Math.ceil the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to ceil
 * @returns {vec4} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
/**
 * Math.floor the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to floor
 * @returns {vec4} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
/**
 * Math.round the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to round
 * @returns {vec4} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  out[3] = Math.round(a[3]);
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Calculates the length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to negate
 * @returns {vec4} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to invert
 * @returns {vec4} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Calculates the dot product of two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
/**
 * Returns the cross-product of three vectors in a 4-dimensional space
 *
 * @param {ReadonlyVec4} result the receiving vector
 * @param {ReadonlyVec4} U the first vector
 * @param {ReadonlyVec4} V the second vector
 * @param {ReadonlyVec4} W the third vector
 * @returns {vec4} result
 */

function cross(out, u, v, w) {
  var A = v[0] * w[1] - v[1] * w[0],
      B = v[0] * w[2] - v[2] * w[0],
      C = v[0] * w[3] - v[3] * w[0],
      D = v[1] * w[2] - v[2] * w[1],
      E = v[1] * w[3] - v[3] * w[1],
      F = v[2] * w[3] - v[3] * w[2];
  var G = u[0];
  var H = u[1];
  var I = u[2];
  var J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec4} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  var aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */

function random(out, scale) {
  scale = scale || 1.0; // Marsaglia, George. Choosing a Point from the Surface of a
  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
  // http://projecteuclid.org/euclid.aoms/1177692644;

  var v1, v2, v3, v4;
  var s1, s2;

  do {
    v1 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2 - 1;
    v2 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2 - 1;
    s1 = v1 * v1 + v2 * v2;
  } while (s1 >= 1);

  do {
    v3 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2 - 1;
    v4 = _common_js__WEBPACK_IMPORTED_MODULE_0__.RANDOM() * 2 - 1;
    s2 = v3 * v3 + v4 * v4;
  } while (s2 >= 1);

  var d = Math.sqrt((1 - s1) / s2);
  out[0] = scale * v1;
  out[1] = scale * v2;
  out[2] = scale * v3 * d;
  out[3] = scale * v4 * d;
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec4} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec4} out
 */

function transformQuat(out, a, q) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3]; // calculate quat * vec

  var ix = qw * x + qy * z - qz * y;
  var iy = qw * y + qz * x - qx * z;
  var iz = qw * z + qx * y - qy * x;
  var iw = -qx * x - qy * y - qz * z; // calculate result * inverse quat

  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to zero
 *
 * @param {vec4} out the receiving vector
 * @returns {vec4} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec4} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec4.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec4.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec4.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/gl-quat/slerp.js":
/*!***************************************!*\
  !*** ./node_modules/gl-quat/slerp.js ***!
  \***************************************/
/***/ ((module) => {

module.exports = slerp

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
function slerp (out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations

  var ax = a[0], ay = a[1], az = a[2], aw = a[3],
    bx = b[0], by = b[1], bz = b[2], bw = b[3]

  var omega, cosom, sinom, scale0, scale1

  // calc cosine
  cosom = ax * bx + ay * by + az * bz + aw * bw
  // adjust signs (if necessary)
  if (cosom < 0.0) {
    cosom = -cosom
    bx = -bx
    by = -by
    bz = -bz
    bw = -bw
  }
  // calculate coefficients
  if ((1.0 - cosom) > 0.000001) {
    // standard case (slerp)
    omega = Math.acos(cosom)
    sinom = Math.sin(omega)
    scale0 = Math.sin((1.0 - t) * omega) / sinom
    scale1 = Math.sin(t * omega) / sinom
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t
    scale1 = t
  }
  // calculate final values
  out[0] = scale0 * ax + scale1 * bx
  out[1] = scale0 * ay + scale1 * by
  out[2] = scale0 * az + scale1 * bz
  out[3] = scale0 * aw + scale1 * bw

  return out
}


/***/ }),

/***/ "./node_modules/gl-vec3/cross.js":
/*!***************************************!*\
  !*** ./node_modules/gl-vec3/cross.js ***!
  \***************************************/
/***/ ((module) => {

module.exports = cross;

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}

/***/ }),

/***/ "./node_modules/gl-vec3/dot.js":
/*!*************************************!*\
  !*** ./node_modules/gl-vec3/dot.js ***!
  \*************************************/
/***/ ((module) => {

module.exports = dot;

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/***/ }),

/***/ "./node_modules/gl-vec3/length.js":
/*!****************************************!*\
  !*** ./node_modules/gl-vec3/length.js ***!
  \****************************************/
/***/ ((module) => {

module.exports = length;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}

/***/ }),

/***/ "./node_modules/gl-vec3/lerp.js":
/*!**************************************!*\
  !*** ./node_modules/gl-vec3/lerp.js ***!
  \**************************************/
/***/ ((module) => {

module.exports = lerp;

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}

/***/ }),

/***/ "./node_modules/gl-vec3/normalize.js":
/*!*******************************************!*\
  !*** ./node_modules/gl-vec3/normalize.js ***!
  \*******************************************/
/***/ ((module) => {

module.exports = normalize;

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}

/***/ }),

/***/ "./node_modules/has-passive-events/index.js":
/*!**************************************************!*\
  !*** ./node_modules/has-passive-events/index.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var isBrowser = __webpack_require__(/*! is-browser */ "./node_modules/is-browser/client.js")

function detect() {
	var supported = false

	try {
		var opts = Object.defineProperty({}, 'passive', {
			get: function() {
				supported = true
			}
		})

		window.addEventListener('test', null, opts)
		window.removeEventListener('test', null, opts)
	} catch(e) {
		supported = false
	}

	return supported
}

module.exports = isBrowser && detect()


/***/ }),

/***/ "./node_modules/is-browser/client.js":
/*!*******************************************!*\
  !*** ./node_modules/is-browser/client.js ***!
  \*******************************************/
/***/ ((module) => {

module.exports = true;

/***/ }),

/***/ "./node_modules/jquery/dist/jquery.js":
/*!********************************************!*\
  !*** ./node_modules/jquery/dist/jquery.js ***!
  \********************************************/
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * jQuery JavaScript Library v3.6.0
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright OpenJS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2021-03-02T17:08Z
 */
( function( global, factory ) {

	"use strict";

	if (  true && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var flat = arr.flat ? function( array ) {
	return arr.flat.call( array );
} : function( array ) {
	return arr.concat.apply( [], array );
};


var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

		// Support: Chrome <=57, Firefox <=52
		// In some browsers, typeof returns "function" for HTML <object> elements
		// (i.e., `typeof document.createElement( "object" ) === "function"`).
		// We don't want to classify *any* DOM node as a function.
		// Support: QtWeb <=3.8.5, WebKit <=534.34, wkhtmltopdf tool <=0.12.5
		// Plus for old WebKit, typeof returns "function" for HTML collections
		// (e.g., `typeof document.getElementsByTagName("div") === "function"`). (gh-4756)
		return typeof obj === "function" && typeof obj.nodeType !== "number" &&
			typeof obj.item !== "function";
	};


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};


var document = window.document;



	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.6.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	even: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return ( i + 1 ) % 2;
		} ) );
	},

	odd: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return i % 2;
		} ) );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a provided context; falls back to the global one
	// if not specified.
	globalEval: function( code, options, doc ) {
		DOMEval( code, { nonce: options && options.nonce }, doc );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
						[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return flat( ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( _i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.6
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2021-02-16
 */
( function( window ) {
var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ( {} ).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	pushNative = arr.push,
	push = arr.push,
	slice = arr.slice,

	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[ i ] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
		"ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +

		// "Attribute values must be CSS identifiers [capture 5]
		// or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
		whitespace + "*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +

		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
		whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
		"*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace +
			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
	funescape = function( escape, nonHex ) {
		var high = "0x" + escape.slice( 1 ) - 0x10000;

		return nonHex ?

			// Strip the backslash prefix from a non-hex escape sequence
			nonHex :

			// Replace a hexadecimal escape sequence with the encoded Unicode code point
			// Support: IE <=11+
			// For values outside the Basic Multilingual Plane (BMP), manually construct a
			// surrogate pair
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" +
				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		( arr = slice.call( preferredDoc.childNodes ) ),
		preferredDoc.childNodes
	);

	// Support: Android<4.0
	// Detect silently failing push.apply
	// eslint-disable-next-line no-unused-expressions
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			pushNative.apply( target, slice.call( els ) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;

			// Can't trust NodeList.length
			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {
		setDocument( context );
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

				// ID selector
				if ( ( m = match[ 1 ] ) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( ( elem = context.getElementById( m ) ) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[ 2 ] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

				// Support: IE 8 only
				// Exclude object elements
				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// The technique has to be used as well when a leading combinator is used
				// as such selectors are not recognized by querySelectorAll.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 &&
					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;

					// We can use :scope instead of the ID hack if the browser
					// supports it & if we're not changing the context.
					if ( newContext !== context || !support.scope ) {

						// Capture the context ID, setting it first if necessary
						if ( ( nid = context.getAttribute( "id" ) ) ) {
							nid = nid.replace( rcssescape, fcssescape );
						} else {
							context.setAttribute( "id", ( nid = expando ) );
						}
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
							toSelector( groups[ i ] );
					}
					newSelector = groups.join( "," );
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {

		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {

			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return ( cache[ key + " " ] = value );
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement( "fieldset" );

	try {
		return !!fn( el );
	} catch ( e ) {
		return false;
	} finally {

		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}

		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split( "|" ),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[ i ] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( ( cur = cur.nextSibling ) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return ( name === "input" || name === "button" ) && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
					inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction( function( argument ) {
		argument = +argument;
		return markFunction( function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
					seed[ j ] = !( matches[ j ] = seed[ j ] );
				}
			}
		} );
	} );
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem && elem.namespaceURI,
		docElem = elem && ( elem.ownerDocument || elem ).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11+, Edge 12 - 18+
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( preferredDoc != document &&
		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
	// IE/Edge & older browsers don't support the :scope pseudo-class.
	// Support: Safari 6.0 only
	// Safari 6.0 supports :scope but it's an alias of :root there.
	support.scope = assert( function( el ) {
		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
		return typeof el.querySelectorAll !== "undefined" &&
			!el.querySelectorAll( ":scope fieldset div" ).length;
	} );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert( function( el ) {
		el.className = "i";
		return !el.getAttribute( "className" );
	} );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert( function( el ) {
		el.appendChild( document.createComment( "" ) );
		return !el.getElementsByTagName( "*" ).length;
	} );

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert( function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	} );

	// ID filter and find
	if ( support.getById ) {
		Expr.filter[ "ID" ] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute( "id" ) === attrId;
			};
		};
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter[ "ID" ] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode( "id" );
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode( "id" );
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( ( elem = elems[ i++ ] ) ) {
						node = elem.getAttributeNode( "id" );
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find[ "TAG" ] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( ( elem = results[ i++ ] ) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert( function( el ) {

			var input;

			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll( "[selected]" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push( "~=" );
			}

			// Support: IE 11+, Edge 15 - 18+
			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
			// Adding a temporary attribute to the document before the selection works
			// around the issue.
			// Interestingly, IE 10 & older don't seem to have the issue.
			input = document.createElement( "input" );
			input.setAttribute( "name", "" );
			el.appendChild( input );
			if ( !el.querySelectorAll( "[name='']" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
					whitespace + "*(?:''|\"\")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll( ":checked" ).length ) {
				rbuggyQSA.push( ":checked" );
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push( ".#.+[+~]" );
			}

			// Support: Firefox <=3.6 - 5 only
			// Old Firefox doesn't throw on a badly-escaped identifier.
			el.querySelectorAll( "\\\f" );
			rbuggyQSA.push( "[\\r\\n\\f]" );
		} );

		assert( function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement( "input" );
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll( "[name=d]" ).length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: Opera 10 - 11 only
			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll( "*,:x" );
			rbuggyQSA.push( ",.*:" );
		} );
	}

	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector ) ) ) ) {

		assert( function( el ) {

			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		} );
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			) );
		} :
		function( a, b ) {
			if ( b ) {
				while ( ( b = b.parentNode ) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		// Support: IE 11+, Edge 17 - 18+
		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
		// two documents; shallow comparisons work.
		// eslint-disable-next-line eqeqeq
		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

			// Choose the first element that is related to our preferred document
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( a == document || a.ownerDocument == preferredDoc &&
				contains( preferredDoc, a ) ) {
				return -1;
			}

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( b == document || b.ownerDocument == preferredDoc &&
				contains( preferredDoc, b ) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			return a == document ? -1 :
				b == document ? 1 :
				/* eslint-enable eqeqeq */
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( ( cur = cur.parentNode ) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( ( cur = cur.parentNode ) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[ i ] === bp[ i ] ) {
			i++;
		}

		return i ?

			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[ i ], bp[ i ] ) :

			// Otherwise nodes in our document sort first
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			ap[ i ] == preferredDoc ? -1 :
			bp[ i ] == preferredDoc ? 1 :
			/* eslint-enable eqeqeq */
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	setDocument( elem );

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||

				// As well, disconnected nodes are said to be in a document
				// fragment in IE 9
				elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch ( e ) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( context.ownerDocument || context ) != document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( elem.ownerDocument || elem ) != document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],

		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			( val = elem.getAttributeNode( name ) ) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return ( sel + "" ).replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( ( elem = results[ i++ ] ) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {

		// If no nodeType, this is expected to be an array
		while ( ( node = elem[ i++ ] ) ) {

			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {

			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}

	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
				match[ 5 ] || "" ).replace( runescape, funescape );

			if ( match[ 2 ] === "~=" ) {
				match[ 3 ] = " " + match[ 3 ] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {

			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[ 1 ] = match[ 1 ].toLowerCase();

			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

				// nth-* requires argument
				if ( !match[ 3 ] ) {
					Sizzle.error( match[ 0 ] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[ 4 ] = +( match[ 4 ] ?
					match[ 5 ] + ( match[ 6 ] || 1 ) :
					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

				// other types prohibit arguments
			} else if ( match[ 3 ] ) {
				Sizzle.error( match[ 0 ] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[ 6 ] && match[ 2 ];

			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[ 3 ] ) {
				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&

				// Get excess from tokenize (recursively)
				( excess = tokenize( unquoted, true ) ) &&

				// advance to the next closing parenthesis
				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

				// excess is a negative index
				match[ 0 ] = match[ 0 ].slice( 0, excess );
				match[ 2 ] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() {
					return true;
				} :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				( pattern = new RegExp( "(^|" + whitespace +
					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
						className, function( elem ) {
							return pattern.test(
								typeof elem.className === "string" && elem.className ||
								typeof elem.getAttribute !== "undefined" &&
									elem.getAttribute( "class" ) ||
								""
							);
				} );
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				/* eslint-disable max-len */

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
				/* eslint-enable max-len */

			};
		},

		"CHILD": function( type, what, _argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, _context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( ( node = node[ dir ] ) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}

								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || ( node[ expando ] = {} );

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								( outerCache[ node.uniqueID ] = {} );

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( ( node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								( diff = nodeIndex = 0 ) || start.pop() ) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {

							// Use previously-cached element index if available
							if ( useCache ) {

								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || ( node[ expando ] = {} );

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									( outerCache[ node.uniqueID ] = {} );

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {

								// Use the same loop as above to seek `elem` from the start
								while ( ( node = ++nodeIndex && node && node[ dir ] ||
									( diff = nodeIndex = 0 ) || start.pop() ) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] ||
												( node[ expando ] = {} );

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												( outerCache[ node.uniqueID ] = {} );

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {

			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction( function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[ i ] );
							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
						}
					} ) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {

		// Potentially complex pseudos
		"not": markFunction( function( selector ) {

			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction( function( seed, matches, _context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( ( elem = unmatched[ i ] ) ) {
							seed[ i ] = !( matches[ i ] = elem );
						}
					}
				} ) :
				function( elem, _context, xml ) {
					input[ 0 ] = elem;
					matcher( input, null, xml, results );

					// Don't keep the element (issue #299)
					input[ 0 ] = null;
					return !results.pop();
				};
		} ),

		"has": markFunction( function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		} ),

		"contains": markFunction( function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		} ),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {

			// lang value must be a valid identifier
			if ( !ridentifier.test( lang || "" ) ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( ( elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
				return false;
			};
		} ),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement &&
				( !document.hasFocus || document.hasFocus() ) &&
				!!( elem.type || elem.href || ~elem.tabIndex );
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {

			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return ( nodeName === "input" && !!elem.checked ) ||
				( nodeName === "option" && !!elem.selected );
		},

		"selected": function( elem ) {

			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				// eslint-disable-next-line no-unused-expressions
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {

			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos[ "empty" ]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( ( attr = elem.getAttribute( "type" ) ) == null ||
					attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo( function() {
			return [ 0 ];
		} ),

		"last": createPositionalPseudo( function( _matchIndexes, length ) {
			return [ length - 1 ];
		} ),

		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		} ),

		"even": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"odd": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} )
	}
};

Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
			if ( match ) {

				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[ 0 ].length ) || soFar;
			}
			groups.push( ( tokens = [] ) );
		}

		matched = false;

		// Combinators
		if ( ( match = rcombinators.exec( soFar ) ) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,

				// Cast descendant combinators to space
				type: match[ 0 ].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
				( match = preFilters[ type ]( match ) ) ) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :

			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[ i ].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?

		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( ( elem = elem[ dir ] ) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] ||
							( outerCache[ elem.uniqueID ] = {} );

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( ( oldCache = uniqueCache[ key ] ) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return ( newCache[ 2 ] = oldCache[ 2 ] );
						} else {

							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[ i ]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[ 0 ];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[ i ], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( ( elem = unmatched[ i ] ) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction( function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts(
				selector || "*",
				context.nodeType ? [ context ] : context,
				[]
			),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?

				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( ( elem = temp[ i ] ) ) {
					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {

					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( ( elem = matcherOut[ i ] ) ) {

							// Restore matcherIn since elem is not yet a final match
							temp.push( ( matcherIn[ i ] = elem ) );
						}
					}
					postFinder( null, ( matcherOut = [] ), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( ( elem = matcherOut[ i ] ) &&
						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

						seed[ temp ] = !( results[ temp ] = elem );
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	} );
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
		implicitRelative = leadingRelative || Expr.relative[ " " ],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				( checkContext = context ).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );

			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {

				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[ j ].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(

					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
					tokens
						.slice( 0, i - 1 )
						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
				len = elems.length;

			if ( outermost ) {

				// Support: IE 11+, Edge 17 - 18+
				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
				// two documents; shallow comparisons work.
				// eslint-disable-next-line eqeqeq
				outermostContext = context == document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;

					// Support: IE 11+, Edge 17 - 18+
					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
					// two documents; shallow comparisons work.
					// eslint-disable-next-line eqeqeq
					if ( !context && elem.ownerDocument != document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( ( matcher = elementMatchers[ j++ ] ) ) {
						if ( matcher( elem, context || document, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {

					// They will have gone through all possible matchers
					if ( ( elem = !matcher && elem ) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( ( matcher = setMatchers[ j++ ] ) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {

					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
								setMatched[ i ] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {

		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[ i ] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache(
			selector,
			matcherFromGroupMatchers( elementMatchers, setMatchers )
		);

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
				.replace( runescape, funescape ), context ) || [] )[ 0 ];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[ i ];

			// Abort if we hit a combinator
			if ( Expr.relative[ ( type = token.type ) ] ) {
				break;
			}
			if ( ( find = Expr.find[ type ] ) ) {

				// Search, expanding context for leading sibling combinators
				if ( ( seed = find(
					token.matches[ 0 ].replace( runescape, funescape ),
					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
						context
				) ) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert( function( el ) {

	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
} );

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert( function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute( "href" ) === "#";
} ) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	} );
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert( function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
} ) ) {
	addHandle( "value", function( elem, _name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	} );
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert( function( el ) {
	return el.getAttribute( "disabled" ) == null;
} ) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
				( val = elem.getAttributeNode( name ) ) && val.specified ?
					val.value :
					null;
		}
	} );
}

return Sizzle;

} )( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

	return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

}
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, _i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, _i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, _i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( elem.contentDocument != null &&

			// Support: IE 11+
			// <object> elements with no `data` attribute has an object
			// `contentDocument` with a `null` prototype.
			getProto( elem.contentDocument ) ) {

			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( _i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the primary Deferred
			primary = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						primary.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, primary.done( updateFunc( i ) ).resolve, primary.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( primary.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return primary.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), primary.reject );
		}

		return primary.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, _key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( _all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};



function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// Support: IE <=9 only
	// IE <=9 replaces <option> tags with their contents when inserted outside of
	// the select element.
	div.innerHTML = "<option></option>";
	support.option = !!div.lastChild;
} )();


// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: IE <=9 only
if ( !support.option ) {
	wrapMap.optgroup = wrapMap.option = [ 1, "<select multiple='multiple'>", "</select>" ];
}


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Only attach events to objects that accept data
		if ( !acceptData( elem ) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = Object.create( null );
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( nativeEvent ),

			handlers = (
				dataPriv.get( this, "events" ) || Object.create( null )
			)[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
						return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
						return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();

						// Support: Chrome 86+
						// In Chrome, if an element having a focusout handler is blurred by
						// clicking outside of it, it invokes the handler synchronously. If
						// that handler calls `.remove()` on the element, the data is cleared,
						// leaving `result` undefined. We need to guard against this.
						return result && result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,
	which: true
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		// Suppress native focus or blur as it's already being fired
		// in leverageNative.
		_default: function() {
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.get( src );
		events = pdataOld.events;

		if ( events ) {
			dataPriv.remove( dest, "handle events" );

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = flat( args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								}, doc );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html;
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var swap = function( elem, options, callback ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.call( elem );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableTrDimensionsVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		},

		// Support: IE 9 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Behavior in IE 9 is more subtle than in newer versions & it passes
		// some versions of this test; make sure not to make it pass there!
		//
		// Support: Firefox 70+
		// Only Firefox includes border widths
		// in computed dimensions. (gh-4529)
		reliableTrDimensions: function() {
			var table, tr, trChild, trStyle;
			if ( reliableTrDimensionsVal == null ) {
				table = document.createElement( "table" );
				tr = document.createElement( "tr" );
				trChild = document.createElement( "div" );

				table.style.cssText = "position:absolute;left:-11111px;border-collapse:separate";
				tr.style.cssText = "border:1px solid";

				// Support: Chrome 86+
				// Height set through cssText does not get applied.
				// Computed height then comes back as 0.
				tr.style.height = "1px";
				trChild.style.height = "9px";

				// Support: Android 8 Chrome 86+
				// In our bodyBackground.html iframe,
				// display for all div elements is set to "inline",
				// which causes a problem only in Android 8 Chrome 86.
				// Ensuring the div is display: block
				// gets around this issue.
				trChild.style.display = "block";

				documentElement
					.appendChild( table )
					.appendChild( tr )
					.appendChild( trChild );

				trStyle = window.getComputedStyle( tr );
				reliableTrDimensionsVal = ( parseInt( trStyle.height, 10 ) +
					parseInt( trStyle.borderTopWidth, 10 ) +
					parseInt( trStyle.borderBottomWidth, 10 ) ) === tr.offsetHeight;

				documentElement.removeChild( table );
			}
			return reliableTrDimensionsVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( _elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Support: IE 9 - 11 only
	// Use offsetWidth/offsetHeight for when box sizing is unreliable.
	// In those cases, the computed value can be trusted to be border-box.
	if ( ( !support.boxSizingReliable() && isBorderBox ||

		// Support: IE 10 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Interestingly, in some cases IE 9 doesn't suffer from this issue.
		!support.reliableTrDimensions() && nodeName( elem, "tr" ) ||

		// Fall back to offsetWidth/offsetHeight when value is "auto"
		// This happens for inline elements with no explicit setting (gh-3571)
		val === "auto" ||

		// Support: Android <=4.1 - 4.3 only
		// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&

		// Make sure the element is visible & connected
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( _i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
					swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, dimension, extra );
					} ) :
					getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
			) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
				jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

				/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
					animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};

		doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( _i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( _i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


support.focusin = "onfocusin" in window;


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || Object.create( null ) )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {

				// Handle: regular nodes (via `this.ownerDocument`), window
				// (via `this.document`) & document (via `this`).
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = { guid: Date.now() };

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, parserErrorElem;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {}

	parserErrorElem = xml && xml.getElementsByTagName( "parsererror" )[ 0 ];
	if ( !xml || parserErrorElem ) {
		jQuery.error( "Invalid XML: " + (
			parserErrorElem ?
				jQuery.map( parserErrorElem.childNodes, function( el ) {
					return el.textContent;
				} ).join( "\n" ) :
				data
		) );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} ).filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} ).map( function( _i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );

originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce.guid++ ) +
					uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Use a noop converter for missing script but not if jsonp
			if ( !isSuccess &&
				jQuery.inArray( "script", s.dataTypes ) > -1 &&
				jQuery.inArray( "json", s.dataTypes ) < 0 ) {
				s.converters[ "text script" ] = function() {};
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( _i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );

jQuery.ajaxPrefilter( function( s ) {
	var i;
	for ( i in s.headers ) {
		if ( i.toLowerCase() === "content-type" ) {
			s.contentType = s.headers[ i ] || "";
		}
	}
} );


jQuery._evalUrl = function( url, options, doc ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options, doc );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce.guid++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			offsetParent = elem.offsetParent || doc.documentElement;
			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( _i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( {
		padding: "inner" + name,
		content: type,
		"": "outer" + name
	}, function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( _i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );

jQuery.each(
	( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( _i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	}
);




// Support: Android <=4.0 only
// Make sure we trim BOM and NBSP
var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};

jQuery.trim = function( text ) {
	return text == null ?
		"" :
		( text + "" ).replace( rtrim, "" );
};



// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( true ) {
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function() {
		return jQuery;
	}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === "undefined" ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );


/***/ }),

/***/ "./node_modules/mat4-decompose/index.js":
/*!**********************************************!*\
  !*** ./node_modules/mat4-decompose/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*jshint unused:true*/
/*
Input:  matrix      ; a 4x4 matrix
Output: translation ; a 3 component vector
        scale       ; a 3 component vector
        skew        ; skew factors XY,XZ,YZ represented as a 3 component vector
        perspective ; a 4 component vector
        quaternion  ; a 4 component vector
Returns false if the matrix cannot be decomposed, true if it can


References:
https://github.com/kamicane/matrix3d/blob/master/lib/Matrix3d.js
https://github.com/ChromiumWebApps/chromium/blob/master/ui/gfx/transform_util.cc
http://www.w3.org/TR/css3-transforms/#decomposing-a-3d-matrix
*/

var normalize = __webpack_require__(/*! ./normalize */ "./node_modules/mat4-decompose/normalize.js")

var create = __webpack_require__(/*! gl-mat4/create */ "./node_modules/gl-mat4/create.js")
var clone = __webpack_require__(/*! gl-mat4/clone */ "./node_modules/gl-mat4/clone.js")
var determinant = __webpack_require__(/*! gl-mat4/determinant */ "./node_modules/gl-mat4/determinant.js")
var invert = __webpack_require__(/*! gl-mat4/invert */ "./node_modules/gl-mat4/invert.js")
var transpose = __webpack_require__(/*! gl-mat4/transpose */ "./node_modules/gl-mat4/transpose.js")
var vec3 = {
    length: __webpack_require__(/*! gl-vec3/length */ "./node_modules/gl-vec3/length.js"),
    normalize: __webpack_require__(/*! gl-vec3/normalize */ "./node_modules/gl-vec3/normalize.js"),
    dot: __webpack_require__(/*! gl-vec3/dot */ "./node_modules/gl-vec3/dot.js"),
    cross: __webpack_require__(/*! gl-vec3/cross */ "./node_modules/gl-vec3/cross.js")
}

var tmp = create()
var perspectiveMatrix = create()
var tmpVec4 = [0, 0, 0, 0]
var row = [ [0,0,0], [0,0,0], [0,0,0] ]
var pdum3 = [0,0,0]

module.exports = function decomposeMat4(matrix, translation, scale, skew, perspective, quaternion) {
    if (!translation) translation = [0,0,0]
    if (!scale) scale = [0,0,0]
    if (!skew) skew = [0,0,0]
    if (!perspective) perspective = [0,0,0,1]
    if (!quaternion) quaternion = [0,0,0,1]

    //normalize, if not possible then bail out early
    if (!normalize(tmp, matrix))
        return false

    // perspectiveMatrix is used to solve for perspective, but it also provides
    // an easy way to test for singularity of the upper 3x3 component.
    clone(perspectiveMatrix, tmp)

    perspectiveMatrix[3] = 0
    perspectiveMatrix[7] = 0
    perspectiveMatrix[11] = 0
    perspectiveMatrix[15] = 1

    // If the perspectiveMatrix is not invertible, we are also unable to
    // decompose, so we'll bail early. Constant taken from SkMatrix44::invert.
    if (Math.abs(determinant(perspectiveMatrix) < 1e-8))
        return false

    var a03 = tmp[3], a13 = tmp[7], a23 = tmp[11],
            a30 = tmp[12], a31 = tmp[13], a32 = tmp[14], a33 = tmp[15]

    // First, isolate perspective.
    if (a03 !== 0 || a13 !== 0 || a23 !== 0) {
        tmpVec4[0] = a03
        tmpVec4[1] = a13
        tmpVec4[2] = a23
        tmpVec4[3] = a33

        // Solve the equation by inverting perspectiveMatrix and multiplying
        // rightHandSide by the inverse.
        // resuing the perspectiveMatrix here since it's no longer needed
        var ret = invert(perspectiveMatrix, perspectiveMatrix)
        if (!ret) return false
        transpose(perspectiveMatrix, perspectiveMatrix)

        //multiply by transposed inverse perspective matrix, into perspective vec4
        vec4multMat4(perspective, tmpVec4, perspectiveMatrix)
    } else { 
        //no perspective
        perspective[0] = perspective[1] = perspective[2] = 0
        perspective[3] = 1
    }

    // Next take care of translation
    translation[0] = a30
    translation[1] = a31
    translation[2] = a32

    // Now get scale and shear. 'row' is a 3 element array of 3 component vectors
    mat3from4(row, tmp)

    // Compute X scale factor and normalize first row.
    scale[0] = vec3.length(row[0])
    vec3.normalize(row[0], row[0])

    // Compute XY shear factor and make 2nd row orthogonal to 1st.
    skew[0] = vec3.dot(row[0], row[1])
    combine(row[1], row[1], row[0], 1.0, -skew[0])

    // Now, compute Y scale and normalize 2nd row.
    scale[1] = vec3.length(row[1])
    vec3.normalize(row[1], row[1])
    skew[0] /= scale[1]

    // Compute XZ and YZ shears, orthogonalize 3rd row
    skew[1] = vec3.dot(row[0], row[2])
    combine(row[2], row[2], row[0], 1.0, -skew[1])
    skew[2] = vec3.dot(row[1], row[2])
    combine(row[2], row[2], row[1], 1.0, -skew[2])

    // Next, get Z scale and normalize 3rd row.
    scale[2] = vec3.length(row[2])
    vec3.normalize(row[2], row[2])
    skew[1] /= scale[2]
    skew[2] /= scale[2]


    // At this point, the matrix (in rows) is orthonormal.
    // Check for a coordinate system flip.  If the determinant
    // is -1, then negate the matrix and the scaling factors.
    vec3.cross(pdum3, row[1], row[2])
    if (vec3.dot(row[0], pdum3) < 0) {
        for (var i = 0; i < 3; i++) {
            scale[i] *= -1;
            row[i][0] *= -1
            row[i][1] *= -1
            row[i][2] *= -1
        }
    }

    // Now, get the rotations out
    quaternion[0] = 0.5 * Math.sqrt(Math.max(1 + row[0][0] - row[1][1] - row[2][2], 0))
    quaternion[1] = 0.5 * Math.sqrt(Math.max(1 - row[0][0] + row[1][1] - row[2][2], 0))
    quaternion[2] = 0.5 * Math.sqrt(Math.max(1 - row[0][0] - row[1][1] + row[2][2], 0))
    quaternion[3] = 0.5 * Math.sqrt(Math.max(1 + row[0][0] + row[1][1] + row[2][2], 0))

    if (row[2][1] > row[1][2])
        quaternion[0] = -quaternion[0]
    if (row[0][2] > row[2][0])
        quaternion[1] = -quaternion[1]
    if (row[1][0] > row[0][1])
        quaternion[2] = -quaternion[2]
    return true
}

//will be replaced by gl-vec4 eventually
function vec4multMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
}

//gets upper-left of a 4x4 matrix into a 3x3 of vectors
function mat3from4(out, mat4x4) {
    out[0][0] = mat4x4[0]
    out[0][1] = mat4x4[1]
    out[0][2] = mat4x4[2]
    
    out[1][0] = mat4x4[4]
    out[1][1] = mat4x4[5]
    out[1][2] = mat4x4[6]

    out[2][0] = mat4x4[8]
    out[2][1] = mat4x4[9]
    out[2][2] = mat4x4[10]
}

function combine(out, a, b, scale1, scale2) {
    out[0] = a[0] * scale1 + b[0] * scale2
    out[1] = a[1] * scale1 + b[1] * scale2
    out[2] = a[2] * scale1 + b[2] * scale2
}

/***/ }),

/***/ "./node_modules/mat4-decompose/normalize.js":
/*!**************************************************!*\
  !*** ./node_modules/mat4-decompose/normalize.js ***!
  \**************************************************/
/***/ ((module) => {

module.exports = function normalize(out, mat) {
    var m44 = mat[15]
    // Cannot normalize.
    if (m44 === 0) 
        return false
    var scale = 1 / m44
    for (var i=0; i<16; i++)
        out[i] = mat[i] * scale
    return true
}

/***/ }),

/***/ "./node_modules/mat4-interpolate/index.js":
/*!************************************************!*\
  !*** ./node_modules/mat4-interpolate/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var lerp = __webpack_require__(/*! gl-vec3/lerp */ "./node_modules/gl-vec3/lerp.js")

var recompose = __webpack_require__(/*! mat4-recompose */ "./node_modules/mat4-recompose/index.js")
var decompose = __webpack_require__(/*! mat4-decompose */ "./node_modules/mat4-decompose/index.js")
var determinant = __webpack_require__(/*! gl-mat4/determinant */ "./node_modules/gl-mat4/determinant.js")
var slerp = __webpack_require__(/*! quat-slerp */ "./node_modules/quat-slerp/index.js")

var state0 = state()
var state1 = state()
var tmp = state()

module.exports = interpolate
function interpolate(out, start, end, alpha) {
    if (determinant(start) === 0 || determinant(end) === 0)
        return false

    //decompose the start and end matrices into individual components
    var r0 = decompose(start, state0.translate, state0.scale, state0.skew, state0.perspective, state0.quaternion)
    var r1 = decompose(end, state1.translate, state1.scale, state1.skew, state1.perspective, state1.quaternion)
    if (!r0 || !r1)
        return false    


    //now lerp/slerp the start and end components into a temporary     lerp(tmptranslate, state0.translate, state1.translate, alpha)
    lerp(tmp.translate, state0.translate, state1.translate, alpha)
    lerp(tmp.skew, state0.skew, state1.skew, alpha)
    lerp(tmp.scale, state0.scale, state1.scale, alpha)
    lerp(tmp.perspective, state0.perspective, state1.perspective, alpha)
    slerp(tmp.quaternion, state0.quaternion, state1.quaternion, alpha)

    //and recompose into our 'out' matrix
    recompose(out, tmp.translate, tmp.scale, tmp.skew, tmp.perspective, tmp.quaternion)
    return true
}

function state() {
    return {
        translate: vec3(),
        scale: vec3(1),
        skew: vec3(),
        perspective: vec4(),
        quaternion: vec4()
    }
}

function vec3(n) {
    return [n||0,n||0,n||0]
}

function vec4() {
    return [0,0,0,1]
}

/***/ }),

/***/ "./node_modules/mat4-recompose/index.js":
/*!**********************************************!*\
  !*** ./node_modules/mat4-recompose/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
Input:  translation ; a 3 component vector
        scale       ; a 3 component vector
        skew        ; skew factors XY,XZ,YZ represented as a 3 component vector
        perspective ; a 4 component vector
        quaternion  ; a 4 component vector
Output: matrix      ; a 4x4 matrix

From: http://www.w3.org/TR/css3-transforms/#recomposing-to-a-3d-matrix
*/

var mat4 = {
    identity: __webpack_require__(/*! gl-mat4/identity */ "./node_modules/gl-mat4/identity.js"),
    translate: __webpack_require__(/*! gl-mat4/translate */ "./node_modules/gl-mat4/translate.js"),
    multiply: __webpack_require__(/*! gl-mat4/multiply */ "./node_modules/gl-mat4/multiply.js"),
    create: __webpack_require__(/*! gl-mat4/create */ "./node_modules/gl-mat4/create.js"),
    scale: __webpack_require__(/*! gl-mat4/scale */ "./node_modules/gl-mat4/scale.js"),
    fromRotationTranslation: __webpack_require__(/*! gl-mat4/fromRotationTranslation */ "./node_modules/gl-mat4/fromRotationTranslation.js")
}

var rotationMatrix = mat4.create()
var temp = mat4.create()

module.exports = function recomposeMat4(matrix, translation, scale, skew, perspective, quaternion) {
    mat4.identity(matrix)

    //apply translation & rotation
    mat4.fromRotationTranslation(matrix, quaternion, translation)

    //apply perspective
    matrix[3] = perspective[0]
    matrix[7] = perspective[1]
    matrix[11] = perspective[2]
    matrix[15] = perspective[3]
        
    // apply skew
    // temp is a identity 4x4 matrix initially
    mat4.identity(temp)

    if (skew[2] !== 0) {
        temp[9] = skew[2]
        mat4.multiply(matrix, matrix, temp)
    }

    if (skew[1] !== 0) {
        temp[9] = 0
        temp[8] = skew[1]
        mat4.multiply(matrix, matrix, temp)
    }

    if (skew[0] !== 0) {
        temp[8] = 0
        temp[4] = skew[0]
        mat4.multiply(matrix, matrix, temp)
    }

    //apply scale
    mat4.scale(matrix, matrix, scale)
    return matrix
}

/***/ }),

/***/ "./node_modules/matrix-camera-controller/matrix.js":
/*!*********************************************************!*\
  !*** ./node_modules/matrix-camera-controller/matrix.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bsearch   = __webpack_require__(/*! binary-search-bounds */ "./node_modules/binary-search-bounds/search-bounds.js")
var m4interp  = __webpack_require__(/*! mat4-interpolate */ "./node_modules/mat4-interpolate/index.js")
var invert44  = __webpack_require__(/*! gl-mat4/invert */ "./node_modules/gl-mat4/invert.js")
var rotateX   = __webpack_require__(/*! gl-mat4/rotateX */ "./node_modules/gl-mat4/rotateX.js")
var rotateY   = __webpack_require__(/*! gl-mat4/rotateY */ "./node_modules/gl-mat4/rotateY.js")
var rotateZ   = __webpack_require__(/*! gl-mat4/rotateZ */ "./node_modules/gl-mat4/rotateZ.js")
var lookAt    = __webpack_require__(/*! gl-mat4/lookAt */ "./node_modules/gl-mat4/lookAt.js")
var translate = __webpack_require__(/*! gl-mat4/translate */ "./node_modules/gl-mat4/translate.js")
var scale     = __webpack_require__(/*! gl-mat4/scale */ "./node_modules/gl-mat4/scale.js")
var normalize = __webpack_require__(/*! gl-vec3/normalize */ "./node_modules/gl-vec3/normalize.js")

var DEFAULT_CENTER = [0,0,0]

module.exports = createMatrixCameraController

function MatrixCameraController(initialMatrix) {
  this._components    = initialMatrix.slice()
  this._time          = [0]
  this.prevMatrix     = initialMatrix.slice()
  this.nextMatrix     = initialMatrix.slice()
  this.computedMatrix = initialMatrix.slice()
  this.computedInverse = initialMatrix.slice()
  this.computedEye    = [0,0,0]
  this.computedUp     = [0,0,0]
  this.computedCenter = [0,0,0]
  this.computedRadius = [0]
  this._limits        = [-Infinity, Infinity]
}

var proto = MatrixCameraController.prototype

proto.recalcMatrix = function(t) {
  var time = this._time
  var tidx = bsearch.le(time, t)
  var mat = this.computedMatrix
  if(tidx < 0) {
    return
  }
  var comps = this._components
  if(tidx === time.length-1) {
    var ptr = 16*tidx
    for(var i=0; i<16; ++i) {
      mat[i] = comps[ptr++]
    }
  } else {
    var dt = (time[tidx+1] - time[tidx])
    var ptr = 16*tidx
    var prev = this.prevMatrix
    var allEqual = true
    for(var i=0; i<16; ++i) {
      prev[i] = comps[ptr++]
    }
    var next = this.nextMatrix
    for(var i=0; i<16; ++i) {
      next[i] = comps[ptr++]
      allEqual = allEqual && (prev[i] === next[i])
    }
    if(dt < 1e-6 || allEqual) {
      for(var i=0; i<16; ++i) {
        mat[i] = prev[i]
      }
    } else {
      m4interp(mat, prev, next, (t - time[tidx])/dt)
    }
  }

  var up = this.computedUp
  up[0] = mat[1]
  up[1] = mat[5]
  up[2] = mat[9]
  normalize(up, up)

  var imat = this.computedInverse
  invert44(imat, mat)
  var eye = this.computedEye
  var w = imat[15]
  eye[0] = imat[12]/w
  eye[1] = imat[13]/w
  eye[2] = imat[14]/w

  var center = this.computedCenter
  var radius = Math.exp(this.computedRadius[0])
  for(var i=0; i<3; ++i) {
    center[i] = eye[i] - mat[2+4*i] * radius
  }
}

proto.idle = function(t) {
  if(t < this.lastT()) {
    return
  }
  var mc = this._components
  var ptr = mc.length-16
  for(var i=0; i<16; ++i) {
    mc.push(mc[ptr++])
  }
  this._time.push(t)
}

proto.flush = function(t) {
  var idx = bsearch.gt(this._time, t) - 2
  if(idx < 0) {
    return
  }
  this._time.splice(0, idx)
  this._components.splice(0, 16*idx)
}

proto.lastT = function() {
  return this._time[this._time.length-1]
}

proto.lookAt = function(t, eye, center, up) {
  this.recalcMatrix(t)
  eye    = eye || this.computedEye
  center = center || DEFAULT_CENTER
  up     = up || this.computedUp
  this.setMatrix(t, lookAt(this.computedMatrix, eye, center, up))
  var d2 = 0.0
  for(var i=0; i<3; ++i) {
    d2 += Math.pow(center[i] - eye[i], 2)
  }
  d2 = Math.log(Math.sqrt(d2))
  this.computedRadius[0] = d2
}

proto.rotate = function(t, yaw, pitch, roll) {
  this.recalcMatrix(t)
  var mat = this.computedInverse
  if(yaw)   rotateY(mat, mat, yaw)
  if(pitch) rotateX(mat, mat, pitch)
  if(roll)  rotateZ(mat, mat, roll)
  this.setMatrix(t, invert44(this.computedMatrix, mat))
}

var tvec = [0,0,0]

proto.pan = function(t, dx, dy, dz) {
  tvec[0] = -(dx || 0.0)
  tvec[1] = -(dy || 0.0)
  tvec[2] = -(dz || 0.0)
  this.recalcMatrix(t)
  var mat = this.computedInverse
  translate(mat, mat, tvec)
  this.setMatrix(t, invert44(mat, mat))
}

proto.translate = function(t, dx, dy, dz) {
  tvec[0] = dx || 0.0
  tvec[1] = dy || 0.0
  tvec[2] = dz || 0.0
  this.recalcMatrix(t)
  var mat = this.computedMatrix
  translate(mat, mat, tvec)
  this.setMatrix(t, mat)
}

proto.setMatrix = function(t, mat) {
  if(t < this.lastT()) {
    return
  }
  this._time.push(t)
  for(var i=0; i<16; ++i) {
    this._components.push(mat[i])
  }
}

proto.setDistance = function(t, d) {
  this.computedRadius[0] = d
}

proto.setDistanceLimits = function(a,b) {
  var lim = this._limits
  lim[0] = a
  lim[1] = b
}

proto.getDistanceLimits = function(out) {
  var lim = this._limits
  if(out) {
    out[0] = lim[0]
    out[1] = lim[1]
    return out
  }
  return lim
}

function createMatrixCameraController(options) {
  options = options || {}
  var matrix = options.matrix || 
              [1,0,0,0,
               0,1,0,0,
               0,0,1,0,
               0,0,0,1]
  return new MatrixCameraController(matrix)
}


/***/ }),

/***/ "./node_modules/mouse-change/mouse-listen.js":
/*!***************************************************!*\
  !*** ./node_modules/mouse-change/mouse-listen.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = mouseListen

var mouse = __webpack_require__(/*! mouse-event */ "./node_modules/mouse-event/mouse.js")

function mouseListen (element, callback) {
  if (!callback) {
    callback = element
    element = window
  }

  var buttonState = 0
  var x = 0
  var y = 0
  var mods = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  }
  var attached = false

  function updateMods (ev) {
    var changed = false
    if ('altKey' in ev) {
      changed = changed || ev.altKey !== mods.alt
      mods.alt = !!ev.altKey
    }
    if ('shiftKey' in ev) {
      changed = changed || ev.shiftKey !== mods.shift
      mods.shift = !!ev.shiftKey
    }
    if ('ctrlKey' in ev) {
      changed = changed || ev.ctrlKey !== mods.control
      mods.control = !!ev.ctrlKey
    }
    if ('metaKey' in ev) {
      changed = changed || ev.metaKey !== mods.meta
      mods.meta = !!ev.metaKey
    }
    return changed
  }

  function handleEvent (nextButtons, ev) {
    var nextX = mouse.x(ev)
    var nextY = mouse.y(ev)
    if ('buttons' in ev) {
      nextButtons = ev.buttons | 0
    }
    if (nextButtons !== buttonState ||
      nextX !== x ||
      nextY !== y ||
      updateMods(ev)) {
      buttonState = nextButtons | 0
      x = nextX || 0
      y = nextY || 0
      callback && callback(buttonState, x, y, mods)
    }
  }

  function clearState (ev) {
    handleEvent(0, ev)
  }

  function handleBlur () {
    if (buttonState ||
      x ||
      y ||
      mods.shift ||
      mods.alt ||
      mods.meta ||
      mods.control) {
      x = y = 0
      buttonState = 0
      mods.shift = mods.alt = mods.control = mods.meta = false
      callback && callback(0, 0, 0, mods)
    }
  }

  function handleMods (ev) {
    if (updateMods(ev)) {
      callback && callback(buttonState, x, y, mods)
    }
  }

  function handleMouseMove (ev) {
    if (mouse.buttons(ev) === 0) {
      handleEvent(0, ev)
    } else {
      handleEvent(buttonState, ev)
    }
  }

  function handleMouseDown (ev) {
    handleEvent(buttonState | mouse.buttons(ev), ev)
  }

  function handleMouseUp (ev) {
    handleEvent(buttonState & ~mouse.buttons(ev), ev)
  }

  function attachListeners () {
    if (attached) {
      return
    }
    attached = true

    element.addEventListener('mousemove', handleMouseMove)

    element.addEventListener('mousedown', handleMouseDown)

    element.addEventListener('mouseup', handleMouseUp)

    element.addEventListener('mouseleave', clearState)
    element.addEventListener('mouseenter', clearState)
    element.addEventListener('mouseout', clearState)
    element.addEventListener('mouseover', clearState)

    element.addEventListener('blur', handleBlur)

    element.addEventListener('keyup', handleMods)
    element.addEventListener('keydown', handleMods)
    element.addEventListener('keypress', handleMods)

    if (element !== window) {
      window.addEventListener('blur', handleBlur)

      window.addEventListener('keyup', handleMods)
      window.addEventListener('keydown', handleMods)
      window.addEventListener('keypress', handleMods)
    }
  }

  function detachListeners () {
    if (!attached) {
      return
    }
    attached = false

    element.removeEventListener('mousemove', handleMouseMove)

    element.removeEventListener('mousedown', handleMouseDown)

    element.removeEventListener('mouseup', handleMouseUp)

    element.removeEventListener('mouseleave', clearState)
    element.removeEventListener('mouseenter', clearState)
    element.removeEventListener('mouseout', clearState)
    element.removeEventListener('mouseover', clearState)

    element.removeEventListener('blur', handleBlur)

    element.removeEventListener('keyup', handleMods)
    element.removeEventListener('keydown', handleMods)
    element.removeEventListener('keypress', handleMods)

    if (element !== window) {
      window.removeEventListener('blur', handleBlur)

      window.removeEventListener('keyup', handleMods)
      window.removeEventListener('keydown', handleMods)
      window.removeEventListener('keypress', handleMods)
    }
  }

  // Attach listeners
  attachListeners()

  var result = {
    element: element
  }

  Object.defineProperties(result, {
    enabled: {
      get: function () { return attached },
      set: function (f) {
        if (f) {
          attachListeners()
        } else {
          detachListeners()
        }
      },
      enumerable: true
    },
    buttons: {
      get: function () { return buttonState },
      enumerable: true
    },
    x: {
      get: function () { return x },
      enumerable: true
    },
    y: {
      get: function () { return y },
      enumerable: true
    },
    mods: {
      get: function () { return mods },
      enumerable: true
    }
  })

  return result
}


/***/ }),

/***/ "./node_modules/mouse-event-offset/index.js":
/*!**************************************************!*\
  !*** ./node_modules/mouse-event-offset/index.js ***!
  \**************************************************/
/***/ ((module) => {

var rootPosition = { left: 0, top: 0 }

module.exports = mouseEventOffset
function mouseEventOffset (ev, target, out) {
  target = target || ev.currentTarget || ev.srcElement
  if (!Array.isArray(out)) {
    out = [ 0, 0 ]
  }
  var cx = ev.clientX || 0
  var cy = ev.clientY || 0
  var rect = getBoundingClientOffset(target)
  out[0] = cx - rect.left
  out[1] = cy - rect.top
  return out
}

function getBoundingClientOffset (element) {
  if (element === window ||
      element === document ||
      element === document.body) {
    return rootPosition
  } else {
    return element.getBoundingClientRect()
  }
}


/***/ }),

/***/ "./node_modules/mouse-event/mouse.js":
/*!*******************************************!*\
  !*** ./node_modules/mouse-event/mouse.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";


function mouseButtons(ev) {
  if(typeof ev === 'object') {
    if('buttons' in ev) {
      return ev.buttons
    } else if('which' in ev) {
      var b = ev.which
      if(b === 2) {
        return 4
      } else if(b === 3) {
        return 2
      } else if(b > 0) {
        return 1<<(b-1)
      }
    } else if('button' in ev) {
      var b = ev.button
      if(b === 1) {
        return 4
      } else if(b === 2) {
        return 2
      } else if(b >= 0) {
        return 1<<b
      }
    }
  }
  return 0
}
exports.buttons = mouseButtons

function mouseElement(ev) {
  return ev.target || ev.srcElement || window
}
exports.element = mouseElement

function mouseRelativeX(ev) {
  if(typeof ev === 'object') {
    if('offsetX' in ev) {
      return ev.offsetX
    }
    var target = mouseElement(ev)
    var bounds = target.getBoundingClientRect()
    return ev.clientX - bounds.left
  }
  return 0
}
exports.x = mouseRelativeX

function mouseRelativeY(ev) {
  if(typeof ev === 'object') {
    if('offsetY' in ev) {
      return ev.offsetY
    }
    var target = mouseElement(ev)
    var bounds = target.getBoundingClientRect()
    return ev.clientY - bounds.top
  }
  return 0
}
exports.y = mouseRelativeY


/***/ }),

/***/ "./node_modules/mouse-wheel/wheel.js":
/*!*******************************************!*\
  !*** ./node_modules/mouse-wheel/wheel.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var toPX = __webpack_require__(/*! to-px */ "./node_modules/to-px/browser.js")

module.exports = mouseWheelListen

function mouseWheelListen(element, callback, noScroll) {
  if(typeof element === 'function') {
    noScroll = !!callback
    callback = element
    element = window
  }
  var lineHeight = toPX('ex', element)
  var listener = function(ev) {
    if(noScroll) {
      ev.preventDefault()
    }
    var dx = ev.deltaX || 0
    var dy = ev.deltaY || 0
    var dz = ev.deltaZ || 0
    var mode = ev.deltaMode
    var scale = 1
    switch(mode) {
      case 1:
        scale = lineHeight
      break
      case 2:
        scale = window.innerHeight
      break
    }
    dx *= scale
    dy *= scale
    dz *= scale
    if(dx || dy || dz) {
      return callback(dx, dy, dz, ev)
    }
  }
  element.addEventListener('wheel', listener)
  return listener
}


/***/ }),

/***/ "./node_modules/orbit-camera-controller/lib/quatFromFrame.js":
/*!*******************************************************************!*\
  !*** ./node_modules/orbit-camera-controller/lib/quatFromFrame.js ***!
  \*******************************************************************/
/***/ ((module) => {

"use strict";


module.exports = quatFromFrame

function quatFromFrame(
  out,
  rx, ry, rz,
  ux, uy, uz,
  fx, fy, fz) {
  var tr = rx + uy + fz
  if(l > 0) {
    var l = Math.sqrt(tr + 1.0)
    out[0] = 0.5 * (uz - fy) / l
    out[1] = 0.5 * (fx - rz) / l
    out[2] = 0.5 * (ry - uy) / l
    out[3] = 0.5 * l
  } else {
    var tf = Math.max(rx, uy, fz)
    var l = Math.sqrt(2 * tf - tr + 1.0)
    if(rx >= tf) {
      //x y z  order
      out[0] = 0.5 * l
      out[1] = 0.5 * (ux + ry) / l
      out[2] = 0.5 * (fx + rz) / l
      out[3] = 0.5 * (uz - fy) / l
    } else if(uy >= tf) {
      //y z x  order
      out[0] = 0.5 * (ry + ux) / l
      out[1] = 0.5 * l
      out[2] = 0.5 * (fy + uz) / l
      out[3] = 0.5 * (fx - rz) / l
    } else {
      //z x y  order
      out[0] = 0.5 * (rz + fx) / l
      out[1] = 0.5 * (uz + fy) / l
      out[2] = 0.5 * l
      out[3] = 0.5 * (ry - ux) / l
    }
  }
  return out
}

/***/ }),

/***/ "./node_modules/orbit-camera-controller/orbit.js":
/*!*******************************************************!*\
  !*** ./node_modules/orbit-camera-controller/orbit.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = createOrbitController

var filterVector  = __webpack_require__(/*! filtered-vector */ "./node_modules/filtered-vector/fvec.js")
var lookAt        = __webpack_require__(/*! gl-mat4/lookAt */ "./node_modules/gl-mat4/lookAt.js")
var mat4FromQuat  = __webpack_require__(/*! gl-mat4/fromQuat */ "./node_modules/gl-mat4/fromQuat.js")
var invert44      = __webpack_require__(/*! gl-mat4/invert */ "./node_modules/gl-mat4/invert.js")
var quatFromFrame = __webpack_require__(/*! ./lib/quatFromFrame */ "./node_modules/orbit-camera-controller/lib/quatFromFrame.js")

function len3(x,y,z) {
  return Math.sqrt(Math.pow(x,2) + Math.pow(y,2) + Math.pow(z,2))
}

function len4(w,x,y,z) {
  return Math.sqrt(Math.pow(w,2) + Math.pow(x,2) + Math.pow(y,2) + Math.pow(z,2))
}

function normalize4(out, a) {
  var ax = a[0]
  var ay = a[1]
  var az = a[2]
  var aw = a[3]
  var al = len4(ax, ay, az, aw)
  if(al > 1e-6) {
    out[0] = ax/al
    out[1] = ay/al
    out[2] = az/al
    out[3] = aw/al
  } else {
    out[0] = out[1] = out[2] = 0.0
    out[3] = 1.0
  }
}

function OrbitCameraController(initQuat, initCenter, initRadius) {
  this.radius    = filterVector([initRadius])
  this.center    = filterVector(initCenter)
  this.rotation  = filterVector(initQuat)

  this.computedRadius   = this.radius.curve(0)
  this.computedCenter   = this.center.curve(0)
  this.computedRotation = this.rotation.curve(0)
  this.computedUp       = [0.1,0,0]
  this.computedEye      = [0.1,0,0]
  this.computedMatrix   = [0.1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

  this.recalcMatrix(0)
}

var proto = OrbitCameraController.prototype

proto.lastT = function() {
  return Math.max(
    this.radius.lastT(),
    this.center.lastT(),
    this.rotation.lastT())
}

proto.recalcMatrix = function(t) {
  this.radius.curve(t)
  this.center.curve(t)
  this.rotation.curve(t)

  var quat = this.computedRotation
  normalize4(quat, quat)

  var mat = this.computedMatrix
  mat4FromQuat(mat, quat)

  var center = this.computedCenter
  var eye    = this.computedEye
  var up     = this.computedUp
  var radius = Math.exp(this.computedRadius[0])

  eye[0] = center[0] + radius * mat[2]
  eye[1] = center[1] + radius * mat[6]
  eye[2] = center[2] + radius * mat[10]
  up[0] = mat[1]
  up[1] = mat[5]
  up[2] = mat[9]

  for(var i=0; i<3; ++i) {
    var rr = 0.0
    for(var j=0; j<3; ++j) {
      rr += mat[i+4*j] * eye[j]
    }
    mat[12+i] = -rr
  }
}

proto.getMatrix = function(t, result) {
  this.recalcMatrix(t)
  var m = this.computedMatrix
  if(result) {
    for(var i=0; i<16; ++i) {
      result[i] = m[i]
    }
    return result
  }
  return m
}

proto.idle = function(t) {
  this.center.idle(t)
  this.radius.idle(t)
  this.rotation.idle(t)
}

proto.flush = function(t) {
  this.center.flush(t)
  this.radius.flush(t)
  this.rotation.flush(t)
}

proto.pan = function(t, dx, dy, dz) {
  dx = dx || 0.0
  dy = dy || 0.0
  dz = dz || 0.0

  this.recalcMatrix(t)
  var mat = this.computedMatrix

  var ux = mat[1]
  var uy = mat[5]
  var uz = mat[9]
  var ul = len3(ux, uy, uz)
  ux /= ul
  uy /= ul
  uz /= ul

  var rx = mat[0]
  var ry = mat[4]
  var rz = mat[8]
  var ru = rx * ux + ry * uy + rz * uz
  rx -= ux * ru
  ry -= uy * ru
  rz -= uz * ru
  var rl = len3(rx, ry, rz)
  rx /= rl
  ry /= rl
  rz /= rl

  var fx = mat[2]
  var fy = mat[6]
  var fz = mat[10]
  var fu = fx * ux + fy * uy + fz * uz
  var fr = fx * rx + fy * ry + fz * rz
  fx -= fu * ux + fr * rx
  fy -= fu * uy + fr * ry
  fz -= fu * uz + fr * rz
  var fl = len3(fx, fy, fz)
  fx /= fl
  fy /= fl
  fz /= fl

  var vx = rx * dx + ux * dy
  var vy = ry * dx + uy * dy
  var vz = rz * dx + uz * dy

  this.center.move(t, vx, vy, vz)

  //Update z-component of radius
  var radius = Math.exp(this.computedRadius[0])
  radius = Math.max(1e-4, radius + dz)
  this.radius.set(t, Math.log(radius))
}

proto.rotate = function(t, dx, dy, dz) {
  this.recalcMatrix(t)

  dx = dx||0.0
  dy = dy||0.0

  var mat = this.computedMatrix

  var rx = mat[0]
  var ry = mat[4]
  var rz = mat[8]

  var ux = mat[1]
  var uy = mat[5]
  var uz = mat[9]

  var fx = mat[2]
  var fy = mat[6]
  var fz = mat[10]

  var qx = dx * rx + dy * ux
  var qy = dx * ry + dy * uy
  var qz = dx * rz + dy * uz

  var bx = -(fy * qz - fz * qy)
  var by = -(fz * qx - fx * qz)
  var bz = -(fx * qy - fy * qx)  
  var bw = Math.sqrt(Math.max(0.0, 1.0 - Math.pow(bx,2) - Math.pow(by,2) - Math.pow(bz,2)))
  var bl = len4(bx, by, bz, bw)
  if(bl > 1e-6) {
    bx /= bl
    by /= bl
    bz /= bl
    bw /= bl
  } else {
    bx = by = bz = 0.0
    bw = 1.0
  }

  var rotation = this.computedRotation
  var ax = rotation[0]
  var ay = rotation[1]
  var az = rotation[2]
  var aw = rotation[3]

  var cx = ax*bw + aw*bx + ay*bz - az*by
  var cy = ay*bw + aw*by + az*bx - ax*bz
  var cz = az*bw + aw*bz + ax*by - ay*bx
  var cw = aw*bw - ax*bx - ay*by - az*bz
  
  //Apply roll
  if(dz) {
    bx = fx
    by = fy
    bz = fz
    var s = Math.sin(dz) / len3(bx, by, bz)
    bx *= s
    by *= s
    bz *= s
    bw = Math.cos(dx)
    cx = cx*bw + cw*bx + cy*bz - cz*by
    cy = cy*bw + cw*by + cz*bx - cx*bz
    cz = cz*bw + cw*bz + cx*by - cy*bx
    cw = cw*bw - cx*bx - cy*by - cz*bz
  }

  var cl = len4(cx, cy, cz, cw)
  if(cl > 1e-6) {
    cx /= cl
    cy /= cl
    cz /= cl
    cw /= cl
  } else {
    cx = cy = cz = 0.0
    cw = 1.0
  }

  this.rotation.set(t, cx, cy, cz, cw)
}

proto.lookAt = function(t, eye, center, up) {
  this.recalcMatrix(t)

  center = center || this.computedCenter
  eye    = eye    || this.computedEye
  up     = up     || this.computedUp

  var mat = this.computedMatrix
  lookAt(mat, eye, center, up)

  var rotation = this.computedRotation
  quatFromFrame(rotation,
    mat[0], mat[1], mat[2],
    mat[4], mat[5], mat[6],
    mat[8], mat[9], mat[10])
  normalize4(rotation, rotation)
  this.rotation.set(t, rotation[0], rotation[1], rotation[2], rotation[3])

  var fl = 0.0
  for(var i=0; i<3; ++i) {
    fl += Math.pow(center[i] - eye[i], 2)
  }
  this.radius.set(t, 0.5 * Math.log(Math.max(fl, 1e-6)))

  this.center.set(t, center[0], center[1], center[2])
}

proto.translate = function(t, dx, dy, dz) {
  this.center.move(t,
    dx||0.0,
    dy||0.0,
    dz||0.0)
}

proto.setMatrix = function(t, matrix) {

  var rotation = this.computedRotation
  quatFromFrame(rotation,
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10])
  normalize4(rotation, rotation)
  this.rotation.set(t, rotation[0], rotation[1], rotation[2], rotation[3])

  var mat = this.computedMatrix
  invert44(mat, matrix)
  var w = mat[15]
  if(Math.abs(w) > 1e-6) {
    var cx = mat[12]/w
    var cy = mat[13]/w
    var cz = mat[14]/w

    this.recalcMatrix(t)  
    var r = Math.exp(this.computedRadius[0])
    this.center.set(t, cx-mat[2]*r, cy-mat[6]*r, cz-mat[10]*r)
    this.radius.idle(t)
  } else {
    this.center.idle(t)
    this.radius.idle(t)
  }
}

proto.setDistance = function(t, d) {
  if(d > 0) {
    this.radius.set(t, Math.log(d))
  }
}

proto.setDistanceLimits = function(lo, hi) {
  if(lo > 0) {
    lo = Math.log(lo)
  } else {
    lo = -Infinity    
  }
  if(hi > 0) {
    hi = Math.log(hi)
  } else {
    hi = Infinity
  }
  hi = Math.max(hi, lo)
  this.radius.bounds[0][0] = lo
  this.radius.bounds[1][0] = hi
}

proto.getDistanceLimits = function(out) {
  var bounds = this.radius.bounds
  if(out) {
    out[0] = Math.exp(bounds[0][0])
    out[1] = Math.exp(bounds[1][0])
    return out
  }
  return [ Math.exp(bounds[0][0]), Math.exp(bounds[1][0]) ]
}

proto.toJSON = function() {
  this.recalcMatrix(this.lastT())
  return {
    center:   this.computedCenter.slice(),
    rotation: this.computedRotation.slice(),
    distance: Math.log(this.computedRadius[0]),
    zoomMin:  this.radius.bounds[0][0],
    zoomMax:  this.radius.bounds[1][0]
  }
}

proto.fromJSON = function(options) {
  var t = this.lastT()
  var c = options.center
  if(c) {
    this.center.set(t, c[0], c[1], c[2])
  }
  var r = options.rotation
  if(r) {
    this.rotation.set(t, r[0], r[1], r[2], r[3])
  }
  var d = options.distance
  if(d && d > 0) {
    this.radius.set(t, Math.log(d))
  }
  this.setDistanceLimits(options.zoomMin, options.zoomMax)
}

function createOrbitController(options) {
  options = options || {}
  var center   = options.center   || [0,0,0]
  var rotation = options.rotation || [0,0,0,1]
  var radius   = options.radius   || 1.0

  center = [].slice.call(center, 0, 3)
  rotation = [].slice.call(rotation, 0, 4)
  normalize4(rotation, rotation)

  var result = new OrbitCameraController(
    rotation,
    center,
    Math.log(radius))

  result.setDistanceLimits(options.zoomMin, options.zoomMax)

  if('eye' in options || 'up' in options) {
    result.lookAt(0, options.eye, options.center, options.up)
  }

  return result
}

/***/ }),

/***/ "./node_modules/parse-unit/index.js":
/*!******************************************!*\
  !*** ./node_modules/parse-unit/index.js ***!
  \******************************************/
/***/ ((module) => {

module.exports = function parseUnit(str, out) {
    if (!out)
        out = [ 0, '' ]

    str = String(str)
    var num = parseFloat(str, 10)
    out[0] = num
    out[1] = str.match(/[\d.\-\+]*\s*(.*)/)[1] || ''
    return out
}

/***/ }),

/***/ "./node_modules/quat-slerp/index.js":
/*!******************************************!*\
  !*** ./node_modules/quat-slerp/index.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(/*! gl-quat/slerp */ "./node_modules/gl-quat/slerp.js")

/***/ }),

/***/ "./node_modules/right-now/browser.js":
/*!*******************************************!*\
  !*** ./node_modules/right-now/browser.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports =
  __webpack_require__.g.performance &&
  __webpack_require__.g.performance.now ? function now() {
    return performance.now()
  } : Date.now || function now() {
    return +new Date
  }


/***/ }),

/***/ "./src/site.css":
/*!**********************!*\
  !*** ./src/site.css ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_site_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./site.css */ "./node_modules/css-loader/dist/cjs.js!./src/site.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_site_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_site_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_site_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_site_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {

"use strict";


var stylesInDOM = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };

    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);

  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }

      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };

  return updater;
}

module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();

        stylesInDOM.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {

"use strict";


var memo = {};
/* istanbul ignore next  */

function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }

    memo[target] = styleTarget;
  }

  return memo[target];
}
/* istanbul ignore next  */


function insertBySelector(insert, style) {
  var target = getTarget(insert);

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }

  target.appendChild(style);
}

module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}

module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}

module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";

  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }

  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }

  var needLayer = typeof obj.layer !== "undefined";

  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }

  css += obj.css;

  if (needLayer) {
    css += "}";
  }

  if (obj.media) {
    css += "}";
  }

  if (obj.supports) {
    css += "}";
  }

  var sourceMap = obj.sourceMap;

  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  options.styleTagTransform(css, styleElement, options.options);
}

function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }

  styleElement.parentNode.removeChild(styleElement);
}
/* istanbul ignore next  */


function domAPI(options) {
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}

module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }

    styleElement.appendChild(document.createTextNode(css));
  }
}

module.exports = styleTagTransform;

/***/ }),

/***/ "./node_modules/to-px/browser.js":
/*!***************************************!*\
  !*** ./node_modules/to-px/browser.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var parseUnit = __webpack_require__(/*! parse-unit */ "./node_modules/parse-unit/index.js")

module.exports = toPX

var PIXELS_PER_INCH = getSizeBrutal('in', document.body) // 96


function getPropertyInPX(element, prop) {
  var parts = parseUnit(getComputedStyle(element).getPropertyValue(prop))
  return parts[0] * toPX(parts[1], element)
}

//This brutal hack is needed
function getSizeBrutal(unit, element) {
  var testDIV = document.createElement('div')
  testDIV.style['height'] = '128' + unit
  element.appendChild(testDIV)
  var size = getPropertyInPX(testDIV, 'height') / 128
  element.removeChild(testDIV)
  return size
}

function toPX(str, element) {
  if (!str) return null

  element = element || document.body
  str = (str + '' || 'px').trim().toLowerCase()
  if(element === window || element === document) {
    element = document.body
  }

  switch(str) {
    case '%':  //Ambiguous, not sure if we should use width or height
      return element.clientHeight / 100.0
    case 'ch':
    case 'ex':
      return getSizeBrutal(str, element)
    case 'em':
      return getPropertyInPX(element, 'font-size')
    case 'rem':
      return getPropertyInPX(document.body, 'font-size')
    case 'vw':
      return window.innerWidth/100
    case 'vh':
      return window.innerHeight/100
    case 'vmin':
      return Math.min(window.innerWidth, window.innerHeight) / 100
    case 'vmax':
      return Math.max(window.innerWidth, window.innerHeight) / 100
    case 'in':
      return PIXELS_PER_INCH
    case 'cm':
      return PIXELS_PER_INCH / 2.54
    case 'mm':
      return PIXELS_PER_INCH / 25.4
    case 'pt':
      return PIXELS_PER_INCH / 72
    case 'pc':
      return PIXELS_PER_INCH / 6
    case 'px':
      return 1
  }

  // detect number of units
  var parts = parseUnit(str)
  if (!isNaN(parts[0]) && parts[1]) {
    var px = toPX(parts[1], element)
    return typeof px === 'number' ? parts[0] * px : null
  }

  return null
}


/***/ }),

/***/ "./src/atom.ts":
/*!*********************!*\
  !*** ./src/atom.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Atom = void 0;
const gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
class Atom {
    constructor(x, y, z, name, residueAtomName) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.name = name;
        this.residueAtomName = residueAtomName;
    }
    GetColor() {
        if (this.name == "C") {
            return gl_matrix_1.vec3.fromValues(0.3, 0.8, 0.3);
        }
        else if (this.name == "N") {
            return gl_matrix_1.vec3.fromValues(0.05, 0.05, 0.85);
        }
        else if (this.name == "O") {
            return gl_matrix_1.vec3.fromValues(0.85, 0.05, 0.05);
        }
        else if (this.name == "S") {
            return gl_matrix_1.vec3.fromValues(0.975, 0.975, 0.025);
        }
        return gl_matrix_1.vec3.fromValues(1, 0.1, 1);
    }
}
exports.Atom = Atom;


/***/ }),

/***/ "./src/atomDatabase.ts":
/*!*****************************!*\
  !*** ./src/atomDatabase.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GetAtomType = exports.AtomTypes = exports.LoadAtomTypes = exports.AtomType = void 0;
const atomTypesText = __webpack_require__(/*! ./data/atomTypes.xml */ "./src/data/atomTypes.xml");
const atomCovalentRadiiText = __webpack_require__(/*! ./data/atomCovalentRadii.xml */ "./src/data/atomCovalentRadii.xml");
class AtomType {
    constructor(number, name, identifier) {
        this.covalentRadius = 1;
        this.name = name;
        this.identifier = identifier;
        this.number = number;
    }
}
exports.AtomType = AtomType;
function LoadAtomTypes() {
    var _a;
    let covalentRadii = LoadCovalentRadii();
    let result = [];
    let lines = atomTypesText.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/atom identifier="(\w+)" name="(\w+)" number="(\d+)"/);
        if (match == null) {
            continue;
        }
        let atomType = new AtomType(parseInt(match[3]), match[2], match[1]);
        atomType.covalentRadius = (_a = covalentRadii.get(atomType.number)) !== null && _a !== void 0 ? _a : 1;
        result.push(atomType);
    }
    return result;
}
exports.LoadAtomTypes = LoadAtomTypes;
function LoadCovalentRadii() {
    let result = new Map();
    let lines = atomCovalentRadiiText.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/covalent id="(\d+)" radius="(\d+\.\d+)"/);
        if (match == null) {
            continue;
        }
        result.set(parseInt(match[1]), parseFloat(match[2]));
    }
    return result;
}
function MakeAtomTypesNumberMap(atomTypes) {
    let result = new Map();
    for (let i = 0; i < atomTypes.length; i++) {
        const atomType = atomTypes[i];
        result.set(atomType.number, atomType);
    }
    return result;
}
function MakeAtomTypesIdentifierMap(atomTypes) {
    let result = new Map();
    for (let i = 0; i < atomTypes.length; i++) {
        const atomType = atomTypes[i];
        result.set(atomType.identifier, atomType);
    }
    return result;
}
exports.AtomTypes = LoadAtomTypes();
const AtomTypesNumberMap = MakeAtomTypesNumberMap(exports.AtomTypes);
const AtomTypesIdentifierMap = MakeAtomTypesIdentifierMap(exports.AtomTypes);
function GetAtomType(atom) {
    var _a;
    return (_a = AtomTypesIdentifierMap.get(atom.name)) !== null && _a !== void 0 ? _a : exports.AtomTypes[0];
}
exports.GetAtomType = GetAtomType;


/***/ }),

/***/ "./src/chain.ts":
/*!**********************!*\
  !*** ./src/chain.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Chain = void 0;
class Chain {
    constructor(name, residues) {
        this.name = name;
        this.residues = residues;
    }
}
exports.Chain = Chain;


/***/ }),

/***/ "./src/data/test_data.ts":
/*!*******************************!*\
  !*** ./src/data/test_data.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Data1cqw = exports.TestData = void 0;
exports.TestData = `
ATOM      1  N   ILE A  15      11.749  11.774  21.160  1.00 13.80           N  
ATOM      2  CA  ILE A  15      11.701  12.518  19.867  1.00 13.69           C  
ATOM      3  C   ILE A  15      11.554  11.546  18.697  1.00 13.63           C  
ATOM      4  O   ILE A  15      12.345  10.617  18.540  1.00 13.65           O  
ATOM      5  CB  ILE A  15      12.971  13.382  19.695  1.00 13.70           C  
ATOM      6  CG1 ILE A  15      13.005  14.454  20.790  0.91 13.70           C  
ATOM      7  CG2 ILE A  15      12.997  14.024  18.310  1.00 13.67           C  
ATOM      8  CD1 ILE A  15      14.242  15.326  20.773  0.78 13.72           C  
ATOM      9  N   GLY A  16      10.528  11.772  17.881  1.00 13.57           N  
ATOM     10  CA  GLY A  16      10.260  10.903  16.747  1.00 13.45           C  
ATOM     11  C   GLY A  16      11.351  10.820  15.696  1.00 13.40           C  
ATOM     12  O   GLY A  16      11.990  11.818  15.362  1.00 13.32           O  
ATOM     13  N   THR A  17      11.558  09.620  15.163  1.00 13.37           N  
ATOM     14  CA  THR A  17      12.577  09.403  14.142  1.00 13.38           C  
ATOM     15  C   THR A  17      11.952  09.091  12.789  1.00 13.40           C  
ATOM     16  O   THR A  17      12.647  09.041  11.773  1.00 13.41           O  
ATOM     17  CB  THR A  17      13.509  08.237  14.520  1.00 13.38           C  
ATOM     18  OG1 THR A  17      12.750  07.024  14.603  0.91 13.40           O  
ATOM     19  CG2 THR A  17      14.175  08.506  15.862  0.96 13.41           C  
ATOM     20  N   GLY A  18      10.640  08.882  12.776  1.00 13.43           N  
ATOM     21  CA  GLY A  18       9.965  08.576  11.529  1.00 13.48           C  
ATOM     22  C   GLY A  18       9.676  09.815  10.703  1.00 13.51           C  
ATOM     23  O   GLY A  18       9.789  10.939  11.193  1.00 13.53           O  
ATOM     24  N   PHE A  19       9.311  09.604  09.442  1.00 13.53           N  
ATOM     25  CA  PHE A  19       8.982  10.696  08.530  1.00 13.54           C  
ATOM     26  C   PHE A  19       7.673  10.291  07.846  1.00 13.59           C  
ATOM     27  O   PHE A  19       7.663  09.891  06.681  1.00 13.60           O  
ATOM     28  CB  PHE A  19      10.093  10.870  07.490  1.00 13.49           C  
ATOM     29  CG  PHE A  19       9.991  12.146  06.702  1.00 13.45           C  
ATOM     30  CD1 PHE A  19      10.189  13.378  07.323  1.00 13.44           C  
ATOM     31  CD2 PHE A  19       9.684  12.121  05.345  0.98 13.45           C  
ATOM     32  CE1 PHE A  19      10.082  14.565  06.603  1.00 13.44           C  
ATOM     33  CE2 PHE A  19       9.575  13.303  04.616  1.00 13.43           C  
ATOM     34  CZ  PHE A  19       9.775  14.529  05.247  1.00 13.42           C  
`;
exports.Data1cqw = `
HEADER    HYDROLASE                               11-AUG-99   1CQW              
TITLE     NAI COCRYSTALLISED WITH HALOALKANE DEHALOGENASE FROM A RHODOCOCCUS    
TITLE    2 SPECIES                                                              
COMPND    MOL_ID: 1;                                                            
COMPND   2 MOLECULE: HALOALKANE DEHALOGENASE; 1-CHLOROHEXANE HALIDOHYDROLASE;   
COMPND   3 CHAIN: A;                                                            
COMPND   4 EC: 3.8.1.5;                                                         
COMPND   5 ENGINEERED: YES;                                                     
COMPND   6 OTHER_DETAILS: COCRYSTALLIZED WITH NAI                               
SOURCE    MOL_ID: 1;                                                            
SOURCE   2 ORGANISM_SCIENTIFIC: RHODOCOCCUS SP.;                                
SOURCE   3 ORGANISM_TAXID: 1831;                                                
SOURCE   4 EXPRESSION_SYSTEM: ESCHERICHIA COLI;                                 
SOURCE   5 EXPRESSION_SYSTEM_TAXID: 562;                                        
SOURCE   6 EXPRESSION_SYSTEM_PLASMID: PTRCHIS                                   
KEYWDS    A/B HYDROLASE FOLD, DEHALOGENASE I-S BOND, HYDROLASE                  
EXPDTA    X-RAY DIFFRACTION                                                     
AUTHOR    J.NEWMAN,T.S.PEAT,R.RICHARD,L.KAN,P.E.SWANSON,J.A.AFFHOLTER,          
AUTHOR   2 I.H.HOLMES,J.F.SCHINDLER,C.J.UNKEFER,T.C.TERWILLIGER                 
REVDAT   6   04-OCT-17 1CQW    1       REMARK                                   
REVDAT   5   24-FEB-09 1CQW    1       VERSN                                    
REVDAT   4   01-APR-03 1CQW    1       JRNL                                     
REVDAT   3   05-JUL-00 1CQW    1       SOURCE REMARK DBREF  SEQADV              
REVDAT   3 2                   1       AUTHOR JRNL                              
REVDAT   2   12-JAN-00 1CQW    1       JRNL   COMPND                            
REVDAT   1   31-AUG-99 1CQW    0                                                
JRNL        AUTH   J.NEWMAN,T.S.PEAT,R.RICHARD,L.KAN,P.E.SWANSON,J.A.AFFHOLTER, 
JRNL        AUTH 2 I.H.HOLMES,J.F.SCHINDLER,C.J.UNKEFER,T.C.TERWILLIGER         
JRNL        TITL   HALOALKANE DEHALOGENASES: STRUCTURE OF A RHODOCOCCUS ENZYME. 
JRNL        REF    BIOCHEMISTRY                  V.  38 16105 1999              
JRNL        REFN                   ISSN 0006-2960                               
JRNL        PMID   10587433                                                     
JRNL        DOI    10.1021/BI9913855                                            
REMARK   2                                                                      
REMARK   2 RESOLUTION.    1.50 ANGSTROMS.                                       
REMARK   3                                                                      
REMARK   3 REFINEMENT.                                                          
REMARK   3   PROGRAM     : CNS                                                  
REMARK   3   AUTHORS     : BRUNGER,ADAMS,CLORE,DELANO,GROS,GROSSE-              
REMARK   3               : KUNSTLEVE,JIANG,KUSZEWSKI,NILGES,PANNU,              
REMARK   3               : READ,RICE,SIMONSON,WARREN                            
REMARK   3                                                                      
REMARK   3  REFINEMENT TARGET : NULL                                            
REMARK   3                                                                      
REMARK   3  DATA USED IN REFINEMENT.                                            
REMARK   3   RESOLUTION RANGE HIGH (ANGSTROMS) : 1.50                           
REMARK   3   RESOLUTION RANGE LOW  (ANGSTROMS) : 12.90                          
REMARK   3   DATA CUTOFF            (SIGMA(F)) : 3.000                          
REMARK   3   DATA CUTOFF HIGH         (ABS(F)) : 1371216.830                    
REMARK   3   DATA CUTOFF LOW          (ABS(F)) : 0.0000                         
REMARK   3   COMPLETENESS (WORKING+TEST)   (%) : 91.9                           
REMARK   3   NUMBER OF REFLECTIONS             : 46900                          
REMARK   3                                                                      
REMARK   3  FIT TO DATA USED IN REFINEMENT.                                     
REMARK   3   CROSS-VALIDATION METHOD          : THROUGHOUT                      
REMARK   3   FREE R VALUE TEST SET SELECTION  : RANDOM                          
REMARK   3   R VALUE            (WORKING SET) : 0.176                           
REMARK   3   FREE R VALUE                     : 0.188                           
REMARK   3   FREE R VALUE TEST SET SIZE   (%) : 5.000                           
REMARK   3   FREE R VALUE TEST SET COUNT      : 2350                            
REMARK   3   ESTIMATED ERROR OF FREE R VALUE  : 0.004                           
REMARK   3                                                                      
REMARK   3  FIT IN THE HIGHEST RESOLUTION BIN.                                  
REMARK   3   TOTAL NUMBER OF BINS USED           : 6                            
REMARK   3   BIN RESOLUTION RANGE HIGH       (A) : 1.50                         
REMARK   3   BIN RESOLUTION RANGE LOW        (A) : 1.59                         
REMARK   3   BIN COMPLETENESS (WORKING+TEST) (%) : 84.40                        
REMARK   3   REFLECTIONS IN BIN    (WORKING SET) : 6694                         
REMARK   3   BIN R VALUE           (WORKING SET) : 0.1880                       
REMARK   3   BIN FREE R VALUE                    : 0.2070                       
REMARK   3   BIN FREE R VALUE TEST SET SIZE  (%) : 5.40                         
REMARK   3   BIN FREE R VALUE TEST SET COUNT     : 383                          
REMARK   3   ESTIMATED ERROR OF BIN FREE R VALUE : 0.011                        
REMARK   3                                                                      
REMARK   3  NUMBER OF NON-HYDROGEN ATOMS USED IN REFINEMENT.                    
REMARK   3   PROTEIN ATOMS            : 2358                                    
REMARK   3   NUCLEIC ACID ATOMS       : 0                                       
REMARK   3   HETEROGEN ATOMS          : 2                                       
REMARK   3   SOLVENT ATOMS            : 394                                     
REMARK   3                                                                      
REMARK   3  B VALUES.                                                           
REMARK   3   FROM WILSON PLOT           (A**2) : 13.20                          
REMARK   3   MEAN B VALUE      (OVERALL, A**2) : 12.10                          
REMARK   3   OVERALL ANISOTROPIC B VALUE.                                       
REMARK   3    B11 (A**2) : -0.31000                                             
REMARK   3    B22 (A**2) : -0.17000                                             
REMARK   3    B33 (A**2) : 0.48000                                              
REMARK   3    B12 (A**2) : 0.00000                                              
REMARK   3    B13 (A**2) : 0.00000                                              
REMARK   3    B23 (A**2) : 0.00000                                              
REMARK   3                                                                      
REMARK   3  ESTIMATED COORDINATE ERROR.                                         
REMARK   3   ESD FROM LUZZATI PLOT        (A) : 0.14                            
REMARK   3   ESD FROM SIGMAA              (A) : 0.08                            
REMARK   3   LOW RESOLUTION CUTOFF        (A) : 5.00                            
REMARK   3                                                                      
REMARK   3  CROSS-VALIDATED ESTIMATED COORDINATE ERROR.                         
REMARK   3   ESD FROM C-V LUZZATI PLOT    (A) : 0.16                            
REMARK   3   ESD FROM C-V SIGMAA          (A) : 0.09                            
REMARK   3                                                                      
REMARK   3  RMS DEVIATIONS FROM IDEAL VALUES.                                   
REMARK   3   BOND LENGTHS                 (A) : 0.007                           
REMARK   3   BOND ANGLES            (DEGREES) : 1.500                           
REMARK   3   DIHEDRAL ANGLES        (DEGREES) : 22.00                           
REMARK   3   IMPROPER ANGLES        (DEGREES) : 0.910                           
REMARK   3                                                                      
REMARK   3  ISOTROPIC THERMAL MODEL : RESTRAINED                                
REMARK   3                                                                      
REMARK   3  ISOTROPIC THERMAL FACTOR RESTRAINTS.    RMS    SIGMA                
REMARK   3   MAIN-CHAIN BOND              (A**2) : 0.140 ; 1.500                
REMARK   3   MAIN-CHAIN ANGLE             (A**2) : 0.250 ; 2.000                
REMARK   3   SIDE-CHAIN BOND              (A**2) : 0.070 ; 2.000                
REMARK   3   SIDE-CHAIN ANGLE             (A**2) : 0.130 ; 2.500                
REMARK   3                                                                      
REMARK   3  BULK SOLVENT MODELING.                                              
REMARK   3   METHOD USED : NULL                                                 
REMARK   3   KSOL        : NULL                                                 
REMARK   3   BSOL        : NULL                                                 
REMARK   3                                                                      
REMARK   3  NCS MODEL : NULL                                                    
REMARK   3                                                                      
REMARK   3  NCS RESTRAINTS.                         RMS   SIGMA/WEIGHT          
REMARK   3   GROUP  1  POSITIONAL            (A) : NULL  ; NULL                 
REMARK   3   GROUP  1  B-FACTOR           (A**2) : NULL  ; NULL                 
REMARK   3                                                                      
REMARK   3  PARAMETER FILE  1  : PROTEIN_REP.PA                                 
REMARK   3  PARAMETER FILE  2  : WATER_REP.PARA                                 
REMARK   3  PARAMETER FILE  3  : ION.PARAM                                      
REMARK   3  PARAMETER FILE  4  : NULL                                           
REMARK   3  TOPOLOGY FILE  1   : PROTEIN.TOP                                    
REMARK   3  TOPOLOGY FILE  2   : WATER.TOP                                      
REMARK   3  TOPOLOGY FILE  3   : ION.TOP                                        
REMARK   3  TOPOLOGY FILE  4   : NULL                                           
REMARK   3                                                                      
REMARK   3  OTHER REFINEMENT REMARKS: NULL                                      
REMARK   4                                                                      
REMARK   4 1CQW COMPLIES WITH FORMAT V. 3.30, 13-JUL-11                         
REMARK 100                                                                      
REMARK 100 THIS ENTRY HAS BEEN PROCESSED BY RCSB ON 13-AUG-99.                  
REMARK 100 THE DEPOSITION ID IS D_1000009501.                                   
REMARK 200                                                                      
REMARK 200 EXPERIMENTAL DETAILS                                                 
REMARK 200  EXPERIMENT TYPE                : X-RAY DIFFRACTION                  
REMARK 200  DATE OF DATA COLLECTION        : NOV-97                             
REMARK 200  TEMPERATURE           (KELVIN) : 110                                
REMARK 200  PH                             : 5.5                                
REMARK 200  NUMBER OF CRYSTALS USED        : 1                                  
REMARK 200                                                                      
REMARK 200  SYNCHROTRON              (Y/N) : Y                                  
REMARK 200  RADIATION SOURCE               : NSLS                               
REMARK 200  BEAMLINE                       : X8C                                
REMARK 200  X-RAY GENERATOR MODEL          : NULL                               
REMARK 200  MONOCHROMATIC OR LAUE    (M/L) : M                                  
REMARK 200  WAVELENGTH OR RANGE        (A) : 1.072                              
REMARK 200  MONOCHROMATOR                  : NULL                               
REMARK 200  OPTICS                         : NULL                               
REMARK 200                                                                      
REMARK 200  DETECTOR TYPE                  : AREA DETECTOR                      
REMARK 200  DETECTOR MANUFACTURER          : MARRESEARCH                        
REMARK 200  INTENSITY-INTEGRATION SOFTWARE : DENZO                              
REMARK 200  DATA SCALING SOFTWARE          : CCP4 (AGROVATA, ROTAVATA           
REMARK 200                                                                      
REMARK 200  NUMBER OF UNIQUE REFLECTIONS   : 47965                              
REMARK 200  RESOLUTION RANGE HIGH      (A) : 1.500                              
REMARK 200  RESOLUTION RANGE LOW       (A) : 12.900                             
REMARK 200  REJECTION CRITERIA  (SIGMA(I)) : 3.000                              
REMARK 200                                                                      
REMARK 200 OVERALL.                                                             
REMARK 200  COMPLETENESS FOR RANGE     (%) : 93.1                               
REMARK 200  DATA REDUNDANCY                : 4.200                              
REMARK 200  R MERGE                    (I) : 0.06500                            
REMARK 200  R SYM                      (I) : NULL                               
REMARK 200  <I/SIGMA(I)> FOR THE DATA SET  : 10.6000                            
REMARK 200                                                                      
REMARK 200 IN THE HIGHEST RESOLUTION SHELL.                                     
REMARK 200  HIGHEST RESOLUTION SHELL, RANGE HIGH (A) : 1.49                     
REMARK 200  HIGHEST RESOLUTION SHELL, RANGE LOW  (A) : 1.57                     
REMARK 200  COMPLETENESS FOR SHELL     (%) : 78.6                               
REMARK 200  DATA REDUNDANCY IN SHELL       : 3.20                               
REMARK 200  R MERGE FOR SHELL          (I) : 0.15400                            
REMARK 200  R SYM FOR SHELL            (I) : NULL                               
REMARK 200  <I/SIGMA(I)> FOR SHELL         : NULL                               
REMARK 200                                                                      
REMARK 200 DIFFRACTION PROTOCOL: SINGLE WAVELENGTH                              
REMARK 200 METHOD USED TO DETERMINE THE STRUCTURE: NULL                         
REMARK 200 SOFTWARE USED: CNS                                                   
REMARK 200 STARTING MODEL: NULL                                                 
REMARK 200                                                                      
REMARK 200 REMARK: NULL                                                         
REMARK 280                                                                      
REMARK 280 CRYSTAL                                                              
REMARK 280 SOLVENT CONTENT, VS   (%): 47.51                                     
REMARK 280 MATTHEWS COEFFICIENT, VM (ANGSTROMS**3/DA): 2.34                     
REMARK 280                                                                      
REMARK 280 CRYSTALLIZATION CONDITIONS: 20-25% PEG 1.5K, 0.1M MES PH 5.5 0.3M    
REMARK 280  NAACETATE, VAPOR DIFFUSION, HANGING DROP, TEMPERATURE 281K          
REMARK 290                                                                      
REMARK 290 CRYSTALLOGRAPHIC SYMMETRY                                            
REMARK 290 SYMMETRY OPERATORS FOR SPACE GROUP: P 21 21 2                        
REMARK 290                                                                      
REMARK 290      SYMOP   SYMMETRY                                                
REMARK 290     NNNMMM   OPERATOR                                                
REMARK 290       1555   X,Y,Z                                                   
REMARK 290       2555   -X,-Y,Z                                                 
REMARK 290       3555   -X+1/2,Y+1/2,-Z                                         
REMARK 290       4555   X+1/2,-Y+1/2,-Z                                         
REMARK 290                                                                      
REMARK 290     WHERE NNN -> OPERATOR NUMBER                                     
REMARK 290           MMM -> TRANSLATION VECTOR                                  
REMARK 290                                                                      
REMARK 290 CRYSTALLOGRAPHIC SYMMETRY TRANSFORMATIONS                            
REMARK 290 THE FOLLOWING TRANSFORMATIONS OPERATE ON THE ATOM/HETATM             
REMARK 290 RECORDS IN THIS ENTRY TO PRODUCE CRYSTALLOGRAPHICALLY                
REMARK 290 RELATED MOLECULES.                                                   
REMARK 290   SMTRY1   1  1.000000  0.000000  0.000000        0.00000            
REMARK 290   SMTRY2   1  0.000000  1.000000  0.000000        0.00000            
REMARK 290   SMTRY3   1  0.000000  0.000000  1.000000        0.00000            
REMARK 290   SMTRY1   2 -1.000000  0.000000  0.000000        0.00000            
REMARK 290   SMTRY2   2  0.000000 -1.000000  0.000000        0.00000            
REMARK 290   SMTRY3   2  0.000000  0.000000  1.000000        0.00000            
REMARK 290   SMTRY1   3 -1.000000  0.000000  0.000000       46.27500            
REMARK 290   SMTRY2   3  0.000000  1.000000  0.000000       39.61500            
REMARK 290   SMTRY3   3  0.000000  0.000000 -1.000000        0.00000            
REMARK 290   SMTRY1   4  1.000000  0.000000  0.000000       46.27500            
REMARK 290   SMTRY2   4  0.000000 -1.000000  0.000000       39.61500            
REMARK 290   SMTRY3   4  0.000000  0.000000 -1.000000        0.00000            
REMARK 290                                                                      
REMARK 290 REMARK: NULL                                                         
REMARK 300                                                                      
REMARK 300 BIOMOLECULE: 1                                                       
REMARK 300 SEE REMARK 350 FOR THE AUTHOR PROVIDED AND/OR PROGRAM                
REMARK 300 GENERATED ASSEMBLY INFORMATION FOR THE STRUCTURE IN                  
REMARK 300 THIS ENTRY. THE REMARK MAY ALSO PROVIDE INFORMATION ON               
REMARK 300 BURIED SURFACE AREA.                                                 
REMARK 350                                                                      
REMARK 350 COORDINATES FOR A COMPLETE MULTIMER REPRESENTING THE KNOWN           
REMARK 350 BIOLOGICALLY SIGNIFICANT OLIGOMERIZATION STATE OF THE                
REMARK 350 MOLECULE CAN BE GENERATED BY APPLYING BIOMT TRANSFORMATIONS          
REMARK 350 GIVEN BELOW.  BOTH NON-CRYSTALLOGRAPHIC AND                          
REMARK 350 CRYSTALLOGRAPHIC OPERATIONS ARE GIVEN.                               
REMARK 350                                                                      
REMARK 350 BIOMOLECULE: 1                                                       
REMARK 350 AUTHOR DETERMINED BIOLOGICAL UNIT: MONOMERIC                         
REMARK 350 APPLY THE FOLLOWING TO CHAINS: A                                     
REMARK 350   BIOMT1   1  1.000000  0.000000  0.000000        0.00000            
REMARK 350   BIOMT2   1  0.000000  1.000000  0.000000        0.00000            
REMARK 350   BIOMT3   1  0.000000  0.000000  1.000000        0.00000            
REMARK 500                                                                      
REMARK 500 GEOMETRY AND STEREOCHEMISTRY                                         
REMARK 500 SUBTOPIC: COVALENT BOND LENGTHS                                      
REMARK 500                                                                      
REMARK 500 THE STEREOCHEMICAL PARAMETERS OF THE FOLLOWING RESIDUES              
REMARK 500 HAVE VALUES WHICH DEVIATE FROM EXPECTED VALUES BY MORE               
REMARK 500 THAN 6*RMSD (M=MODEL NUMBER; RES=RESIDUE NAME; C=CHAIN               
REMARK 500 IDENTIFIER; SSEQ=SEQUENCE NUMBER; I=INSERTION CODE).                 
REMARK 500                                                                      
REMARK 500 STANDARD TABLE:                                                      
REMARK 500 FORMAT: (10X,I3,1X,2(A3,1X,A1,I4,A1,1X,A4,3X),1X,F6.3)               
REMARK 500                                                                      
REMARK 500 EXPECTED VALUES PROTEIN: ENGH AND HUBER, 1999                        
REMARK 500 EXPECTED VALUES NUCLEIC ACID: CLOWNEY ET AL 1996                     
REMARK 500                                                                      
REMARK 500  M RES CSSEQI ATM1   RES CSSEQI ATM2   DEVIATION                     
REMARK 500    GLU A 109   CB    GLU A 109   CG      0.176                       
REMARK 500                                                                      
REMARK 500 REMARK: NULL                                                         
REMARK 500                                                                      
REMARK 500 GEOMETRY AND STEREOCHEMISTRY                                         
REMARK 500 SUBTOPIC: TORSION ANGLES                                             
REMARK 500                                                                      
REMARK 500 TORSION ANGLES OUTSIDE THE EXPECTED RAMACHANDRAN REGIONS:            
REMARK 500 (M=MODEL NUMBER; RES=RESIDUE NAME; C=CHAIN IDENTIFIER;               
REMARK 500 SSEQ=SEQUENCE NUMBER; I=INSERTION CODE).                             
REMARK 500                                                                      
REMARK 500 STANDARD TABLE:                                                      
REMARK 500 FORMAT:(10X,I3,1X,A3,1X,A1,I4,A1,4X,F7.2,3X,F7.2)                    
REMARK 500                                                                      
REMARK 500 EXPECTED VALUES: GJ KLEYWEGT AND TA JONES (1996). PHI/PSI-           
REMARK 500 CHOLOGY: RAMACHANDRAN REVISITED. STRUCTURE 4, 1395 - 1400            
REMARK 500                                                                      
REMARK 500  M RES CSSEQI        PSI       PHI                                   
REMARK 500    PRO A  20       46.10    -73.34                                   
REMARK 500    PRO A  53       48.03   -108.35                                   
REMARK 500    THR A  54     -157.78    -98.56                                   
REMARK 500    SER A  55     -169.29   -163.47                                   
REMARK 500    GLU A 109      -92.17   -100.36                                   
REMARK 500    ASP A 117     -130.44     47.12                                   
REMARK 500    GLU A 141       60.15     39.27                                   
REMARK 500    ASP A 167      -53.52     70.23                                   
REMARK 500    VAL A 256      -71.01   -134.73                                   
REMARK 500    LEU A 282      -93.91   -117.03                                   
REMARK 500                                                                      
REMARK 500 REMARK: NULL                                                         
REMARK 500                                                                      
REMARK 500 GEOMETRY AND STEREOCHEMISTRY                                         
REMARK 500 SUBTOPIC: MAIN CHAIN PLANARITY                                       
REMARK 500                                                                      
REMARK 500 THE FOLLOWING RESIDUES HAVE A PSEUDO PLANARITY                       
REMARK 500 TORSION ANGLE, C(I) - CA(I) - N(I+1) - O(I), GREATER                 
REMARK 500 10.0 DEGREES. (M=MODEL NUMBER; RES=RESIDUE NAME;                     
REMARK 500 C=CHAIN IDENTIFIER; SSEQ=SEQUENCE NUMBER;                            
REMARK 500 I=INSERTION CODE).                                                   
REMARK 500                                                                      
REMARK 500  M RES CSSEQI        ANGLE                                           
REMARK 500    LEU A 205        -10.71                                           
REMARK 500                                                                      
REMARK 500 REMARK: NULL                                                         
REMARK 800                                                                      
REMARK 800 SITE                                                                 
REMARK 800 SITE_IDENTIFIER: AC1                                                 
REMARK 800 EVIDENCE_CODE: SOFTWARE                                              
REMARK 800 SITE_DESCRIPTION: BINDING SITE FOR RESIDUE IOD A 321                 
REMARK 800                                                                      
REMARK 800 SITE_IDENTIFIER: AC2                                                 
REMARK 800 EVIDENCE_CODE: SOFTWARE                                              
REMARK 800 SITE_DESCRIPTION: BINDING SITE FOR RESIDUE IOD A 322                 
REMARK 900                                                                      
REMARK 900 RELATED ENTRIES                                                      
REMARK 900 RELATED ID: 1BN7   RELATED DB: PDB                                   
REMARK 900 UNCOMPLEXED PROTEIN AT PH 5.5                                        
REMARK 900 RELATED ID: 1BN6   RELATED DB: PDB                                   
REMARK 900 UNCOMPLEXED PROTEIN AT PH 7.0                                        
DBREF  1CQW A   15   304  UNP    P59336   DHAA_RHOSD       4    293             
SEQADV 1CQW VAL A  183  UNP  P59336    ALA   172 CONFLICT                       
SEQADV 1CQW ILE A  220  UNP  P59336    LEU   209 CONFLICT                       
SEQADV 1CQW GLY A  303  UNP  P59336    ALA   292 CONFLICT                       
SEQADV 1CQW ALA A  305  UNP  P59336              INSERTION                      
SEQADV 1CQW SER A  306  UNP  P59336              INSERTION                      
SEQADV 1CQW GLY A  307  UNP  P59336              INSERTION                      
SEQADV 1CQW LEU A  308  UNP  P59336              INSERTION                      
SEQADV 1CQW GLY A  309  UNP  P59336              INSERTION                      
SEQRES   1 A  295  ILE GLY THR GLY PHE PRO PHE ASP PRO HIS TYR VAL GLU          
SEQRES   2 A  295  VAL LEU GLY GLU ARG MET HIS TYR VAL ASP VAL GLY PRO          
SEQRES   3 A  295  ARG ASP GLY THR PRO VAL LEU PHE LEU HIS GLY ASN PRO          
SEQRES   4 A  295  THR SER SER TYR LEU TRP ARG ASN ILE ILE PRO HIS VAL          
SEQRES   5 A  295  ALA PRO SER HIS ARG CYS ILE ALA PRO ASP LEU ILE GLY          
SEQRES   6 A  295  MET GLY LYS SER ASP LYS PRO ASP LEU ASP TYR PHE PHE          
SEQRES   7 A  295  ASP ASP HIS VAL ARG TYR LEU ASP ALA PHE ILE GLU ALA          
SEQRES   8 A  295  LEU GLY LEU GLU GLU VAL VAL LEU VAL ILE HIS ASP TRP          
SEQRES   9 A  295  GLY SER ALA LEU GLY PHE HIS TRP ALA LYS ARG ASN PRO          
SEQRES  10 A  295  GLU ARG VAL LYS GLY ILE ALA CYS MET GLU PHE ILE ARG          
SEQRES  11 A  295  PRO ILE PRO THR TRP ASP GLU TRP PRO GLU PHE ALA ARG          
SEQRES  12 A  295  GLU THR PHE GLN ALA PHE ARG THR ALA ASP VAL GLY ARG          
SEQRES  13 A  295  GLU LEU ILE ILE ASP GLN ASN ALA PHE ILE GLU GLY VAL          
SEQRES  14 A  295  LEU PRO LYS CYS VAL VAL ARG PRO LEU THR GLU VAL GLU          
SEQRES  15 A  295  MET ASP HIS TYR ARG GLU PRO PHE LEU LYS PRO VAL ASP          
SEQRES  16 A  295  ARG GLU PRO LEU TRP ARG PHE PRO ASN GLU ILE PRO ILE          
SEQRES  17 A  295  ALA GLY GLU PRO ALA ASN ILE VAL ALA LEU VAL GLU ALA          
SEQRES  18 A  295  TYR MET ASN TRP LEU HIS GLN SER PRO VAL PRO LYS LEU          
SEQRES  19 A  295  LEU PHE TRP GLY THR PRO GLY VAL LEU ILE PRO PRO ALA          
SEQRES  20 A  295  GLU ALA ALA ARG LEU ALA GLU SER LEU PRO ASN CYS LYS          
SEQRES  21 A  295  THR VAL ASP ILE GLY PRO GLY LEU HIS TYR LEU GLN GLU          
SEQRES  22 A  295  ASP ASN PRO ASP LEU ILE GLY SER GLU ILE ALA ARG TRP          
SEQRES  23 A  295  LEU PRO GLY LEU ALA SER GLY LEU GLY                          
HET    IOD  A 321       1                                                       
HET    IOD  A 322       1                                                       
HETNAM     IOD IODIDE ION                                                       
FORMUL   2  IOD    2(I 1-)                                                      
FORMUL   4  HOH   *394(H2 O)                                                    
HELIX    1   1 SER A   55  ARG A   60  5                                   6    
HELIX    2   2 ILE A   62  ALA A   67  1                                   6    
HELIX    3   3 PHE A   91  LEU A  106  1                                  16    
HELIX    4   4 ASP A  117  ASN A  130  1                                  14    
HELIX    5   5 THR A  148  TRP A  152  5                                   5    
HELIX    6   6 PRO A  153  ARG A  164  1                                  12    
HELIX    7   7 ASP A  167  ILE A  174  1                                   8    
HELIX    8   8 ASN A  177  GLY A  182  1                                   6    
HELIX    9   9 GLY A  182  CYS A  187  1                                   6    
HELIX   10  10 THR A  193  GLU A  202  1                                  10    
HELIX   11  11 PRO A  203  LEU A  205  5                                   3    
HELIX   12  12 LYS A  206  ASP A  209  5                                   4    
HELIX   13  13 ARG A  210  ILE A  220  1                                  11    
HELIX   14  14 PRO A  226  SER A  243  1                                  18    
HELIX   15  15 PRO A  259  LEU A  270  1                                  12    
HELIX   16  16 TYR A  284  ASP A  288  5                                   5    
HELIX   17  17 ASN A  289  LEU A  301  1                                  13    
HELIX   18  18 PRO A  302  ALA A  305  5                                   4    
SHEET    1   A 8 HIS A  24  VAL A  28  0                                        
SHEET    2   A 8 GLU A  31  VAL A  38 -1  O  GLU A  31   N  VAL A  28           
SHEET    3   A 8 CYS A  72  PRO A  75 -1  N  CYS A  72   O  VAL A  38           
SHEET    4   A 8 VAL A  46  LEU A  49  1  O  VAL A  46   N  ILE A  73           
SHEET    5   A 8 VAL A 111  HIS A 116  1  O  VAL A 112   N  LEU A  47           
SHEET    6   A 8 VAL A 134  MET A 140  1  N  LYS A 135   O  VAL A 111           
SHEET    7   A 8 LYS A 247  PRO A 254  1  O  LEU A 248   N  CYS A 139           
SHEET    8   A 8 CYS A 273  GLY A 281  1  O  LYS A 274   N  LEU A 249           
CISPEP   1 ASN A   52    PRO A   53          0        -0.65                     
CISPEP   2 GLU A  225    PRO A  226          0        -0.43                     
CISPEP   3 THR A  253    PRO A  254          0        -0.06                     
SITE     1 AC1  3 ASN A  52  TRP A 118  PRO A 217                               
SITE     1 AC2  1 CYS A 187                                                     
CRYST1   92.550   79.230   42.650  90.00  90.00  90.00 P 21 21 2     4          
ORIGX1      1.000000  0.000000  0.000000        0.00000                         
ORIGX2      0.000000  1.000000  0.000000        0.00000                         
ORIGX3      0.000000  0.000000  1.000000        0.00000                         
SCALE1      0.010805  0.000000  0.000000        0.00000                         
SCALE2      0.000000  0.012621  0.000000        0.00000                         
SCALE3      0.000000  0.000000  0.023447        0.00000                         
ATOM      1  N   ILE A  15      11.749  81.774  51.160  1.00 13.80           N  
ATOM      2  CA  ILE A  15      11.701  82.518  49.867  1.00 13.69           C  
ATOM      3  C   ILE A  15      11.554  81.546  48.697  1.00 13.63           C  
ATOM      4  O   ILE A  15      12.345  80.617  48.540  1.00 13.65           O  
ATOM      5  CB  ILE A  15      12.971  83.382  49.695  1.00 13.70           C  
ATOM      6  CG1 ILE A  15      13.005  84.454  50.790  0.91 13.70           C  
ATOM      7  CG2 ILE A  15      12.997  84.024  48.310  1.00 13.67           C  
ATOM      8  CD1 ILE A  15      14.242  85.326  50.773  0.78 13.72           C  
ATOM      9  N   GLY A  16      10.528  81.772  47.881  1.00 13.57           N  
ATOM     10  CA  GLY A  16      10.260  80.903  46.747  1.00 13.45           C  
ATOM     11  C   GLY A  16      11.351  80.820  45.696  1.00 13.40           C  
ATOM     12  O   GLY A  16      11.990  81.818  45.362  1.00 13.32           O  
ATOM     13  N   THR A  17      11.558  79.620  45.163  1.00 13.37           N  
ATOM     14  CA  THR A  17      12.577  79.403  44.142  1.00 13.38           C  
ATOM     15  C   THR A  17      11.952  79.091  42.789  1.00 13.40           C  
ATOM     16  O   THR A  17      12.647  79.041  41.773  1.00 13.41           O  
ATOM     17  CB  THR A  17      13.509  78.237  44.520  1.00 13.38           C  
ATOM     18  OG1 THR A  17      12.750  77.024  44.603  0.91 13.40           O  
ATOM     19  CG2 THR A  17      14.175  78.506  45.862  0.96 13.41           C  
ATOM     20  N   GLY A  18      10.640  78.882  42.776  1.00 13.43           N  
ATOM     21  CA  GLY A  18       9.965  78.576  41.529  1.00 13.48           C  
ATOM     22  C   GLY A  18       9.676  79.815  40.703  1.00 13.51           C  
ATOM     23  O   GLY A  18       9.789  80.939  41.193  1.00 13.53           O  
ATOM     24  N   PHE A  19       9.311  79.604  39.442  1.00 13.53           N  
ATOM     25  CA  PHE A  19       8.982  80.696  38.530  1.00 13.54           C  
ATOM     26  C   PHE A  19       7.673  80.291  37.846  1.00 13.59           C  
ATOM     27  O   PHE A  19       7.663  79.891  36.681  1.00 13.60           O  
ATOM     28  CB  PHE A  19      10.093  80.870  37.490  1.00 13.49           C  
ATOM     29  CG  PHE A  19       9.991  82.146  36.702  1.00 13.45           C  
ATOM     30  CD1 PHE A  19      10.189  83.378  37.323  1.00 13.44           C  
ATOM     31  CD2 PHE A  19       9.684  82.121  35.345  0.98 13.45           C  
ATOM     32  CE1 PHE A  19      10.082  84.565  36.603  1.00 13.44           C  
ATOM     33  CE2 PHE A  19       9.575  83.303  34.616  1.00 13.43           C  
ATOM     34  CZ  PHE A  19       9.775  84.529  35.247  1.00 13.42           C  
ATOM     35  N   PRO A  20       6.554  80.369  38.583  1.00 13.64           N  
ATOM     36  CA  PRO A  20       5.196  80.028  38.145  1.00 13.67           C  
ATOM     37  C   PRO A  20       4.550  81.021  37.188  1.00 13.70           C  
ATOM     38  O   PRO A  20       3.388  81.391  37.372  1.00 13.79           O  
ATOM     39  CB  PRO A  20       4.440  79.958  39.463  0.88 13.67           C  
ATOM     40  CG  PRO A  20       5.057  81.119  40.197  0.91 13.66           C  
ATOM     41  CD  PRO A  20       6.525  80.771  40.002  0.90 13.65           C  
ATOM     42  N   PHE A  21       5.281  81.457  36.169  1.00 13.65           N  
ATOM     43  CA  PHE A  21       4.704  82.405  35.227  1.00 13.62           C  
ATOM     44  C   PHE A  21       4.792  81.901  33.798  1.00 13.60           C  
ATOM     45  O   PHE A  21       5.863  81.518  33.332  1.00 13.65           O  
ATOM     46  CB  PHE A  21       5.396  83.766  35.334  1.00 13.62           C  
ATOM     47  CG  PHE A  21       5.431  84.317  36.728  1.00 13.58           C  
ATOM     48  CD1 PHE A  21       6.512  84.055  37.563  0.86 13.60           C  
ATOM     49  CD2 PHE A  21       4.365  85.059  37.223  0.84 13.62           C  
ATOM     50  CE1 PHE A  21       6.531  84.525  38.875  0.87 13.59           C  
ATOM     51  CE2 PHE A  21       4.371  85.533  38.534  0.83 13.62           C  
ATOM     52  CZ  PHE A  21       5.458  85.265  39.362  1.00 13.60           C  
ATOM     53  N   ASP A  22       3.655  81.902  33.110  1.00 13.57           N  
ATOM     54  CA  ASP A  22       3.605  81.451  31.729  1.00 13.52           C  
ATOM     55  C   ASP A  22       4.425  82.386  30.855  1.00 13.45           C  
ATOM     56  O   ASP A  22       4.405  83.606  31.040  1.00 13.47           O  
ATOM     57  CB  ASP A  22       2.160  81.414  31.226  0.87 13.59           C  
ATOM     58  CG  ASP A  22       1.317  80.386  31.954  0.75 13.66           C  
ATOM     59  OD1 ASP A  22       1.687  79.193  31.927  0.25 13.70           O  
ATOM     60  OD2 ASP A  22       0.292  80.771  32.551  0.14 13.74           O  
ATOM     61  N   PRO A  23       5.192  81.823  29.912  1.00 13.35           N  
ATOM     62  CA  PRO A  23       6.014  82.638  29.021  1.00 13.29           C  
ATOM     63  C   PRO A  23       5.187  83.395  27.987  1.00 13.23           C  
ATOM     64  O   PRO A  23       4.206  82.876  27.450  1.00 13.26           O  
ATOM     65  CB  PRO A  23       6.921  81.602  28.371  0.91 13.32           C  
ATOM     66  CG  PRO A  23       5.965  80.437  28.220  0.77 13.32           C  
ATOM     67  CD  PRO A  23       5.417  80.392  29.634  0.85 13.35           C  
ATOM     68  N   HIS A  24       5.590  84.630  27.724  1.00 13.10           N  
ATOM     69  CA  HIS A  24       4.946  85.468  26.725  1.00 12.99           C  
ATOM     70  C   HIS A  24       6.076  86.018  25.878  1.00 12.90           C  
ATOM     71  O   HIS A  24       7.137  86.359  26.402  1.00 12.85           O  
ATOM     72  CB  HIS A  24       4.176  86.610  27.384  1.00 13.00           C  
ATOM     73  CG  HIS A  24       2.998  86.151  28.184  1.00 13.06           C  
ATOM     74  ND1 HIS A  24       1.868  85.619  27.602  0.46 13.10           N  
ATOM     75  CD2 HIS A  24       2.789  86.109  29.521  0.88 13.08           C  
ATOM     76  CE1 HIS A  24       1.012  85.270  28.545  0.47 13.11           C  
ATOM     77  NE2 HIS A  24       1.548  85.556  29.719  0.80 13.11           N  
ATOM     78  N   TYR A  25       5.864  86.077  24.570  1.00 12.79           N  
ATOM     79  CA  TYR A  25       6.888  86.590  23.678  1.00 12.73           C  
ATOM     80  C   TYR A  25       6.332  87.619  22.715  1.00 12.61           C  
ATOM     81  O   TYR A  25       5.171  87.550  22.309  1.00 12.69           O  
ATOM     82  CB  TYR A  25       7.527  85.463  22.865  1.00 12.83           C  
ATOM     83  CG  TYR A  25       8.182  84.378  23.684  1.00 12.91           C  
ATOM     84  CD1 TYR A  25       7.461  83.264  24.110  0.91 12.95           C  
ATOM     85  CD2 TYR A  25       9.530  84.466  24.035  0.99 12.95           C  
ATOM     86  CE1 TYR A  25       8.070  82.260  24.863  0.88 12.98           C  
ATOM     87  CE2 TYR A  25      10.146  83.471  24.787  0.80 12.99           C  
ATOM     88  CZ  TYR A  25       9.411  82.372  25.197  0.82 13.01           C  
ATOM     89  OH  TYR A  25      10.021  81.384  25.934  0.53 13.03           O  
ATOM     90  N   VAL A  26       7.177  88.576  22.352  1.00 12.47           N  
ATOM     91  CA  VAL A  26       6.797  89.611  21.406  1.00 12.30           C  
ATOM     92  C   VAL A  26       8.007  89.888  20.519  1.00 12.24           C  
ATOM     93  O   VAL A  26       9.147  89.914  20.994  1.00 12.09           O  
ATOM     94  CB  VAL A  26       6.344  90.904  22.127  1.00 12.29           C  
ATOM     95  CG1 VAL A  26       7.463  91.448  22.995  1.00 12.29           C  
ATOM     96  CG2 VAL A  26       5.898  91.934  21.107  0.73 12.32           C  
ATOM     97  N   GLU A  27       7.756  90.062  19.226  1.00 12.17           N  
ATOM     98  CA  GLU A  27       8.820  90.321  18.264  1.00 12.15           C  
ATOM     99  C   GLU A  27       9.164  91.805  18.280  1.00 12.10           C  
ATOM    100  O   GLU A  27       8.323  92.656  17.980  1.00 12.17           O  
ATOM    101  CB  GLU A  27       8.374  89.891  16.864  0.90 12.25           C  
ATOM    102  CG  GLU A  27       9.486  89.890  15.839  0.38 12.40           C  
ATOM    103  CD  GLU A  27      10.623  88.973  16.232  0.64 12.49           C  
ATOM    104  OE1 GLU A  27      10.380  87.764  16.427  0.38 12.56           O  
ATOM    105  OE2 GLU A  27      11.764  89.462  16.350  0.01 12.56           O  
ATOM    106  N   VAL A  28      10.413  92.100  18.622  1.00 11.99           N  
ATOM    107  CA  VAL A  28      10.902  93.467  18.734  1.00 11.93           C  
ATOM    108  C   VAL A  28      12.211  93.657  17.973  1.00 11.79           C  
ATOM    109  O   VAL A  28      13.192  92.975  18.252  1.00 11.74           O  
ATOM    110  CB  VAL A  28      11.160  93.817  20.223  0.93 11.97           C  
ATOM    111  CG1 VAL A  28      11.666  95.235  20.352  0.41 12.04           C  
ATOM    112  CG2 VAL A  28       9.889  93.616  21.031  0.59 12.04           C  
ATOM    113  N   LEU A  29      12.225  94.583  17.019  1.00 11.68           N  
ATOM    114  CA  LEU A  29      13.435  94.859  16.249  1.00 11.64           C  
ATOM    115  C   LEU A  29      14.126  93.578  15.777  1.00 11.57           C  
ATOM    116  O   LEU A  29      15.322  93.377  16.011  1.00 11.52           O  
ATOM    117  CB  LEU A  29      14.403  95.694  17.096  1.00 11.68           C  
ATOM    118  CG  LEU A  29      13.885  97.043  17.611  0.94 11.74           C  
ATOM    119  CD1 LEU A  29      14.909  97.661  18.555  1.00 11.71           C  
ATOM    120  CD2 LEU A  29      13.600  97.975  16.441  0.88 11.80           C  
ATOM    121  N   GLY A  30      13.358  92.709  15.129  1.00 11.51           N  
ATOM    122  CA  GLY A  30      13.897  91.467  14.602  1.00 11.50           C  
ATOM    123  C   GLY A  30      14.309  90.412  15.609  1.00 11.46           C  
ATOM    124  O   GLY A  30      14.939  89.421  15.238  1.00 11.49           O  
ATOM    125  N   GLU A  31      13.951  90.612  16.873  1.00 11.40           N  
ATOM    126  CA  GLU A  31      14.305  89.666  17.927  1.00 11.35           C  
ATOM    127  C   GLU A  31      13.094  89.364  18.802  1.00 11.29           C  
ATOM    128  O   GLU A  31      12.187  90.184  18.925  1.00 11.33           O  
ATOM    129  CB  GLU A  31      15.411  90.246  18.812  1.00 11.40           C  
ATOM    130  CG  GLU A  31      16.688  90.657  18.092  0.91 11.52           C  
ATOM    131  CD  GLU A  31      17.368  89.505  17.383  0.84 11.60           C  
ATOM    132  OE1 GLU A  31      17.492  88.420  17.987  0.92 11.68           O  
ATOM    133  OE2 GLU A  31      17.803  89.689  16.227  0.78 11.67           O  
ATOM    134  N   ARG A  32      13.082  88.188  19.418  1.00 11.18           N  
ATOM    135  CA  ARG A  32      11.977  87.826  20.287  1.00 11.11           C  
ATOM    136  C   ARG A  32      12.358  88.135  21.730  1.00 11.03           C  
ATOM    137  O   ARG A  32      13.448  87.778  22.182  1.00 11.06           O  
ATOM    138  CB  ARG A  32      11.649  86.335  20.150  0.87 11.18           C  
ATOM    139  CG  ARG A  32      10.375  85.925  20.878  0.50 11.27           C  
ATOM    140  CD  ARG A  32      10.069  84.436  20.745  0.59 11.35           C  
ATOM    141  NE  ARG A  32      11.048  83.601  21.433  0.60 11.42           N  
ATOM    142  CZ  ARG A  32      10.941  82.284  21.572  0.57 11.46           C  
ATOM    143  NH1 ARG A  32       9.894  81.644  21.069  0.43 11.46           N  
ATOM    144  NH2 ARG A  32      11.879  81.605  22.220  0.43 11.50           N  
ATOM    145  N   MET A  33      11.472  88.823  22.441  1.00 10.89           N  
ATOM    146  CA  MET A  33      11.718  89.138  23.841  1.00 10.77           C  
ATOM    147  C   MET A  33      10.693  88.427  24.708  1.00 10.66           C  
ATOM    148  O   MET A  33       9.505  88.399  24.389  1.00 10.70           O  
ATOM    149  CB  MET A  33      11.650  90.650  24.094  1.00 10.87           C  
ATOM    150  CG  MET A  33      12.790  91.433  23.460  1.00 10.98           C  
ATOM    151  SD  MET A  33      12.774  93.188  23.863  1.00 11.17           S  
ATOM    152  CE  MET A  33      13.031  93.143  25.644  1.00 11.10           C  
ATOM    153  N   HIS A  34      11.170  87.838  25.799  1.00 10.44           N  
ATOM    154  CA  HIS A  34      10.309  87.129  26.735  1.00 10.31           C  
ATOM    155  C   HIS A  34       9.875  88.055  27.861  1.00 10.23           C  
ATOM    156  O   HIS A  34      10.627  88.937  28.279  1.00 10.19           O  
ATOM    157  CB  HIS A  34      11.046  85.911  27.309  1.00 10.31           C  
ATOM    158  CG  HIS A  34      10.352  85.274  28.475  1.00 10.31           C  
ATOM    159  ND1 HIS A  34      10.579  85.661  29.779  0.97 10.34           N  
ATOM    160  CD2 HIS A  34       9.402  84.311  28.528  0.81 10.35           C  
ATOM    161  CE1 HIS A  34       9.799  84.962  30.585  0.84 10.34           C  
ATOM    162  NE2 HIS A  34       9.074  84.137  29.851  0.82 10.37           N  
ATOM    163  N   TYR A  35       8.655  87.860  28.349  1.00 10.15           N  
ATOM    164  CA  TYR A  35       8.161  88.690  29.433  1.00 10.11           C  
ATOM    165  C   TYR A  35       7.042  88.028  30.211  1.00 10.14           C  
ATOM    166  O   TYR A  35       6.308  87.183  29.687  1.00 10.08           O  
ATOM    167  CB  TYR A  35       7.688  90.045  28.886  1.00 10.06           C  
ATOM    168  CG  TYR A  35       6.460  89.995  27.992  1.00 10.00           C  
ATOM    169  CD1 TYR A  35       5.182  90.181  28.517  1.00 10.03           C  
ATOM    170  CD2 TYR A  35       6.581  89.773  26.619  1.00 10.01           C  
ATOM    171  CE1 TYR A  35       4.053  90.153  27.694  0.98 10.08           C  
ATOM    172  CE2 TYR A  35       5.459  89.742  25.790  1.00 10.05           C  
ATOM    173  CZ  TYR A  35       4.201  89.933  26.333  1.00 10.06           C  
ATOM    174  OH  TYR A  35       3.091  89.908  25.514  0.87 10.18           O  
ATOM    175  N   VAL A  36       6.949  88.399  31.481  1.00 10.21           N  
ATOM    176  CA  VAL A  36       5.903  87.908  32.361  1.00 10.32           C  
ATOM    177  C   VAL A  36       4.770  88.916  32.212  1.00 10.39           C  
ATOM    178  O   VAL A  36       5.014  90.114  32.077  1.00 10.35           O  
ATOM    179  CB  VAL A  36       6.365  87.896  33.839  1.00 10.30           C  
ATOM    180  CG1 VAL A  36       5.194  87.545  34.752  0.98 10.30           C  
ATOM    181  CG2 VAL A  36       7.498  86.898  34.023  1.00 10.32           C  
ATOM    182  N   ASP A  37       3.536  88.431  32.207  1.00 10.53           N  
ATOM    183  CA  ASP A  37       2.381  89.310  32.096  1.00 10.72           C  
ATOM    184  C   ASP A  37       1.261  88.641  32.875  1.00 10.86           C  
ATOM    185  O   ASP A  37       0.622  87.707  32.383  1.00 10.96           O  
ATOM    186  CB  ASP A  37       1.962  89.483  30.633  0.98 10.77           C  
ATOM    187  CG  ASP A  37       0.925  90.582  30.446  0.97 10.79           C  
ATOM    188  OD1 ASP A  37       0.345  91.046  31.451  0.92 10.80           O  
ATOM    189  OD2 ASP A  37       0.680  90.977  29.289  0.84 10.87           O  
ATOM    190  N   VAL A  38       1.042  89.100  34.103  1.00 11.02           N  
ATOM    191  CA  VAL A  38      -0.001  88.532  34.948  1.00 11.20           C  
ATOM    192  C   VAL A  38      -0.851  89.622  35.582  1.00 11.34           C  
ATOM    193  O   VAL A  38      -0.595  90.812  35.387  1.00 11.39           O  
ATOM    194  CB  VAL A  38       0.598  87.641  36.058  1.00 11.19           C  
ATOM    195  CG1 VAL A  38       1.340  86.470  35.434  0.98 11.22           C  
ATOM    196  CG2 VAL A  38       1.536  88.454  36.940  0.91 11.25           C  
ATOM    197  N   GLY A  39      -1.862  89.209  36.340  1.00 11.54           N  
ATOM    198  CA  GLY A  39      -2.751  90.164  36.973  1.00 11.74           C  
ATOM    199  C   GLY A  39      -3.834  90.594  35.997  1.00 11.88           C  
ATOM    200  O   GLY A  39      -3.962  90.010  34.916  1.00 11.89           O  
ATOM    201  N   PRO A  40      -4.632  91.614  36.341  1.00 12.01           N  
ATOM    202  CA  PRO A  40      -5.697  92.089  35.454  1.00 12.12           C  
ATOM    203  C   PRO A  40      -5.175  92.432  34.062  1.00 12.21           C  
ATOM    204  O   PRO A  40      -4.008  92.789  33.896  1.00 12.24           O  
ATOM    205  CB  PRO A  40      -6.227  93.310  36.202  0.88 12.13           C  
ATOM    206  CG  PRO A  40      -6.046  92.890  37.642  0.75 12.11           C  
ATOM    207  CD  PRO A  40      -4.609  92.422  37.571  1.00 12.05           C  
ATOM    208  N   ARG A  41      -6.043  92.311  33.063  1.00 12.30           N  
ATOM    209  CA  ARG A  41      -5.676  92.605  31.684  1.00 12.37           C  
ATOM    210  C   ARG A  41      -5.712  94.100  31.386  1.00 12.36           C  
ATOM    211  O   ARG A  41      -5.150  94.559  30.388  1.00 12.46           O  
ATOM    212  CB  ARG A  41      -6.613  91.872  30.720  1.00 12.45           C  
ATOM    213  CG  ARG A  41      -6.514  90.352  30.748  0.77 12.56           C  
ATOM    214  CD  ARG A  41      -5.098  89.897  30.433  0.72 12.68           C  
ATOM    215  NE  ARG A  41      -4.211  90.061  31.581  0.85 12.76           N  
ATOM    216  CZ  ARG A  41      -2.891  90.182  31.498  0.84 12.79           C  
ATOM    217  NH1 ARG A  41      -2.293  90.162  30.315  0.70 12.84           N  
ATOM    218  NH2 ARG A  41      -2.169  90.310  32.603  0.93 12.83           N  
ATOM    219  N   ASP A  42      -6.374  94.859  32.252  1.00 12.30           N  
ATOM    220  CA  ASP A  42      -6.476  96.300  32.073  1.00 12.22           C  
ATOM    221  C   ASP A  42      -5.978  97.079  33.286  1.00 12.14           C  
ATOM    222  O   ASP A  42      -5.451  96.502  34.239  1.00 12.17           O  
ATOM    223  CB  ASP A  42      -7.922  96.704  31.755  0.84 12.32           C  
ATOM    224  CG  ASP A  42      -8.925  96.095  32.715  0.82 12.38           C  
ATOM    225  OD1 ASP A  42      -8.588  95.913  33.900  0.76 12.40           O  
ATOM    226  OD2 ASP A  42     -10.064  95.823  32.286  0.49 12.50           O  
ATOM    227  N   GLY A  43      -6.156  98.394  33.247  1.00 12.05           N  
ATOM    228  CA  GLY A  43      -5.695  99.228  34.340  1.00 11.87           C  
ATOM    229  C   GLY A  43      -4.240  99.592  34.138  1.00 11.73           C  
ATOM    230  O   GLY A  43      -3.592  99.098  33.214  1.00 11.82           O  
ATOM    231  N   THR A  44      -3.721 100.458  34.999  1.00 11.51           N  
ATOM    232  CA  THR A  44      -2.333 100.883  34.895  1.00 11.22           C  
ATOM    233  C   THR A  44      -1.405  99.706  35.154  1.00 10.94           C  
ATOM    234  O   THR A  44      -1.493  99.054  36.192  1.00 11.02           O  
ATOM    235  CB  THR A  44      -2.014 101.994  35.912  0.66 11.24           C  
ATOM    236  OG1 THR A  44      -2.884 103.110  35.691  0.57 11.26           O  
ATOM    237  CG2 THR A  44      -0.571 102.452  35.763  0.53 11.20           C  
ATOM    238  N   PRO A  45      -0.534  99.386  34.186  1.00 10.68           N  
ATOM    239  CA  PRO A  45       0.405  98.277  34.339  1.00 10.37           C  
ATOM    240  C   PRO A  45       1.622  98.668  35.175  1.00 10.06           C  
ATOM    241  O   PRO A  45       2.055  99.825  35.164  1.00 10.06           O  
ATOM    242  CB  PRO A  45       0.790  97.979  32.900  0.95 10.47           C  
ATOM    243  CG  PRO A  45       0.906  99.379  32.356  0.65 10.58           C  
ATOM    244  CD  PRO A  45      -0.420  99.955  32.830  0.96 10.65           C  
ATOM    245  N   VAL A  46       2.155  97.700  35.910  1.00  9.66           N  
ATOM    246  CA  VAL A  46       3.349  97.913  36.714  1.00  9.24           C  
ATOM    247  C   VAL A  46       4.445  97.199  35.931  1.00  8.96           C  
ATOM    248  O   VAL A  46       4.383  95.986  35.720  1.00  8.95           O  
ATOM    249  CB  VAL A  46       3.205  97.295  38.116  1.00  9.27           C  
ATOM    250  CG1 VAL A  46       4.455  97.574  38.935  1.00  9.28           C  
ATOM    251  CG2 VAL A  46       1.981  97.878  38.814  0.92  9.30           C  
ATOM    252  N   LEU A  47       5.433  97.965  35.480  1.00  8.57           N  
ATOM    253  CA  LEU A  47       6.527  97.433  34.676  1.00  8.22           C  
ATOM    254  C   LEU A  47       7.790  97.231  35.510  1.00  7.99           C  
ATOM    255  O   LEU A  47       8.378  98.197  36.001  1.00  8.01           O  
ATOM    256  CB  LEU A  47       6.802  98.392  33.512  1.00  8.19           C  
ATOM    257  CG  LEU A  47       7.880  98.028  32.490  1.00  8.11           C  
ATOM    258  CD1 LEU A  47       7.499  96.744  31.769  1.00  8.19           C  
ATOM    259  CD2 LEU A  47       8.043  99.170  31.497  0.97  8.19           C  
ATOM    260  N   PHE A  48       8.196  95.971  35.663  1.00  7.71           N  
ATOM    261  CA  PHE A  48       9.381  95.610  36.443  1.00  7.45           C  
ATOM    262  C   PHE A  48      10.598  95.441  35.535  1.00  7.33           C  
ATOM    263  O   PHE A  48      10.570  94.645  34.593  1.00  7.35           O  
ATOM    264  CB  PHE A  48       9.153  94.297  37.207  1.00  7.38           C  
ATOM    265  CG  PHE A  48       7.985  94.325  38.158  1.00  7.30           C  
ATOM    266  CD1 PHE A  48       6.676  94.288  37.685  0.98  7.32           C  
ATOM    267  CD2 PHE A  48       8.198  94.382  39.533  1.00  7.28           C  
ATOM    268  CE1 PHE A  48       5.594  94.305  38.568  0.96  7.31           C  
ATOM    269  CE2 PHE A  48       7.123  94.401  40.424  1.00  7.31           C  
ATOM    270  CZ  PHE A  48       5.820  94.361  39.941  1.00  7.29           C  
ATOM    271  N   LEU A  49      11.669  96.172  35.831  1.00  7.15           N  
ATOM    272  CA  LEU A  49      12.878  96.100  35.016  1.00  7.00           C  
ATOM    273  C   LEU A  49      14.089  95.633  35.815  1.00  6.88           C  
ATOM    274  O   LEU A  49      14.539  96.323  36.727  1.00  6.82           O  
ATOM    275  CB  LEU A  49      13.167  97.472  34.397  1.00  7.09           C  
ATOM    276  CG  LEU A  49      12.022  98.096  33.592  0.95  7.12           C  
ATOM    277  CD1 LEU A  49      12.441  99.466  33.076  1.00  7.16           C  
ATOM    278  CD2 LEU A  49      11.641  97.180  32.438  1.00  7.18           C  
ATOM    279  N   HIS A  50      14.604  94.457  35.462  1.00  6.83           N  
ATOM    280  CA  HIS A  50      15.770  93.875  36.123  1.00  6.78           C  
ATOM    281  C   HIS A  50      17.059  94.467  35.559  1.00  6.81           C  
ATOM    282  O   HIS A  50      17.037  95.249  34.606  1.00  6.79           O  
ATOM    283  CB  HIS A  50      15.781  92.356  35.915  1.00  6.74           C  
ATOM    284  CG  HIS A  50      16.146  91.933  34.522  1.00  6.65           C  
ATOM    285  ND1 HIS A  50      17.451  91.868  34.081  0.99  6.67           N  
ATOM    286  CD2 HIS A  50      15.374  91.582  33.466  0.88  6.68           C  
ATOM    287  CE1 HIS A  50      17.467  91.492  32.813  0.96  6.66           C  
ATOM    288  NE2 HIS A  50      16.220  91.312  32.416  1.00  6.66           N  
ATOM    289  N   GLY A  51      18.181  94.068  36.151  1.00  6.79           N  
ATOM    290  CA  GLY A  51      19.477  94.543  35.709  1.00  6.91           C  
ATOM    291  C   GLY A  51      20.457  93.414  35.440  1.00  6.93           C  
ATOM    292  O   GLY A  51      20.075  92.332  34.990  1.00  6.87           O  
ATOM    293  N   ASN A  52      21.724  93.661  35.754  1.00  7.01           N  
ATOM    294  CA  ASN A  52      22.797  92.700  35.517  1.00  7.13           C  
ATOM    295  C   ASN A  52      23.146  91.891  36.761  1.00  7.20           C  
ATOM    296  O   ASN A  52      23.275  92.452  37.847  1.00  7.36           O  
ATOM    297  CB  ASN A  52      24.031  93.468  35.030  1.00  7.12           C  
ATOM    298  CG  ASN A  52      25.148  92.560  34.570  1.00  7.13           C  
ATOM    299  OD1 ASN A  52      24.910  91.590  33.858  1.00  7.11           O  
ATOM    300  ND2 ASN A  52      26.385  92.894  34.939  1.00  7.24           N  
ATOM    301  N   PRO A  53      23.284  90.558  36.629  1.00  7.17           N  
ATOM    302  CA  PRO A  53      23.152  89.657  35.478  1.00  7.17           C  
ATOM    303  C   PRO A  53      21.870  88.840  35.656  1.00  7.12           C  
ATOM    304  O   PRO A  53      21.872  87.616  35.496  1.00  7.16           O  
ATOM    305  CB  PRO A  53      24.378  88.786  35.639  0.99  7.19           C  
ATOM    306  CG  PRO A  53      24.266  88.464  37.136  1.00  7.18           C  
ATOM    307  CD  PRO A  53      23.828  89.804  37.778  0.99  7.20           C  
ATOM    308  N   THR A  54      20.779  89.521  35.977  1.00  7.11           N  
ATOM    309  CA  THR A  54      19.523  88.845  36.263  1.00  7.10           C  
ATOM    310  C   THR A  54      18.504  88.779  35.130  1.00  7.09           C  
ATOM    311  O   THR A  54      18.859  88.867  33.957  1.00  7.09           O  
ATOM    312  CB  THR A  54      18.887  89.490  37.513  1.00  7.10           C  
ATOM    313  OG1 THR A  54      18.618  90.871  37.250  0.99  7.15           O  
ATOM    314  CG2 THR A  54      19.860  89.406  38.701  1.00  7.08           C  
ATOM    315  N   SER A  55      17.238  88.593  35.498  1.00  7.10           N  
ATOM    316  CA  SER A  55      16.138  88.497  34.543  1.00  7.19           C  
ATOM    317  C   SER A  55      14.853  88.705  35.328  1.00  7.16           C  
ATOM    318  O   SER A  55      14.891  89.097  36.496  1.00  7.18           O  
ATOM    319  CB  SER A  55      16.103  87.108  33.907  0.99  7.25           C  
ATOM    320  OG  SER A  55      15.744  86.128  34.869  0.93  7.47           O  
ATOM    321  N   SER A  56      13.716  88.441  34.693  1.00  7.14           N  
ATOM    322  CA  SER A  56      12.436  88.585  35.374  1.00  7.16           C  
ATOM    323  C   SER A  56      12.357  87.639  36.581  1.00  7.16           C  
ATOM    324  O   SER A  56      11.518  87.816  37.465  1.00  7.21           O  
ATOM    325  CB  SER A  56      11.284  88.321  34.394  1.00  7.18           C  
ATOM    326  OG  SER A  56      11.420  87.064  33.759  0.96  7.29           O  
ATOM    327  N   TYR A  57      13.237  86.640  36.619  1.00  7.19           N  
ATOM    328  CA  TYR A  57      13.282  85.692  37.734  1.00  7.18           C  
ATOM    329  C   TYR A  57      13.497  86.468  39.039  1.00  7.19           C  
ATOM    330  O   TYR A  57      12.996  86.086  40.098  1.00  7.17           O  
ATOM    331  CB  TYR A  57      14.435  84.694  37.528  1.00  7.20           C  
ATOM    332  CG  TYR A  57      14.530  83.593  38.570  1.00  7.27           C  
ATOM    333  CD1 TYR A  57      13.608  82.544  38.600  1.00  7.28           C  
ATOM    334  CD2 TYR A  57      15.539  83.607  39.534  0.94  7.28           C  
ATOM    335  CE1 TYR A  57      13.691  81.534  39.569  1.00  7.34           C  
ATOM    336  CE2 TYR A  57      15.630  82.607  40.505  0.82  7.34           C  
ATOM    337  CZ  TYR A  57      14.705  81.576  40.517  0.99  7.36           C  
ATOM    338  OH  TYR A  57      14.792  80.596  41.485  0.93  7.49           O  
ATOM    339  N   LEU A  58      14.236  87.570  38.951  1.00  7.18           N  
ATOM    340  CA  LEU A  58      14.529  88.395  40.118  1.00  7.17           C  
ATOM    341  C   LEU A  58      13.276  88.958  40.788  1.00  7.18           C  
ATOM    342  O   LEU A  58      13.288  89.255  41.981  1.00  7.29           O  
ATOM    343  CB  LEU A  58      15.452  89.549  39.715  1.00  7.23           C  
ATOM    344  CG  LEU A  58      15.899  90.514  40.816  1.00  7.25           C  
ATOM    345  CD1 LEU A  58      16.673  89.761  41.884  0.98  7.33           C  
ATOM    346  CD2 LEU A  58      16.761  91.611  40.203  0.87  7.29           C  
ATOM    347  N   TRP A  59      12.198  89.095  40.022  1.00  7.15           N  
ATOM    348  CA  TRP A  59      10.951  89.651  40.552  1.00  7.11           C  
ATOM    349  C   TRP A  59       9.910  88.592  40.911  1.00  7.23           C  
ATOM    350  O   TRP A  59       8.792  88.931  41.302  1.00  7.23           O  
ATOM    351  CB  TRP A  59      10.313  90.606  39.531  1.00  7.02           C  
ATOM    352  CG  TRP A  59      11.202  91.712  39.040  0.97  6.91           C  
ATOM    353  CD1 TRP A  59      11.756  91.829  37.794  1.00  6.84           C  
ATOM    354  CD2 TRP A  59      11.622  92.864  39.778  1.00  6.82           C  
ATOM    355  NE1 TRP A  59      12.493  92.989  37.711  1.00  6.82           N  
ATOM    356  CE2 TRP A  59      12.428  93.643  38.915  0.99  6.81           C  
ATOM    357  CE3 TRP A  59      11.394  93.316  41.086  1.00  6.77           C  
ATOM    358  CZ2 TRP A  59      13.007  94.852  39.319  1.00  6.76           C  
ATOM    359  CZ3 TRP A  59      11.970  94.521  41.489  1.00  6.77           C  
ATOM    360  CH2 TRP A  59      12.767  95.273  40.605  1.00  6.73           C  
ATOM    361  N   ARG A  60      10.279  87.321  40.793  1.00  7.33           N  
ATOM    362  CA  ARG A  60       9.355  86.217  41.040  1.00  7.47           C  
ATOM    363  C   ARG A  60       8.586  86.224  42.357  1.00  7.56           C  
ATOM    364  O   ARG A  60       7.434  85.796  42.399  1.00  7.60           O  
ATOM    365  CB  ARG A  60      10.096  84.885  40.915  1.00  7.44           C  
ATOM    366  CG  ARG A  60      11.102  84.642  42.025  1.00  7.45           C  
ATOM    367  CD  ARG A  60      11.923  83.385  41.790  0.99  7.54           C  
ATOM    368  NE  ARG A  60      12.814  83.127  42.917  1.00  7.63           N  
ATOM    369  CZ  ARG A  60      13.830  83.910  43.273  0.98  7.68           C  
ATOM    370  NH1 ARG A  60      14.102  85.016  42.588  1.00  7.73           N  
ATOM    371  NH2 ARG A  60      14.559  83.601  44.338  1.00  7.72           N  
ATOM    372  N   ASN A  61       9.214  86.702  43.427  1.00  7.72           N  
ATOM    373  CA  ASN A  61       8.571  86.717  44.740  1.00  7.88           C  
ATOM    374  C   ASN A  61       7.948  88.058  45.104  1.00  8.01           C  
ATOM    375  O   ASN A  61       7.326  88.201  46.157  1.00  8.07           O  
ATOM    376  CB  ASN A  61       9.589  86.307  45.806  1.00  7.86           C  
ATOM    377  CG  ASN A  61      10.078  84.888  45.619  0.99  7.89           C  
ATOM    378  OD1 ASN A  61      11.259  84.600  45.807  0.75  8.00           O  
ATOM    379  ND2 ASN A  61       9.169  83.989  45.258  1.00  7.88           N  
ATOM    380  N   ILE A  62       8.121  89.040  44.230  1.00  8.14           N  
ATOM    381  CA  ILE A  62       7.572  90.371  44.452  1.00  8.30           C  
ATOM    382  C   ILE A  62       6.263  90.526  43.679  1.00  8.44           C  
ATOM    383  O   ILE A  62       5.271  91.039  44.204  1.00  8.46           O  
ATOM    384  CB  ILE A  62       8.608  91.444  44.025  1.00  8.27           C  
ATOM    385  CG1 ILE A  62       9.803  91.391  44.987  1.00  8.29           C  
ATOM    386  CG2 ILE A  62       7.973  92.828  43.988  0.99  8.30           C  
ATOM    387  CD1 ILE A  62      10.943  92.319  44.632  0.90  8.36           C  
ATOM    388  N   ILE A  63       6.259  90.051  42.439  1.00  8.58           N  
ATOM    389  CA  ILE A  63       5.075  90.123  41.591  1.00  8.90           C  
ATOM    390  C   ILE A  63       3.789  89.574  42.233  1.00  9.02           C  
ATOM    391  O   ILE A  63       2.731  90.190  42.118  1.00  9.02           O  
ATOM    392  CB  ILE A  63       5.348  89.421  40.239  0.97  8.88           C  
ATOM    393  CG1 ILE A  63       6.366  90.250  39.446  0.91  8.92           C  
ATOM    394  CG2 ILE A  63       4.051  89.235  39.456  0.93  8.90           C  
ATOM    395  CD1 ILE A  63       6.802  89.632  38.137  0.95  8.97           C  
ATOM    396  N   PRO A  64       3.858  88.424  42.926  1.00  9.18           N  
ATOM    397  CA  PRO A  64       2.646  87.875  43.549  1.00  9.44           C  
ATOM    398  C   PRO A  64       1.948  88.830  44.521  1.00  9.56           C  
ATOM    399  O   PRO A  64       0.753  88.695  44.778  1.00  9.63           O  
ATOM    400  CB  PRO A  64       3.168  86.615  44.240  0.90  9.37           C  
ATOM    401  CG  PRO A  64       4.313  86.203  43.323  0.88  9.31           C  
ATOM    402  CD  PRO A  64       5.002  87.539  43.201  0.95  9.29           C  
ATOM    403  N   HIS A  65       2.692  89.788  45.064  1.00  9.75           N  
ATOM    404  CA  HIS A  65       2.122  90.759  45.999  1.00  9.96           C  
ATOM    405  C   HIS A  65       1.346  91.845  45.267  1.00 10.11           C  
ATOM    406  O   HIS A  65       0.446  92.469  45.831  1.00 10.18           O  
ATOM    407  CB  HIS A  65       3.235  91.420  46.819  1.00  9.98           C  
ATOM    408  CG  HIS A  65       3.833  90.534  47.867  1.00  9.98           C  
ATOM    409  ND1 HIS A  65       3.235  90.322  49.092  0.81 10.01           N  
ATOM    410  CD2 HIS A  65       4.958  89.782  47.862  0.96 10.01           C  
ATOM    411  CE1 HIS A  65       3.968  89.479  49.796  0.71 10.00           C  
ATOM    412  NE2 HIS A  65       5.019  89.135  49.074  0.90 10.01           N  
ATOM    413  N   VAL A  66       1.697  92.057  44.004  1.00 10.22           N  
ATOM    414  CA  VAL A  66       1.082  93.096  43.190  1.00 10.38           C  
ATOM    415  C   VAL A  66       0.018  92.608  42.209  1.00 10.51           C  
ATOM    416  O   VAL A  66      -0.966  93.305  41.963  1.00 10.53           O  
ATOM    417  CB  VAL A  66       2.179  93.863  42.409  1.00 10.33           C  
ATOM    418  CG1 VAL A  66       1.563  94.989  41.595  0.98 10.36           C  
ATOM    419  CG2 VAL A  66       3.220  94.404  43.385  1.00 10.33           C  
ATOM    420  N   ALA A  67       0.212  91.413  41.659  1.00 10.64           N  
ATOM    421  CA  ALA A  67      -0.722  90.842  40.693  1.00 10.83           C  
ATOM    422  C   ALA A  67      -2.200  90.853  41.113  1.00 10.98           C  
ATOM    423  O   ALA A  67      -3.080  91.011  40.269  1.00 11.05           O  
ATOM    424  CB  ALA A  67      -0.293  89.418  40.340  0.96 10.83           C  
ATOM    425  N   PRO A  68      -2.495  90.654  42.408  1.00 11.10           N  
ATOM    426  CA  PRO A  68      -3.903  90.667  42.822  1.00 11.23           C  
ATOM    427  C   PRO A  68      -4.630  91.989  42.556  1.00 11.34           C  
ATOM    428  O   PRO A  68      -5.856  92.010  42.415  1.00 11.48           O  
ATOM    429  CB  PRO A  68      -3.818  90.355  44.316  0.93 11.20           C  
ATOM    430  CG  PRO A  68      -2.570  89.493  44.398  0.86 11.17           C  
ATOM    431  CD  PRO A  68      -1.641  90.358  43.570  1.00 11.11           C  
ATOM    432  N   SER A  69      -3.882  93.087  42.485  1.00 11.39           N  
ATOM    433  CA  SER A  69      -4.489  94.399  42.267  1.00 11.41           C  
ATOM    434  C   SER A  69      -4.120  95.091  40.958  1.00 11.35           C  
ATOM    435  O   SER A  69      -4.885  95.917  40.460  1.00 11.43           O  
ATOM    436  CB  SER A  69      -4.143  95.336  43.427  0.88 11.46           C  
ATOM    437  OG  SER A  69      -2.747  95.569  43.494  0.71 11.52           O  
ATOM    438  N   HIS A  70      -2.953  94.765  40.406  1.00 11.24           N  
ATOM    439  CA  HIS A  70      -2.494  95.388  39.166  1.00 11.06           C  
ATOM    440  C   HIS A  70      -1.841  94.437  38.181  1.00 10.89           C  
ATOM    441  O   HIS A  70      -1.267  93.417  38.564  1.00 10.90           O  
ATOM    442  CB  HIS A  70      -1.463  96.486  39.448  1.00 11.16           C  
ATOM    443  CG  HIS A  70      -2.011  97.679  40.160  0.72 11.22           C  
ATOM    444  ND1 HIS A  70      -2.436  97.638  41.471  0.69 11.24           N  
ATOM    445  CD2 HIS A  70      -2.193  98.955  39.744  0.70 11.28           C  
ATOM    446  CE1 HIS A  70      -2.855  98.839  41.831  0.45 11.29           C  
ATOM    447  NE2 HIS A  70      -2.718  99.654  40.802  0.79 11.27           N  
ATOM    448  N   ARG A  71      -1.912  94.805  36.908  1.00 10.66           N  
ATOM    449  CA  ARG A  71      -1.279  94.037  35.850  1.00 10.38           C  
ATOM    450  C   ARG A  71       0.225  94.191  36.070  1.00 10.18           C  
ATOM    451  O   ARG A  71       0.708  95.295  36.339  1.00 10.19           O  
ATOM    452  CB  ARG A  71      -1.653  94.608  34.480  0.97 10.48           C  
ATOM    453  CG  ARG A  71      -1.031  93.867  33.310  1.00 10.53           C  
ATOM    454  CD  ARG A  71      -1.396  94.515  31.988  0.90 10.65           C  
ATOM    455  NE  ARG A  71      -0.802  93.808  30.859  1.00 10.72           N  
ATOM    456  CZ  ARG A  71      -0.844  94.245  29.604  0.77 10.78           C  
ATOM    457  NH1 ARG A  71      -1.452  95.390  29.319  0.76 10.78           N  
ATOM    458  NH2 ARG A  71      -0.280  93.539  28.635  0.83 10.88           N  
ATOM    459  N   CYS A  72       0.955  93.087  35.967  1.00  9.88           N  
ATOM    460  CA  CYS A  72       2.402  93.100  36.148  1.00  9.63           C  
ATOM    461  C   CYS A  72       3.094  92.632  34.878  1.00  9.39           C  
ATOM    462  O   CYS A  72       2.798  91.554  34.367  1.00  9.39           O  
ATOM    463  CB  CYS A  72       2.807  92.179  37.301  1.00  9.71           C  
ATOM    464  SG  CYS A  72       2.186  92.665  38.921  1.00  9.90           S  
ATOM    465  N   ILE A  73       4.019  93.446  34.378  1.00  9.11           N  
ATOM    466  CA  ILE A  73       4.771  93.117  33.171  1.00  8.85           C  
ATOM    467  C   ILE A  73       6.256  93.133  33.528  1.00  8.66           C  
ATOM    468  O   ILE A  73       6.763  94.128  34.043  1.00  8.64           O  
ATOM    469  CB  ILE A  73       4.507  94.149  32.051  1.00  8.88           C  
ATOM    470  CG1 ILE A  73       3.012  94.195  31.730  0.93  8.91           C  
ATOM    471  CG2 ILE A  73       5.303  93.782  30.802  1.00  8.89           C  
ATOM    472  CD1 ILE A  73       2.639  95.237  30.687  0.93  8.97           C  
ATOM    473  N   ALA A  74       6.947  92.029  33.263  1.00  8.45           N  
ATOM    474  CA  ALA A  74       8.368  91.936  33.580  1.00  8.25           C  
ATOM    475  C   ALA A  74       9.138  91.322  32.422  1.00  8.14           C  
ATOM    476  O   ALA A  74       9.208  90.104  32.284  1.00  8.12           O  
ATOM    477  CB  ALA A  74       8.565  91.103  34.842  1.00  8.32           C  
ATOM    478  N   PRO A  75       9.708  92.164  31.555  1.00  8.00           N  
ATOM    479  CA  PRO A  75      10.468  91.666  30.411  1.00  7.96           C  
ATOM    480  C   PRO A  75      11.889  91.239  30.753  1.00  7.90           C  
ATOM    481  O   PRO A  75      12.459  91.680  31.755  1.00  7.94           O  
ATOM    482  CB  PRO A  75      10.474  92.868  29.481  1.00  7.94           C  
ATOM    483  CG  PRO A  75      10.684  93.991  30.476  1.00  7.92           C  
ATOM    484  CD  PRO A  75       9.617  93.637  31.507  1.00  7.96           C  
ATOM    485  N   ASP A  76      12.444  90.355  29.931  1.00  7.85           N  
ATOM    486  CA  ASP A  76      13.835  89.959  30.091  1.00  7.81           C  
ATOM    487  C   ASP A  76      14.528  90.841  29.062  1.00  7.83           C  
ATOM    488  O   ASP A  76      14.149  90.844  27.887  1.00  7.81           O  
ATOM    489  CB  ASP A  76      14.074  88.484  29.745  1.00  7.78           C  
ATOM    490  CG  ASP A  76      13.495  87.538  30.773  0.95  7.83           C  
ATOM    491  OD1 ASP A  76      13.300  87.970  31.930  1.00  7.87           O  
ATOM    492  OD2 ASP A  76      13.269  86.355  30.433  1.00  7.80           O  
ATOM    493  N   LEU A  77      15.517  91.612  29.497  1.00  7.81           N  
ATOM    494  CA  LEU A  77      16.231  92.495  28.582  1.00  7.87           C  
ATOM    495  C   LEU A  77      16.829  91.700  27.428  1.00  7.91           C  
ATOM    496  O   LEU A  77      17.114  90.510  27.561  1.00  7.83           O  
ATOM    497  CB  LEU A  77      17.338  93.247  29.321  1.00  7.92           C  
ATOM    498  CG  LEU A  77      16.891  94.166  30.466  1.00  7.93           C  
ATOM    499  CD1 LEU A  77      18.122  94.850  31.049  0.92  8.04           C  
ATOM    500  CD2 LEU A  77      15.892  95.210  29.958  1.00  7.98           C  
ATOM    501  N   ILE A  78      17.023  92.361  26.295  1.00  7.96           N  
ATOM    502  CA  ILE A  78      17.585  91.689  25.135  1.00  8.04           C  
ATOM    503  C   ILE A  78      18.934  91.081  25.532  1.00  8.10           C  
ATOM    504  O   ILE A  78      19.709  91.693  26.274  1.00  8.04           O  
ATOM    505  CB  ILE A  78      17.740  92.686  23.945  1.00  8.05           C  
ATOM    506  CG1 ILE A  78      18.002  91.920  22.646  1.00  8.08           C  
ATOM    507  CG2 ILE A  78      18.868  93.673  24.214  1.00  8.08           C  
ATOM    508  CD1 ILE A  78      16.858  91.001  22.241  0.98  8.17           C  
ATOM    509  N   GLY A  79      19.184  89.862  25.059  1.00  8.15           N  
ATOM    510  CA  GLY A  79      20.421  89.164  25.371  1.00  8.27           C  
ATOM    511  C   GLY A  79      20.433  88.513  26.744  1.00  8.32           C  
ATOM    512  O   GLY A  79      21.442  87.936  27.150  1.00  8.40           O  
ATOM    513  N   MET A  80      19.313  88.584  27.458  1.00  8.35           N  
ATOM    514  CA  MET A  80      19.249  88.016  28.800  1.00  8.44           C  
ATOM    515  C   MET A  80      17.991  87.184  29.033  1.00  8.51           C  
ATOM    516  O   MET A  80      17.058  87.205  28.229  1.00  8.49           O  
ATOM    517  CB  MET A  80      19.328  89.148  29.827  1.00  8.46           C  
ATOM    518  CG  MET A  80      20.464  90.122  29.538  0.95  8.51           C  
ATOM    519  SD  MET A  80      20.652  91.425  30.757  0.95  8.65           S  
ATOM    520  CE  MET A  80      21.238  90.480  32.173  0.99  8.49           C  
ATOM    521  N   GLY A  81      17.976  86.439  30.133  1.00  8.58           N  
ATOM    522  CA  GLY A  81      16.822  85.615  30.448  1.00  8.72           C  
ATOM    523  C   GLY A  81      16.423  84.700  29.304  1.00  8.84           C  
ATOM    524  O   GLY A  81      17.265  83.987  28.751  1.00  8.86           O  
ATOM    525  N   LYS A  82      15.140  84.722  28.949  1.00  8.99           N  
ATOM    526  CA  LYS A  82      14.626  83.891  27.863  1.00  9.13           C  
ATOM    527  C   LYS A  82      14.468  84.669  26.561  1.00  9.26           C  
ATOM    528  O   LYS A  82      13.902  84.160  25.592  1.00  9.31           O  
ATOM    529  CB  LYS A  82      13.279  83.273  28.255  1.00  9.13           C  
ATOM    530  CG  LYS A  82      13.349  82.342  29.457  0.71  9.16           C  
ATOM    531  CD  LYS A  82      11.974  81.792  29.802  0.71  9.17           C  
ATOM    532  CE  LYS A  82      12.030  80.874  31.009  0.22  9.15           C  
ATOM    533  NZ  LYS A  82      10.683  80.350  31.369  0.08  9.15           N  
ATOM    534  N   SER A  83      14.950  85.907  26.535  1.00  9.38           N  
ATOM    535  CA  SER A  83      14.862  86.704  25.317  1.00  9.51           C  
ATOM    536  C   SER A  83      15.957  86.264  24.358  1.00  9.75           C  
ATOM    537  O   SER A  83      16.913  85.598  24.761  1.00  9.77           O  
ATOM    538  CB  SER A  83      15.014  88.196  25.629  1.00  9.41           C  
ATOM    539  OG  SER A  83      13.898  88.678  26.352  1.00  9.17           O  
ATOM    540  N   ASP A  84      15.813  86.615  23.083  1.00 10.04           N  
ATOM    541  CA  ASP A  84      16.829  86.242  22.114  1.00 10.39           C  
ATOM    542  C   ASP A  84      18.147  86.905  22.447  1.00 10.63           C  
ATOM    543  O   ASP A  84      18.194  87.905  23.170  1.00 10.56           O  
ATOM    544  CB  ASP A  84      16.411  86.606  20.690  1.00 10.50           C  
ATOM    545  CG  ASP A  84      15.347  85.679  20.143  0.82 10.63           C  
ATOM    546  OD1 ASP A  84      15.143  84.593  20.726  0.85 10.75           O  
ATOM    547  OD2 ASP A  84      14.737  86.024  19.113  0.83 10.74           O  
ATOM    548  N   LYS A  85      19.221  86.344  21.910  1.00 10.87           N  
ATOM    549  CA  LYS A  85      20.546  86.865  22.180  1.00 11.17           C  
ATOM    550  C   LYS A  85      21.330  87.139  20.902  1.00 11.30           C  
ATOM    551  O   LYS A  85      22.236  86.388  20.534  1.00 11.42           O  
ATOM    552  CB  LYS A  85      21.277  85.884  23.103  0.82 11.28           C  
ATOM    553  CG  LYS A  85      20.515  85.683  24.418  0.62 11.46           C  
ATOM    554  CD  LYS A  85      21.160  84.683  25.360  0.59 11.60           C  
ATOM    555  CE  LYS A  85      20.350  84.559  26.652  0.72 11.69           C  
ATOM    556  NZ  LYS A  85      18.932  84.137  26.421  0.87 11.79           N  
ATOM    557  N   PRO A  86      20.972  88.227  20.201  1.00 11.42           N  
ATOM    558  CA  PRO A  86      21.617  88.647  18.954  1.00 11.56           C  
ATOM    559  C   PRO A  86      23.081  89.014  19.183  1.00 11.71           C  
ATOM    560  O   PRO A  86      23.505  89.234  20.321  1.00 11.73           O  
ATOM    561  CB  PRO A  86      20.773  89.851  18.536  1.00 11.55           C  
ATOM    562  CG  PRO A  86      20.362  90.429  19.875  0.92 11.50           C  
ATOM    563  CD  PRO A  86      19.877  89.155  20.529  1.00 11.48           C  
ATOM    564  N   ASP A  87      23.850  89.077  18.099  1.00 11.93           N  
ATOM    565  CA  ASP A  87      25.262  89.420  18.186  1.00 12.13           C  
ATOM    566  C   ASP A  87      25.435  90.930  18.246  1.00 12.22           C  
ATOM    567  O   ASP A  87      25.736  91.574  17.241  1.00 12.29           O  
ATOM    568  CB  ASP A  87      26.024  88.864  16.981  0.85 12.26           C  
ATOM    569  CG  ASP A  87      27.495  89.232  17.008  0.50 12.40           C  
ATOM    570  OD1 ASP A  87      28.174  88.890  17.998  0.34 12.50           O  
ATOM    571  OD2 ASP A  87      27.972  89.864  16.042  0.06 12.52           O  
ATOM    572  N   LEU A  88      25.236  91.489  19.434  1.00 12.21           N  
ATOM    573  CA  LEU A  88      25.364  92.925  19.641  1.00 12.28           C  
ATOM    574  C   LEU A  88      26.519  93.189  20.594  1.00 12.32           C  
ATOM    575  O   LEU A  88      27.053  92.262  21.203  1.00 12.40           O  
ATOM    576  CB  LEU A  88      24.083  93.482  20.265  0.97 12.27           C  
ATOM    577  CG  LEU A  88      22.749  93.189  19.579  0.93 12.24           C  
ATOM    578  CD1 LEU A  88      21.622  93.800  20.405  0.75 12.23           C  
ATOM    579  CD2 LEU A  88      22.757  93.749  18.168  0.72 12.22           C  
ATOM    580  N   ASP A  89      26.911  94.453  20.714  1.00 12.36           N  
ATOM    581  CA  ASP A  89      27.976  94.816  21.638  1.00 12.37           C  
ATOM    582  C   ASP A  89      27.308  95.050  22.986  1.00 12.30           C  
ATOM    583  O   ASP A  89      27.962  95.136  24.026  1.00 12.40           O  
ATOM    584  CB  ASP A  89      28.684  96.091  21.178  0.76 12.43           C  
ATOM    585  CG  ASP A  89      29.426  95.905  19.871  0.57 12.52           C  
ATOM    586  OD1 ASP A  89      30.303  95.020  19.812  0.39 12.59           O  
ATOM    587  OD2 ASP A  89      29.133  96.646  18.909  0.25 12.58           O  
ATOM    588  N   TYR A  90      25.985  95.146  22.946  1.00 12.17           N  
ATOM    589  CA  TYR A  90      25.175  95.365  24.133  1.00 11.99           C  
ATOM    590  C   TYR A  90      25.505  96.606  24.949  1.00 11.93           C  
ATOM    591  O   TYR A  90      25.590  96.551  26.178  1.00 11.96           O  
ATOM    592  CB  TYR A  90      25.193  94.126  25.037  1.00 11.88           C  
ATOM    593  CG  TYR A  90      24.450  92.951  24.441  1.00 11.74           C  
ATOM    594  CD1 TYR A  90      25.107  91.998  23.665  1.00 11.68           C  
ATOM    595  CD2 TYR A  90      23.071  92.831  24.601  1.00 11.69           C  
ATOM    596  CE1 TYR A  90      24.403  90.952  23.063  1.00 11.56           C  
ATOM    597  CE2 TYR A  90      22.359  91.794  24.004  1.00 11.59           C  
ATOM    598  CZ  TYR A  90      23.030  90.860  23.236  0.94 11.62           C  
ATOM    599  OH  TYR A  90      22.323  89.842  22.638  1.00 11.53           O  
ATOM    600  N   PHE A  91      25.700  97.729  24.264  1.00 11.82           N  
ATOM    601  CA  PHE A  91      25.943  98.976  24.969  1.00 11.68           C  
ATOM    602  C   PHE A  91      24.591  99.372  25.549  1.00 11.55           C  
ATOM    603  O   PHE A  91      23.557  98.825  25.158  1.00 11.59           O  
ATOM    604  CB  PHE A  91      26.425 100.084  24.028  0.79 11.73           C  
ATOM    605  CG  PHE A  91      27.872  99.975  23.646  0.76 11.73           C  
ATOM    606  CD1 PHE A  91      28.299  99.037  22.716  0.33 11.74           C  
ATOM    607  CD2 PHE A  91      28.815 100.809  24.236  0.50 11.72           C  
ATOM    608  CE1 PHE A  91      29.649  98.936  22.377  0.35 11.75           C  
ATOM    609  CE2 PHE A  91      30.163 100.715  23.905  0.43 11.72           C  
ATOM    610  CZ  PHE A  91      30.580  99.776  22.973  0.29 11.73           C  
ATOM    611  N   PHE A  92      24.596 100.318  26.479  1.00 11.37           N  
ATOM    612  CA  PHE A  92      23.355 100.767  27.088  1.00 11.15           C  
ATOM    613  C   PHE A  92      22.345 101.149  26.009  1.00 11.02           C  
ATOM    614  O   PHE A  92      21.158 100.851  26.125  1.00 11.02           O  
ATOM    615  CB  PHE A  92      23.615 101.971  27.994  0.91 11.14           C  
ATOM    616  CG  PHE A  92      22.387 102.469  28.701  0.98 11.08           C  
ATOM    617  CD1 PHE A  92      21.731 101.667  29.630  1.00 11.02           C  
ATOM    618  CD2 PHE A  92      21.879 103.734  28.432  1.00 11.04           C  
ATOM    619  CE1 PHE A  92      20.585 102.121  30.282  1.00 11.06           C  
ATOM    620  CE2 PHE A  92      20.733 104.197  29.079  1.00 11.07           C  
ATOM    621  CZ  PHE A  92      20.087 103.385  30.006  0.92 11.07           C  
ATOM    622  N   ASP A  93      22.826 101.802  24.956  1.00 10.86           N  
ATOM    623  CA  ASP A  93      21.962 102.232  23.864  1.00 10.70           C  
ATOM    624  C   ASP A  93      21.184 101.088  23.217  1.00 10.57           C  
ATOM    625  O   ASP A  93      20.038 101.278  22.811  1.00 10.64           O  
ATOM    626  CB  ASP A  93      22.783 102.963  22.799  0.85 10.74           C  
ATOM    627  CG  ASP A  93      21.922 103.518  21.684  0.37 10.74           C  
ATOM    628  OD1 ASP A  93      21.056 104.371  21.971  0.43 10.77           O  
ATOM    629  OD2 ASP A  93      22.109 103.102  20.521  0.35 10.75           O  
ATOM    630  N   ASP A  94      21.801  99.911  23.106  1.00 10.42           N  
ATOM    631  CA  ASP A  94      21.106  98.765  22.521  1.00 10.19           C  
ATOM    632  C   ASP A  94      19.918  98.404  23.404  1.00 10.01           C  
ATOM    633  O   ASP A  94      18.823  98.145  22.911  1.00 10.01           O  
ATOM    634  CB  ASP A  94      22.031  97.545  22.392  1.00 10.27           C  
ATOM    635  CG  ASP A  94      23.122  97.739  21.355  0.77 10.33           C  
ATOM    636  OD1 ASP A  94      22.799  98.155  20.224  0.61 10.41           O  
ATOM    637  OD2 ASP A  94      24.298  97.451  21.663  0.67 10.37           O  
ATOM    638  N   HIS A  95      20.141  98.388  24.714  1.00  9.81           N  
ATOM    639  CA  HIS A  95      19.075  98.072  25.655  1.00  9.64           C  
ATOM    640  C   HIS A  95      17.973  99.125  25.609  1.00  9.60           C  
ATOM    641  O   HIS A  95      16.793  98.800  25.741  1.00  9.55           O  
ATOM    642  CB  HIS A  95      19.642  97.956  27.071  1.00  9.49           C  
ATOM    643  CG  HIS A  95      20.412  96.695  27.303  1.00  9.33           C  
ATOM    644  ND1 HIS A  95      19.811  95.455  27.327  1.00  9.26           N  
ATOM    645  CD2 HIS A  95      21.735  96.476  27.485  1.00  9.31           C  
ATOM    646  CE1 HIS A  95      20.732  94.526  27.515  1.00  9.26           C  
ATOM    647  NE2 HIS A  95      21.908  95.120  27.614  1.00  9.21           N  
ATOM    648  N   VAL A  96      18.357 100.384  25.415  1.00  9.61           N  
ATOM    649  CA  VAL A  96      17.380 101.465  25.340  1.00  9.62           C  
ATOM    650  C   VAL A  96      16.469 101.255  24.139  1.00  9.62           C  
ATOM    651  O   VAL A  96      15.246 101.361  24.248  1.00  9.54           O  
ATOM    652  CB  VAL A  96      18.068 102.842  25.213  1.00  9.65           C  
ATOM    653  CG1 VAL A  96      17.033 103.923  24.915  0.96  9.68           C  
ATOM    654  CG2 VAL A  96      18.803 103.169  26.504  1.00  9.67           C  
ATOM    655  N   ARG A  97      17.068 100.945  22.995  1.00  9.69           N  
ATOM    656  CA  ARG A  97      16.293 100.723  21.784  1.00  9.78           C  
ATOM    657  C   ARG A  97      15.319  99.560  21.924  1.00  9.75           C  
ATOM    658  O   ARG A  97      14.154  99.677  21.548  1.00  9.78           O  
ATOM    659  CB  ARG A  97      17.206 100.455  20.588  0.83  9.91           C  
ATOM    660  CG  ARG A  97      18.071 101.619  20.143  0.49 10.08           C  
ATOM    661  CD  ARG A  97      18.633 101.295  18.770  0.21 10.21           C  
ATOM    662  NE  ARG A  97      19.432 100.074  18.796  0.36 10.36           N  
ATOM    663  CZ  ARG A  97      19.407  99.138  17.854  0.44 10.47           C  
ATOM    664  NH1 ARG A  97      18.617  99.272  16.796  0.26 10.60           N  
ATOM    665  NH2 ARG A  97      20.176  98.063  17.971  0.33 10.46           N  
ATOM    666  N   TYR A  98      15.792  98.435  22.454  1.00  9.75           N  
ATOM    667  CA  TYR A  98      14.915  97.286  22.607  1.00  9.73           C  
ATOM    668  C   TYR A  98      13.798  97.485  23.622  1.00  9.77           C  
ATOM    669  O   TYR A  98      12.669  97.059  23.378  1.00  9.76           O  
ATOM    670  CB  TYR A  98      15.714  96.008  22.912  1.00  9.74           C  
ATOM    671  CG  TYR A  98      16.280  95.389  21.655  1.00  9.73           C  
ATOM    672  CD1 TYR A  98      17.422  95.903  21.049  1.00  9.71           C  
ATOM    673  CD2 TYR A  98      15.589  94.369  20.998  0.91  9.74           C  
ATOM    674  CE1 TYR A  98      17.857  95.425  19.813  1.00  9.75           C  
ATOM    675  CE2 TYR A  98      16.011  93.886  19.766  1.00  9.74           C  
ATOM    676  CZ  TYR A  98      17.140  94.421  19.176  0.78  9.75           C  
ATOM    677  OH  TYR A  98      17.525  93.976  17.930  0.80  9.81           O  
ATOM    678  N   LEU A  99      14.087  98.137  24.745  1.00  9.82           N  
ATOM    679  CA  LEU A  99      13.036  98.362  25.731  1.00  9.90           C  
ATOM    680  C   LEU A  99      12.012  99.354  25.183  1.00  9.99           C  
ATOM    681  O   LEU A  99      10.812  99.179  25.388  1.00  9.97           O  
ATOM    682  CB  LEU A  99      13.607  98.884  27.052  1.00  9.88           C  
ATOM    683  CG  LEU A  99      12.543  99.118  28.131  1.00  9.92           C  
ATOM    684  CD1 LEU A  99      11.805  97.821  28.438  0.97  9.93           C  
ATOM    685  CD2 LEU A  99      13.204  99.655  29.386  1.00  9.94           C  
ATOM    686  N   ASP A 100      12.481 100.397  24.500  1.00 10.11           N  
ATOM    687  CA  ASP A 100      11.562 101.374  23.913  1.00 10.28           C  
ATOM    688  C   ASP A 100      10.584 100.650  23.000  1.00 10.42           C  
ATOM    689  O   ASP A 100       9.374 100.855  23.078  1.00 10.39           O  
ATOM    690  CB  ASP A 100      12.305 102.422  23.071  1.00 10.28           C  
ATOM    691  CG  ASP A 100      12.912 103.536  23.899  0.85 10.31           C  
ATOM    692  OD1 ASP A 100      12.678 103.586  25.125  0.90 10.33           O  
ATOM    693  OD2 ASP A 100      13.615 104.380  23.304  1.00 10.34           O  
ATOM    694  N   ALA A 101      11.121  99.799  22.130  1.00 10.61           N  
ATOM    695  CA  ALA A 101      10.291  99.056  21.190  1.00 10.85           C  
ATOM    696  C   ALA A 101       9.384  98.053  21.894  1.00 11.02           C  
ATOM    697  O   ALA A 101       8.253  97.827  21.466  1.00 11.13           O  
ATOM    698  CB  ALA A 101      11.167  98.352  20.169  1.00 10.83           C  
ATOM    699  N   PHE A 102       9.883  97.451  22.970  1.00 11.16           N  
ATOM    700  CA  PHE A 102       9.096  96.492  23.742  1.00 11.31           C  
ATOM    701  C   PHE A 102       7.842  97.177  24.280  1.00 11.52           C  
ATOM    702  O   PHE A 102       6.724  96.686  24.117  1.00 11.53           O  
ATOM    703  CB  PHE A 102       9.908  95.968  24.928  1.00 11.16           C  
ATOM    704  CG  PHE A 102       9.126  95.075  25.851  1.00 11.03           C  
ATOM    705  CD1 PHE A 102       8.867  93.750  25.513  1.00 10.99           C  
ATOM    706  CD2 PHE A 102       8.614  95.574  27.047  1.00 10.94           C  
ATOM    707  CE1 PHE A 102       8.108  92.933  26.357  1.00 10.95           C  
ATOM    708  CE2 PHE A 102       7.854  94.769  27.895  1.00 10.96           C  
ATOM    709  CZ  PHE A 102       7.602  93.447  27.550  1.00 10.95           C  
ATOM    710  N   ILE A 103       8.045  98.314  24.936  1.00 11.79           N  
ATOM    711  CA  ILE A 103       6.948  99.073  25.518  1.00 12.10           C  
ATOM    712  C   ILE A 103       5.906  99.464  24.479  1.00 12.36           C  
ATOM    713  O   ILE A 103       4.706  99.371  24.733  1.00 12.41           O  
ATOM    714  CB  ILE A 103       7.476 100.339  26.233  1.00 12.05           C  
ATOM    715  CG1 ILE A 103       8.344  99.926  27.425  1.00 12.05           C  
ATOM    716  CG2 ILE A 103       6.312 101.211  26.693  0.95 12.10           C  
ATOM    717  CD1 ILE A 103       8.973 101.086  28.170  1.00 12.06           C  
ATOM    718  N   GLU A 104       6.356  99.897  23.307  1.00 12.71           N  
ATOM    719  CA  GLU A 104       5.417 100.285  22.261  1.00 13.07           C  
ATOM    720  C   GLU A 104       4.714  99.070  21.663  1.00 13.27           C  
ATOM    721  O   GLU A 104       3.542  99.147  21.292  1.00 13.35           O  
ATOM    722  CB  GLU A 104       6.135 101.076  21.165  0.93 13.12           C  
ATOM    723  CG  GLU A 104       6.746 102.378  21.662  0.91 13.24           C  
ATOM    724  CD  GLU A 104       5.740 103.240  22.408  0.77 13.28           C  
ATOM    725  OE1 GLU A 104       4.688 103.570  21.824  0.61 13.32           O  
ATOM    726  OE2 GLU A 104       6.000 103.587  23.582  0.91 13.35           O  
ATOM    727  N   ALA A 105       5.427  97.951  21.578  1.00 13.48           N  
ATOM    728  CA  ALA A 105       4.860  96.722  21.027  1.00 13.72           C  
ATOM    729  C   ALA A 105       3.655  96.266  21.846  1.00 13.87           C  
ATOM    730  O   ALA A 105       2.672  95.767  21.295  1.00 13.99           O  
ATOM    731  CB  ALA A 105       5.915  95.625  20.996  0.98 13.72           C  
ATOM    732  N   LEU A 106       3.730  96.433  23.162  1.00 13.98           N  
ATOM    733  CA  LEU A 106       2.629  96.036  24.030  1.00 14.10           C  
ATOM    734  C   LEU A 106       1.576  97.134  24.143  1.00 14.13           C  
ATOM    735  O   LEU A 106       0.589  96.988  24.867  1.00 14.23           O  
ATOM    736  CB  LEU A 106       3.144  95.666  25.424  1.00 14.14           C  
ATOM    737  CG  LEU A 106       4.087  94.465  25.529  0.90 14.18           C  
ATOM    738  CD1 LEU A 106       4.324  94.167  27.001  0.80 14.19           C  
ATOM    739  CD2 LEU A 106       3.486  93.245  24.846  0.44 14.24           C  
ATOM    740  N   GLY A 107       1.798  98.231  23.423  1.00 14.14           N  
ATOM    741  CA  GLY A 107       0.862  99.340  23.435  1.00 14.14           C  
ATOM    742  C   GLY A 107       0.613  99.960  24.795  1.00 14.11           C  
ATOM    743  O   GLY A 107      -0.502 100.381  25.095  1.00 14.19           O  
ATOM    744  N   LEU A 108       1.647 100.022  25.626  1.00 14.04           N  
ATOM    745  CA  LEU A 108       1.499 100.603  26.953  1.00 13.92           C  
ATOM    746  C   LEU A 108       1.358 102.119  26.862  1.00 13.82           C  
ATOM    747  O   LEU A 108       2.052 102.774  26.083  1.00 13.94           O  
ATOM    748  CB  LEU A 108       2.707 100.252  27.827  0.95 13.94           C  
ATOM    749  CG  LEU A 108       3.017  98.761  27.973  1.00 13.92           C  
ATOM    750  CD1 LEU A 108       4.183  98.584  28.934  0.96 13.97           C  
ATOM    751  CD2 LEU A 108       1.791  98.019  28.489  0.89 13.96           C  
ATOM    752  N   GLU A 109       0.443 102.670  27.651  1.00 13.65           N  
ATOM    753  CA  GLU A 109       0.217 104.108  27.685  1.00 13.41           C  
ATOM    754  C   GLU A 109       0.938 104.636  28.918  1.00 13.20           C  
ATOM    755  O   GLU A 109       2.127 104.959  28.857  1.00 13.33           O  
ATOM    756  CB  GLU A 109      -1.280 104.406  27.782  0.71 13.40           C  
ATOM    757  CG  GLU A 109      -1.704 104.880  26.213  0.17 13.43           C  
ATOM    758  CD  GLU A 109      -1.776 103.631  25.368  0.05 13.43           C  
ATOM    759  OE1 GLU A 109      -2.368 103.679  24.262  0.01 13.46           O  
ATOM    760  OE2 GLU A 109      -1.243 102.595  25.806  0.01 13.46           O  
ATOM    761  N   GLU A 110       0.226 104.715  30.037  1.00 12.90           N  
ATOM    762  CA  GLU A 110       0.835 105.177  31.277  1.00 12.52           C  
ATOM    763  C   GLU A 110       1.279 103.930  32.027  1.00 12.23           C  
ATOM    764  O   GLU A 110       0.684 102.859  31.875  1.00 12.27           O  
ATOM    765  CB  GLU A 110      -0.165 105.963  32.131  0.68 12.54           C  
ATOM    766  CG  GLU A 110      -1.231 105.113  32.796  0.39 12.58           C  
ATOM    767  CD  GLU A 110      -2.063 104.332  31.802  0.34 12.59           C  
ATOM    768  OE1 GLU A 110      -2.747 104.964  30.971  0.19 12.60           O  
ATOM    769  OE2 GLU A 110      -2.028 103.084  31.852  0.01 12.64           O  
ATOM    770  N   VAL A 111       2.325 104.063  32.832  1.00 11.82           N  
ATOM    771  CA  VAL A 111       2.821 102.925  33.588  1.00 11.37           C  
ATOM    772  C   VAL A 111       3.418 103.342  34.916  1.00 11.00           C  
ATOM    773  O   VAL A 111       3.673 104.521  35.161  1.00 10.95           O  
ATOM    774  CB  VAL A 111       3.934 102.174  32.820  0.83 11.43           C  
ATOM    775  CG1 VAL A 111       3.422 101.697  31.471  0.58 11.42           C  
ATOM    776  CG2 VAL A 111       5.140 103.082  32.644  0.97 11.46           C  
ATOM    777  N   VAL A 112       3.614 102.351  35.775  1.00 10.56           N  
ATOM    778  CA  VAL A 112       4.262 102.549  37.060  1.00 10.14           C  
ATOM    779  C   VAL A 112       5.515 101.697  36.912  1.00  9.86           C  
ATOM    780  O   VAL A 112       5.440 100.537  36.503  1.00  9.87           O  
ATOM    781  CB  VAL A 112       3.421 102.025  38.239  1.00 10.14           C  
ATOM    782  CG1 VAL A 112       4.228 102.125  39.529  1.00 10.15           C  
ATOM    783  CG2 VAL A 112       2.142 102.839  38.368  0.88 10.19           C  
ATOM    784  N   LEU A 113       6.666 102.278  37.218  1.00  9.42           N  
ATOM    785  CA  LEU A 113       7.933 101.577  37.089  1.00  9.03           C  
ATOM    786  C   LEU A 113       8.455 101.035  38.412  1.00  8.75           C  
ATOM    787  O   LEU A 113       8.367 101.704  39.438  1.00  8.69           O  
ATOM    788  CB  LEU A 113       8.987 102.524  36.504  1.00  9.06           C  
ATOM    789  CG  LEU A 113       8.718 103.127  35.123  0.93  9.14           C  
ATOM    790  CD1 LEU A 113       9.777 104.171  34.799  0.94  9.17           C  
ATOM    791  CD2 LEU A 113       8.708 102.024  34.081  0.71  9.17           C  
ATOM    792  N   VAL A 114       8.973  99.812  38.376  1.00  8.42           N  
ATOM    793  CA  VAL A 114       9.594  99.170  39.538  1.00  8.10           C  
ATOM    794  C   VAL A 114      10.939  98.784  38.929  1.00  7.94           C  
ATOM    795  O   VAL A 114      11.023  97.860  38.114  1.00  7.88           O  
ATOM    796  CB  VAL A 114       8.815  97.924  39.998  1.00  8.03           C  
ATOM    797  CG1 VAL A 114       9.535  97.270  41.171  1.00  8.01           C  
ATOM    798  CG2 VAL A 114       7.405  98.326  40.418  1.00  8.02           C  
ATOM    799  N   ILE A 115      11.990  99.499  39.319  1.00  7.70           N  
ATOM    800  CA  ILE A 115      13.295  99.297  38.705  1.00  7.48           C  
ATOM    801  C   ILE A 115      14.489  99.065  39.624  1.00  7.38           C  
ATOM    802  O   ILE A 115      14.490  99.464  40.791  1.00  7.28           O  
ATOM    803  CB  ILE A 115      13.573 100.485  37.760  1.00  7.42           C  
ATOM    804  CG1 ILE A 115      13.595 101.794  38.558  1.00  7.43           C  
ATOM    805  CG2 ILE A 115      12.470 100.555  36.696  0.88  7.48           C  
ATOM    806  CD1 ILE A 115      13.642 103.051  37.699  0.92  7.40           C  
ATOM    807  N   HIS A 116      15.516  98.433  39.059  1.00  7.25           N  
ATOM    808  CA  HIS A 116      16.723  98.066  39.787  1.00  7.22           C  
ATOM    809  C   HIS A 116      17.939  98.043  38.867  1.00  7.18           C  
ATOM    810  O   HIS A 116      17.833  97.657  37.707  1.00  7.16           O  
ATOM    811  CB  HIS A 116      16.518  96.663  40.375  1.00  7.19           C  
ATOM    812  CG  HIS A 116      17.715  96.106  41.083  1.00  7.16           C  
ATOM    813  ND1 HIS A 116      18.259  94.879  40.767  0.93  7.20           N  
ATOM    814  CD2 HIS A 116      18.440  96.582  42.124  1.00  7.16           C  
ATOM    815  CE1 HIS A 116      19.267  94.622  41.583  0.94  7.18           C  
ATOM    816  NE2 HIS A 116      19.397  95.639  42.416  0.98  7.17           N  
ATOM    817  N   ASP A 117      19.087  98.463  39.393  1.00  7.11           N  
ATOM    818  CA  ASP A 117      20.339  98.424  38.643  1.00  7.19           C  
ATOM    819  C   ASP A 117      20.200  98.988  37.226  1.00  7.12           C  
ATOM    820  O   ASP A 117      19.672 100.079  37.049  1.00  7.21           O  
ATOM    821  CB  ASP A 117      20.826  96.975  38.617  0.97  7.25           C  
ATOM    822  CG  ASP A 117      22.200  96.836  38.020  0.64  7.31           C  
ATOM    823  OD1 ASP A 117      23.149  97.453  38.558  0.58  7.37           O  
ATOM    824  OD2 ASP A 117      22.323  96.104  37.016  0.96  7.44           O  
ATOM    825  N   TRP A 118      20.670  98.272  36.208  1.00  7.11           N  
ATOM    826  CA  TRP A 118      20.542  98.816  34.864  1.00  7.00           C  
ATOM    827  C   TRP A 118      19.098  98.978  34.423  1.00  6.98           C  
ATOM    828  O   TRP A 118      18.802  99.739  33.503  1.00  6.89           O  
ATOM    829  CB  TRP A 118      21.353  98.000  33.858  0.99  7.05           C  
ATOM    830  CG  TRP A 118      22.800  98.361  33.954  1.00  7.06           C  
ATOM    831  CD1 TRP A 118      23.786  97.671  34.594  1.00  7.08           C  
ATOM    832  CD2 TRP A 118      23.397  99.575  33.487  1.00  7.08           C  
ATOM    833  NE1 TRP A 118      24.964  98.386  34.554  0.97  7.12           N  
ATOM    834  CE2 TRP A 118      24.750  99.558  33.882  1.00  7.09           C  
ATOM    835  CE3 TRP A 118      22.914 100.680  32.773  1.00  7.10           C  
ATOM    836  CZ2 TRP A 118      25.632 100.604  33.585  0.92  7.12           C  
ATOM    837  CZ3 TRP A 118      23.788 101.720  32.478  0.84  7.11           C  
ATOM    838  CH2 TRP A 118      25.133 101.674  32.885  0.87  7.13           C  
ATOM    839  N   GLY A 119      18.197  98.275  35.100  1.00  6.95           N  
ATOM    840  CA  GLY A 119      16.789  98.410  34.793  1.00  6.94           C  
ATOM    841  C   GLY A 119      16.349  99.791  35.249  1.00  6.96           C  
ATOM    842  O   GLY A 119      15.412 100.362  34.694  1.00  6.92           O  
ATOM    843  N   SER A 120      17.028 100.337  36.259  1.00  6.97           N  
ATOM    844  CA  SER A 120      16.687 101.667  36.754  1.00  7.03           C  
ATOM    845  C   SER A 120      17.231 102.732  35.800  1.00  7.10           C  
ATOM    846  O   SER A 120      16.599 103.770  35.596  1.00  7.16           O  
ATOM    847  CB  SER A 120      17.233 101.896  38.174  1.00  6.97           C  
ATOM    848  OG  SER A 120      18.648 101.975  38.203  1.00  6.98           O  
ATOM    849  N   ALA A 121      18.397 102.481  35.212  1.00  7.15           N  
ATOM    850  CA  ALA A 121      18.954 103.432  34.258  1.00  7.28           C  
ATOM    851  C   ALA A 121      17.991 103.494  33.074  1.00  7.37           C  
ATOM    852  O   ALA A 121      17.669 104.574  32.578  1.00  7.48           O  
ATOM    853  CB  ALA A 121      20.341 102.986  33.802  1.00  7.25           C  
ATOM    854  N   LEU A 122      17.516 102.332  32.633  1.00  7.49           N  
ATOM    855  CA  LEU A 122      16.567 102.273  31.526  1.00  7.57           C  
ATOM    856  C   LEU A 122      15.251 102.951  31.899  1.00  7.64           C  
ATOM    857  O   LEU A 122      14.711 103.737  31.126  1.00  7.70           O  
ATOM    858  CB  LEU A 122      16.297 100.816  31.128  1.00  7.59           C  
ATOM    859  CG  LEU A 122      17.442 100.078  30.435  0.99  7.59           C  
ATOM    860  CD1 LEU A 122      17.135  98.590  30.367  1.00  7.62           C  
ATOM    861  CD2 LEU A 122      17.652 100.657  29.040  0.91  7.68           C  
ATOM    862  N   GLY A 123      14.742 102.643  33.089  1.00  7.65           N  
ATOM    863  CA  GLY A 123      13.488 103.224  33.537  1.00  7.76           C  
ATOM    864  C   GLY A 123      13.528 104.729  33.706  1.00  7.85           C  
ATOM    865  O   GLY A 123      12.629 105.433  33.244  1.00  7.81           O  
ATOM    866  N   PHE A 124      14.559 105.224  34.383  1.00  7.90           N  
ATOM    867  CA  PHE A 124      14.708 106.659  34.597  1.00  8.02           C  
ATOM    868  C   PHE A 124      14.887 107.386  33.265  1.00  8.16           C  
ATOM    869  O   PHE A 124      14.339 108.464  33.062  1.00  8.13           O  
ATOM    870  CB  PHE A 124      15.913 106.935  35.509  1.00  7.88           C  
ATOM    871  CG  PHE A 124      15.681 106.597  36.962  1.00  7.79           C  
ATOM    872  CD1 PHE A 124      16.692 106.010  37.716  1.00  7.77           C  
ATOM    873  CD2 PHE A 124      14.481 106.924  37.593  0.92  7.77           C  
ATOM    874  CE1 PHE A 124      16.516 105.753  39.078  1.00  7.72           C  
ATOM    875  CE2 PHE A 124      14.296 106.672  38.958  1.00  7.72           C  
ATOM    876  CZ  PHE A 124      15.319 106.086  39.699  1.00  7.69           C  
ATOM    877  N   HIS A 125      15.652 106.788  32.358  1.00  8.37           N  
ATOM    878  CA  HIS A 125      15.892 107.394  31.054  1.00  8.64           C  
ATOM    879  C   HIS A 125      14.597 107.452  30.248  1.00  8.83           C  
ATOM    880  O   HIS A 125      14.339 108.430  29.544  1.00  8.82           O  
ATOM    881  CB  HIS A 125      16.952 106.592  30.296  1.00  8.68           C  
ATOM    882  CG  HIS A 125      17.360 107.204  28.991  1.00  8.73           C  
ATOM    883  ND1 HIS A 125      17.859 108.485  28.893  0.97  8.78           N  
ATOM    884  CD2 HIS A 125      17.367 106.699  27.735  0.96  8.79           C  
ATOM    885  CE1 HIS A 125      18.156 108.744  27.631  0.97  8.80           C  
ATOM    886  NE2 HIS A 125      17.867 107.676  26.909  0.82  8.83           N  
ATOM    887  N   TRP A 126      13.785 106.405  30.356  1.00  9.02           N  
ATOM    888  CA  TRP A 126      12.513 106.355  29.644  1.00  9.24           C  
ATOM    889  C   TRP A 126      11.567 107.395  30.247  1.00  9.41           C  
ATOM    890  O   TRP A 126      10.862 108.102  29.527  1.00  9.44           O  
ATOM    891  CB  TRP A 126      11.873 104.969  29.777  1.00  9.24           C  
ATOM    892  CG  TRP A 126      10.692 104.765  28.862  1.00  9.29           C  
ATOM    893  CD1 TRP A 126      10.730 104.428  27.538  1.00  9.28           C  
ATOM    894  CD2 TRP A 126       9.306 104.932  29.192  0.98  9.33           C  
ATOM    895  NE1 TRP A 126       9.457 104.374  27.024  0.94  9.34           N  
ATOM    896  CE2 TRP A 126       8.563 104.680  28.016  1.00  9.30           C  
ATOM    897  CE3 TRP A 126       8.619 105.271  30.364  0.76  9.36           C  
ATOM    898  CZ2 TRP A 126       7.164 104.755  27.979  0.92  9.35           C  
ATOM    899  CZ3 TRP A 126       7.228 105.345  30.327  0.77  9.37           C  
ATOM    900  CH2 TRP A 126       6.517 105.088  29.140  0.83  9.40           C  
ATOM    901  N   ALA A 127      11.559 107.478  31.575  1.00  9.61           N  
ATOM    902  CA  ALA A 127      10.702 108.419  32.291  1.00  9.89           C  
ATOM    903  C   ALA A 127      11.033 109.863  31.926  1.00 10.08           C  
ATOM    904  O   ALA A 127      10.134 110.677  31.717  1.00 10.08           O  
ATOM    905  CB  ALA A 127      10.848 108.213  33.800  0.99  9.89           C  
ATOM    906  N   LYS A 128      12.324 110.177  31.851  1.00 10.33           N  
ATOM    907  CA  LYS A 128      12.759 111.527  31.504  1.00 10.62           C  
ATOM    908  C   LYS A 128      12.229 111.923  30.130  1.00 10.83           C  
ATOM    909  O   LYS A 128      11.828 113.068  29.910  1.00 10.91           O  
ATOM    910  CB  LYS A 128      14.286 111.613  31.471  0.97 10.64           C  
ATOM    911  CG  LYS A 128      14.800 113.017  31.165  0.76 10.65           C  
ATOM    912  CD  LYS A 128      16.255 113.027  30.722  0.72 10.66           C  
ATOM    913  CE  LYS A 128      16.429 112.366  29.360  0.57 10.64           C  
ATOM    914  NZ  LYS A 128      17.832 112.458  28.848  0.63 10.63           N  
ATOM    915  N   ARG A 129      12.234 110.968  29.205  1.00 11.06           N  
ATOM    916  CA  ARG A 129      11.780 111.213  27.841  1.00 11.31           C  
ATOM    917  C   ARG A 129      10.269 111.098  27.654  1.00 11.53           C  
ATOM    918  O   ARG A 129       9.725 111.567  26.650  1.00 11.63           O  
ATOM    919  CB  ARG A 129      12.478 110.243  26.886  1.00 11.26           C  
ATOM    920  CG  ARG A 129      13.988 110.407  26.804  1.00 11.25           C  
ATOM    921  CD  ARG A 129      14.569 109.325  25.911  0.77 11.26           C  
ATOM    922  NE  ARG A 129      14.433 108.007  26.526  1.00 11.22           N  
ATOM    923  CZ  ARG A 129      14.258 106.875  25.849  0.76 11.22           C  
ATOM    924  NH1 ARG A 129      14.195 106.892  24.525  0.92 11.28           N  
ATOM    925  NH2 ARG A 129      14.148 105.723  26.499  1.00 11.14           N  
ATOM    926  N   ASN A 130       9.594 110.477  28.615  1.00 11.72           N  
ATOM    927  CA  ASN A 130       8.146 110.290  28.543  1.00 11.86           C  
ATOM    928  C   ASN A 130       7.543 110.557  29.918  1.00 11.97           C  
ATOM    929  O   ASN A 130       6.847 109.711  30.469  1.00 12.02           O  
ATOM    930  CB  ASN A 130       7.844 108.851  28.124  0.92 11.91           C  
ATOM    931  CG  ASN A 130       8.479 108.487  26.800  0.85 11.92           C  
ATOM    932  OD1 ASN A 130       8.040 108.936  25.741  0.56 11.98           O  
ATOM    933  ND2 ASN A 130       9.539 107.687  26.854  1.00 11.91           N  
ATOM    934  N   PRO A 131       7.782 111.754  30.476  1.00 12.10           N  
ATOM    935  CA  PRO A 131       7.265 112.113  31.799  1.00 12.20           C  
ATOM    936  C   PRO A 131       5.759 112.009  32.001  1.00 12.31           C  
ATOM    937  O   PRO A 131       5.305 111.627  33.079  1.00 12.41           O  
ATOM    938  CB  PRO A 131       7.783 113.540  31.981  0.77 12.19           C  
ATOM    939  CG  PRO A 131       7.809 114.051  30.553  0.73 12.15           C  
ATOM    940  CD  PRO A 131       8.526 112.891  29.911  0.85 12.14           C  
ATOM    941  N   GLU A 132       4.985 112.337  30.973  1.00 12.44           N  
ATOM    942  CA  GLU A 132       3.533 112.287  31.098  1.00 12.50           C  
ATOM    943  C   GLU A 132       3.002 110.859  31.188  1.00 12.50           C  
ATOM    944  O   GLU A 132       1.833 110.643  31.510  1.00 12.60           O  
ATOM    945  CB  GLU A 132       2.857 113.000  29.917  0.94 12.57           C  
ATOM    946  CG  GLU A 132       2.914 112.255  28.584  0.35 12.66           C  
ATOM    947  CD  GLU A 132       4.305 112.175  27.978  0.40 12.73           C  
ATOM    948  OE1 GLU A 132       4.452 111.495  26.941  0.37 12.80           O  
ATOM    949  OE2 GLU A 132       5.245 112.795  28.517  0.45 12.78           O  
ATOM    950  N   ARG A 133       3.862 109.882  30.923  1.00 12.42           N  
ATOM    951  CA  ARG A 133       3.445 108.484  30.956  1.00 12.35           C  
ATOM    952  C   ARG A 133       3.884 107.717  32.200  1.00 12.20           C  
ATOM    953  O   ARG A 133       3.560 106.537  32.345  1.00 12.35           O  
ATOM    954  CB  ARG A 133       3.951 107.775  29.697  0.93 12.49           C  
ATOM    955  CG  ARG A 133       3.372 108.357  28.415  0.77 12.64           C  
ATOM    956  CD  ARG A 133       4.072 107.831  27.175  0.88 12.74           C  
ATOM    957  NE  ARG A 133       3.881 106.401  26.953  0.99 12.85           N  
ATOM    958  CZ  ARG A 133       4.447 105.729  25.955  1.00 12.89           C  
ATOM    959  NH1 ARG A 133       5.236 106.362  25.097  0.70 12.97           N  
ATOM    960  NH2 ARG A 133       4.216 104.433  25.805  0.80 12.95           N  
ATOM    961  N   VAL A 134       4.610 108.380  33.098  1.00 11.96           N  
ATOM    962  CA  VAL A 134       5.073 107.737  34.329  1.00 11.70           C  
ATOM    963  C   VAL A 134       4.240 108.200  35.523  1.00 11.51           C  
ATOM    964  O   VAL A 134       4.308 109.357  35.937  1.00 11.57           O  
ATOM    965  CB  VAL A 134       6.560 108.043  34.594  0.99 11.71           C  
ATOM    966  CG1 VAL A 134       7.009 107.365  35.882  0.90 11.72           C  
ATOM    967  CG2 VAL A 134       7.398 107.556  33.430  0.80 11.70           C  
ATOM    968  N   LYS A 135       3.474 107.267  36.076  1.00 11.24           N  
ATOM    969  CA  LYS A 135       2.575 107.521  37.197  1.00 10.99           C  
ATOM    970  C   LYS A 135       3.255 107.392  38.558  1.00 10.73           C  
ATOM    971  O   LYS A 135       2.788 107.944  39.556  1.00 10.75           O  
ATOM    972  CB  LYS A 135       1.401 106.548  37.082  0.78 11.09           C  
ATOM    973  CG  LYS A 135       0.275 106.714  38.066  0.51 11.15           C  
ATOM    974  CD  LYS A 135      -0.859 105.809  37.623  0.33 11.22           C  
ATOM    975  CE  LYS A 135      -2.077 105.920  38.502  0.41 11.27           C  
ATOM    976  NZ  LYS A 135      -3.171 105.110  37.905  0.38 11.30           N  
ATOM    977  N   GLY A 136       4.360 106.658  38.592  1.00 10.39           N  
ATOM    978  CA  GLY A 136       5.089 106.476  39.832  1.00 10.04           C  
ATOM    979  C   GLY A 136       6.336 105.655  39.580  1.00  9.79           C  
ATOM    980  O   GLY A 136       6.412 104.930  38.587  1.00  9.70           O  
ATOM    981  N   ILE A 137       7.318 105.768  40.466  1.00  9.57           N  
ATOM    982  CA  ILE A 137       8.550 105.008  40.309  1.00  9.36           C  
ATOM    983  C   ILE A 137       9.000 104.381  41.618  1.00  9.25           C  
ATOM    984  O   ILE A 137       9.263 105.083  42.595  1.00  9.26           O  
ATOM    985  CB  ILE A 137       9.716 105.887  39.799  1.00  9.35           C  
ATOM    986  CG1 ILE A 137       9.355 106.527  38.457  1.00  9.35           C  
ATOM    987  CG2 ILE A 137      10.974 105.029  39.638  1.00  9.37           C  
ATOM    988  CD1 ILE A 137      10.422 107.475  37.938  0.93  9.39           C  
ATOM    989  N   ALA A 138       9.060 103.054  41.634  1.00  9.09           N  
ATOM    990  CA  ALA A 138       9.543 102.322  42.796  1.00  8.95           C  
ATOM    991  C   ALA A 138      10.943 101.908  42.362  1.00  8.86           C  
ATOM    992  O   ALA A 138      11.118 101.329  41.286  1.00  8.85           O  
ATOM    993  CB  ALA A 138       8.680 101.095  43.065  1.00  8.90           C  
ATOM    994  N   CYS A 139      11.944 102.222  43.178  1.00  8.73           N  
ATOM    995  CA  CYS A 139      13.316 101.893  42.820  1.00  8.70           C  
ATOM    996  C   CYS A 139      14.127 101.361  43.987  1.00  8.59           C  
ATOM    997  O   CYS A 139      13.740 101.494  45.147  1.00  8.54           O  
ATOM    998  CB  CYS A 139      14.004 103.120  42.209  1.00  8.73           C  
ATOM    999  SG  CYS A 139      14.036 104.595  43.266  0.96  8.92           S  
ATOM   1000  N   MET A 140      15.262 100.756  43.663  1.00  8.54           N  
ATOM   1001  CA  MET A 140      16.135 100.172  44.665  1.00  8.52           C  
ATOM   1002  C   MET A 140      17.498  99.930  44.032  1.00  8.45           C  
ATOM   1003  O   MET A 140      17.574  99.517  42.873  1.00  8.44           O  
ATOM   1004  CB  MET A 140      15.521  98.853  45.148  1.00  8.66           C  
ATOM   1005  CG  MET A 140      15.322  97.814  44.039  1.00  8.82           C  
ATOM   1006  SD  MET A 140      13.914  96.701  44.312  0.96  9.20           S  
ATOM   1007  CE  MET A 140      12.556  97.828  44.062  0.89  9.09           C  
ATOM   1008  N   GLU A 141      18.564 100.204  44.783  1.00  8.36           N  
ATOM   1009  CA  GLU A 141      19.927  99.997  44.296  1.00  8.31           C  
ATOM   1010  C   GLU A 141      20.033 100.400  42.831  1.00  8.39           C  
ATOM   1011  O   GLU A 141      20.382  99.593  41.965  1.00  8.34           O  
ATOM   1012  CB  GLU A 141      20.312  98.529  44.493  1.00  8.15           C  
ATOM   1013  CG  GLU A 141      20.751  98.189  45.914  1.00  7.94           C  
ATOM   1014  CD  GLU A 141      22.104  98.791  46.229  0.88  7.85           C  
ATOM   1015  OE1 GLU A 141      23.029  98.581  45.418  1.00  7.82           O  
ATOM   1016  OE2 GLU A 141      22.249  99.463  47.274  1.00  7.70           O  
ATOM   1017  N   PHE A 142      19.742 101.671  42.572  1.00  8.48           N  
ATOM   1018  CA  PHE A 142      19.744 102.195  41.215  1.00  8.57           C  
ATOM   1019  C   PHE A 142      21.041 102.859  40.776  1.00  8.73           C  
ATOM   1020  O   PHE A 142      21.883 103.224  41.599  1.00  8.76           O  
ATOM   1021  CB  PHE A 142      18.551 103.153  41.037  1.00  8.47           C  
ATOM   1022  CG  PHE A 142      18.640 104.427  41.844  1.00  8.36           C  
ATOM   1023  CD1 PHE A 142      19.393 105.505  41.392  1.00  8.31           C  
ATOM   1024  CD2 PHE A 142      17.931 104.560  43.034  0.99  8.35           C  
ATOM   1025  CE1 PHE A 142      19.435 106.700  42.106  1.00  8.29           C  
ATOM   1026  CE2 PHE A 142      17.966 105.753  43.761  1.00  8.30           C  
ATOM   1027  CZ  PHE A 142      18.719 106.824  43.293  0.97  8.31           C  
ATOM   1028  N   ILE A 143      21.194 103.000  39.462  1.00  8.95           N  
ATOM   1029  CA  ILE A 143      22.387 103.606  38.883  1.00  9.17           C  
ATOM   1030  C   ILE A 143      22.382 105.126  39.012  1.00  9.36           C  
ATOM   1031  O   ILE A 143      21.438 105.800  38.596  1.00  9.35           O  
ATOM   1032  CB  ILE A 143      22.533 103.236  37.379  1.00  9.15           C  
ATOM   1033  CG1 ILE A 143      22.767 101.727  37.220  0.80  9.20           C  
ATOM   1034  CG2 ILE A 143      23.682 104.026  36.752  1.00  9.15           C  
ATOM   1035  CD1 ILE A 143      24.091 101.233  37.769  0.44  9.21           C  
ATOM   1036  N   ARG A 144      23.452 105.650  39.598  1.00  9.63           N  
ATOM   1037  CA  ARG A 144      23.635 107.085  39.785  1.00  9.94           C  
ATOM   1038  C   ARG A 144      25.120 107.324  39.530  1.00 10.09           C  
ATOM   1039  O   ARG A 144      25.911 106.379  39.533  1.00 10.05           O  
ATOM   1040  CB  ARG A 144      23.276 107.484  41.220  0.91 10.01           C  
ATOM   1041  CG  ARG A 144      24.185 106.871  42.278  0.89 10.12           C  
ATOM   1042  CD  ARG A 144      23.643 107.090  43.680  0.81 10.22           C  
ATOM   1043  NE  ARG A 144      24.482 106.458  44.697  0.72 10.30           N  
ATOM   1044  CZ  ARG A 144      25.592 106.985  45.207  0.79 10.33           C  
ATOM   1045  NH1 ARG A 144      26.020 108.175  44.806  0.66 10.39           N  
ATOM   1046  NH2 ARG A 144      26.282 106.311  46.119  0.71 10.37           N  
ATOM   1047  N   PRO A 145      25.522 108.579  39.289  1.00 10.33           N  
ATOM   1048  CA  PRO A 145      26.943 108.837  39.044  1.00 10.62           C  
ATOM   1049  C   PRO A 145      27.754 108.595  40.314  1.00 10.82           C  
ATOM   1050  O   PRO A 145      27.429 109.139  41.364  1.00 10.86           O  
ATOM   1051  CB  PRO A 145      26.955 110.314  38.644  1.00 10.53           C  
ATOM   1052  CG  PRO A 145      25.522 110.546  38.120  0.90 10.50           C  
ATOM   1053  CD  PRO A 145      24.762 109.836  39.205  1.00 10.40           C  
ATOM   1054  N   ILE A 146      28.786 107.761  40.225  1.00 11.09           N  
ATOM   1055  CA  ILE A 146      29.648 107.494  41.372  1.00 11.54           C  
ATOM   1056  C   ILE A 146      30.848 108.404  41.120  1.00 11.73           C  
ATOM   1057  O   ILE A 146      31.650 108.156  40.223  1.00 11.80           O  
ATOM   1058  CB  ILE A 146      30.094 106.017  41.413  0.95 11.47           C  
ATOM   1059  CG1 ILE A 146      28.865 105.101  41.454  0.85 11.50           C  
ATOM   1060  CG2 ILE A 146      30.982 105.774  42.632  0.94 11.50           C  
ATOM   1061  CD1 ILE A 146      27.952 105.326  42.644  0.67 11.51           C  
ATOM   1062  N   PRO A 147      30.989 109.471  41.919  1.00 11.94           N  
ATOM   1063  CA  PRO A 147      32.078 110.439  41.783  1.00 12.25           C  
ATOM   1064  C   PRO A 147      33.500 109.899  41.826  1.00 12.32           C  
ATOM   1065  O   PRO A 147      34.344 110.292  41.019  1.00 12.43           O  
ATOM   1066  CB  PRO A 147      31.797 111.416  42.924  0.88 12.16           C  
ATOM   1067  CG  PRO A 147      30.288 111.339  43.053  0.64 12.11           C  
ATOM   1068  CD  PRO A 147      30.142 109.841  43.064  0.92 12.05           C  
ATOM   1069  N   THR A 148      33.762 109.002  42.768  1.00 12.50           N  
ATOM   1070  CA  THR A 148      35.100 108.445  42.928  1.00 12.67           C  
ATOM   1071  C   THR A 148      35.040 106.981  43.335  1.00 12.72           C  
ATOM   1072  O   THR A 148      33.997 106.496  43.770  1.00 12.72           O  
ATOM   1073  CB  THR A 148      35.868 109.196  44.030  0.71 12.68           C  
ATOM   1074  OG1 THR A 148      35.192 109.015  45.280  0.49 12.74           O  
ATOM   1075  CG2 THR A 148      35.938 110.686  43.720  0.77 12.72           C  
ATOM   1076  N   TRP A 149      36.159 106.275  43.201  1.00 12.84           N  
ATOM   1077  CA  TRP A 149      36.195 104.875  43.604  1.00 12.99           C  
ATOM   1078  C   TRP A 149      36.041 104.759  45.114  1.00 13.11           C  
ATOM   1079  O   TRP A 149      35.638 103.717  45.629  1.00 13.19           O  
ATOM   1080  CB  TRP A 149      37.494 104.201  43.154  1.00 12.94           C  
ATOM   1081  CG  TRP A 149      37.470 103.780  41.718  1.00 12.90           C  
ATOM   1082  CD1 TRP A 149      38.144 104.350  40.676  0.98 12.92           C  
ATOM   1083  CD2 TRP A 149      36.705 102.703  41.162  1.00 12.89           C  
ATOM   1084  NE1 TRP A 149      37.847 103.692  39.504  1.00 12.91           N  
ATOM   1085  CE2 TRP A 149      36.966 102.678  39.774  0.97 12.90           C  
ATOM   1086  CE3 TRP A 149      35.823 101.757  41.704  1.00 12.87           C  
ATOM   1087  CZ2 TRP A 149      36.376 101.741  38.918  0.90 12.90           C  
ATOM   1088  CZ3 TRP A 149      35.237 100.824  40.852  1.00 12.87           C  
ATOM   1089  CH2 TRP A 149      35.518 100.826  39.473  1.00 12.88           C  
ATOM   1090  N   ASP A 150      36.360 105.841  45.819  1.00 13.31           N  
ATOM   1091  CA  ASP A 150      36.242 105.872  47.272  1.00 13.49           C  
ATOM   1092  C   ASP A 150      34.803 105.563  47.674  1.00 13.62           C  
ATOM   1093  O   ASP A 150      34.552 104.921  48.693  1.00 13.72           O  
ATOM   1094  CB  ASP A 150      36.606 107.259  47.808  0.96 13.51           C  
ATOM   1095  CG  ASP A 150      38.020 107.668  47.462  0.78 13.55           C  
ATOM   1096  OD1 ASP A 150      38.368 107.669  46.263  0.69 13.56           O  
ATOM   1097  OD2 ASP A 150      38.783 107.999  48.394  0.43 13.60           O  
ATOM   1098  N   GLU A 151      33.864 106.030  46.858  1.00 13.76           N  
ATOM   1099  CA  GLU A 151      32.445 105.845  47.132  1.00 13.86           C  
ATOM   1100  C   GLU A 151      31.896 104.486  46.722  1.00 13.91           C  
ATOM   1101  O   GLU A 151      30.722 104.188  46.951  1.00 14.01           O  
ATOM   1102  CB  GLU A 151      31.652 106.972  46.469  1.00 13.91           C  
ATOM   1103  CG  GLU A 151      32.067 108.341  46.988  0.49 13.98           C  
ATOM   1104  CD  GLU A 151      31.334 109.477  46.317  0.20 14.02           C  
ATOM   1105  OE1 GLU A 151      30.092 109.510  46.403  0.48 14.05           O  
ATOM   1106  OE2 GLU A 151      32.002 110.338  45.707  0.18 14.07           O  
ATOM   1107  N   TRP A 152      32.736 103.661  46.107  1.00 13.90           N  
ATOM   1108  CA  TRP A 152      32.302 102.328  45.727  1.00 13.88           C  
ATOM   1109  C   TRP A 152      32.714 101.446  46.898  1.00 13.91           C  
ATOM   1110  O   TRP A 152      33.858 101.498  47.350  1.00 13.87           O  
ATOM   1111  CB  TRP A 152      32.982 101.886  44.428  0.99 13.89           C  
ATOM   1112  CG  TRP A 152      32.426 100.603  43.883  1.00 13.85           C  
ATOM   1113  CD1 TRP A 152      32.735  99.333  44.281  0.90 13.87           C  
ATOM   1114  CD2 TRP A 152      31.399 100.474  42.894  1.00 13.86           C  
ATOM   1115  NE1 TRP A 152      31.963  98.420  43.600  0.83 13.86           N  
ATOM   1116  CE2 TRP A 152      31.134  99.095  42.742  0.88 13.86           C  
ATOM   1117  CE3 TRP A 152      30.675 101.391  42.121  0.97 13.85           C  
ATOM   1118  CZ2 TRP A 152      30.174  98.610  41.848  1.00 13.83           C  
ATOM   1119  CZ3 TRP A 152      29.719 100.909  41.230  1.00 13.85           C  
ATOM   1120  CH2 TRP A 152      29.479  99.529  41.103  1.00 13.86           C  
ATOM   1121  N   PRO A 153      31.787 100.630  47.414  1.00 13.89           N  
ATOM   1122  CA  PRO A 153      32.075  99.748  48.547  1.00 13.91           C  
ATOM   1123  C   PRO A 153      33.377  98.964  48.424  1.00 13.92           C  
ATOM   1124  O   PRO A 153      33.620  98.279  47.435  1.00 13.92           O  
ATOM   1125  CB  PRO A 153      30.829  98.855  48.604  0.91 13.91           C  
ATOM   1126  CG  PRO A 153      30.292  98.926  47.176  0.52 13.90           C  
ATOM   1127  CD  PRO A 153      30.408 100.405  46.956  0.96 13.89           C  
ATOM   1128  N   GLU A 154      34.208  99.082  49.454  1.00 13.95           N  
ATOM   1129  CA  GLU A 154      35.507  98.425  49.514  1.00 13.96           C  
ATOM   1130  C   GLU A 154      35.514  96.938  49.157  1.00 13.94           C  
ATOM   1131  O   GLU A 154      36.378  96.485  48.407  1.00 13.96           O  
ATOM   1132  CB  GLU A 154      36.101  98.640  50.915  0.91 14.06           C  
ATOM   1133  CG  GLU A 154      37.481  98.044  51.159  0.62 14.15           C  
ATOM   1134  CD  GLU A 154      37.478  96.530  51.221  0.89 14.20           C  
ATOM   1135  OE1 GLU A 154      36.723  95.972  52.046  0.45 14.26           O  
ATOM   1136  OE2 GLU A 154      38.232  95.900  50.451  0.16 14.29           O  
ATOM   1137  N   PHE A 155      34.551  96.178  49.669  1.00 13.91           N  
ATOM   1138  CA  PHE A 155      34.523  94.740  49.412  1.00 13.88           C  
ATOM   1139  C   PHE A 155      34.369  94.376  47.937  1.00 13.84           C  
ATOM   1140  O   PHE A 155      34.746  93.279  47.527  1.00 13.91           O  
ATOM   1141  CB  PHE A 155      33.410  94.080  50.240  1.00 13.89           C  
ATOM   1142  CG  PHE A 155      32.051  94.114  49.593  0.85 13.92           C  
ATOM   1143  CD1 PHE A 155      31.578  93.007  48.895  0.74 13.92           C  
ATOM   1144  CD2 PHE A 155      31.243  95.240  49.689  0.79 13.92           C  
ATOM   1145  CE1 PHE A 155      30.315  93.018  48.302  0.78 13.93           C  
ATOM   1146  CE2 PHE A 155      29.979  95.264  49.099  0.84 13.93           C  
ATOM   1147  CZ  PHE A 155      29.514  94.148  48.404  1.00 13.93           C  
ATOM   1148  N   ALA A 156      33.833  95.295  47.140  1.00 13.75           N  
ATOM   1149  CA  ALA A 156      33.631  95.031  45.716  1.00 13.61           C  
ATOM   1150  C   ALA A 156      34.400  95.982  44.805  1.00 13.51           C  
ATOM   1151  O   ALA A 156      34.269  95.920  43.584  1.00 13.50           O  
ATOM   1152  CB  ALA A 156      32.140  95.108  45.388  0.88 13.65           C  
ATOM   1153  N   ARG A 157      35.224  96.839  45.395  1.00 13.37           N  
ATOM   1154  CA  ARG A 157      35.971  97.829  44.630  1.00 13.18           C  
ATOM   1155  C   ARG A 157      36.978  97.284  43.613  1.00 13.05           C  
ATOM   1156  O   ARG A 157      36.889  97.599  42.430  1.00 13.03           O  
ATOM   1157  CB  ARG A 157      36.667  98.790  45.597  0.99 13.22           C  
ATOM   1158  CG  ARG A 157      37.239 100.040  44.955  1.00 13.26           C  
ATOM   1159  CD  ARG A 157      37.852 100.917  46.031  1.00 13.31           C  
ATOM   1160  NE  ARG A 157      36.859 101.325  47.021  1.00 13.37           N  
ATOM   1161  CZ  ARG A 157      37.157 101.736  48.249  0.82 13.37           C  
ATOM   1162  NH1 ARG A 157      38.423 101.791  48.639  0.83 13.38           N  
ATOM   1163  NH2 ARG A 157      36.192 102.089  49.089  0.93 13.42           N  
ATOM   1164  N   GLU A 158      37.932  96.471  44.053  1.00 12.89           N  
ATOM   1165  CA  GLU A 158      38.919  95.947  43.112  1.00 12.73           C  
ATOM   1166  C   GLU A 158      38.308  95.056  42.041  1.00 12.58           C  
ATOM   1167  O   GLU A 158      38.787  95.024  40.906  1.00 12.54           O  
ATOM   1168  CB  GLU A 158      40.019  95.183  43.849  0.99 12.80           C  
ATOM   1169  CG  GLU A 158      40.791  96.038  44.832  0.76 12.88           C  
ATOM   1170  CD  GLU A 158      41.949  95.297  45.446  0.40 12.96           C  
ATOM   1171  OE1 GLU A 158      41.739  94.157  45.900  0.53 13.00           O  
ATOM   1172  OE2 GLU A 158      43.062  95.859  45.485  0.47 12.98           O  
ATOM   1173  N   THR A 159      37.248  94.337  42.395  1.00 12.43           N  
ATOM   1174  CA  THR A 159      36.589  93.462  41.436  1.00 12.29           C  
ATOM   1175  C   THR A 159      36.002  94.262  40.278  1.00 12.17           C  
ATOM   1176  O   THR A 159      36.196  93.909  39.114  1.00 12.13           O  
ATOM   1177  CB  THR A 159      35.483  92.634  42.114  1.00 12.31           C  
ATOM   1178  OG1 THR A 159      36.078  91.759  43.081  0.86 12.35           O  
ATOM   1179  CG2 THR A 159      34.728  91.800  41.087  0.97 12.33           C  
ATOM   1180  N   PHE A 160      35.289  95.341  40.583  1.00 12.05           N  
ATOM   1181  CA  PHE A 160      34.724  96.144  39.508  1.00 11.96           C  
ATOM   1182  C   PHE A 160      35.794  96.923  38.752  1.00 11.94           C  
ATOM   1183  O   PHE A 160      35.622  97.227  37.572  1.00 11.94           O  
ATOM   1184  CB  PHE A 160      33.616  97.067  40.032  0.98 11.91           C  
ATOM   1185  CG  PHE A 160      32.290  96.372  40.190  0.92 11.84           C  
ATOM   1186  CD1 PHE A 160      32.077  95.458  41.218  1.00 11.81           C  
ATOM   1187  CD2 PHE A 160      31.277  96.580  39.257  1.00 11.77           C  
ATOM   1188  CE1 PHE A 160      30.875  94.758  41.316  1.00 11.81           C  
ATOM   1189  CE2 PHE A 160      30.071  95.884  39.343  1.00 11.76           C  
ATOM   1190  CZ  PHE A 160      29.870  94.971  40.374  0.95 11.78           C  
ATOM   1191  N   GLN A 161      36.906  97.233  39.418  1.00 11.94           N  
ATOM   1192  CA  GLN A 161      37.994  97.931  38.745  1.00 11.92           C  
ATOM   1193  C   GLN A 161      38.585  96.930  37.753  1.00 11.90           C  
ATOM   1194  O   GLN A 161      38.974  97.292  36.645  1.00 11.94           O  
ATOM   1195  CB  GLN A 161      39.062  98.381  39.749  0.94 11.94           C  
ATOM   1196  CG  GLN A 161      38.514  99.289  40.845  1.00 11.94           C  
ATOM   1197  CD  GLN A 161      39.573  99.756  41.832  0.68 11.97           C  
ATOM   1198  OE1 GLN A 161      40.428  98.982  42.255  0.95 11.95           O  
ATOM   1199  NE2 GLN A 161      39.495 101.021  42.226  0.73 12.00           N  
ATOM   1200  N   ALA A 162      38.627  95.663  38.156  1.00 11.89           N  
ATOM   1201  CA  ALA A 162      39.153  94.599  37.305  1.00 11.86           C  
ATOM   1202  C   ALA A 162      38.232  94.365  36.107  1.00 11.87           C  
ATOM   1203  O   ALA A 162      38.698  94.128  34.991  1.00 11.88           O  
ATOM   1204  CB  ALA A 162      39.300  93.314  38.107  1.00 11.82           C  
ATOM   1205  N   PHE A 163      36.924  94.420  36.348  1.00 11.89           N  
ATOM   1206  CA  PHE A 163      35.940  94.234  35.282  1.00 11.94           C  
ATOM   1207  C   PHE A 163      36.132  95.293  34.200  1.00 12.04           C  
ATOM   1208  O   PHE A 163      35.871  95.047  33.023  1.00 11.98           O  
ATOM   1209  CB  PHE A 163      34.514  94.362  35.832  1.00 11.84           C  
ATOM   1210  CG  PHE A 163      34.070  93.209  36.697  1.00 11.76           C  
ATOM   1211  CD1 PHE A 163      32.883  93.299  37.419  1.00 11.73           C  
ATOM   1212  CD2 PHE A 163      34.808  92.030  36.768  1.00 11.73           C  
ATOM   1213  CE1 PHE A 163      32.436  92.236  38.195  1.00 11.71           C  
ATOM   1214  CE2 PHE A 163      34.368  90.959  37.542  1.00 11.69           C  
ATOM   1215  CZ  PHE A 163      33.178  91.062  38.257  1.00 11.69           C  
ATOM   1216  N   ARG A 164      36.589  96.471  34.619  1.00 12.17           N  
ATOM   1217  CA  ARG A 164      36.803  97.597  33.715  1.00 12.36           C  
ATOM   1218  C   ARG A 164      38.254  97.711  33.239  1.00 12.52           C  
ATOM   1219  O   ARG A 164      38.648  98.730  32.670  1.00 12.59           O  
ATOM   1220  CB  ARG A 164      36.367  98.892  34.415  0.95 12.32           C  
ATOM   1221  CG  ARG A 164      34.880  98.912  34.786  1.00 12.25           C  
ATOM   1222  CD  ARG A 164      34.578  99.921  35.890  1.00 12.21           C  
ATOM   1223  NE  ARG A 164      34.719 101.320  35.493  1.00 12.22           N  
ATOM   1224  CZ  ARG A 164      33.777 102.034  34.883  1.00 12.20           C  
ATOM   1225  NH1 ARG A 164      34.014 103.301  34.569  0.99 12.24           N  
ATOM   1226  NH2 ARG A 164      32.596 101.496  34.603  1.00 12.15           N  
ATOM   1227  N   THR A 165      39.041  96.664  33.472  1.00 12.69           N  
ATOM   1228  CA  THR A 165      40.441  96.645  33.052  1.00 12.89           C  
ATOM   1229  C   THR A 165      40.587  95.789  31.797  1.00 13.01           C  
ATOM   1230  O   THR A 165      40.122  94.648  31.757  1.00 13.12           O  
ATOM   1231  CB  THR A 165      41.352  96.067  34.156  1.00 12.85           C  
ATOM   1232  OG1 THR A 165      41.281  96.901  35.318  0.82 12.89           O  
ATOM   1233  CG2 THR A 165      42.799  95.996  33.677  0.98 12.86           C  
ATOM   1234  N   ALA A 166      41.238  96.344  30.780  1.00 13.19           N  
ATOM   1235  CA  ALA A 166      41.441  95.645  29.514  1.00 13.26           C  
ATOM   1236  C   ALA A 166      41.892  94.196  29.682  1.00 13.31           C  
ATOM   1237  O   ALA A 166      42.806  93.903  30.456  1.00 13.36           O  
ATOM   1238  CB  ALA A 166      42.451  96.408  28.658  0.65 13.29           C  
ATOM   1239  N   ASP A 167      41.237  93.303  28.941  1.00 13.33           N  
ATOM   1240  CA  ASP A 167      41.531  91.869  28.947  1.00 13.32           C  
ATOM   1241  C   ASP A 167      41.135  91.155  30.238  1.00 13.26           C  
ATOM   1242  O   ASP A 167      40.415  90.152  30.206  1.00 13.37           O  
ATOM   1243  CB  ASP A 167      43.018  91.632  28.660  0.75 13.41           C  
ATOM   1244  CG  ASP A 167      43.449  92.203  27.322  0.41 13.46           C  
ATOM   1245  OD1 ASP A 167      42.834  91.845  26.295  0.32 13.49           O  
ATOM   1246  OD2 ASP A 167      44.405  93.007  27.296  0.21 13.51           O  
ATOM   1247  N   VAL A 168      41.608  91.666  31.370  1.00 13.11           N  
ATOM   1248  CA  VAL A 168      41.300  91.071  32.663  1.00 12.92           C  
ATOM   1249  C   VAL A 168      39.793  90.947  32.867  1.00 12.77           C  
ATOM   1250  O   VAL A 168      39.297  89.893  33.258  1.00 12.75           O  
ATOM   1251  CB  VAL A 168      41.892  91.913  33.815  0.70 12.95           C  
ATOM   1252  CG1 VAL A 168      41.488  91.324  35.152  0.82 12.95           C  
ATOM   1253  CG2 VAL A 168      43.408  91.956  33.698  0.71 12.93           C  
ATOM   1254  N   GLY A 169      39.072  92.027  32.586  1.00 12.60           N  
ATOM   1255  CA  GLY A 169      37.629  92.025  32.756  1.00 12.41           C  
ATOM   1256  C   GLY A 169      36.875  90.958  31.983  1.00 12.27           C  
ATOM   1257  O   GLY A 169      35.953  90.342  32.518  1.00 12.18           O  
ATOM   1258  N   ARG A 170      37.250  90.739  30.725  1.00 12.13           N  
ATOM   1259  CA  ARG A 170      36.581  89.736  29.901  1.00 12.01           C  
ATOM   1260  C   ARG A 170      36.940  88.325  30.361  1.00 11.90           C  
ATOM   1261  O   ARG A 170      36.107  87.422  30.326  1.00 11.90           O  
ATOM   1262  CB  ARG A 170      36.944  89.925  28.421  1.00 12.05           C  
ATOM   1263  CG  ARG A 170      36.478  91.257  27.832  0.99 12.15           C  
ATOM   1264  CD  ARG A 170      36.848  91.385  26.357  0.81 12.23           C  
ATOM   1265  NE  ARG A 170      36.098  90.471  25.498  0.79 12.34           N  
ATOM   1266  CZ  ARG A 170      34.817  90.622  25.173  0.96 12.37           C  
ATOM   1267  NH1 ARG A 170      34.123  91.657  25.631  0.85 12.43           N  
ATOM   1268  NH2 ARG A 170      34.225  89.732  24.388  0.79 12.45           N  
ATOM   1269  N   GLU A 171      38.182  88.134  30.794  1.00 11.79           N  
ATOM   1270  CA  GLU A 171      38.610  86.825  31.273  1.00 11.70           C  
ATOM   1271  C   GLU A 171      37.752  86.432  32.473  1.00 11.61           C  
ATOM   1272  O   GLU A 171      37.296  85.297  32.582  1.00 11.61           O  
ATOM   1273  CB  GLU A 171      40.083  86.861  31.691  0.88 11.69           C  
ATOM   1274  CG  GLU A 171      41.051  87.219  30.576  0.40 11.75           C  
ATOM   1275  CD  GLU A 171      42.488  87.272  31.059  0.51 11.78           C  
ATOM   1276  OE1 GLU A 171      42.993  86.234  31.537  0.07 11.83           O  
ATOM   1277  OE2 GLU A 171      43.110  88.351  30.964  0.17 11.81           O  
ATOM   1278  N   LEU A 172      37.528  87.387  33.370  1.00 11.53           N  
ATOM   1279  CA  LEU A 172      36.728  87.142  34.563  1.00 11.40           C  
ATOM   1280  C   LEU A 172      35.245  86.910  34.282  1.00 11.30           C  
ATOM   1281  O   LEU A 172      34.682  85.887  34.668  1.00 11.28           O  
ATOM   1282  CB  LEU A 172      36.859  88.317  35.537  0.94 11.45           C  
ATOM   1283  CG  LEU A 172      38.215  88.555  36.202  0.96 11.44           C  
ATOM   1284  CD1 LEU A 172      38.190  89.885  36.944  0.86 11.49           C  
ATOM   1285  CD2 LEU A 172      38.530  87.409  37.154  0.93 11.47           C  
ATOM   1286  N   ILE A 173      34.620  87.866  33.604  1.00 11.18           N  
ATOM   1287  CA  ILE A 173      33.191  87.788  33.323  1.00 11.10           C  
ATOM   1288  C   ILE A 173      32.758  86.816  32.233  1.00 11.11           C  
ATOM   1289  O   ILE A 173      31.791  86.077  32.411  1.00 11.04           O  
ATOM   1290  CB  ILE A 173      32.634  89.189  32.992  1.00 11.02           C  
ATOM   1291  CG1 ILE A 173      32.787  90.099  34.211  1.00 10.99           C  
ATOM   1292  CG2 ILE A 173      31.171  89.091  32.569  1.00 10.98           C  
ATOM   1293  CD1 ILE A 173      32.336  91.523  33.974  1.00 10.93           C  
ATOM   1294  N   ILE A 174      33.461  86.810  31.108  1.00 11.13           N  
ATOM   1295  CA  ILE A 174      33.093  85.924  30.014  1.00 11.18           C  
ATOM   1296  C   ILE A 174      33.673  84.517  30.141  1.00 11.18           C  
ATOM   1297  O   ILE A 174      32.933  83.536  30.143  1.00 11.24           O  
ATOM   1298  CB  ILE A 174      33.501  86.537  28.654  0.83 11.19           C  
ATOM   1299  CG1 ILE A 174      32.779  87.876  28.462  0.86 11.22           C  
ATOM   1300  CG2 ILE A 174      33.150  85.579  27.519  0.94 11.25           C  
ATOM   1301  CD1 ILE A 174      33.150  88.612  27.196  0.71 11.19           C  
ATOM   1302  N   ASP A 175      34.989  84.410  30.271  1.00 11.18           N  
ATOM   1303  CA  ASP A 175      35.602  83.092  30.372  1.00 11.12           C  
ATOM   1304  C   ASP A 175      35.297  82.366  31.680  1.00 11.08           C  
ATOM   1305  O   ASP A 175      35.014  81.168  31.680  1.00 11.17           O  
ATOM   1306  CB  ASP A 175      37.119  83.201  30.193  1.00 11.18           C  
ATOM   1307  CG  ASP A 175      37.502  83.930  28.921  0.71 11.23           C  
ATOM   1308  OD1 ASP A 175      37.001  83.554  27.845  0.44 11.29           O  
ATOM   1309  OD2 ASP A 175      38.311  84.879  28.997  0.01 11.28           O  
ATOM   1310  N   GLN A 176      35.338  83.097  32.790  1.00 10.96           N  
ATOM   1311  CA  GLN A 176      35.107  82.508  34.103  1.00 10.81           C  
ATOM   1312  C   GLN A 176      33.700  82.702  34.672  1.00 10.65           C  
ATOM   1313  O   GLN A 176      33.376  82.155  35.728  1.00 10.68           O  
ATOM   1314  CB  GLN A 176      36.155  83.056  35.068  0.94 10.86           C  
ATOM   1315  CG  GLN A 176      37.577  82.701  34.655  0.82 10.95           C  
ATOM   1316  CD  GLN A 176      38.622  83.489  35.414  0.63 11.01           C  
ATOM   1317  OE1 GLN A 176      38.601  83.548  36.641  0.53 11.10           O  
ATOM   1318  NE2 GLN A 176      39.553  84.094  34.683  0.31 11.05           N  
ATOM   1319  N   ASN A 177      32.875  83.475  33.970  1.00 10.44           N  
ATOM   1320  CA  ASN A 177      31.491  83.749  34.372  1.00 10.27           C  
ATOM   1321  C   ASN A 177      31.425  84.288  35.806  1.00 10.17           C  
ATOM   1322  O   ASN A 177      30.526  83.950  36.580  1.00 10.08           O  
ATOM   1323  CB  ASN A 177      30.658  82.465  34.220  1.00 10.25           C  
ATOM   1324  CG  ASN A 177      29.163  82.736  34.130  0.97 10.20           C  
ATOM   1325  OD1 ASN A 177      28.741  83.797  33.674  1.00 10.16           O  
ATOM   1326  ND2 ASN A 177      28.357  81.752  34.518  1.00 10.18           N  
ATOM   1327  N   ALA A 178      32.372  85.165  36.129  1.00 10.06           N  
ATOM   1328  CA  ALA A 178      32.484  85.751  37.462  1.00  9.99           C  
ATOM   1329  C   ALA A 178      31.315  86.609  37.928  1.00  9.89           C  
ATOM   1330  O   ALA A 178      31.124  86.781  39.132  1.00  9.94           O  
ATOM   1331  CB  ALA A 178      33.776  86.556  37.563  0.96 10.00           C  
ATOM   1332  N   PHE A 179      30.533  87.162  37.006  1.00  9.78           N  
ATOM   1333  CA  PHE A 179      29.420  87.987  37.457  1.00  9.68           C  
ATOM   1334  C   PHE A 179      28.304  87.107  38.013  1.00  9.70           C  
ATOM   1335  O   PHE A 179      27.647  87.466  38.989  1.00  9.68           O  
ATOM   1336  CB  PHE A 179      28.873  88.869  36.332  0.97  9.62           C  
ATOM   1337  CG  PHE A 179      28.522  90.251  36.792  1.00  9.51           C  
ATOM   1338  CD1 PHE A 179      29.352  91.327  36.495  1.00  9.48           C  
ATOM   1339  CD2 PHE A 179      27.422  90.462  37.617  0.97  9.55           C  
ATOM   1340  CE1 PHE A 179      29.095  92.590  37.018  1.00  9.47           C  
ATOM   1341  CE2 PHE A 179      27.160  91.723  38.146  0.90  9.54           C  
ATOM   1342  CZ  PHE A 179      27.998  92.784  37.848  1.00  9.52           C  
ATOM   1343  N   ILE A 180      28.099  85.952  37.391  1.00  9.74           N  
ATOM   1344  CA  ILE A 180      27.078  85.010  37.832  1.00  9.83           C  
ATOM   1345  C   ILE A 180      27.557  84.201  39.041  1.00  9.91           C  
ATOM   1346  O   ILE A 180      26.853  84.097  40.043  1.00  9.89           O  
ATOM   1347  CB  ILE A 180      26.708  84.017  36.696  1.00  9.85           C  
ATOM   1348  CG1 ILE A 180      25.959  84.744  35.573  0.97  9.88           C  
ATOM   1349  CG2 ILE A 180      25.868  82.869  37.251  0.95  9.89           C  
ATOM   1350  CD1 ILE A 180      24.572  85.225  35.957  0.77  9.94           C  
ATOM   1351  N   GLU A 181      28.759  83.640  38.943  1.00 10.03           N  
ATOM   1352  CA  GLU A 181      29.307  82.812  40.013  1.00 10.19           C  
ATOM   1353  C   GLU A 181      29.840  83.566  41.223  1.00 10.30           C  
ATOM   1354  O   GLU A 181      29.897  83.014  42.320  1.00 10.39           O  
ATOM   1355  CB  GLU A 181      30.434  81.925  39.477  1.00 10.15           C  
ATOM   1356  CG  GLU A 181      30.039  80.918  38.406  1.00 10.16           C  
ATOM   1357  CD  GLU A 181      28.976  79.938  38.862  0.96 10.17           C  
ATOM   1358  OE1 GLU A 181      28.900  79.648  40.076  0.82 10.22           O  
ATOM   1359  OE2 GLU A 181      28.235  79.430  37.997  1.00 10.16           O  
ATOM   1360  N   GLY A 182      30.241  84.815  41.029  1.00 10.43           N  
ATOM   1361  CA  GLY A 182      30.787  85.570  42.141  1.00 10.65           C  
ATOM   1362  C   GLY A 182      29.962  86.739  42.628  1.00 10.76           C  
ATOM   1363  O   GLY A 182      29.433  86.718  43.739  1.00 10.83           O  
ATOM   1364  N   VAL A 183      29.849  87.766  41.795  1.00 10.83           N  
ATOM   1365  CA  VAL A 183      29.110  88.962  42.166  1.00 10.91           C  
ATOM   1366  C   VAL A 183      27.692  88.704  42.664  1.00 11.00           C  
ATOM   1367  O   VAL A 183      27.332  89.122  43.765  1.00 11.06           O  
ATOM   1368  CB  VAL A 183      29.054  89.954  40.991  1.00 10.90           C  
ATOM   1369  CG1 VAL A 183      28.244  91.163  41.380  0.94 10.95           C  
ATOM   1370  CG2 VAL A 183      30.464  90.377  40.600  0.90 10.92           C  
ATOM   1371  N   LEU A 184      26.887  88.016  41.862  1.00 11.01           N  
ATOM   1372  CA  LEU A 184      25.506  87.739  42.236  1.00 11.06           C  
ATOM   1373  C   LEU A 184      25.323  87.173  43.648  1.00 11.17           C  
ATOM   1374  O   LEU A 184      24.663  87.790  44.482  1.00 11.09           O  
ATOM   1375  CB  LEU A 184      24.866  86.811  41.195  1.00 11.06           C  
ATOM   1376  CG  LEU A 184      23.429  86.342  41.429  1.00 11.00           C  
ATOM   1377  CD1 LEU A 184      22.491  87.536  41.571  0.99 11.02           C  
ATOM   1378  CD2 LEU A 184      23.002  85.465  40.262  1.00 11.04           C  
ATOM   1379  N   PRO A 185      25.917  86.006  43.945  1.00 11.29           N  
ATOM   1380  CA  PRO A 185      25.771  85.415  45.279  1.00 11.37           C  
ATOM   1381  C   PRO A 185      26.385  86.258  46.393  1.00 11.41           C  
ATOM   1382  O   PRO A 185      25.863  86.303  47.509  1.00 11.44           O  
ATOM   1383  CB  PRO A 185      26.479  84.063  45.132  0.87 11.46           C  
ATOM   1384  CG  PRO A 185      26.401  83.789  43.638  0.17 11.57           C  
ATOM   1385  CD  PRO A 185      26.765  85.143  43.108  1.00 11.37           C  
ATOM   1386  N   LYS A 186      27.495  86.922  46.088  1.00 11.39           N  
ATOM   1387  CA  LYS A 186      28.181  87.746  47.075  1.00 11.38           C  
ATOM   1388  C   LYS A 186      27.447  89.047  47.364  1.00 11.35           C  
ATOM   1389  O   LYS A 186      27.855  89.820  48.236  1.00 11.40           O  
ATOM   1390  CB  LYS A 186      29.612  88.046  46.619  0.97 11.45           C  
ATOM   1391  CG  LYS A 186      30.517  86.822  46.536  0.69 11.53           C  
ATOM   1392  CD  LYS A 186      30.715  86.170  47.897  0.39 11.58           C  
ATOM   1393  CE  LYS A 186      31.659  84.983  47.802  0.24 11.58           C  
ATOM   1394  NZ  LYS A 186      32.990  85.380  47.269  0.09 11.53           N  
ATOM   1395  N   CYS A 187      26.361  89.290  46.640  1.00 11.19           N  
ATOM   1396  CA  CYS A 187      25.590  90.498  46.866  1.00 11.22           C  
ATOM   1397  C   CYS A 187      24.162  90.297  47.287  1.00 11.06           C  
ATOM   1398  O   CYS A 187      23.283  91.129  47.040  1.00 11.00           O  
ATOM   1399  CB  CYS A 187      25.690  91.414  45.672  1.00 11.28           C  
ATOM   1400  SG  CYS A 187      27.285  92.199  45.771  0.62 12.17           S  
ATOM   1401  N   VAL A 188      23.962  89.158  47.933  1.00 11.02           N  
ATOM   1402  CA  VAL A 188      22.702  88.776  48.535  1.00 10.94           C  
ATOM   1403  C   VAL A 188      23.201  88.384  49.921  1.00 10.93           C  
ATOM   1404  O   VAL A 188      24.161  87.620  50.041  1.00 10.93           O  
ATOM   1405  CB  VAL A 188      22.064  87.553  47.855  1.00 10.97           C  
ATOM   1406  CG1 VAL A 188      20.808  87.142  48.611  1.00 11.04           C  
ATOM   1407  CG2 VAL A 188      21.713  87.887  46.414  1.00 11.02           C  
ATOM   1408  N   VAL A 189      22.586  88.928  50.965  1.00 10.85           N  
ATOM   1409  CA  VAL A 189      23.026  88.608  52.316  1.00 10.86           C  
ATOM   1410  C   VAL A 189      22.771  87.142  52.638  1.00 10.88           C  
ATOM   1411  O   VAL A 189      23.669  86.441  53.102  1.00 11.01           O  
ATOM   1412  CB  VAL A 189      22.333  89.506  53.360  1.00 10.78           C  
ATOM   1413  CG1 VAL A 189      22.734  89.071  54.765  1.00 10.79           C  
ATOM   1414  CG2 VAL A 189      22.734  90.960  53.136  0.93 10.84           C  
ATOM   1415  N   ARG A 190      21.553  86.673  52.389  1.00 10.89           N  
ATOM   1416  CA  ARG A 190      21.244  85.276  52.652  1.00 10.92           C  
ATOM   1417  C   ARG A 190      21.831  84.437  51.519  1.00 10.95           C  
ATOM   1418  O   ARG A 190      22.065  84.937  50.419  1.00 10.95           O  
ATOM   1419  CB  ARG A 190      19.726  85.087  52.798  0.87 10.93           C  
ATOM   1420  CG  ARG A 190      18.877  85.428  51.585  0.82 10.90           C  
ATOM   1421  CD  ARG A 190      18.741  84.242  50.659  0.82 10.86           C  
ATOM   1422  NE  ARG A 190      17.825  84.519  49.555  0.83 10.84           N  
ATOM   1423  CZ  ARG A 190      17.430  83.608  48.672  1.00 10.78           C  
ATOM   1424  NH1 ARG A 190      16.598  83.944  47.697  1.00 10.78           N  
ATOM   1425  NH2 ARG A 190      17.859  82.356  48.772  1.00 10.72           N  
ATOM   1426  N   PRO A 191      22.136  83.161  51.789  1.00 10.98           N  
ATOM   1427  CA  PRO A 191      22.709  82.286  50.763  1.00 11.00           C  
ATOM   1428  C   PRO A 191      21.724  81.849  49.683  1.00 10.99           C  
ATOM   1429  O   PRO A 191      20.677  81.281  49.984  1.00 11.14           O  
ATOM   1430  CB  PRO A 191      23.211  81.108  51.587  0.80 11.02           C  
ATOM   1431  CG  PRO A 191      22.119  80.994  52.623  0.44 11.02           C  
ATOM   1432  CD  PRO A 191      22.042  82.444  53.074  0.79 11.00           C  
ATOM   1433  N   LEU A 192      22.050  82.128  48.425  1.00 10.89           N  
ATOM   1434  CA  LEU A 192      21.182  81.699  47.337  1.00 10.77           C  
ATOM   1435  C   LEU A 192      21.334  80.186  47.259  1.00 10.71           C  
ATOM   1436  O   LEU A 192      22.421  79.658  47.501  1.00 10.76           O  
ATOM   1437  CB  LEU A 192      21.608  82.336  46.011  1.00 10.77           C  
ATOM   1438  CG  LEU A 192      21.406  83.846  45.875  1.00 10.79           C  
ATOM   1439  CD1 LEU A 192      21.894  84.303  44.506  1.00 10.78           C  
ATOM   1440  CD2 LEU A 192      19.934  84.185  46.048  0.96 10.85           C  
ATOM   1441  N   THR A 193      20.249  79.490  46.936  1.00 10.60           N  
ATOM   1442  CA  THR A 193      20.292  78.036  46.839  1.00 10.50           C  
ATOM   1443  C   THR A 193      20.771  77.595  45.464  1.00 10.46           C  
ATOM   1444  O   THR A 193      20.852  78.403  44.535  1.00 10.43           O  
ATOM   1445  CB  THR A 193      18.913  77.410  47.096  1.00 10.51           C  
ATOM   1446  OG1 THR A 193      17.996  77.832  46.080  1.00 10.57           O  
ATOM   1447  CG2 THR A 193      18.390  77.831  48.462  0.97 10.54           C  
ATOM   1448  N   GLU A 194      21.084  76.310  45.341  1.00 10.36           N  
ATOM   1449  CA  GLU A 194      21.564  75.751  44.083  1.00 10.29           C  
ATOM   1450  C   GLU A 194      20.557  75.954  42.952  1.00 10.21           C  
ATOM   1451  O   GLU A 194      20.938  76.309  41.834  1.00 10.18           O  
ATOM   1452  CB  GLU A 194      21.850  74.252  44.243  0.81 10.35           C  
ATOM   1453  CG  GLU A 194      22.460  73.600  43.006  0.74 10.49           C  
ATOM   1454  CD  GLU A 194      23.932  73.912  42.830  0.61 10.57           C  
ATOM   1455  OE1 GLU A 194      24.323  75.083  43.011  0.24 10.60           O  
ATOM   1456  OE2 GLU A 194      24.698  72.988  42.484  0.37 10.68           O  
ATOM   1457  N   VAL A 195      19.276  75.731  43.234  1.00 10.09           N  
ATOM   1458  CA  VAL A 195      18.255  75.882  42.203  1.00  9.99           C  
ATOM   1459  C   VAL A 195      18.108  77.330  41.745  1.00  9.90           C  
ATOM   1460  O   VAL A 195      17.870  77.589  40.565  1.00  9.83           O  
ATOM   1461  CB  VAL A 195      16.878  75.346  42.673  0.90 10.02           C  
ATOM   1462  CG1 VAL A 195      16.360  76.162  43.844  0.72 10.04           C  
ATOM   1463  CG2 VAL A 195      15.892  75.373  41.515  0.63 10.01           C  
ATOM   1464  N   GLU A 196      18.244  78.272  42.673  1.00  9.77           N  
ATOM   1465  CA  GLU A 196      18.137  79.680  42.309  1.00  9.69           C  
ATOM   1466  C   GLU A 196      19.329  80.056  41.443  1.00  9.63           C  
ATOM   1467  O   GLU A 196      19.180  80.736  40.429  1.00  9.60           O  
ATOM   1468  CB  GLU A 196      18.070  80.552  43.566  1.00  9.70           C  
ATOM   1469  CG  GLU A 196      16.808  80.305  44.381  1.00  9.70           C  
ATOM   1470  CD  GLU A 196      16.810  81.024  45.712  0.87  9.70           C  
ATOM   1471  OE1 GLU A 196      17.789  80.863  46.468  1.00  9.71           O  
ATOM   1472  OE2 GLU A 196      15.827  81.735  46.009  0.99  9.71           O  
ATOM   1473  N   MET A 197      20.517  79.605  41.832  1.00  9.56           N  
ATOM   1474  CA  MET A 197      21.705  79.894  41.042  1.00  9.51           C  
ATOM   1475  C   MET A 197      21.598  79.256  39.658  1.00  9.48           C  
ATOM   1476  O   MET A 197      21.993  79.868  38.666  1.00  9.48           O  
ATOM   1477  CB  MET A 197      22.969  79.414  41.762  1.00  9.68           C  
ATOM   1478  CG  MET A 197      23.405  80.324  42.910  1.00  9.86           C  
ATOM   1479  SD  MET A 197      23.907  81.982  42.357  0.94 10.32           S  
ATOM   1480  CE  MET A 197      25.322  81.581  41.291  0.95 10.14           C  
ATOM   1481  N   ASP A 198      21.058  78.041  39.575  1.00  9.39           N  
ATOM   1482  CA  ASP A 198      20.917  77.417  38.264  1.00  9.27           C  
ATOM   1483  C   ASP A 198      19.926  78.181  37.385  1.00  9.21           C  
ATOM   1484  O   ASP A 198      20.071  78.206  36.165  1.00  9.21           O  
ATOM   1485  CB  ASP A 198      20.522  75.936  38.370  1.00  9.30           C  
ATOM   1486  CG  ASP A 198      21.681  75.051  38.816  1.00  9.31           C  
ATOM   1487  OD1 ASP A 198      22.848  75.432  38.588  0.93  9.41           O  
ATOM   1488  OD2 ASP A 198      21.430  73.957  39.364  0.87  9.41           O  
ATOM   1489  N   HIS A 199      18.922  78.808  37.993  1.00  9.12           N  
ATOM   1490  CA  HIS A 199      17.972  79.604  37.216  1.00  9.10           C  
ATOM   1491  C   HIS A 199      18.726  80.794  36.623  1.00  9.04           C  
ATOM   1492  O   HIS A 199      18.516  81.158  35.466  1.00  9.14           O  
ATOM   1493  CB  HIS A 199      16.827  80.102  38.104  0.97  9.12           C  
ATOM   1494  CG  HIS A 199      15.664  79.160  38.184  0.83  9.14           C  
ATOM   1495  ND1 HIS A 199      14.785  78.976  37.139  0.72  9.17           N  
ATOM   1496  CD2 HIS A 199      15.235  78.352  39.183  0.81  9.16           C  
ATOM   1497  CE1 HIS A 199      13.862  78.097  37.491  0.78  9.17           C  
ATOM   1498  NE2 HIS A 199      14.113  77.704  38.727  0.69  9.16           N  
ATOM   1499  N   TYR A 200      19.607  81.395  37.417  1.00  8.94           N  
ATOM   1500  CA  TYR A 200      20.387  82.535  36.948  1.00  8.79           C  
ATOM   1501  C   TYR A 200      21.476  82.143  35.953  1.00  8.83           C  
ATOM   1502  O   TYR A 200      21.851  82.935  35.092  1.00  8.79           O  
ATOM   1503  CB  TYR A 200      20.998  83.288  38.139  1.00  8.67           C  
ATOM   1504  CG  TYR A 200      20.003  84.162  38.880  1.00  8.52           C  
ATOM   1505  CD1 TYR A 200      19.744  83.975  40.239  0.93  8.49           C  
ATOM   1506  CD2 TYR A 200      19.343  85.200  38.223  1.00  8.46           C  
ATOM   1507  CE1 TYR A 200      18.850  84.806  40.926  1.00  8.36           C  
ATOM   1508  CE2 TYR A 200      18.452  86.031  38.896  1.00  8.36           C  
ATOM   1509  CZ  TYR A 200      18.209  85.831  40.245  0.97  8.38           C  
ATOM   1510  OH  TYR A 200      17.330  86.665  40.900  1.00  8.32           O  
ATOM   1511  N   ARG A 201      21.971  80.915  36.060  1.00  8.86           N  
ATOM   1512  CA  ARG A 201      23.015  80.428  35.157  1.00  8.96           C  
ATOM   1513  C   ARG A 201      22.480  80.032  33.785  1.00  9.04           C  
ATOM   1514  O   ARG A 201      23.168  80.175  32.779  1.00  9.01           O  
ATOM   1515  CB  ARG A 201      23.704  79.199  35.757  1.00  8.96           C  
ATOM   1516  CG  ARG A 201      24.588  79.461  36.956  1.00  9.04           C  
ATOM   1517  CD  ARG A 201      24.857  78.163  37.708  0.99  9.13           C  
ATOM   1518  NE  ARG A 201      25.796  78.361  38.808  1.00  9.18           N  
ATOM   1519  CZ  ARG A 201      25.724  77.729  39.975  1.00  9.20           C  
ATOM   1520  NH1 ARG A 201      26.628  77.974  40.914  0.98  9.28           N  
ATOM   1521  NH2 ARG A 201      24.734  76.880  40.219  0.99  9.26           N  
ATOM   1522  N   GLU A 202      21.247  79.541  33.755  1.00  9.18           N  
ATOM   1523  CA  GLU A 202      20.631  79.050  32.527  1.00  9.26           C  
ATOM   1524  C   GLU A 202      20.822  79.849  31.233  1.00  9.32           C  
ATOM   1525  O   GLU A 202      21.168  79.279  30.204  1.00  9.36           O  
ATOM   1526  CB  GLU A 202      19.135  78.806  32.758  0.94  9.34           C  
ATOM   1527  CG  GLU A 202      18.420  78.169  31.570  0.43  9.43           C  
ATOM   1528  CD  GLU A 202      16.958  77.873  31.853  0.24  9.49           C  
ATOM   1529  OE1 GLU A 202      16.212  78.818  32.185  0.18  9.52           O  
ATOM   1530  OE2 GLU A 202      16.554  76.696  31.739  0.10  9.53           O  
ATOM   1531  N   PRO A 203      20.601  81.170  31.261  1.00  9.34           N  
ATOM   1532  CA  PRO A 203      20.768  81.954  30.032  1.00  9.43           C  
ATOM   1533  C   PRO A 203      22.192  82.084  29.503  1.00  9.58           C  
ATOM   1534  O   PRO A 203      22.390  82.419  28.333  1.00  9.66           O  
ATOM   1535  CB  PRO A 203      20.206  83.323  30.425  0.96  9.41           C  
ATOM   1536  CG  PRO A 203      19.270  82.998  31.588  1.00  9.34           C  
ATOM   1537  CD  PRO A 203      20.156  82.051  32.350  1.00  9.34           C  
ATOM   1538  N   PHE A 204      23.179  81.809  30.347  1.00  9.74           N  
ATOM   1539  CA  PHE A 204      24.565  81.998  29.940  1.00  9.88           C  
ATOM   1540  C   PHE A 204      25.470  80.774  29.901  1.00 10.05           C  
ATOM   1541  O   PHE A 204      26.679  80.878  30.123  1.00 10.08           O  
ATOM   1542  CB  PHE A 204      25.177  83.085  30.826  1.00  9.84           C  
ATOM   1543  CG  PHE A 204      24.340  84.329  30.893  1.00  9.78           C  
ATOM   1544  CD1 PHE A 204      23.529  84.584  31.994  1.00  9.77           C  
ATOM   1545  CD2 PHE A 204      24.293  85.200  29.811  1.00  9.76           C  
ATOM   1546  CE1 PHE A 204      22.682  85.690  32.014  1.00  9.73           C  
ATOM   1547  CE2 PHE A 204      23.450  86.306  29.819  1.00  9.72           C  
ATOM   1548  CZ  PHE A 204      22.642  86.552  30.922  1.00  9.72           C  
ATOM   1549  N   LEU A 205      24.886  79.623  29.591  1.00 10.24           N  
ATOM   1550  CA  LEU A 205      25.648  78.384  29.508  1.00 10.46           C  
ATOM   1551  C   LEU A 205      26.524  78.388  28.260  1.00 10.61           C  
ATOM   1552  O   LEU A 205      27.573  77.743  28.224  1.00 10.71           O  
ATOM   1553  CB  LEU A 205      24.697  77.186  29.465  0.97 10.52           C  
ATOM   1554  CG  LEU A 205      23.785  76.999  30.679  0.98 10.54           C  
ATOM   1555  CD1 LEU A 205      22.834  75.842  30.421  0.69 10.58           C  
ATOM   1556  CD2 LEU A 205      24.620  76.747  31.924  1.00 10.55           C  
ATOM   1557  N   LYS A 206      26.402  79.320  27.389  1.00 10.74           N  
ATOM   1558  CA  LYS A 206      27.289  79.513  26.248  1.00 10.78           C  
ATOM   1559  C   LYS A 206      28.074  80.783  26.577  1.00 10.84           C  
ATOM   1560  O   LYS A 206      27.509  81.874  26.629  1.00 10.92           O  
ATOM   1561  CB  LYS A 206      26.467  79.681  24.963  0.72 10.84           C  
ATOM   1562  CG  LYS A 206      25.659  78.436  24.600  0.50 10.87           C  
ATOM   1563  CD  LYS A 206      24.693  78.665  23.431  0.14 10.88           C  
ATOM   1564  CE  LYS A 206      25.405  79.036  22.140  0.15 10.89           C  
ATOM   1565  NZ  LYS A 206      24.421  79.259  21.036  0.15 10.92           N  
ATOM   1566  N   PRO A 207      29.362  80.645  26.748  1.00 10.87           N  
ATOM   1567  CA  PRO A 207      30.209  81.768  27.158  1.00 10.81           C  
ATOM   1568  C   PRO A 207      30.081  83.024  26.298  1.00 10.87           C  
ATOM   1569  O   PRO A 207      30.114  84.141  26.815  1.00 10.90           O  
ATOM   1570  CB  PRO A 207      31.608  81.161  27.106  0.76 10.88           C  
ATOM   1571  CG  PRO A 207      31.332  79.741  27.550  0.80 10.86           C  
ATOM   1572  CD  PRO A 207      30.182  79.428  26.622  0.81 10.86           C  
ATOM   1573  N   VAL A 208      29.935  82.849  24.991  1.00 10.88           N  
ATOM   1574  CA  VAL A 208      29.820  83.998  24.107  1.00 10.81           C  
ATOM   1575  C   VAL A 208      28.612  84.871  24.459  1.00 10.78           C  
ATOM   1576  O   VAL A 208      28.638  86.085  24.251  1.00 10.86           O  
ATOM   1577  CB  VAL A 208      29.725  83.563  22.622  0.94 10.84           C  
ATOM   1578  CG1 VAL A 208      28.429  82.812  22.374  0.61 10.89           C  
ATOM   1579  CG2 VAL A 208      29.841  84.782  21.715  0.76 10.85           C  
ATOM   1580  N   ASP A 209      27.562  84.264  25.008  1.00 10.69           N  
ATOM   1581  CA  ASP A 209      26.369  85.027  25.368  1.00 10.55           C  
ATOM   1582  C   ASP A 209      26.534  85.884  26.621  1.00 10.42           C  
ATOM   1583  O   ASP A 209      25.600  86.571  27.031  1.00 10.45           O  
ATOM   1584  CB  ASP A 209      25.158  84.107  25.562  1.00 10.68           C  
ATOM   1585  CG  ASP A 209      24.747  83.403  24.286  0.78 10.76           C  
ATOM   1586  OD1 ASP A 209      24.815  84.038  23.211  0.71 10.83           O  
ATOM   1587  OD2 ASP A 209      24.328  82.228  24.363  0.90 10.89           O  
ATOM   1588  N   ARG A 210      27.715  85.850  27.226  1.00 10.23           N  
ATOM   1589  CA  ARG A 210      27.960  86.631  28.436  1.00 10.03           C  
ATOM   1590  C   ARG A 210      28.402  88.065  28.141  1.00  9.93           C  
ATOM   1591  O   ARG A 210      28.714  88.823  29.056  1.00  9.88           O  
ATOM   1592  CB  ARG A 210      29.003  85.913  29.297  1.00 10.00           C  
ATOM   1593  CG  ARG A 210      28.534  84.532  29.720  0.99  9.95           C  
ATOM   1594  CD  ARG A 210      29.640  83.677  30.303  1.00  9.89           C  
ATOM   1595  NE  ARG A 210      29.156  82.326  30.573  1.00  9.81           N  
ATOM   1596  CZ  ARG A 210      29.934  81.299  30.904  0.95  9.83           C  
ATOM   1597  NH1 ARG A 210      31.244  81.462  31.012  0.90  9.86           N  
ATOM   1598  NH2 ARG A 210      29.398  80.107  31.128  1.00  9.80           N  
ATOM   1599  N   GLU A 211      28.403  88.439  26.863  1.00  9.79           N  
ATOM   1600  CA  GLU A 211      28.821  89.778  26.452  1.00  9.64           C  
ATOM   1601  C   GLU A 211      28.124  90.897  27.232  1.00  9.49           C  
ATOM   1602  O   GLU A 211      28.780  91.805  27.735  1.00  9.44           O  
ATOM   1603  CB  GLU A 211      28.572  89.968  24.951  1.00  9.71           C  
ATOM   1604  CG  GLU A 211      29.257  91.184  24.329  1.00  9.82           C  
ATOM   1605  CD  GLU A 211      30.772  91.122  24.439  0.93  9.87           C  
ATOM   1606  OE1 GLU A 211      31.331  90.008  24.356  0.86  9.91           O  
ATOM   1607  OE2 GLU A 211      31.408  92.188  24.580  0.75  9.96           O  
ATOM   1608  N   PRO A 212      26.786  90.855  27.340  1.00  9.35           N  
ATOM   1609  CA  PRO A 212      26.123  91.927  28.086  1.00  9.22           C  
ATOM   1610  C   PRO A 212      26.548  92.021  29.551  1.00  9.15           C  
ATOM   1611  O   PRO A 212      26.558  93.109  30.129  1.00  9.17           O  
ATOM   1612  CB  PRO A 212      24.641  91.585  27.923  1.00  9.23           C  
ATOM   1613  CG  PRO A 212      24.668  90.072  27.822  0.96  9.25           C  
ATOM   1614  CD  PRO A 212      25.781  89.918  26.808  1.00  9.27           C  
ATOM   1615  N   LEU A 213      26.913  90.887  30.141  1.00  9.03           N  
ATOM   1616  CA  LEU A 213      27.319  90.857  31.546  1.00  8.93           C  
ATOM   1617  C   LEU A 213      28.630  91.605  31.757  1.00  8.93           C  
ATOM   1618  O   LEU A 213      28.920  92.077  32.860  1.00  8.84           O  
ATOM   1619  CB  LEU A 213      27.470  89.409  32.024  1.00  8.87           C  
ATOM   1620  CG  LEU A 213      26.319  88.454  31.681  1.00  8.82           C  
ATOM   1621  CD1 LEU A 213      26.580  87.111  32.343  1.00  8.80           C  
ATOM   1622  CD2 LEU A 213      24.981  89.025  32.147  1.00  8.77           C  
ATOM   1623  N   TRP A 214      29.421  91.705  30.694  1.00  8.96           N  
ATOM   1624  CA  TRP A 214      30.702  92.402  30.746  1.00  9.01           C  
ATOM   1625  C   TRP A 214      30.560  93.867  30.338  1.00  9.04           C  
ATOM   1626  O   TRP A 214      31.222  94.741  30.894  1.00  9.01           O  
ATOM   1627  CB  TRP A 214      31.710  91.723  29.818  0.98  9.11           C  
ATOM   1628  CG  TRP A 214      32.978  92.503  29.643  1.00  9.19           C  
ATOM   1629  CD1 TRP A 214      34.057  92.536  30.484  1.00  9.23           C  
ATOM   1630  CD2 TRP A 214      33.274  93.406  28.573  0.96  9.27           C  
ATOM   1631  NE1 TRP A 214      35.008  93.407  29.997  0.94  9.31           N  
ATOM   1632  CE2 TRP A 214      34.551  93.954  28.827  1.00  9.26           C  
ATOM   1633  CE3 TRP A 214      32.581  93.808  27.423  0.94  9.30           C  
ATOM   1634  CZ2 TRP A 214      35.151  94.884  27.969  0.85  9.34           C  
ATOM   1635  CZ3 TRP A 214      33.177  94.732  26.571  0.92  9.34           C  
ATOM   1636  CH2 TRP A 214      34.450  95.258  26.850  0.90  9.37           C  
ATOM   1637  N   ARG A 215      29.701  94.143  29.363  1.00  9.02           N  
ATOM   1638  CA  ARG A 215      29.537  95.520  28.921  1.00  9.07           C  
ATOM   1639  C   ARG A 215      28.898  96.380  30.007  1.00  9.04           C  
ATOM   1640  O   ARG A 215      29.298  97.528  30.209  1.00  9.05           O  
ATOM   1641  CB  ARG A 215      28.708  95.584  27.634  0.96  9.17           C  
ATOM   1642  CG  ARG A 215      28.484  97.006  27.125  0.81  9.29           C  
ATOM   1643  CD  ARG A 215      29.791  97.766  26.893  0.74  9.42           C  
ATOM   1644  NE  ARG A 215      30.587  97.217  25.798  0.68  9.53           N  
ATOM   1645  CZ  ARG A 215      31.755  97.715  25.401  0.72  9.58           C  
ATOM   1646  NH1 ARG A 215      32.410  97.151  24.395  0.63  9.63           N  
ATOM   1647  NH2 ARG A 215      32.271  98.773  26.010  0.53  9.62           N  
ATOM   1648  N   PHE A 216      27.921  95.821  30.717  1.00  9.02           N  
ATOM   1649  CA  PHE A 216      27.246  96.559  31.779  1.00  8.97           C  
ATOM   1650  C   PHE A 216      28.193  97.212  32.795  1.00  9.05           C  
ATOM   1651  O   PHE A 216      28.133  98.424  33.001  1.00  9.04           O  
ATOM   1652  CB  PHE A 216      26.231  95.648  32.483  1.00  8.81           C  
ATOM   1653  CG  PHE A 216      24.867  95.644  31.843  1.00  8.66           C  
ATOM   1654  CD1 PHE A 216      24.117  94.473  31.787  1.00  8.59           C  
ATOM   1655  CD2 PHE A 216      24.299  96.824  31.369  1.00  8.61           C  
ATOM   1656  CE1 PHE A 216      22.822  94.472  31.271  1.00  8.52           C  
ATOM   1657  CE2 PHE A 216      22.997  96.834  30.849  1.00  8.54           C  
ATOM   1658  CZ  PHE A 216      22.261  95.654  30.804  1.00  8.50           C  
ATOM   1659  N   PRO A 217      29.065  96.429  33.457  1.00  9.11           N  
ATOM   1660  CA  PRO A 217      29.970  97.061  34.424  1.00  9.22           C  
ATOM   1661  C   PRO A 217      30.900  98.093  33.800  1.00  9.36           C  
ATOM   1662  O   PRO A 217      31.369  99.004  34.477  1.00  9.39           O  
ATOM   1663  CB  PRO A 217      30.709  95.866  35.028  1.00  9.18           C  
ATOM   1664  CG  PRO A 217      30.711  94.875  33.891  0.98  9.16           C  
ATOM   1665  CD  PRO A 217      29.267  94.971  33.457  1.00  9.14           C  
ATOM   1666  N   ASN A 218      31.159  97.951  32.506  1.00  9.53           N  
ATOM   1667  CA  ASN A 218      32.009  98.901  31.807  1.00  9.72           C  
ATOM   1668  C   ASN A 218      31.238 100.153  31.407  1.00  9.86           C  
ATOM   1669  O   ASN A 218      31.822 101.112  30.912  1.00  9.91           O  
ATOM   1670  CB  ASN A 218      32.635  98.237  30.582  1.00  9.71           C  
ATOM   1671  CG  ASN A 218      33.863  97.428  30.936  0.78  9.79           C  
ATOM   1672  OD1 ASN A 218      34.948  97.982  31.114  0.86  9.85           O  
ATOM   1673  ND2 ASN A 218      33.697  96.121  31.075  0.97  9.82           N  
ATOM   1674  N   GLU A 219      29.926 100.137  31.634  1.00  9.95           N  
ATOM   1675  CA  GLU A 219      29.068 101.275  31.314  1.00 10.09           C  
ATOM   1676  C   GLU A 219      28.728 102.094  32.560  1.00 10.20           C  
ATOM   1677  O   GLU A 219      28.272 103.231  32.447  1.00 10.16           O  
ATOM   1678  CB  GLU A 219      27.769 100.792  30.647  1.00 10.10           C  
ATOM   1679  CG  GLU A 219      27.950 100.224  29.238  0.94 10.18           C  
ATOM   1680  CD  GLU A 219      27.991 101.293  28.154  0.70 10.22           C  
ATOM   1681  OE1 GLU A 219      26.937 101.556  27.531  0.76 10.31           O  
ATOM   1682  OE2 GLU A 219      29.068 101.885  27.932  0.74 10.29           O  
ATOM   1683  N   ILE A 220      28.957 101.528  33.745  1.00 10.34           N  
ATOM   1684  CA  ILE A 220      28.650 102.232  34.993  1.00 10.48           C  
ATOM   1685  C   ILE A 220      29.385 103.565  35.068  1.00 10.66           C  
ATOM   1686  O   ILE A 220      30.596 103.621  34.867  1.00 10.64           O  
ATOM   1687  CB  ILE A 220      29.086 101.439  36.241  1.00 10.50           C  
ATOM   1688  CG1 ILE A 220      28.479 100.041  36.243  0.86 10.55           C  
ATOM   1689  CG2 ILE A 220      28.644 102.185  37.498  1.00 10.51           C  
ATOM   1690  CD1 ILE A 220      29.034  99.179  37.364  0.71 10.58           C  
ATOM   1691  N   PRO A 221      28.661 104.659  35.343  1.00 10.83           N  
ATOM   1692  CA  PRO A 221      29.310 105.969  35.438  1.00 10.98           C  
ATOM   1693  C   PRO A 221      30.133 106.079  36.729  1.00 11.20           C  
ATOM   1694  O   PRO A 221      29.592 106.357  37.800  1.00 11.25           O  
ATOM   1695  CB  PRO A 221      28.124 106.923  35.419  1.00 10.95           C  
ATOM   1696  CG  PRO A 221      27.097 106.139  36.214  1.00 10.88           C  
ATOM   1697  CD  PRO A 221      27.202 104.800  35.509  1.00 10.82           C  
ATOM   1698  N   ILE A 222      31.438 105.849  36.623  1.00 11.46           N  
ATOM   1699  CA  ILE A 222      32.321 105.921  37.784  1.00 11.72           C  
ATOM   1700  C   ILE A 222      33.502 106.835  37.483  1.00 11.87           C  
ATOM   1701  O   ILE A 222      34.202 106.652  36.489  1.00 11.95           O  
ATOM   1702  CB  ILE A 222      32.869 104.525  38.163  1.00 11.77           C  
ATOM   1703  CG1 ILE A 222      31.711 103.557  38.420  1.00 11.82           C  
ATOM   1704  CG2 ILE A 222      33.758 104.631  39.398  0.94 11.84           C  
ATOM   1705  CD1 ILE A 222      32.157 102.130  38.687  0.90 11.87           C  
ATOM   1706  N   ALA A 223      33.716 107.819  38.348  1.00 12.02           N  
ATOM   1707  CA  ALA A 223      34.813 108.763  38.182  1.00 12.17           C  
ATOM   1708  C   ALA A 223      34.797 109.442  36.811  1.00 12.24           C  
ATOM   1709  O   ALA A 223      35.849 109.704  36.223  1.00 12.37           O  
ATOM   1710  CB  ALA A 223      36.148 108.052  38.406  0.95 12.20           C  
ATOM   1711  N   GLY A 224      33.600 109.714  36.303  1.00 12.30           N  
ATOM   1712  CA  GLY A 224      33.467 110.390  35.025  1.00 12.33           C  
ATOM   1713  C   GLY A 224      33.580 109.560  33.760  1.00 12.32           C  
ATOM   1714  O   GLY A 224      33.578 110.115  32.663  1.00 12.43           O  
ATOM   1715  N   GLU A 225      33.668 108.241  33.894  1.00 12.30           N  
ATOM   1716  CA  GLU A 225      33.786 107.376  32.721  1.00 12.28           C  
ATOM   1717  C   GLU A 225      32.818 106.196  32.774  1.00 12.15           C  
ATOM   1718  O   GLU A 225      32.587 105.623  33.838  1.00 12.19           O  
ATOM   1719  CB  GLU A 225      35.214 106.834  32.614  0.68 12.40           C  
ATOM   1720  CG  GLU A 225      36.292 107.895  32.496  0.69 12.56           C  
ATOM   1721  CD  GLU A 225      37.687 107.299  32.508  0.31 12.64           C  
ATOM   1722  OE1 GLU A 225      37.991 106.475  31.620  0.18 12.71           O  
ATOM   1723  OE2 GLU A 225      38.480 107.653  33.406  0.08 12.70           O  
ATOM   1724  N   PRO A 226      32.223 105.831  31.626  1.00 12.07           N  
ATOM   1725  CA  PRO A 226      32.382 106.440  30.302  1.00 11.98           C  
ATOM   1726  C   PRO A 226      31.585 107.744  30.215  1.00 11.92           C  
ATOM   1727  O   PRO A 226      30.440 107.814  30.663  1.00 11.88           O  
ATOM   1728  CB  PRO A 226      31.836 105.360  29.378  0.82 12.01           C  
ATOM   1729  CG  PRO A 226      30.683 104.841  30.194  0.94 12.01           C  
ATOM   1730  CD  PRO A 226      31.382 104.625  31.523  1.00 12.04           C  
ATOM   1731  N   ALA A 227      32.189 108.769  29.625  1.00 11.84           N  
ATOM   1732  CA  ALA A 227      31.559 110.080  29.504  1.00 11.74           C  
ATOM   1733  C   ALA A 227      30.124 110.113  28.981  1.00 11.63           C  
ATOM   1734  O   ALA A 227      29.289 110.843  29.517  1.00 11.70           O  
ATOM   1735  CB  ALA A 227      32.435 110.991  28.649  0.82 11.75           C  
ATOM   1736  N   ASN A 228      29.829 109.340  27.940  1.00 11.44           N  
ATOM   1737  CA  ASN A 228      28.485 109.348  27.368  1.00 11.25           C  
ATOM   1738  C   ASN A 228      27.426 108.865  28.352  1.00 11.08           C  
ATOM   1739  O   ASN A 228      26.342 109.439  28.430  1.00 11.06           O  
ATOM   1740  CB  ASN A 228      28.437 108.509  26.084  1.00 11.36           C  
ATOM   1741  CG  ASN A 228      28.596 107.024  26.343  0.87 11.42           C  
ATOM   1742  OD1 ASN A 228      29.554 106.587  26.978  0.66 11.50           O  
ATOM   1743  ND2 ASN A 228      27.653 106.237  25.836  0.66 11.51           N  
ATOM   1744  N   ILE A 229      27.738 107.816  29.108  1.00 10.88           N  
ATOM   1745  CA  ILE A 229      26.781 107.296  30.078  1.00 10.68           C  
ATOM   1746  C   ILE A 229      26.672 108.262  31.252  1.00 10.54           C  
ATOM   1747  O   ILE A 229      25.586 108.478  31.789  1.00 10.51           O  
ATOM   1748  CB  ILE A 229      27.189 105.897  30.592  1.00 10.66           C  
ATOM   1749  CG1 ILE A 229      27.263 104.910  29.420  1.00 10.69           C  
ATOM   1750  CG2 ILE A 229      26.173 105.404  31.617  1.00 10.64           C  
ATOM   1751  CD1 ILE A 229      25.951 104.740  28.672  0.85 10.78           C  
ATOM   1752  N   VAL A 230      27.797 108.845  31.652  1.00 10.41           N  
ATOM   1753  CA  VAL A 230      27.789 109.803  32.750  1.00 10.29           C  
ATOM   1754  C   VAL A 230      26.820 110.935  32.416  1.00 10.23           C  
ATOM   1755  O   VAL A 230      26.003 111.331  33.246  1.00 10.13           O  
ATOM   1756  CB  VAL A 230      29.197 110.395  32.989  1.00 10.26           C  
ATOM   1757  CG1 VAL A 230      29.121 111.533  34.004  0.90 10.28           C  
ATOM   1758  CG2 VAL A 230      30.137 109.310  33.494  0.86 10.30           C  
ATOM   1759  N   ALA A 231      26.901 111.444  31.192  1.00 10.19           N  
ATOM   1760  CA  ALA A 231      26.020 112.526  30.767  1.00 10.14           C  
ATOM   1761  C   ALA A 231      24.550 112.104  30.788  1.00 10.05           C  
ATOM   1762  O   ALA A 231      23.686 112.858  31.235  1.00 10.09           O  
ATOM   1763  CB  ALA A 231      26.410 112.994  29.369  0.89 10.20           C  
ATOM   1764  N   LEU A 232      24.268 110.897  30.312  1.00  9.95           N  
ATOM   1765  CA  LEU A 232      22.898 110.403  30.277  1.00  9.79           C  
ATOM   1766  C   LEU A 232      22.336 110.219  31.689  1.00  9.72           C  
ATOM   1767  O   LEU A 232      21.191 110.583  31.963  1.00  9.60           O  
ATOM   1768  CB  LEU A 232      22.846 109.091  29.481  0.95  9.85           C  
ATOM   1769  CG  LEU A 232      21.505 108.379  29.274  0.84  9.82           C  
ATOM   1770  CD1 LEU A 232      21.594 107.467  28.057  0.64  9.87           C  
ATOM   1771  CD2 LEU A 232      21.126 107.596  30.520  1.00  9.84           C  
ATOM   1772  N   VAL A 233      23.149 109.668  32.584  1.00  9.59           N  
ATOM   1773  CA  VAL A 233      22.722 109.450  33.962  1.00  9.54           C  
ATOM   1774  C   VAL A 233      22.550 110.773  34.709  1.00  9.58           C  
ATOM   1775  O   VAL A 233      21.581 110.946  35.453  1.00  9.53           O  
ATOM   1776  CB  VAL A 233      23.721 108.533  34.700  1.00  9.46           C  
ATOM   1777  CG1 VAL A 233      23.334 108.397  36.162  1.00  9.45           C  
ATOM   1778  CG2 VAL A 233      23.721 107.159  34.041  1.00  9.49           C  
ATOM   1779  N   GLU A 234      23.474 111.710  34.511  1.00  9.61           N  
ATOM   1780  CA  GLU A 234      23.348 113.011  35.161  1.00  9.67           C  
ATOM   1781  C   GLU A 234      22.039 113.636  34.691  1.00  9.70           C  
ATOM   1782  O   GLU A 234      21.322 114.270  35.466  1.00  9.69           O  
ATOM   1783  CB  GLU A 234      24.508 113.937  34.777  1.00  9.70           C  
ATOM   1784  CG  GLU A 234      25.861 113.582  35.375  1.00  9.75           C  
ATOM   1785  CD  GLU A 234      25.968 113.886  36.861  0.95  9.77           C  
ATOM   1786  OE1 GLU A 234      25.008 114.438  37.447  0.99  9.77           O  
ATOM   1787  OE2 GLU A 234      27.028 113.579  37.441  0.94  9.85           O  
ATOM   1788  N   ALA A 235      21.728 113.438  33.415  1.00  9.77           N  
ATOM   1789  CA  ALA A 235      20.516 113.990  32.833  1.00  9.85           C  
ATOM   1790  C   ALA A 235      19.242 113.460  33.481  1.00  9.89           C  
ATOM   1791  O   ALA A 235      18.344 114.243  33.798  1.00  9.99           O  
ATOM   1792  CB  ALA A 235      20.489 113.731  31.326  0.85  9.83           C  
ATOM   1793  N   TYR A 236      19.137 112.148  33.690  1.00  9.98           N  
ATOM   1794  CA  TYR A 236      17.908 111.668  34.303  1.00 10.04           C  
ATOM   1795  C   TYR A 236      17.851 111.942  35.800  1.00 10.23           C  
ATOM   1796  O   TYR A 236      16.765 112.018  36.368  1.00 10.29           O  
ATOM   1797  CB  TYR A 236      17.614 110.186  33.971  1.00  9.89           C  
ATOM   1798  CG  TYR A 236      18.523 109.103  34.521  1.00  9.68           C  
ATOM   1799  CD1 TYR A 236      18.714 108.938  35.896  0.97  9.63           C  
ATOM   1800  CD2 TYR A 236      19.091 108.157  33.662  1.00  9.61           C  
ATOM   1801  CE1 TYR A 236      19.440 107.850  36.401  1.00  9.52           C  
ATOM   1802  CE2 TYR A 236      19.813 107.072  34.151  1.00  9.48           C  
ATOM   1803  CZ  TYR A 236      19.981 106.922  35.520  1.00  9.48           C  
ATOM   1804  OH  TYR A 236      20.670 105.831  36.000  1.00  9.34           O  
ATOM   1805  N   MET A 237      19.005 112.122  36.440  1.00 10.43           N  
ATOM   1806  CA  MET A 237      19.000 112.445  37.864  1.00 10.61           C  
ATOM   1807  C   MET A 237      18.528 113.890  38.012  1.00 10.75           C  
ATOM   1808  O   MET A 237      17.818 114.230  38.955  1.00 10.76           O  
ATOM   1809  CB  MET A 237      20.393 112.284  38.483  1.00 10.64           C  
ATOM   1810  CG  MET A 237      20.862 110.839  38.599  1.00 10.72           C  
ATOM   1811  SD  MET A 237      19.741 109.800  39.577  0.98 10.87           S  
ATOM   1812  CE  MET A 237      19.730 110.664  41.156  0.97 10.75           C  
ATOM   1813  N   ASN A 238      18.927 114.743  37.072  1.00 10.89           N  
ATOM   1814  CA  ASN A 238      18.509 116.140  37.104  1.00 11.08           C  
ATOM   1815  C   ASN A 238      16.990 116.187  36.973  1.00 11.19           C  
ATOM   1816  O   ASN A 238      16.316 116.968  37.649  1.00 11.32           O  
ATOM   1817  CB  ASN A 238      19.155 116.914  35.956  1.00 11.07           C  
ATOM   1818  CG  ASN A 238      18.711 118.362  35.908  0.63 11.10           C  
ATOM   1819  OD1 ASN A 238      18.939 119.126  36.846  0.11 11.11           O  
ATOM   1820  ND2 ASN A 238      18.069 118.745  34.813  0.30 11.13           N  
ATOM   1821  N   TRP A 239      16.458 115.342  36.096  1.00 11.28           N  
ATOM   1822  CA  TRP A 239      15.018 115.266  35.886  1.00 11.40           C  
ATOM   1823  C   TRP A 239      14.334 114.742  37.145  1.00 11.50           C  
ATOM   1824  O   TRP A 239      13.341 115.301  37.608  1.00 11.50           O  
ATOM   1825  CB  TRP A 239      14.694 114.316  34.730  1.00 11.40           C  
ATOM   1826  CG  TRP A 239      13.222 114.069  34.589  1.00 11.48           C  
ATOM   1827  CD1 TRP A 239      12.294 114.915  34.053  0.76 11.49           C  
ATOM   1828  CD2 TRP A 239      12.493 112.944  35.096  1.00 11.47           C  
ATOM   1829  NE1 TRP A 239      11.031 114.388  34.198  0.87 11.52           N  
ATOM   1830  CE2 TRP A 239      11.125 113.180  34.836  0.90 11.50           C  
ATOM   1831  CE3 TRP A 239      12.865 111.759  35.748  0.95 11.49           C  
ATOM   1832  CZ2 TRP A 239      10.124 112.273  35.205  0.75 11.51           C  
ATOM   1833  CZ3 TRP A 239      11.867 110.857  36.116  0.99 11.49           C  
ATOM   1834  CH2 TRP A 239      10.514 111.122  35.842  0.88 11.52           C  
ATOM   1835  N   LEU A 240      14.876 113.658  37.689  1.00 11.59           N  
ATOM   1836  CA  LEU A 240      14.313 113.029  38.876  1.00 11.71           C  
ATOM   1837  C   LEU A 240      14.217 113.994  40.056  1.00 11.82           C  
ATOM   1838  O   LEU A 240      13.203 114.037  40.750  1.00 11.82           O  
ATOM   1839  CB  LEU A 240      15.153 111.808  39.265  1.00 11.69           C  
ATOM   1840  CG  LEU A 240      14.529 110.845  40.279  0.94 11.63           C  
ATOM   1841  CD1 LEU A 240      13.267 110.220  39.686  1.00 11.57           C  
ATOM   1842  CD2 LEU A 240      15.532 109.752  40.623  0.92 11.62           C  
ATOM   1843  N   HIS A 241      15.271 114.772  40.278  1.00 11.96           N  
ATOM   1844  CA  HIS A 241      15.291 115.733  41.376  1.00 12.11           C  
ATOM   1845  C   HIS A 241      14.273 116.860  41.232  1.00 12.18           C  
ATOM   1846  O   HIS A 241      13.887 117.478  42.224  1.00 12.32           O  
ATOM   1847  CB  HIS A 241      16.695 116.333  41.527  1.00 12.12           C  
ATOM   1848  CG  HIS A 241      17.665 115.439  42.236  0.86 12.15           C  
ATOM   1849  ND1 HIS A 241      17.515 115.085  43.560  1.00 12.12           N  
ATOM   1850  CD2 HIS A 241      18.805 114.842  41.815  0.89 12.16           C  
ATOM   1851  CE1 HIS A 241      18.520 114.310  43.924  0.97 12.15           C  
ATOM   1852  NE2 HIS A 241      19.317 114.146  42.884  0.90 12.15           N  
ATOM   1853  N   GLN A 242      13.833 117.120  40.005  1.00 12.23           N  
ATOM   1854  CA  GLN A 242      12.873 118.188  39.747  1.00 12.25           C  
ATOM   1855  C   GLN A 242      11.466 117.684  39.452  1.00 12.19           C  
ATOM   1856  O   GLN A 242      10.538 118.474  39.303  1.00 12.36           O  
ATOM   1857  CB  GLN A 242      13.359 119.046  38.578  0.77 12.31           C  
ATOM   1858  CG  GLN A 242      14.724 119.674  38.810  0.44 12.38           C  
ATOM   1859  CD  GLN A 242      15.220 120.468  37.619  0.18 12.42           C  
ATOM   1860  OE1 GLN A 242      15.389 119.928  36.526  0.01 12.46           O  
ATOM   1861  NE2 GLN A 242      15.459 121.757  37.824  0.01 12.41           N  
ATOM   1862  N   SER A 243      11.310 116.369  39.372  1.00 12.03           N  
ATOM   1863  CA  SER A 243      10.017 115.771  39.072  1.00 11.83           C  
ATOM   1864  C   SER A 243       9.122 115.526  40.280  1.00 11.69           C  
ATOM   1865  O   SER A 243       9.579 115.050  41.314  1.00 11.65           O  
ATOM   1866  CB  SER A 243      10.219 114.446  38.344  1.00 11.82           C  
ATOM   1867  OG  SER A 243       8.972 113.806  38.130  0.83 11.85           O  
ATOM   1868  N   PRO A 244       7.832 115.888  40.171  1.00 11.60           N  
ATOM   1869  CA  PRO A 244       6.859 115.698  41.250  1.00 11.49           C  
ATOM   1870  C   PRO A 244       6.315 114.264  41.289  1.00 11.33           C  
ATOM   1871  O   PRO A 244       5.492 113.933  42.142  1.00 11.44           O  
ATOM   1872  CB  PRO A 244       5.774 116.699  40.885  0.92 11.51           C  
ATOM   1873  CG  PRO A 244       5.714 116.510  39.393  0.69 11.53           C  
ATOM   1874  CD  PRO A 244       7.202 116.620  39.054  0.87 11.56           C  
ATOM   1875  N   VAL A 245       6.772 113.420  40.367  1.00 11.16           N  
ATOM   1876  CA  VAL A 245       6.300 112.038  40.305  1.00 10.92           C  
ATOM   1877  C   VAL A 245       6.531 111.293  41.621  1.00 10.70           C  
ATOM   1878  O   VAL A 245       7.591 111.413  42.236  1.00 10.66           O  
ATOM   1879  CB  VAL A 245       6.998 111.251  39.163  1.00 10.95           C  
ATOM   1880  CG1 VAL A 245       8.491 111.128  39.441  0.66 11.01           C  
ATOM   1881  CG2 VAL A 245       6.364 109.877  39.009  0.79 11.00           C  
ATOM   1882  N   PRO A 246       5.522 110.536  42.086  1.00 10.45           N  
ATOM   1883  CA  PRO A 246       5.663 109.781  43.333  1.00 10.25           C  
ATOM   1884  C   PRO A 246       6.812 108.784  43.218  1.00 10.00           C  
ATOM   1885  O   PRO A 246       6.939 108.092  42.207  1.00  9.97           O  
ATOM   1886  CB  PRO A 246       4.304 109.095  43.464  0.94 10.33           C  
ATOM   1887  CG  PRO A 246       3.373 110.101  42.790  1.00 10.38           C  
ATOM   1888  CD  PRO A 246       4.173 110.338  41.529  0.96 10.45           C  
ATOM   1889  N   LYS A 247       7.641 108.719  44.255  1.00  9.73           N  
ATOM   1890  CA  LYS A 247       8.793 107.826  44.266  1.00  9.49           C  
ATOM   1891  C   LYS A 247       8.808 106.988  45.537  1.00  9.35           C  
ATOM   1892  O   LYS A 247       8.460 107.469  46.617  1.00  9.33           O  
ATOM   1893  CB  LYS A 247      10.079 108.652  44.186  1.00  9.43           C  
ATOM   1894  CG  LYS A 247      10.085 109.653  43.042  1.00  9.42           C  
ATOM   1895  CD  LYS A 247      11.302 110.563  43.088  1.00  9.39           C  
ATOM   1896  CE  LYS A 247      11.180 111.689  42.072  0.89  9.42           C  
ATOM   1897  NZ  LYS A 247      10.015 112.578  42.378  1.00  9.39           N  
ATOM   1898  N   LEU A 248       9.208 105.730  45.395  1.00  9.17           N  
ATOM   1899  CA  LEU A 248       9.300 104.811  46.522  1.00  9.07           C  
ATOM   1900  C   LEU A 248      10.678 104.171  46.415  1.00  8.98           C  
ATOM   1901  O   LEU A 248      10.964 103.463  45.453  1.00  8.96           O  
ATOM   1902  CB  LEU A 248       8.202 103.746  46.432  1.00  9.13           C  
ATOM   1903  CG  LEU A 248       8.159 102.679  47.533  0.89  9.17           C  
ATOM   1904  CD1 LEU A 248       7.984 103.334  48.902  0.75  9.25           C  
ATOM   1905  CD2 LEU A 248       7.013 101.715  47.249  1.00  9.18           C  
ATOM   1906  N   LEU A 249      11.532 104.442  47.396  1.00  8.86           N  
ATOM   1907  CA  LEU A 249      12.893 103.917  47.402  1.00  8.80           C  
ATOM   1908  C   LEU A 249      13.141 102.887  48.489  1.00  8.76           C  
ATOM   1909  O   LEU A 249      13.012 103.186  49.678  1.00  8.79           O  
ATOM   1910  CB  LEU A 249      13.892 105.067  47.581  1.00  8.79           C  
ATOM   1911  CG  LEU A 249      15.365 104.698  47.796  1.00  8.81           C  
ATOM   1912  CD1 LEU A 249      15.919 104.009  46.558  1.00  8.90           C  
ATOM   1913  CD2 LEU A 249      16.162 105.960  48.101  0.92  8.89           C  
ATOM   1914  N   PHE A 250      13.487 101.670  48.082  1.00  8.68           N  
ATOM   1915  CA  PHE A 250      13.804 100.618  49.037  1.00  8.68           C  
ATOM   1916  C   PHE A 250      15.316 100.599  49.192  1.00  8.69           C  
ATOM   1917  O   PHE A 250      16.042 100.729  48.210  1.00  8.67           O  
ATOM   1918  CB  PHE A 250      13.336  99.246  48.544  1.00  8.68           C  
ATOM   1919  CG  PHE A 250      11.851  99.119  48.415  1.00  8.67           C  
ATOM   1920  CD1 PHE A 250      11.197  99.524  47.257  1.00  8.68           C  
ATOM   1921  CD2 PHE A 250      11.096  98.614  49.471  1.00  8.68           C  
ATOM   1922  CE1 PHE A 250       9.807  99.429  47.150  0.99  8.69           C  
ATOM   1923  CE2 PHE A 250       9.711  98.515  49.379  1.00  8.68           C  
ATOM   1924  CZ  PHE A 250       9.063  98.923  48.215  0.98  8.67           C  
ATOM   1925  N   TRP A 251      15.791 100.455  50.422  1.00  8.67           N  
ATOM   1926  CA  TRP A 251      17.224 100.413  50.668  1.00  8.75           C  
ATOM   1927  C   TRP A 251      17.562  99.411  51.758  1.00  8.80           C  
ATOM   1928  O   TRP A 251      16.718  99.075  52.595  1.00  8.78           O  
ATOM   1929  CB  TRP A 251      17.748 101.794  51.074  1.00  8.78           C  
ATOM   1930  CG  TRP A 251      17.099 102.348  52.311  1.00  8.85           C  
ATOM   1931  CD1 TRP A 251      15.874 102.948  52.399  0.81  8.90           C  
ATOM   1932  CD2 TRP A 251      17.619 102.301  53.644  0.93  8.91           C  
ATOM   1933  NE1 TRP A 251      15.600 103.277  53.705  0.87  8.94           N  
ATOM   1934  CE2 TRP A 251      16.654 102.891  54.491  0.98  8.92           C  
ATOM   1935  CE3 TRP A 251      18.808 101.816  54.207  0.92  8.93           C  
ATOM   1936  CZ2 TRP A 251      16.840 103.010  55.874  0.92  8.96           C  
ATOM   1937  CZ3 TRP A 251      18.994 101.934  55.586  0.74  8.96           C  
ATOM   1938  CH2 TRP A 251      18.011 102.527  56.400  0.84  8.97           C  
ATOM   1939  N   GLY A 252      18.804  98.937  51.738  1.00  8.89           N  
ATOM   1940  CA  GLY A 252      19.251  97.986  52.737  1.00  9.04           C  
ATOM   1941  C   GLY A 252      20.577  98.406  53.338  1.00  9.13           C  
ATOM   1942  O   GLY A 252      21.184  99.390  52.903  1.00  9.20           O  
ATOM   1943  N   THR A 253      21.016  97.664  54.349  1.00  9.23           N  
ATOM   1944  CA  THR A 253      22.279  97.934  55.022  1.00  9.34           C  
ATOM   1945  C   THR A 253      23.177  96.713  54.859  1.00  9.34           C  
ATOM   1946  O   THR A 253      22.757  95.592  55.145  1.00  9.39           O  
ATOM   1947  CB  THR A 253      22.063  98.182  56.530  0.82  9.37           C  
ATOM   1948  OG1 THR A 253      21.202  99.313  56.712  0.74  9.45           O  
ATOM   1949  CG2 THR A 253      23.389  98.444  57.226  0.90  9.39           C  
ATOM   1950  N   PRO A 254      24.434  96.915  54.425  1.00  9.34           N  
ATOM   1951  CA  PRO A 254      25.084  98.183  54.074  1.00  9.41           C  
ATOM   1952  C   PRO A 254      24.774  98.693  52.664  1.00  9.39           C  
ATOM   1953  O   PRO A 254      25.152  99.809  52.306  1.00  9.44           O  
ATOM   1954  CB  PRO A 254      26.557  97.840  54.230  0.96  9.39           C  
ATOM   1955  CG  PRO A 254      26.582  96.470  53.615  1.00  9.39           C  
ATOM   1956  CD  PRO A 254      25.415  95.814  54.348  1.00  9.37           C  
ATOM   1957  N   GLY A 255      24.091  97.876  51.868  1.00  9.34           N  
ATOM   1958  CA  GLY A 255      23.780  98.268  50.502  1.00  9.39           C  
ATOM   1959  C   GLY A 255      25.043  98.303  49.658  1.00  9.38           C  
ATOM   1960  O   GLY A 255      26.116  97.926  50.130  1.00  9.45           O  
ATOM   1961  N   VAL A 256      24.924  98.737  48.407  1.00  9.36           N  
ATOM   1962  CA  VAL A 256      26.080  98.837  47.518  1.00  9.38           C  
ATOM   1963  C   VAL A 256      26.042 100.175  46.788  1.00  9.40           C  
ATOM   1964  O   VAL A 256      26.844 101.063  47.076  1.00  9.42           O  
ATOM   1965  CB  VAL A 256      26.117  97.680  46.493  1.00  9.38           C  
ATOM   1966  CG1 VAL A 256      27.255  97.895  45.493  0.95  9.47           C  
ATOM   1967  CG2 VAL A 256      26.324  96.356  47.222  1.00  9.45           C  
ATOM   1968  N   LEU A 257      25.106 100.330  45.856  1.00  9.39           N  
ATOM   1969  CA  LEU A 257      24.985 101.585  45.125  1.00  9.42           C  
ATOM   1970  C   LEU A 257      24.276 102.648  45.959  1.00  9.44           C  
ATOM   1971  O   LEU A 257      24.544 103.843  45.812  1.00  9.45           O  
ATOM   1972  CB  LEU A 257      24.218 101.376  43.816  1.00  9.42           C  
ATOM   1973  CG  LEU A 257      24.845 100.425  42.792  1.00  9.41           C  
ATOM   1974  CD1 LEU A 257      23.954 100.356  41.559  0.91  9.51           C  
ATOM   1975  CD2 LEU A 257      26.240 100.913  42.416  0.72  9.49           C  
ATOM   1976  N   ILE A 258      23.375 102.214  46.836  1.00  9.47           N  
ATOM   1977  CA  ILE A 258      22.626 103.140  47.680  1.00  9.54           C  
ATOM   1978  C   ILE A 258      22.791 102.802  49.162  1.00  9.63           C  
ATOM   1979  O   ILE A 258      21.896 102.223  49.781  1.00  9.61           O  
ATOM   1980  CB  ILE A 258      21.109 103.114  47.341  1.00  9.51           C  
ATOM   1981  CG1 ILE A 258      20.889 103.360  45.843  1.00  9.50           C  
ATOM   1982  CG2 ILE A 258      20.377 104.180  48.155  1.00  9.52           C  
ATOM   1983  CD1 ILE A 258      21.353 104.720  45.346  0.91  9.58           C  
ATOM   1984  N   PRO A 259      23.950 103.137  49.748  1.00  9.74           N  
ATOM   1985  CA  PRO A 259      24.154 102.842  51.167  1.00  9.86           C  
ATOM   1986  C   PRO A 259      23.173 103.670  52.000  1.00  9.97           C  
ATOM   1987  O   PRO A 259      22.594 104.637  51.503  1.00 10.00           O  
ATOM   1988  CB  PRO A 259      25.611 103.242  51.384  0.95  9.86           C  
ATOM   1989  CG  PRO A 259      25.766 104.395  50.418  0.68  9.83           C  
ATOM   1990  CD  PRO A 259      25.157 103.764  49.184  1.00  9.79           C  
ATOM   1991  N   PRO A 260      22.982 103.310  53.276  1.00 10.06           N  
ATOM   1992  CA  PRO A 260      22.063 104.036  54.156  1.00 10.11           C  
ATOM   1993  C   PRO A 260      22.212 105.559  54.097  1.00 10.17           C  
ATOM   1994  O   PRO A 260      21.217 106.282  54.015  1.00 10.20           O  
ATOM   1995  CB  PRO A 260      22.400 103.460  55.527  0.81 10.12           C  
ATOM   1996  CG  PRO A 260      22.680 102.017  55.178  0.91 10.10           C  
ATOM   1997  CD  PRO A 260      23.644 102.226  54.026  1.00 10.06           C  
ATOM   1998  N   ALA A 261      23.452 106.039  54.127  1.00 10.24           N  
ATOM   1999  CA  ALA A 261      23.711 107.474  54.088  1.00 10.27           C  
ATOM   2000  C   ALA A 261      23.185 108.116  52.808  1.00 10.22           C  
ATOM   2001  O   ALA A 261      22.681 109.237  52.834  1.00 10.28           O  
ATOM   2002  CB  ALA A 261      25.205 107.740  54.230  0.80 10.25           C  
ATOM   2003  N   GLU A 262      23.303 107.404  51.691  1.00 10.22           N  
ATOM   2004  CA  GLU A 262      22.824 107.914  50.410  1.00 10.19           C  
ATOM   2005  C   GLU A 262      21.299 107.910  50.381  1.00 10.14           C  
ATOM   2006  O   GLU A 262      20.682 108.833  49.854  1.00 10.08           O  
ATOM   2007  CB  GLU A 262      23.390 107.065  49.262  1.00 10.25           C  
ATOM   2008  CG  GLU A 262      22.912 107.423  47.846  1.00 10.36           C  
ATOM   2009  CD  GLU A 262      23.193 108.862  47.439  0.97 10.43           C  
ATOM   2010  OE1 GLU A 262      24.034 109.527  48.083  0.88 10.50           O  
ATOM   2011  OE2 GLU A 262      22.585 109.318  46.445  1.00 10.45           O  
ATOM   2012  N   ALA A 263      20.690 106.878  50.957  1.00 10.07           N  
ATOM   2013  CA  ALA A 263      19.235 106.795  50.992  1.00 10.07           C  
ATOM   2014  C   ALA A 263      18.673 107.952  51.819  1.00 10.05           C  
ATOM   2015  O   ALA A 263      17.636 108.524  51.479  1.00 10.05           O  
ATOM   2016  CB  ALA A 263      18.795 105.459  51.583  1.00 10.00           C  
ATOM   2017  N   ALA A 264      19.371 108.297  52.897  1.00 10.09           N  
ATOM   2018  CA  ALA A 264      18.945 109.394  53.762  1.00 10.11           C  
ATOM   2019  C   ALA A 264      19.031 110.719  53.007  1.00 10.12           C  
ATOM   2020  O   ALA A 264      18.171 111.585  53.160  1.00 10.16           O  
ATOM   2021  CB  ALA A 264      19.809 109.439  55.012  0.86 10.15           C  
ATOM   2022  N   ARG A 265      20.069 110.874  52.191  1.00 10.08           N  
ATOM   2023  CA  ARG A 265      20.222 112.092  51.405  1.00 10.09           C  
ATOM   2024  C   ARG A 265      19.123 112.181  50.350  1.00 10.06           C  
ATOM   2025  O   ARG A 265      18.524 113.235  50.154  1.00 10.00           O  
ATOM   2026  CB  ARG A 265      21.597 112.137  50.728  1.00 10.15           C  
ATOM   2027  CG  ARG A 265      22.758 112.400  51.683  0.72 10.25           C  
ATOM   2028  CD  ARG A 265      24.058 112.640  50.933  0.65 10.33           C  
ATOM   2029  NE  ARG A 265      24.613 111.430  50.337  0.39 10.40           N  
ATOM   2030  CZ  ARG A 265      25.117 110.418  51.038  0.34 10.43           C  
ATOM   2031  NH1 ARG A 265      25.605 109.356  50.411  0.30 10.45           N  
ATOM   2032  NH2 ARG A 265      25.136 110.472  52.362  0.11 10.45           N  
ATOM   2033  N   LEU A 266      18.852 111.066  49.680  1.00 10.06           N  
ATOM   2034  CA  LEU A 266      17.823 111.028  48.644  1.00 10.13           C  
ATOM   2035  C   LEU A 266      16.417 111.250  49.199  1.00 10.22           C  
ATOM   2036  O   LEU A 266      15.551 111.796  48.511  1.00 10.23           O  
ATOM   2037  CB  LEU A 266      17.886 109.692  47.898  1.00 10.06           C  
ATOM   2038  CG  LEU A 266      19.145 109.480  47.053  1.00 10.04           C  
ATOM   2039  CD1 LEU A 266      19.231 108.029  46.605  1.00 10.04           C  
ATOM   2040  CD2 LEU A 266      19.121 110.431  45.859  1.00 10.04           C  
ATOM   2041  N   ALA A 267      16.189 110.824  50.438  1.00 10.37           N  
ATOM   2042  CA  ALA A 267      14.884 111.000  51.067  1.00 10.51           C  
ATOM   2043  C   ALA A 267      14.555 112.489  51.085  1.00 10.62           C  
ATOM   2044  O   ALA A 267      13.390 112.883  51.075  1.00 10.73           O  
ATOM   2045  CB  ALA A 267      14.904 110.446  52.488  1.00 10.50           C  
ATOM   2046  N   GLU A 268      15.596 113.313  51.102  1.00 10.71           N  
ATOM   2047  CA  GLU A 268      15.423 114.757  51.105  1.00 10.81           C  
ATOM   2048  C   GLU A 268      15.468 115.376  49.715  1.00 10.85           C  
ATOM   2049  O   GLU A 268      14.600 116.173  49.357  1.00 10.86           O  
ATOM   2050  CB  GLU A 268      16.493 115.416  51.979  1.00 10.77           C  
ATOM   2051  CG  GLU A 268      16.258 115.256  53.475  0.87 10.84           C  
ATOM   2052  CD  GLU A 268      17.312 115.951  54.314  0.77 10.84           C  
ATOM   2053  OE1 GLU A 268      17.953 116.898  53.811  1.00 10.81           O  
ATOM   2054  OE2 GLU A 268      17.481 115.570  55.492  0.74 10.91           O  
ATOM   2055  N   SER A 269      16.473 114.998  48.930  1.00 10.94           N  
ATOM   2056  CA  SER A 269      16.664 115.561  47.597  1.00 11.02           C  
ATOM   2057  C   SER A 269      15.697 115.113  46.505  1.00 11.09           C  
ATOM   2058  O   SER A 269      15.626 115.744  45.453  1.00 11.19           O  
ATOM   2059  CB  SER A 269      18.104 115.320  47.134  1.00 11.00           C  
ATOM   2060  OG  SER A 269      18.372 113.937  46.992  0.92 11.05           O  
ATOM   2061  N   LEU A 270      14.965 114.026  46.735  1.00 11.10           N  
ATOM   2062  CA  LEU A 270      13.996 113.553  45.747  1.00 11.16           C  
ATOM   2063  C   LEU A 270      12.591 113.973  46.170  1.00 11.20           C  
ATOM   2064  O   LEU A 270      12.139 113.636  47.261  1.00 11.21           O  
ATOM   2065  CB  LEU A 270      14.041 112.028  45.620  1.00 11.15           C  
ATOM   2066  CG  LEU A 270      15.330 111.381  45.115  0.96 11.19           C  
ATOM   2067  CD1 LEU A 270      15.172 109.865  45.134  1.00 11.19           C  
ATOM   2068  CD2 LEU A 270      15.642 111.873  43.714  1.00 11.19           C  
ATOM   2069  N   PRO A 271      11.892 114.737  45.320  1.00 11.27           N  
ATOM   2070  CA  PRO A 271      10.534 115.183  45.641  1.00 11.37           C  
ATOM   2071  C   PRO A 271       9.533 114.034  45.768  1.00 11.45           C  
ATOM   2072  O   PRO A 271       9.677 112.997  45.116  1.00 11.41           O  
ATOM   2073  CB  PRO A 271      10.197 116.097  44.463  0.87 11.38           C  
ATOM   2074  CG  PRO A 271      11.565 116.606  44.036  0.86 11.37           C  
ATOM   2075  CD  PRO A 271      12.306 115.295  44.024  1.00 11.30           C  
ATOM   2076  N   ASN A 272       8.525 114.236  46.614  1.00 11.54           N  
ATOM   2077  CA  ASN A 272       7.455 113.264  46.834  1.00 11.64           C  
ATOM   2078  C   ASN A 272       8.015 111.847  46.933  1.00 11.66           C  
ATOM   2079  O   ASN A 272       7.551 110.923  46.259  1.00 11.60           O  
ATOM   2080  CB  ASN A 272       6.441 113.376  45.691  0.83 11.78           C  
ATOM   2081  CG  ASN A 272       5.149 112.638  45.978  0.59 11.86           C  
ATOM   2082  OD1 ASN A 272       4.532 112.828  47.024  0.24 11.96           O  
ATOM   2083  ND2 ASN A 272       4.723 111.805  45.040  0.01 12.02           N  
ATOM   2084  N   CYS A 273       9.005 111.693  47.805  1.00 11.67           N  
ATOM   2085  CA  CYS A 273       9.685 110.423  48.008  1.00 11.76           C  
ATOM   2086  C   CYS A 273       9.434 109.749  49.351  1.00 11.73           C  
ATOM   2087  O   CYS A 273       9.495 110.382  50.405  1.00 11.87           O  
ATOM   2088  CB  CYS A 273      11.191 110.632  47.825  0.98 11.80           C  
ATOM   2089  SG  CYS A 273      12.239 109.225  48.260  0.76 12.28           S  
ATOM   2090  N   LYS A 274       9.143 108.454  49.293  1.00 11.63           N  
ATOM   2091  CA  LYS A 274       8.928 107.642  50.481  1.00 11.53           C  
ATOM   2092  C   LYS A 274      10.048 106.610  50.468  1.00 11.40           C  
ATOM   2093  O   LYS A 274      10.387 106.079  49.411  1.00 11.43           O  
ATOM   2094  CB  LYS A 274       7.576 106.927  50.422  0.94 11.58           C  
ATOM   2095  CG  LYS A 274       7.362 105.933  51.555  0.49 11.57           C  
ATOM   2096  CD  LYS A 274       6.029 105.214  51.422  0.46 11.52           C  
ATOM   2097  CE  LYS A 274       5.864 104.155  52.502  0.58 11.44           C  
ATOM   2098  NZ  LYS A 274       5.941 104.727  53.873  0.33 11.32           N  
ATOM   2099  N   THR A 275      10.635 106.338  51.627  1.00 11.25           N  
ATOM   2100  CA  THR A 275      11.709 105.359  51.697  1.00 11.05           C  
ATOM   2101  C   THR A 275      11.302 104.187  52.576  1.00 10.95           C  
ATOM   2102  O   THR A 275      10.510 104.340  53.509  1.00 11.06           O  
ATOM   2103  CB  THR A 275      13.008 105.973  52.254  1.00 11.02           C  
ATOM   2104  OG1 THR A 275      12.791 106.421  53.598  0.61 11.02           O  
ATOM   2105  CG2 THR A 275      13.452 107.148  51.391  0.82 10.98           C  
ATOM   2106  N   VAL A 276      11.841 103.015  52.257  1.00 10.75           N  
ATOM   2107  CA  VAL A 276      11.549 101.801  53.005  1.00 10.50           C  
ATOM   2108  C   VAL A 276      12.831 101.036  53.307  1.00 10.36           C  
ATOM   2109  O   VAL A 276      13.574 100.655  52.400  1.00 10.23           O  
ATOM   2110  CB  VAL A 276      10.586 100.879  52.224  1.00 10.52           C  
ATOM   2111  CG1 VAL A 276      10.345  99.595  53.003  0.95 10.52           C  
ATOM   2112  CG2 VAL A 276       9.266 101.592  51.980  0.80 10.52           C  
ATOM   2113  N   ASP A 277      13.073 100.828  54.596  1.00 10.18           N  
ATOM   2114  CA  ASP A 277      14.239 100.112  55.104  1.00 10.09           C  
ATOM   2115  C   ASP A 277      13.886  98.624  55.031  1.00  9.97           C  
ATOM   2116  O   ASP A 277      12.938  98.186  55.678  1.00  9.96           O  
ATOM   2117  CB  ASP A 277      14.464 100.513  56.564  1.00 10.18           C  
ATOM   2118  CG  ASP A 277      15.739  99.941  57.152  1.00 10.22           C  
ATOM   2119  OD1 ASP A 277      16.284  98.964  56.599  0.89 10.34           O  
ATOM   2120  OD2 ASP A 277      16.186 100.464  58.198  0.70 10.32           O  
ATOM   2121  N   ILE A 278      14.625  97.845  54.245  1.00  9.82           N  
ATOM   2122  CA  ILE A 278      14.314  96.419  54.143  1.00  9.72           C  
ATOM   2123  C   ILE A 278      15.161  95.558  55.072  1.00  9.59           C  
ATOM   2124  O   ILE A 278      14.995  94.338  55.112  1.00  9.57           O  
ATOM   2125  CB  ILE A 278      14.511  95.867  52.707  1.00  9.76           C  
ATOM   2126  CG1 ILE A 278      16.001  95.823  52.357  0.97  9.85           C  
ATOM   2127  CG2 ILE A 278      13.739  96.724  51.713  0.74  9.82           C  
ATOM   2128  CD1 ILE A 278      16.303  95.062  51.094  0.33  9.98           C  
ATOM   2129  N   GLY A 279      16.063  96.190  55.815  1.00  9.50           N  
ATOM   2130  CA  GLY A 279      16.923  95.445  56.715  1.00  9.35           C  
ATOM   2131  C   GLY A 279      18.220  95.079  56.017  1.00  9.26           C  
ATOM   2132  O   GLY A 279      18.674  95.817  55.143  1.00  9.24           O  
ATOM   2133  N   PRO A 280      18.850  93.953  56.378  1.00  9.17           N  
ATOM   2134  CA  PRO A 280      20.102  93.545  55.739  1.00  9.08           C  
ATOM   2135  C   PRO A 280      19.961  93.423  54.224  1.00  8.97           C  
ATOM   2136  O   PRO A 280      18.981  92.870  53.718  1.00  8.96           O  
ATOM   2137  CB  PRO A 280      20.393  92.203  56.403  0.82  9.13           C  
ATOM   2138  CG  PRO A 280      19.822  92.415  57.796  0.93  9.16           C  
ATOM   2139  CD  PRO A 280      18.469  92.970  57.407  0.94  9.17           C  
ATOM   2140  N   GLY A 281      20.943  93.947  53.505  1.00  8.81           N  
ATOM   2141  CA  GLY A 281      20.901  93.880  52.060  1.00  8.70           C  
ATOM   2142  C   GLY A 281      22.140  94.487  51.448  1.00  8.58           C  
ATOM   2143  O   GLY A 281      22.773  95.369  52.033  1.00  8.62           O  
ATOM   2144  N   LEU A 282      22.495  93.995  50.269  1.00  8.43           N  
ATOM   2145  CA  LEU A 282      23.653  94.489  49.540  1.00  8.33           C  
ATOM   2146  C   LEU A 282      23.153  95.092  48.233  1.00  8.19           C  
ATOM   2147  O   LEU A 282      22.756  96.254  48.216  1.00  8.19           O  
ATOM   2148  CB  LEU A 282      24.649  93.347  49.311  0.98  8.42           C  
ATOM   2149  CG  LEU A 282      25.375  92.926  50.600  0.97  8.47           C  
ATOM   2150  CD1 LEU A 282      26.021  91.559  50.439  0.80  8.52           C  
ATOM   2151  CD2 LEU A 282      26.408  93.990  50.965  0.87  8.56           C  
ATOM   2152  N   HIS A 283      23.134  94.323  47.147  1.00  8.02           N  
ATOM   2153  CA  HIS A 283      22.647  94.873  45.883  1.00  7.81           C  
ATOM   2154  C   HIS A 283      21.333  94.266  45.400  1.00  7.71           C  
ATOM   2155  O   HIS A 283      20.419  94.993  45.009  1.00  7.68           O  
ATOM   2156  CB  HIS A 283      23.698  94.716  44.785  0.85  7.89           C  
ATOM   2157  CG  HIS A 283      23.298  95.329  43.478  1.00  7.90           C  
ATOM   2158  ND1 HIS A 283      23.069  96.680  43.329  1.00  7.92           N  
ATOM   2159  CD2 HIS A 283      23.067  94.772  42.265  0.89  7.95           C  
ATOM   2160  CE1 HIS A 283      22.715  96.929  42.081  0.82  7.93           C  
ATOM   2161  NE2 HIS A 283      22.705  95.789  41.414  0.92  7.98           N  
ATOM   2162  N   TYR A 284      21.232  92.939  45.414  1.00  7.56           N  
ATOM   2163  CA  TYR A 284      20.008  92.286  44.958  1.00  7.48           C  
ATOM   2164  C   TYR A 284      19.023  92.166  46.115  1.00  7.44           C  
ATOM   2165  O   TYR A 284      18.712  91.072  46.590  1.00  7.36           O  
ATOM   2166  CB  TYR A 284      20.330  90.914  44.354  0.91  7.50           C  
ATOM   2167  CG  TYR A 284      21.370  91.000  43.256  1.00  7.46           C  
ATOM   2168  CD1 TYR A 284      22.733  90.944  43.552  0.98  7.51           C  
ATOM   2169  CD2 TYR A 284      20.996  91.251  41.936  1.00  7.47           C  
ATOM   2170  CE1 TYR A 284      23.698  91.144  42.563  0.87  7.54           C  
ATOM   2171  CE2 TYR A 284      21.953  91.454  40.939  0.96  7.51           C  
ATOM   2172  CZ  TYR A 284      23.301  91.404  41.262  0.93  7.55           C  
ATOM   2173  OH  TYR A 284      24.253  91.657  40.298  0.95  7.65           O  
ATOM   2174  N   LEU A 285      18.526  93.320  46.547  1.00  7.41           N  
ATOM   2175  CA  LEU A 285      17.604  93.398  47.671  1.00  7.41           C  
ATOM   2176  C   LEU A 285      16.384  92.498  47.531  1.00  7.42           C  
ATOM   2177  O   LEU A 285      15.824  92.044  48.534  1.00  7.35           O  
ATOM   2178  CB  LEU A 285      17.148  94.848  47.875  1.00  7.46           C  
ATOM   2179  CG  LEU A 285      18.227  95.932  47.968  1.00  7.48           C  
ATOM   2180  CD1 LEU A 285      17.564  97.249  48.333  0.96  7.55           C  
ATOM   2181  CD2 LEU A 285      19.266  95.565  49.011  1.00  7.60           C  
ATOM   2182  N   GLN A 286      15.973  92.241  46.292  1.00  7.46           N  
ATOM   2183  CA  GLN A 286      14.807  91.404  46.035  1.00  7.58           C  
ATOM   2184  C   GLN A 286      14.998  89.979  46.532  1.00  7.67           C  
ATOM   2185  O   GLN A 286      14.023  89.275  46.790  1.00  7.65           O  
ATOM   2186  CB  GLN A 286      14.477  91.370  44.537  1.00  7.63           C  
ATOM   2187  CG  GLN A 286      14.315  92.742  43.905  0.95  7.73           C  
ATOM   2188  CD  GLN A 286      15.593  93.243  43.264  1.00  7.76           C  
ATOM   2189  OE1 GLN A 286      16.689  93.038  43.790  1.00  7.84           O  
ATOM   2190  NE2 GLN A 286      15.457  93.921  42.127  1.00  7.89           N  
ATOM   2191  N   GLU A 287      16.251  89.555  46.666  1.00  7.81           N  
ATOM   2192  CA  GLU A 287      16.534  88.204  47.135  1.00  7.96           C  
ATOM   2193  C   GLU A 287      16.636  88.129  48.654  1.00  8.11           C  
ATOM   2194  O   GLU A 287      16.631  87.041  49.224  1.00  8.24           O  
ATOM   2195  CB  GLU A 287      17.820  87.673  46.491  0.97  7.93           C  
ATOM   2196  CG  GLU A 287      17.721  87.493  44.979  1.00  7.84           C  
ATOM   2197  CD  GLU A 287      16.736  86.407  44.566  0.87  7.85           C  
ATOM   2198  OE1 GLU A 287      16.041  85.848  45.442  1.00  7.80           O  
ATOM   2199  OE2 GLU A 287      16.653  86.116  43.352  1.00  7.83           O  
ATOM   2200  N   ASP A 288      16.727  89.281  49.311  1.00  8.26           N  
ATOM   2201  CA  ASP A 288      16.806  89.294  50.767  1.00  8.33           C  
ATOM   2202  C   ASP A 288      15.478  89.569  51.460  1.00  8.42           C  
ATOM   2203  O   ASP A 288      15.190  88.973  52.494  1.00  8.51           O  
ATOM   2204  CB  ASP A 288      17.856  90.297  51.254  1.00  8.41           C  
ATOM   2205  CG  ASP A 288      19.262  89.726  51.214  1.00  8.44           C  
ATOM   2206  OD1 ASP A 288      19.479  88.665  51.843  0.98  8.59           O  
ATOM   2207  OD2 ASP A 288      20.147  90.330  50.571  0.92  8.53           O  
ATOM   2208  N   ASN A 289      14.660  90.455  50.900  1.00  8.43           N  
ATOM   2209  CA  ASN A 289      13.375  90.758  51.525  1.00  8.43           C  
ATOM   2210  C   ASN A 289      12.305  91.050  50.471  1.00  8.48           C  
ATOM   2211  O   ASN A 289      11.773  92.159  50.385  1.00  8.51           O  
ATOM   2212  CB  ASN A 289      13.548  91.944  52.489  1.00  8.40           C  
ATOM   2213  CG  ASN A 289      12.379  92.104  53.449  0.87  8.34           C  
ATOM   2214  OD1 ASN A 289      12.423  92.934  54.363  0.84  8.38           O  
ATOM   2215  ND2 ASN A 289      11.330  91.318  53.249  1.00  8.23           N  
ATOM   2216  N   PRO A 290      11.984  90.050  49.638  1.00  8.54           N  
ATOM   2217  CA  PRO A 290      10.971  90.235  48.598  1.00  8.61           C  
ATOM   2218  C   PRO A 290       9.574  90.522  49.143  1.00  8.68           C  
ATOM   2219  O   PRO A 290       8.812  91.279  48.540  1.00  8.72           O  
ATOM   2220  CB  PRO A 290      11.033  88.917  47.830  0.98  8.62           C  
ATOM   2221  CG  PRO A 290      11.404  87.931  48.922  1.00  8.59           C  
ATOM   2222  CD  PRO A 290      12.551  88.693  49.551  1.00  8.56           C  
ATOM   2223  N   ASP A 291       9.234  89.928  50.282  1.00  8.75           N  
ATOM   2224  CA  ASP A 291       7.904  90.143  50.832  1.00  8.85           C  
ATOM   2225  C   ASP A 291       7.620  91.587  51.221  1.00  8.85           C  
ATOM   2226  O   ASP A 291       6.543  92.101  50.921  1.00  8.90           O  
ATOM   2227  CB  ASP A 291       7.647  89.202  52.011  0.90  8.92           C  
ATOM   2228  CG  ASP A 291       7.609  87.749  51.585  0.56  8.98           C  
ATOM   2229  OD1 ASP A 291       6.882  87.443  50.612  0.49  9.04           O  
ATOM   2230  OD2 ASP A 291       8.291  86.917  52.216  0.27  9.03           O  
ATOM   2231  N   LEU A 292       8.572  92.250  51.872  1.00  8.81           N  
ATOM   2232  CA  LEU A 292       8.362  93.643  52.257  1.00  8.76           C  
ATOM   2233  C   LEU A 292       8.346  94.543  51.024  1.00  8.75           C  
ATOM   2234  O   LEU A 292       7.565  95.490  50.949  1.00  8.74           O  
ATOM   2235  CB  LEU A 292       9.453  94.119  53.222  1.00  8.79           C  
ATOM   2236  CG  LEU A 292       9.286  95.567  53.696  0.98  8.77           C  
ATOM   2237  CD1 LEU A 292       7.982  95.710  54.479  0.90  8.82           C  
ATOM   2238  CD2 LEU A 292      10.474  95.958  54.564  0.80  8.81           C  
ATOM   2239  N   ILE A 293       9.211  94.254  50.058  1.00  8.73           N  
ATOM   2240  CA  ILE A 293       9.252  95.058  48.846  1.00  8.74           C  
ATOM   2241  C   ILE A 293       7.917  94.925  48.115  1.00  8.78           C  
ATOM   2242  O   ILE A 293       7.323  95.918  47.702  1.00  8.73           O  
ATOM   2243  CB  ILE A 293      10.423  94.623  47.927  1.00  8.67           C  
ATOM   2244  CG1 ILE A 293      11.755  94.934  48.623  1.00  8.69           C  
ATOM   2245  CG2 ILE A 293      10.338  95.342  46.582  0.88  8.73           C  
ATOM   2246  CD1 ILE A 293      12.984  94.425  47.885  1.00  8.62           C  
ATOM   2247  N   GLY A 294       7.435  93.693  47.986  1.00  8.85           N  
ATOM   2248  CA  GLY A 294       6.169  93.461  47.313  1.00  8.97           C  
ATOM   2249  C   GLY A 294       4.972  94.052  48.037  1.00  9.09           C  
ATOM   2250  O   GLY A 294       4.125  94.701  47.420  1.00  9.13           O  
ATOM   2251  N   SER A 295       4.890  93.834  49.347  1.00  9.18           N  
ATOM   2252  CA  SER A 295       3.766  94.363  50.111  1.00  9.29           C  
ATOM   2253  C   SER A 295       3.749  95.893  50.123  1.00  9.35           C  
ATOM   2254  O   SER A 295       2.683  96.502  50.008  1.00  9.38           O  
ATOM   2255  CB  SER A 295       3.780  93.816  51.544  0.92  9.31           C  
ATOM   2256  OG  SER A 295       4.959  94.179  52.236  0.65  9.37           O  
ATOM   2257  N   GLU A 296       4.917  96.519  50.249  1.00  9.43           N  
ATOM   2258  CA  GLU A 296       4.976  97.979  50.260  1.00  9.54           C  
ATOM   2259  C   GLU A 296       4.609  98.588  48.910  1.00  9.63           C  
ATOM   2260  O   GLU A 296       3.982  99.643  48.851  1.00  9.65           O  
ATOM   2261  CB  GLU A 296       6.358  98.464  50.715  1.00  9.56           C  
ATOM   2262  CG  GLU A 296       6.582  98.300  52.208  0.94  9.74           C  
ATOM   2263  CD  GLU A 296       5.589  99.113  53.024  0.78  9.81           C  
ATOM   2264  OE1 GLU A 296       5.594 100.356  52.902  0.59  9.90           O  
ATOM   2265  OE2 GLU A 296       4.797  98.511  53.779  0.46  9.88           O  
ATOM   2266  N   ILE A 297       4.996  97.935  47.821  1.00  9.70           N  
ATOM   2267  CA  ILE A 297       4.633  98.444  46.504  1.00  9.80           C  
ATOM   2268  C   ILE A 297       3.112  98.353  46.378  1.00  9.94           C  
ATOM   2269  O   ILE A 297       2.455  99.299  45.947  1.00  9.93           O  
ATOM   2270  CB  ILE A 297       5.313  97.620  45.380  1.00  9.71           C  
ATOM   2271  CG1 ILE A 297       6.822  97.883  45.398  1.00  9.72           C  
ATOM   2272  CG2 ILE A 297       4.702  97.964  44.025  1.00  9.71           C  
ATOM   2273  CD1 ILE A 297       7.612  97.055  44.404  1.00  9.61           C  
ATOM   2274  N   ALA A 298       2.554  97.219  46.788  1.00 10.13           N  
ATOM   2275  CA  ALA A 298       1.113  97.013  46.718  1.00 10.33           C  
ATOM   2276  C   ALA A 298       0.337  98.064  47.510  1.00 10.49           C  
ATOM   2277  O   ALA A 298      -0.708  98.530  47.065  1.00 10.50           O  
ATOM   2278  CB  ALA A 298       0.766  95.621  47.224  1.00 10.33           C  
ATOM   2279  N   ARG A 299       0.848  98.440  48.678  1.00 10.67           N  
ATOM   2280  CA  ARG A 299       0.172  99.431  49.514  1.00 10.95           C  
ATOM   2281  C   ARG A 299       0.346 100.857  48.998  1.00 11.12           C  
ATOM   2282  O   ARG A 299      -0.453 101.744  49.300  1.00 11.23           O  
ATOM   2283  CB  ARG A 299       0.693  99.338  50.953  0.79 10.95           C  
ATOM   2284  CG  ARG A 299       0.439  97.994  51.618  0.31 11.02           C  
ATOM   2285  CD  ARG A 299       1.046  98.117  53.070  0.33 11.05           C  
ATOM   2286  NE  ARG A 299       0.799  96.896  53.833  0.29 11.10           N  
ATOM   2287  CZ  ARG A 299      -0.407  96.447  54.171  0.13 11.11           C  
ATOM   2288  NH1 ARG A 299      -1.499  97.110  53.807  0.08 11.13           N  
ATOM   2289  NH2 ARG A 299      -0.520  95.327  54.875  0.10 11.13           N  
ATOM   2290  N   TRP A 300       1.394 101.059  48.208  1.00 11.31           N  
ATOM   2291  CA  TRP A 300       1.741 102.359  47.640  1.00 11.47           C  
ATOM   2292  C   TRP A 300       1.009 102.702  46.336  1.00 11.68           C  
ATOM   2293  O   TRP A 300       0.680 103.862  46.089  1.00 11.67           O  
ATOM   2294  CB  TRP A 300       3.259 102.372  47.423  1.00 11.33           C  
ATOM   2295  CG  TRP A 300       3.835 103.519  46.649  1.00 11.23           C  
ATOM   2296  CD1 TRP A 300       4.016 104.806  47.077  0.99 11.23           C  
ATOM   2297  CD2 TRP A 300       4.377 103.454  45.328  1.00 11.17           C  
ATOM   2298  NE1 TRP A 300       4.649 105.543  46.100  1.00 11.20           N  
ATOM   2299  CE2 TRP A 300       4.881 104.736  45.016  0.96 11.17           C  
ATOM   2300  CE3 TRP A 300       4.489 102.432  44.375  1.00 11.13           C  
ATOM   2301  CZ2 TRP A 300       5.490 105.023  43.789  1.00 11.15           C  
ATOM   2302  CZ3 TRP A 300       5.095 102.717  43.154  1.00 11.10           C  
ATOM   2303  CH2 TRP A 300       5.588 104.004  42.875  1.00 11.12           C  
ATOM   2304  N   LEU A 301       0.744 101.695  45.510  1.00 11.94           N  
ATOM   2305  CA  LEU A 301       0.085 101.903  44.220  1.00 12.27           C  
ATOM   2306  C   LEU A 301      -1.267 102.627  44.206  1.00 12.57           C  
ATOM   2307  O   LEU A 301      -1.478 103.526  43.395  1.00 12.56           O  
ATOM   2308  CB  LEU A 301      -0.061 100.564  43.489  1.00 12.19           C  
ATOM   2309  CG  LEU A 301       1.235  99.878  43.043  1.00 12.16           C  
ATOM   2310  CD1 LEU A 301       0.928  98.488  42.511  1.00 12.19           C  
ATOM   2311  CD2 LEU A 301       1.927 100.721  41.982  1.00 12.16           C  
ATOM   2312  N   PRO A 302      -2.200 102.251  45.097  1.00 12.91           N  
ATOM   2313  CA  PRO A 302      -3.509 102.915  45.105  1.00 13.24           C  
ATOM   2314  C   PRO A 302      -3.464 104.439  45.198  1.00 13.61           C  
ATOM   2315  O   PRO A 302      -4.219 105.130  44.511  1.00 13.61           O  
ATOM   2316  CB  PRO A 302      -4.198 102.273  46.308  1.00 13.13           C  
ATOM   2317  CG  PRO A 302      -3.621 100.873  46.284  1.00 13.05           C  
ATOM   2318  CD  PRO A 302      -2.153 101.235  46.160  0.99 12.97           C  
ATOM   2319  N   GLY A 303      -2.574 104.949  46.043  1.00 13.98           N  
ATOM   2320  CA  GLY A 303      -2.450 106.384  46.228  1.00 14.52           C  
ATOM   2321  C   GLY A 303      -1.942 107.148  45.020  1.00 14.91           C  
ATOM   2322  O   GLY A 303      -1.966 108.381  45.009  1.00 14.95           O  
ATOM   2323  N   LEU A 304      -1.482 106.430  44.001  1.00 15.31           N  
ATOM   2324  CA  LEU A 304      -0.979 107.079  42.795  1.00 15.82           C  
ATOM   2325  C   LEU A 304      -2.117 107.573  41.913  1.00 16.24           C  
ATOM   2326  O   LEU A 304      -1.896 108.346  40.982  1.00 16.29           O  
ATOM   2327  CB  LEU A 304      -0.104 106.113  41.994  1.00 15.66           C  
ATOM   2328  CG  LEU A 304       1.136 105.569  42.707  1.00 15.59           C  
ATOM   2329  CD1 LEU A 304       1.888 104.641  41.767  1.00 15.53           C  
ATOM   2330  CD2 LEU A 304       2.024 106.719  43.140  1.00 15.57           C  
ATOM   2331  N   ALA A 305      -3.332 107.122  42.208  1.00 16.73           N  
ATOM   2332  CA  ALA A 305      -4.507 107.514  41.433  1.00 17.19           C  
ATOM   2333  C   ALA A 305      -5.059 108.854  41.900  1.00 17.56           C  
ATOM   2334  O   ALA A 305      -4.873 109.247  43.049  1.00 17.70           O  
ATOM   2335  CB  ALA A 305      -5.585 106.445  41.554  0.99 17.20           C  
ATOM   2336  N   SER A 306      -5.742 109.549  40.998  0.61 18.00           N  
ATOM   2337  CA  SER A 306      -6.339 110.840  41.316  0.69 18.37           C  
ATOM   2338  C   SER A 306      -7.827 110.790  40.985  0.76 18.68           C  
ATOM   2339  O   SER A 306      -8.284 111.428  40.036  0.45 18.77           O  
ATOM   2340  CB  SER A 306      -5.662 111.952  40.508  0.43 18.30           C  
ATOM   2341  OG  SER A 306      -5.814 111.734  39.118  0.03 18.25           O  
ATOM   2342  N   GLY A 307      -8.581 110.016  41.760  0.79 19.02           N  
ATOM   2343  CA  GLY A 307     -10.007 109.897  41.511  0.85 19.34           C  
ATOM   2344  C   GLY A 307     -10.321 108.866  40.442  0.71 19.63           C  
ATOM   2345  O   GLY A 307      -9.414 108.254  39.876  0.88 19.66           O  
ATOM   2346  N   LEU A 308     -11.610 108.683  40.161  0.75 19.74           N  
ATOM   2347  CA  LEU A 308     -12.068 107.728  39.155  0.90 20.09           C  
ATOM   2348  C   LEU A 308     -11.563 108.117  37.769  0.76 20.30           C  
ATOM   2349  O   LEU A 308     -11.608 109.288  37.397  0.79 20.27           O  
ATOM   2350  CB  LEU A 308     -13.597 107.663  39.149  1.00 19.99           C  
ATOM   2351  CG  LEU A 308     -14.235 107.347  40.503  0.59 19.88           C  
ATOM   2352  CD1 LEU A 308     -15.735 107.267  40.336  0.47 19.94           C  
ATOM   2353  CD2 LEU A 308     -13.697 106.038  41.054  0.68 19.92           C  
ATOM   2354  N   GLY A 309     -11.082 107.133  37.019  0.76 20.40           N  
ATOM   2355  CA  GLY A 309     -10.563 107.407  35.692  0.63 20.80           C  
ATOM   2356  C   GLY A 309      -9.565 106.360  35.242  0.56 20.94           C  
ATOM   2357  O   GLY A 309      -9.764 105.770  34.159  0.17 21.07           O  
ATOM   2358  OXT GLY A 309      -8.567 106.132  35.964  0.01 21.08           O  
TER    2359      GLY A 309                                                      
HETATM 2360  I   IOD A 321      26.952  96.166  36.471  0.59 12.91           I  
HETATM 2361  I   IOD A 322      27.132  94.040  43.464  0.53 16.67           I  
HETATM 2362  O   HOH A 401       2.169  80.994  27.573  0.58 24.26           O  
HETATM 2363  O   HOH A 402       3.972  81.852  24.830  0.48 22.61           O  
HETATM 2364  O   HOH A 403       3.508  84.690  23.502  0.89 20.25           O  
HETATM 2365  O   HOH A 404       1.359  85.754  24.723  0.56 21.32           O  
HETATM 2366  O   HOH A 405       0.666  89.910  26.832  0.85 20.13           O  
HETATM 2367  O   HOH A 406      -1.476  91.280  25.791  0.36 23.65           O  
HETATM 2368  O   HOH A 407      -3.342  91.244  27.272  0.49 25.74           O  
HETATM 2369  O   HOH A 408      -4.163  93.382  27.911  0.64 23.14           O  
HETATM 2370  O   HOH A 409      -0.486  94.652  25.940  0.83 18.03           O  
HETATM 2371  O   HOH A 410      -1.682  97.055  26.833  0.45 18.60           O  
HETATM 2372  O   HOH A 411      -3.015  97.470  30.917  0.96 21.18           O  
HETATM 2373  O   HOH A 412      -6.925  99.914  30.877  0.51 26.09           O  
HETATM 2374  O   HOH A 413     -10.803  97.949  30.345  0.49 22.56           O  
HETATM 2375  O   HOH A 414     -14.072  98.268  32.541  0.70 21.62           O  
HETATM 2376  O   HOH A 415     -12.294  96.665  33.840  0.94 15.14           O  
HETATM 2377  O   HOH A 416      -9.888  93.357  34.367  0.74 22.59           O  
HETATM 2378  O   HOH A 417      -8.689  91.188  33.338  0.89 16.99           O  
HETATM 2379  O   HOH A 418     -10.139  90.226  31.136  0.55 20.96           O  
HETATM 2380  O   HOH A 419      -5.790  88.246  33.367  0.60 23.81           O  
HETATM 2381  O   HOH A 420      -1.931  86.873  31.598  0.45 21.59           O  
HETATM 2382  O   HOH A 421       0.473  84.673  32.122  0.98 20.49           O  
HETATM 2383  O   HOH A 422       1.305  83.034  34.242  0.85 23.18           O  
HETATM 2384  O   HOH A 423       1.102  83.007  36.796  0.62 22.24           O  
HETATM 2385  O   HOH A 424       1.438  82.160  39.362  0.58 21.39           O  
HETATM 2386  O   HOH A 425       1.944  83.464  41.607  0.79 21.48           O  
HETATM 2387  O   HOH A 426       3.933  82.609  43.224  0.82 19.23           O  
HETATM 2388  O   HOH A 427       6.356  83.213  42.506  0.95 16.58           O  
HETATM 2389  O   HOH A 428       8.667  81.841  43.573  1.00 12.77           O  
HETATM 2390  O   HOH A 429       8.176  79.004  44.507  0.63 21.07           O  
HETATM 2391  O   HOH A 430       6.130  78.255  42.451  0.52 24.55           O  
HETATM 2392  O   HOH A 431       9.762  74.392  42.995  0.70 28.18           O  
HETATM 2393  O   HOH A 432      12.042  75.345  42.495  0.78 19.74           O  
HETATM 2394  O   HOH A 433      12.617  75.660  39.949  1.00 21.02           O  
HETATM 2395  O   HOH A 434      13.570  73.436  39.034  0.55 22.56           O  
HETATM 2396  O   HOH A 435      17.157  75.833  38.319  0.72 23.95           O  
HETATM 2397  O   HOH A 436      17.555  75.800  36.035  0.60 26.24           O  
HETATM 2398  O   HOH A 437      19.228  73.685  35.287  0.48 27.29           O  
HETATM 2399  O   HOH A 438      21.228  76.301  34.450  0.95 17.28           O  
HETATM 2400  O   HOH A 439      23.447  75.602  35.738  1.00 11.68           O  
HETATM 2401  O   HOH A 440      20.169  75.153  32.554  0.60 25.32           O  
HETATM 2402  O   HOH A 441      20.050  75.227  27.780  0.45 24.11           O  
HETATM 2403  O   HOH A 442      20.422  78.135  27.772  0.60 20.41           O  
HETATM 2404  O   HOH A 443      22.579  78.427  26.204  0.72 20.00           O  
HETATM 2405  O   HOH A 444      21.703  78.471  23.569  0.40 21.96           O  
HETATM 2406  O   HOH A 445      22.097  81.251  22.944  0.56 23.87           O  
HETATM 2407  O   HOH A 446      21.641  82.659  20.256  0.44 22.59           O  
HETATM 2408  O   HOH A 447      24.027  82.624  20.943  0.64 25.97           O  
HETATM 2409  O   HOH A 448      24.464  87.096  23.080  0.86 18.18           O  
HETATM 2410  O   HOH A 449      26.855  87.776  23.008  0.77 23.66           O  
HETATM 2411  O   HOH A 450      27.415  89.513  21.189  0.96 22.74           O  
HETATM 2412  O   HOH A 451      30.113  92.168  19.876  0.69 27.19           O  
HETATM 2413  O   HOH A 452      29.186  92.183  17.801  0.76 27.72           O  
HETATM 2414  O   HOH A 453      27.769  93.701  16.632  0.73 28.54           O  
HETATM 2415  O   HOH A 454      25.535  96.534  19.049  0.90 23.16           O  
HETATM 2416  O   HOH A 455      27.221  98.364  17.886  0.46 24.12           O  
HETATM 2417  O   HOH A 456      21.791  95.701  15.910  0.55 24.08           O  
HETATM 2418  O   HOH A 457      23.640  94.172  14.767  0.69 19.59           O  
HETATM 2419  O   HOH A 458      23.962  91.533  14.914  0.80 16.08           O  
HETATM 2420  O   HOH A 459      22.632  89.107  15.566  1.00 14.96           O  
HETATM 2421  O   HOH A 460      20.056  88.280  15.538  0.85 18.56           O  
HETATM 2422  O   HOH A 461      19.772  85.918  17.537  0.62 28.16           O  
HETATM 2423  O   HOH A 462      18.985  83.953  20.299  0.92 20.18           O  
HETATM 2424  O   HOH A 463      13.734  82.569  19.309  0.58 24.47           O  
HETATM 2425  O   HOH A 464      13.471  84.214  22.842  0.93 19.17           O  
HETATM 2426  O   HOH A 465      13.494  81.305  25.123  0.51 24.09           O  
HETATM 2427  O   HOH A 466      17.348  80.969  29.132  0.65 21.01           O  
HETATM 2428  O   HOH A 467      16.028  82.924  32.214  0.88 18.29           O  
HETATM 2429  O   HOH A 468      13.843  84.445  32.451  0.94 21.36           O  
HETATM 2430  O   HOH A 469      12.937  83.307  34.179  0.78 21.26           O  
HETATM 2431  O   HOH A 470      13.146  81.718  33.769  0.57 23.59           O  
HETATM 2432  O   HOH A 471      15.481  80.267  34.606  0.58 24.33           O  
HETATM 2433  O   HOH A 472      17.747  84.362  34.959  0.96 15.76           O  
HETATM 2434  O   HOH A 473      20.471  85.307  34.760  1.00  6.84           O  
HETATM 2435  O   HOH A 474      19.522  86.653  32.424  1.00  7.41           O  
HETATM 2436  O   HOH A 475      23.540  87.409  25.476  1.00 17.57           O  
HETATM 2437  O   HOH A 476      23.933  80.831  26.673  1.00 12.30           O  
HETATM 2438  O   HOH A 477      19.913  81.250  26.134  0.48 24.33           O  
HETATM 2439  O   HOH A 478      24.192  76.060  25.949  0.52 23.35           O  
HETATM 2440  O   HOH A 479      23.344  74.131  26.917  0.54 25.40           O  
HETATM 2441  O   HOH A 480      28.876  75.469  26.566  0.52 24.07           O  
HETATM 2442  O   HOH A 481      33.122  77.202  29.682  0.51 19.63           O  
HETATM 2443  O   HOH A 482      31.757  78.448  31.469  0.97 21.64           O  
HETATM 2444  O   HOH A 483      33.413  78.665  33.555  0.61 25.87           O  
HETATM 2445  O   HOH A 484      32.064  79.469  35.631  0.70 18.51           O  
HETATM 2446  O   HOH A 485      29.294  79.145  35.522  1.00 10.29           O  
HETATM 2447  O   HOH A 486      25.896  80.568  33.376  1.00 10.08           O  
HETATM 2448  O   HOH A 487      29.711  86.408  34.276  1.00  9.48           O  
HETATM 2449  O   HOH A 488      34.108  82.777  38.325  0.74 16.41           O  
HETATM 2450  O   HOH A 489      33.432  83.671  40.615  0.66 22.22           O  
HETATM 2451  O   HOH A 490      36.454  83.971  38.389  0.92 20.01           O  
HETATM 2452  O   HOH A 491      36.789  85.907  40.277  0.88 21.61           O  
HETATM 2453  O   HOH A 492      35.775  88.479  39.954  0.82 17.66           O  
HETATM 2454  O   HOH A 493      33.424  88.218  40.817  0.71 17.80           O  
HETATM 2455  O   HOH A 494      32.882  88.010  43.469  0.92 21.67           O  
HETATM 2456  O   HOH A 495      33.825  85.537  44.396  0.53 20.88           O  
HETATM 2457  O   HOH A 496      37.830  90.038  41.513  0.92 19.43           O  
HETATM 2458  O   HOH A 497      39.807  86.109  40.521  0.65 23.95           O  
HETATM 2459  O   HOH A 498      40.538  84.476  38.263  0.52 24.16           O  
HETATM 2460  O   HOH A 499      41.975  85.111  35.921  0.49 24.48           O  
HETATM 2461  O   HOH A 500      34.755  79.442  29.486  0.62 22.65           O  
HETATM 2462  O   HOH A 501      35.112  80.022  27.173  0.60 22.44           O  
HETATM 2463  O   HOH A 502      34.883  82.289  26.806  0.67 23.58           O  
HETATM 2464  O   HOH A 503      33.524  83.427  24.829  0.65 20.03           O  
HETATM 2465  O   HOH A 504      33.411  86.000  23.671  0.85 18.99           O  
HETATM 2466  O   HOH A 505      35.776  87.224  24.761  0.54 24.93           O  
HETATM 2467  O   HOH A 506      38.273  88.661  25.015  0.42 24.44           O  
HETATM 2468  O   HOH A 507      38.895  94.000  27.350  0.93 21.30           O  
HETATM 2469  O   HOH A 508      37.952  96.355  25.967  0.51 27.43           O  
HETATM 2470  O   HOH A 509      39.438  98.266  28.846  0.47 23.31           O  
HETATM 2471  O   HOH A 510      37.494  96.994  30.155  0.78 21.62           O  
HETATM 2472  O   HOH A 511      37.901  93.939  30.096  1.00 16.83           O  
HETATM 2473  O   HOH A 512      36.111  93.883  23.482  0.58 24.47           O  
HETATM 2474  O   HOH A 513      33.405  92.856  22.435  0.49 24.63           O  
HETATM 2475  O   HOH A 514      30.576  94.775  24.142  0.97 14.78           O  
HETATM 2476  O   HOH A 515      31.527 100.791  28.052  1.00 17.15           O  
HETATM 2477  O   HOH A 516      32.842 103.080  26.523  0.68 25.40           O  
HETATM 2478  O   HOH A 517      29.902 103.947  26.370  0.79 23.84           O  
HETATM 2479  O   HOH A 518      27.445 103.416  25.442  0.52 22.13           O  
HETATM 2480  O   HOH A 519      25.452 103.282  25.243  0.81 18.89           O  
HETATM 2481  O   HOH A 520      26.149 103.888  22.623  0.59 23.38           O  
HETATM 2482  O   HOH A 521      29.218 104.177  23.511  0.58 22.60           O  
HETATM 2483  O   HOH A 522      32.114 108.243  26.193  0.58 20.95           O  
HETATM 2484  O   HOH A 523      31.363 110.510  24.468  0.51 23.44           O  
HETATM 2485  O   HOH A 524      29.221 112.467  26.106  0.51 26.08           O  
HETATM 2486  O   HOH A 525      25.020 110.753  26.434  0.78 18.95           O  
HETATM 2487  O   HOH A 526      20.407 110.439  25.280  0.65 28.20           O  
HETATM 2488  O   HOH A 527      17.567 111.857  26.057  0.77 19.02           O  
HETATM 2489  O   HOH A 528      14.067 114.257  26.888  0.74 28.72           O  
HETATM 2490  O   HOH A 529      10.326 116.057  27.495  0.32 23.27           O  
HETATM 2491  O   HOH A 530      11.489 115.673  30.590  0.71 18.69           O  
HETATM 2492  O   HOH A 531       9.472 116.520  32.892  0.65 23.73           O  
HETATM 2493  O   HOH A 532       9.368 117.437  35.823  0.58 27.01           O  
HETATM 2494  O   HOH A 533      11.613 117.163  36.245  0.67 19.99           O  
HETATM 2495  O   HOH A 534       7.720 114.533  35.823  0.62 22.02           O  
HETATM 2496  O   HOH A 535       6.481 111.296  35.544  0.90 18.86           O  
HETATM 2497  O   HOH A 536       2.399 111.461  35.895  0.31 25.99           O  
HETATM 2498  O   HOH A 537       1.005 109.705  34.305  0.69 25.74           O  
HETATM 2499  O   HOH A 538       0.140 113.035  32.274  0.45 24.20           O  
HETATM 2500  O   HOH A 539       1.583 110.540  26.136  0.45 25.08           O  
HETATM 2501  O   HOH A 540       0.286 107.709  26.498  0.74 27.96           O  
HETATM 2502  O   HOH A 541       5.544 109.735  24.991  0.59 20.34           O  
HETATM 2503  O   HOH A 542       7.982 107.625  23.212  0.47 26.46           O  
HETATM 2504  O   HOH A 543       9.660 105.246  22.844  0.85 22.20           O  
HETATM 2505  O   HOH A 544       9.906 104.675  20.355  0.64 22.68           O  
HETATM 2506  O   HOH A 545      10.613 102.144  19.783  0.86 15.30           O  
HETATM 2507  O   HOH A 546       9.145 100.711  17.925  0.77 17.98           O  
HETATM 2508  O   HOH A 547      11.275 100.818  16.138  0.73 18.15           O  
HETATM 2509  O   HOH A 548      13.548 101.644  19.633  1.00 12.22           O  
HETATM 2510  O   HOH A 549      14.392 104.047  20.693  0.80 17.39           O  
HETATM 2511  O   HOH A 550      12.799 105.951  19.221  0.48 25.40           O  
HETATM 2512  O   HOH A 551      13.787 109.047  22.471  0.48 22.77           O  
HETATM 2513  O   HOH A 552      10.726 107.152  24.166  0.70 26.63           O  
HETATM 2514  O   HOH A 553       8.612 103.244  24.410  1.00 13.44           O  
HETATM 2515  O   HOH A 554      14.200 102.136  26.821  1.00 10.54           O  
HETATM 2516  O   HOH A 555      15.470 104.057  28.456  1.00 10.21           O  
HETATM 2517  O   HOH A 556      18.478 107.433  24.147  0.75 20.43           O  
HETATM 2518  O   HOH A 557      18.156 106.121  21.788  0.51 25.24           O  
HETATM 2519  O   HOH A 558      21.159 105.586  24.858  0.66 22.10           O  
HETATM 2520  O   HOH A 559      23.719 105.504  25.516  0.84 19.91           O  
HETATM 2521  O   HOH A 560      24.690  97.926  28.340  0.54 23.92           O  
HETATM 2522  O   HOH A 561      24.640  94.841  28.344  1.00  8.04           O  
HETATM 2523  O   HOH A 562      16.982  95.387  26.608  1.00  7.89           O  
HETATM 2524  O   HOH A 563      13.741  94.171  32.513  0.81 13.80           O  
HETATM 2525  O   HOH A 564      12.131  92.300  34.521  1.00  9.69           O  
HETATM 2526  O   HOH A 565      19.285  93.154  38.634  1.00  9.73           O  
HETATM 2527  O   HOH A 566      21.573  94.138  39.167  0.81 12.12           O  
HETATM 2528  O   HOH A 567      24.864  94.386  39.510  0.63 30.55           O  
HETATM 2529  O   HOH A 568      25.725  98.977  39.123  0.32 31.57           O  
HETATM 2530  O   HOH A 569      26.171  96.971  40.424  0.48 31.49           O  
HETATM 2531  O   HOH A 570      25.804 103.614  39.843  0.51 21.05           O  
HETATM 2532  O   HOH A 571      24.861 103.763  41.757  0.53 24.75           O  
HETATM 2533  O   HOH A 572      27.780 103.775  46.687  0.76 16.74           O  
HETATM 2534  O   HOH A 573      28.241 101.654  49.407  0.91 18.75           O  
HETATM 2535  O   HOH A 574      29.928 103.627  49.994  0.66 20.74           O  
HETATM 2536  O   HOH A 575      32.711 103.494  50.189  0.85 19.80           O  
HETATM 2537  O   HOH A 576      27.918 100.226  51.625  0.66 24.86           O  
HETATM 2538  O   HOH A 577      27.225 101.194  53.814  0.56 25.32           O  
HETATM 2539  O   HOH A 578      25.930 100.530  56.618  0.50 21.76           O  
HETATM 2540  O   HOH A 579      27.872  99.024  57.575  0.51 23.09           O  
HETATM 2541  O   HOH A 580      29.902  97.867  55.452  0.61 25.19           O  
HETATM 2542  O   HOH A 581      30.158  96.322  52.597  0.75 20.26           O  
HETATM 2543  O   HOH A 582      28.718  97.750  50.995  1.00 20.46           O  
HETATM 2544  O   HOH A 583      32.781  96.898  51.989  0.99 19.20           O  
HETATM 2545  O   HOH A 584      36.087  93.661  53.501  0.45 28.83           O  
HETATM 2546  O   HOH A 585      33.441  91.238  53.171  0.80 29.16           O  
HETATM 2547  O   HOH A 586      29.655  92.863  52.359  0.81 26.29           O  
HETATM 2548  O   HOH A 587      29.597  89.405  50.271  0.77 22.09           O  
HETATM 2549  O   HOH A 588      27.111  87.843  51.179  0.73 28.20           O  
HETATM 2550  O   HOH A 589      25.560  84.432  51.905  0.60 24.65           O  
HETATM 2551  O   HOH A 590      26.716  81.673  51.674  0.45 25.01           O  
HETATM 2552  O   HOH A 591      26.035  82.460  48.787  0.69 18.86           O  
HETATM 2553  O   HOH A 592      24.042  84.445  48.470  1.00 12.80           O  
HETATM 2554  O   HOH A 593      24.844  80.887  46.599  0.61 23.41           O  
HETATM 2555  O   HOH A 594      26.868  79.555  44.289  0.61 21.75           O  
HETATM 2556  O   HOH A 595      29.057  80.442  42.692  0.77 18.49           O  
HETATM 2557  O   HOH A 596      25.138  77.460  43.187  0.79 16.33           O  
HETATM 2558  O   HOH A 597      23.509  78.071  49.546  0.68 21.99           O  
HETATM 2559  O   HOH A 598      18.687  80.469  51.610  0.76 22.26           O  
HETATM 2560  O   HOH A 599      16.297  79.677  50.989  0.44 22.95           O  
HETATM 2561  O   HOH A 600      14.715  77.939  49.396  0.56 22.58           O  
HETATM 2562  O   HOH A 601      15.110  80.604  48.634  0.99 16.29           O  
HETATM 2563  O   HOH A 602      11.895  77.509  49.462  0.56 26.33           O  
HETATM 2564  O   HOH A 603      10.357  77.379  46.782  0.85 18.18           O  
HETATM 2565  O   HOH A 604      13.737  74.968  46.102  0.75 20.32           O  
HETATM 2566  O   HOH A 605      19.374  72.951  40.899  1.00 12.42           O  
HETATM 2567  O   HOH A 606      10.316  76.720  38.451  0.54 23.98           O  
HETATM 2568  O   HOH A 607       9.228  78.442  34.640  0.45 26.59           O  
HETATM 2569  O   HOH A 608       8.214  82.135  31.602  1.00 16.78           O  
HETATM 2570  O   HOH A 609       3.289  85.514  32.615  1.00 11.74           O  
HETATM 2571  O   HOH A 610      -1.113  83.198  29.800  0.48 22.85           O  
HETATM 2572  O   HOH A 611      -2.759  86.442  36.347  0.77 22.98           O  
HETATM 2573  O   HOH A 612       0.341  85.217  38.855  0.58 23.27           O  
HETATM 2574  O   HOH A 613       1.363  86.037  40.937  0.88 21.21           O  
HETATM 2575  O   HOH A 614      -0.816  86.587  43.944  0.79 21.81           O  
HETATM 2576  O   HOH A 615      -2.861  87.349  41.552  0.66 24.26           O  
HETATM 2577  O   HOH A 616      -5.062  89.095  39.606  0.74 24.95           O  
HETATM 2578  O   HOH A 617      -7.823  90.353  43.326  0.96 19.26           O  
HETATM 2579  O   HOH A 618      -7.268  88.154  44.595  0.68 19.47           O  
HETATM 2580  O   HOH A 619      -6.565  91.268  46.414  0.73 29.09           O  
HETATM 2581  O   HOH A 620      -4.324  93.644  46.758  0.53 23.16           O  
HETATM 2582  O   HOH A 621      -1.949  93.723  45.252  0.86 15.37           O  
HETATM 2583  O   HOH A 622      -0.605  92.119  48.389  0.85 22.02           O  
HETATM 2584  O   HOH A 623       1.176  92.053  49.886  0.87 18.41           O  
HETATM 2585  O   HOH A 624      -1.873  94.598  49.585  0.68 24.99           O  
HETATM 2586  O   HOH A 625      -2.381  89.972  48.203  0.47 25.84           O  
HETATM 2587  O   HOH A 626       0.340  88.456  48.278  0.81 29.84           O  
HETATM 2588  O   HOH A 627       3.209  86.171  48.269  0.50 21.13           O  
HETATM 2589  O   HOH A 628       5.305  86.138  46.844  0.62 22.18           O  
HETATM 2590  O   HOH A 629       6.361  83.836  45.948  0.76 23.97           O  
HETATM 2591  O   HOH A 630       8.948  84.133  48.643  0.71 20.31           O  
HETATM 2592  O   HOH A 631       9.681  84.850  51.051  0.47 25.09           O  
HETATM 2593  O   HOH A 632      10.781  88.368  52.263  0.98 14.16           O  
HETATM 2594  O   HOH A 633      11.682  88.006  54.515  0.58 23.08           O  
HETATM 2595  O   HOH A 634      13.706  89.056  54.836  0.66 19.29           O  
HETATM 2596  O   HOH A 635      16.202  86.550  53.676  0.76 18.60           O  
HETATM 2597  O   HOH A 636      15.917  84.071  54.138  0.47 24.32           O  
HETATM 2598  O   HOH A 637      12.930  80.467  53.424  0.39 24.36           O  
HETATM 2599  O   HOH A 638      19.498  79.847  54.435  0.44 26.95           O  
HETATM 2600  O   HOH A 639      19.730  86.404  56.044  0.72 18.86           O  
HETATM 2601  O   HOH A 640      18.437  87.989  54.308  1.00 16.95           O  
HETATM 2602  O   HOH A 641      16.502  92.118  54.494  0.98  8.87           O  
HETATM 2603  O   HOH A 642      18.844  98.344  56.423  0.81 16.08           O  
HETATM 2604  O   HOH A 643      21.523 101.168  58.700  0.95 20.51           O  
HETATM 2605  O   HOH A 644      23.873 101.058  59.622  0.35 24.73           O  
HETATM 2606  O   HOH A 645      20.524 103.561  58.838  0.68 19.79           O  
HETATM 2607  O   HOH A 646      20.066 106.010  57.398  0.66 22.00           O  
HETATM 2608  O   HOH A 647      18.779 105.547  55.405  0.81 23.42           O  
HETATM 2609  O   HOH A 648      16.182 107.166  54.883  0.66 23.43           O  
HETATM 2610  O   HOH A 649      15.684 109.401  56.015  0.52 22.13           O  
HETATM 2611  O   HOH A 650      13.272 108.613  55.091  0.55 23.69           O  
HETATM 2612  O   HOH A 651      11.856 109.035  53.968  0.60 21.33           O  
HETATM 2613  O   HOH A 652       9.604 107.922  53.975  0.97 20.21           O  
HETATM 2614  O   HOH A 653      11.358 111.248  52.140  0.57 15.20           O  
HETATM 2615  O   HOH A 654       9.073 113.879  49.758  0.58 22.40           O  
HETATM 2616  O   HOH A 655      11.846 114.585  49.676  0.84 16.67           O  
HETATM 2617  O   HOH A 656      13.363 117.450  47.064  1.00 22.56           O  
HETATM 2618  O   HOH A 657      14.483 118.429  44.719  1.00 19.49           O  
HETATM 2619  O   HOH A 658      12.617 120.462  44.792  0.56 20.26           O  
HETATM 2620  O   HOH A 659      10.018 119.904  44.040  0.51 21.90           O  
HETATM 2621  O   HOH A 660       8.640 118.705  42.211  0.79 26.36           O  
HETATM 2622  O   HOH A 661      10.761 118.498  47.882  0.49 25.02           O  
HETATM 2623  O   HOH A 662       8.283 116.481  48.432  0.59 19.27           O  
HETATM 2624  O   HOH A 663       5.747 108.112  46.992  0.95 13.98           O  
HETATM 2625  O   HOH A 664       2.601 105.884  50.215  0.50 22.97           O  
HETATM 2626  O   HOH A 665       2.627 103.711  51.225  0.70 22.97           O  
HETATM 2627  O   HOH A 666       0.158 103.335  51.803  0.47 19.93           O  
HETATM 2628  O   HOH A 667      -1.761 104.095  48.480  0.92 19.40           O  
HETATM 2629  O   HOH A 668      -0.497 106.603  49.237  0.59 20.69           O  
HETATM 2630  O   HOH A 669       0.917 106.330  47.148  0.87 19.51           O  
HETATM 2631  O   HOH A 670      -4.782 109.310  45.989  0.52 24.89           O  
HETATM 2632  O   HOH A 671      -6.102 107.313  45.277  0.80 19.91           O  
HETATM 2633  O   HOH A 672      -4.388 107.422  36.912  0.51 25.57           O  
HETATM 2634  O   HOH A 673      -5.705 101.694  36.267  0.69 28.65           O  
HETATM 2635  O   HOH A 674      -5.443 100.245  37.735  0.80 21.03           O  
HETATM 2636  O   HOH A 675      -5.521  97.545  38.096  0.77 14.61           O  
HETATM 2637  O   HOH A 676      -3.656  97.041  36.301  1.00 13.29           O  
HETATM 2638  O   HOH A 677      -0.666 101.475  29.789  0.92 19.98           O  
HETATM 2639  O   HOH A 678       2.205 102.604  23.206  0.72 21.08           O  
HETATM 2640  O   HOH A 679       4.024 103.519  19.123  0.41 24.39           O  
HETATM 2641  O   HOH A 680       7.494 102.431  16.618  0.52 26.79           O  
HETATM 2642  O   HOH A 681       5.186  99.076  18.162  0.58 22.62           O  
HETATM 2643  O   HOH A 682       7.788  98.391  18.657  0.75 21.48           O  
HETATM 2644  O   HOH A 683      10.045  96.451  16.097  0.83 18.00           O  
HETATM 2645  O   HOH A 684       8.563  93.997  15.477  0.94 18.66           O  
HETATM 2646  O   HOH A 685      10.668  92.913  14.194  1.00 13.55           O  
HETATM 2647  O   HOH A 686       6.148  93.726  14.340  0.31 24.12           O  
HETATM 2648  O   HOH A 687       4.493  95.170  13.769  0.77 27.90           O  
HETATM 2649  O   HOH A 688       5.603  92.963  17.727  0.65 23.47           O  
HETATM 2650  O   HOH A 689       2.919  94.539  18.400  0.35 24.58           O  
HETATM 2651  O   HOH A 690       5.130  89.827  18.184  0.89 20.41           O  
HETATM 2652  O   HOH A 691       6.972  86.268  19.123  0.71 25.64           O  
HETATM 2653  O   HOH A 692       7.229  82.802  19.613  0.55 24.17           O  
HETATM 2654  O   HOH A 693       4.836  83.313  20.785  0.32 26.53           O  
HETATM 2655  O   HOH A 694      13.066  86.695  15.744  0.52 22.06           O  
HETATM 2656  O   HOH A 695      15.856  86.483  14.909  0.54 28.33           O  
HETATM 2657  O   HOH A 696      16.967  89.700  13.057  0.97 18.97           O  
HETATM 2658  O   HOH A 697      19.291  95.886  16.707  0.87 20.69           O  
HETATM 2659  O   HOH A 698      26.217  90.483  13.081  0.78 22.85           O  
HETATM 2660  O   HOH A 699      26.481  88.037  13.546  0.49 24.55           O  
HETATM 2661  O   HOH A 700      24.021  86.905  14.589  0.85 22.42           O  
HETATM 2662  O   HOH A 701      27.728  92.903  12.418  0.91 26.93           O  
HETATM 2663  O   HOH A 702      31.033  87.375  23.926  1.00 20.36           O  
HETATM 2664  O   HOH A 703      33.192  81.241  23.096  0.48 26.49           O  
HETATM 2665  O   HOH A 704      30.514  80.158  23.495  0.97 20.41           O  
HETATM 2666  O   HOH A 705      30.307  79.892  20.268  0.39 23.94           O  
HETATM 2667  O   HOH A 706      34.286  78.724  25.182  0.43 24.18           O  
HETATM 2668  O   HOH A 707      45.186  95.312  31.064  0.61 20.91           O  
HETATM 2669  O   HOH A 708      42.580  99.008  31.465  0.77 25.47           O  
HETATM 2670  O   HOH A 709      42.487  99.662  34.928  0.46 24.17           O  
HETATM 2671  O   HOH A 710      39.475 100.119  36.292  0.82 25.52           O  
HETATM 2672  O   HOH A 711      41.029 101.082  38.457  0.80 26.19           O  
HETATM 2673  O   HOH A 712      38.599 104.265  36.820  0.54 20.50           O  
HETATM 2674  O   HOH A 713      36.253 104.969  35.764  0.93 18.77           O  
HETATM 2675  O   HOH A 714      37.447 102.069  35.459  0.83 14.28           O  
HETATM 2676  O   HOH A 715      38.348 101.758  32.811  0.54 23.95           O  
HETATM 2677  O   HOH A 716      38.509 108.966  36.063  0.58 24.64           O  
HETATM 2678  O   HOH A 717      36.875 111.527  40.546  0.65 22.95           O  
HETATM 2679  O   HOH A 718      39.014 112.736  44.295  0.45 23.69           O  
HETATM 2680  O   HOH A 719      39.324 109.737  44.759  0.57 22.48           O  
HETATM 2681  O   HOH A 720      38.610 111.778  47.193  0.35 24.69           O  
HETATM 2682  O   HOH A 721      40.502 110.031  47.773  0.81 23.77           O  
HETATM 2683  O   HOH A 722      37.985 108.833  51.004  0.62 21.51           O  
HETATM 2684  O   HOH A 723      35.498 111.410  47.574  0.50 23.95           O  
HETATM 2685  O   HOH A 724      27.740 110.529  46.113  0.66 28.72           O  
HETATM 2686  O   HOH A 725      26.014 111.688  47.886  0.72 19.15           O  
HETATM 2687  O   HOH A 726      22.862 111.740  45.370  1.00 13.73           O  
HETATM 2688  O   HOH A 727      20.987 113.593  46.946  1.00 14.78           O  
HETATM 2689  O   HOH A 728      20.170 115.552  50.192  1.00 11.00           O  
HETATM 2690  O   HOH A 729      18.963 117.799  51.364  1.00  8.38           O  
HETATM 2691  O   HOH A 730      18.661 112.869  57.142  0.49 24.60           O  
HETATM 2692  O   HOH A 731      16.765 111.889  55.549  1.00 17.64           O  
HETATM 2693  O   HOH A 732      14.345 113.085  55.756  0.62 22.94           O  
HETATM 2694  O   HOH A 733      19.594 110.529  58.850  0.56 24.51           O  
HETATM 2695  O   HOH A 734      21.654 112.543  56.490  0.58 23.18           O  
HETATM 2696  O   HOH A 735      23.344 111.053  54.956  0.81 21.24           O  
HETATM 2697  O   HOH A 736      25.384 112.475  54.941  0.76 25.02           O  
HETATM 2698  O   HOH A 737      23.177 106.608  57.436  0.61 26.22           O  
HETATM 2699  O   HOH A 738      25.841 104.562  54.780  1.00 17.59           O  
HETATM 2700  O   HOH A 739      27.933 105.602  53.523  0.85 24.21           O  
HETATM 2701  O   HOH A 740      28.280 107.912  47.641  0.51 23.52           O  
HETATM 2702  O   HOH A 741      25.065 110.249  43.053  0.90 19.61           O  
HETATM 2703  O   HOH A 742      26.736 111.655  41.934  0.85 17.66           O  
HETATM 2704  O   HOH A 743      27.828 113.545  39.989  1.00 12.25           O  
HETATM 2705  O   HOH A 744      30.298 112.605  39.632  0.85 19.67           O  
HETATM 2706  O   HOH A 745      30.984 111.800  37.172  0.76 21.06           O  
HETATM 2707  O   HOH A 746      30.973 109.284  37.419  1.00 15.15           O  
HETATM 2708  O   HOH A 747      33.565 113.220  37.007  0.60 21.63           O  
HETATM 2709  O   HOH A 748      33.020 114.874  34.127  0.53 25.36           O  
HETATM 2710  O   HOH A 749      32.600 112.695  32.199  0.92 20.45           O  
HETATM 2711  O   HOH A 750      30.121 113.303  30.824  0.87 23.25           O  
HETATM 2712  O   HOH A 751      28.377 114.842  31.800  0.50 26.36           O  
HETATM 2713  O   HOH A 752      29.036 115.174  33.664  0.53 24.84           O  
HETATM 2714  O   HOH A 753      29.483 114.016  36.318  0.95 16.60           O  
HETATM 2715  O   HOH A 754      30.418 115.773  38.003  0.59 19.48           O  
HETATM 2716  O   HOH A 755      26.078 116.900  33.252  0.59 23.02           O  
HETATM 2717  O   HOH A 756      23.878 115.732  31.411  0.82 19.57           O  
HETATM 2718  O   HOH A 757      22.236 117.042  33.103  0.68 19.68           O  
HETATM 2719  O   HOH A 758      20.160 118.063  32.432  0.50 22.80           O  
HETATM 2720  O   HOH A 759      17.597 116.647  32.506  0.72 20.26           O  
HETATM 2721  O   HOH A 760      14.388 117.064  32.299  0.54 27.21           O  
HETATM 2722  O   HOH A 761      18.202 115.381  28.800  0.71 23.12           O  
HETATM 2723  O   HOH A 762      18.693 110.556  30.586  1.00 11.77           O  
HETATM 2724  O   HOH A 763      22.510 115.585  37.543  1.00 17.61           O  
HETATM 2725  O   HOH A 764      21.199 116.008  39.654  0.81 18.90           O  
HETATM 2726  O   HOH A 765      18.542 101.045  47.399  1.00  7.10           O  
HETATM 2727  O   HOH A 766      20.411  99.979  49.294  1.00  7.70           O  
HETATM 2728  O   HOH A 767      20.922  92.164  48.822  1.00 10.01           O  
HETATM 2729  O   HOH A 768      13.363  86.728  45.798  1.00  6.55           O  
HETATM 2730  O   HOH A 769      11.727  88.058  43.909  1.00  8.65           O  
HETATM 2731  O   HOH A 770       9.663  90.647  55.303  0.87 18.54           O  
HETATM 2732  O   HOH A 771       7.001  91.261  55.294  0.66 25.86           O  
HETATM 2733  O   HOH A 772       5.288  92.074  54.126  0.73 24.20           O  
HETATM 2734  O   HOH A 773       3.880  89.828  53.133  0.65 24.31           O  
HETATM 2735  O   HOH A 774       3.932  95.924  54.045  0.89 18.17           O  
HETATM 2736  O   HOH A 775       6.056  98.079  57.058  0.67 26.90           O  
HETATM 2737  O   HOH A 776       8.102  99.364  56.209  0.83 22.58           O  
HETATM 2738  O   HOH A 777      10.663  98.664  57.119  1.00 14.80           O  
HETATM 2739  O   HOH A 778      11.372 102.372  56.448  0.96 13.95           O  
HETATM 2740  O   HOH A 779      13.237 104.363  55.374  0.93 17.15           O  
HETATM 2741  O   HOH A 780      14.538 105.522  57.526  0.67 24.35           O  
HETATM 2742  O   HOH A 781      15.510 104.143  59.410  0.67 27.69           O  
HETATM 2743  O   HOH A 782      13.885 101.669  59.684  0.69 15.63           O  
HETATM 2744  O   HOH A 783       8.660 102.917  55.571  0.76 26.67           O  
HETATM 2745  O   HOH A 784       4.323 101.649  50.721  0.99 15.98           O  
HETATM 2746  O   HOH A 785      -2.280  97.886  44.948  0.79 17.69           O  
HETATM 2747  O   HOH A 786       0.766 109.639  40.103  0.81 19.27           O  
HETATM 2748  O   HOH A 787      -1.635 112.904  40.324  0.21 25.09           O  
HETATM 2749  O   HOH A 788     -12.332 111.256  35.554  0.55 26.60           O  
HETATM 2750  O   HOH A 789       7.291 113.281  25.809  0.41 24.14           O  
HETATM 2751  O   HOH A 790      34.994 108.622  29.232  0.77 19.57           O  
HETATM 2752  O   HOH A 791      38.590  95.934  46.899  0.84 16.27           O  
HETATM 2753  O   HOH A 792      39.215  93.254  46.752  0.49 22.41           O  
HETATM 2754  O   HOH A 793      36.735  93.315  45.222  0.99 16.07           O  
HETATM 2755  O   HOH A 794      45.420  95.095  44.658  0.73 18.48           O  
MASTER      289    0    2   18    8    0    2    6 2754    1    0   23          
END                                                                             

`;


/***/ }),

/***/ "./src/helper.ts":
/*!***********************!*\
  !*** ./src/helper.ts ***!
  \***********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CheckWebGPU = exports.InitGPU = exports.CreateGPUBuffer = exports.CreateGPUBufferUint = exports.CreateViewProjection = exports.CreateTransforms = exports.CreateAnimation = exports.CreateMesh = void 0;
const gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
const meshHelpers_1 = __webpack_require__(/*! ./meshHelpers */ "./src/meshHelpers.ts");
const test_data_1 = __webpack_require__(/*! ./data/test_data */ "./src/data/test_data.ts");
const loadData_1 = __webpack_require__(/*! ./loadData */ "./src/loadData.ts");
const atomDatabase_1 = __webpack_require__(/*! ./atomDatabase */ "./src/atomDatabase.ts");
const CreateMesh = () => {
    const loaded = loadData_1.LoadData(test_data_1.Data1cqw);
    const atoms = loaded.atoms;
    console.log(loaded.chains);
    //const instanceMesh = CubeData();
    const instanceMesh = meshHelpers_1.CreateSphereGeometry(1, 12, 6);
    let result = { positions: new Float32Array(instanceMesh.positions.length * atoms.length), colors: new Float32Array(instanceMesh.colors.length * atoms.length) };
    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        let positions = new Float32Array(instanceMesh.positions);
        for (let j = 0; j < positions.length; j++) {
            if (j % 3 == 0) {
                positions[j] = (positions[j] / 4) * atomDatabase_1.GetAtomType(atom).covalentRadius + atom.x;
            }
            else if (j % 3 == 1) {
                positions[j] = (positions[j] / 4) * atomDatabase_1.GetAtomType(atom).covalentRadius + atom.y;
            }
            else if (j % 3 == 2) {
                positions[j] = (positions[j] / 4) * atomDatabase_1.GetAtomType(atom).covalentRadius + atom.z;
            }
        }
        let atomColor = atom.GetColor();
        let colors = new Float32Array(instanceMesh.colors);
        for (let j = 0; j < colors.length; j++) {
            colors[j] = atomColor[j % 3];
        }
        result.positions.set(positions, instanceMesh.positions.length * i);
        result.colors.set(colors, instanceMesh.colors.length * i);
    }
    console.log(atomDatabase_1.AtomTypes);
    console.log(result);
    return result;
};
exports.CreateMesh = CreateMesh;
const CreateAnimation = (draw, rotation = gl_matrix_1.vec3.fromValues(0, 0, 0), isAnimation = true) => {
    function step() {
        if (isAnimation) {
            rotation[0] += 0.01;
            rotation[1] += 0.01;
            rotation[2] += 0.01;
        }
        else {
            rotation = [0, 0, 0];
        }
        draw();
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
};
exports.CreateAnimation = CreateAnimation;
const CreateTransforms = (modelMat, translation = [0, 0, 0], rotation = [0, 0, 0], scaling = [1, 1, 1]) => {
    const rotateXMat = gl_matrix_1.mat4.create();
    const rotateYMat = gl_matrix_1.mat4.create();
    const rotateZMat = gl_matrix_1.mat4.create();
    const translateMat = gl_matrix_1.mat4.create();
    const scaleMat = gl_matrix_1.mat4.create();
    //perform indivisual transformations
    gl_matrix_1.mat4.fromTranslation(translateMat, translation);
    gl_matrix_1.mat4.fromXRotation(rotateXMat, rotation[0]);
    gl_matrix_1.mat4.fromYRotation(rotateYMat, rotation[1]);
    gl_matrix_1.mat4.fromZRotation(rotateZMat, rotation[2]);
    gl_matrix_1.mat4.fromScaling(scaleMat, scaling);
    //combine all transformation matrices together to form a final transform matrix: modelMat
    gl_matrix_1.mat4.multiply(modelMat, rotateXMat, scaleMat);
    gl_matrix_1.mat4.multiply(modelMat, rotateYMat, modelMat);
    gl_matrix_1.mat4.multiply(modelMat, rotateZMat, modelMat);
    gl_matrix_1.mat4.multiply(modelMat, translateMat, modelMat);
};
exports.CreateTransforms = CreateTransforms;
const CreateViewProjection = (aspectRatio = 1.0, cameraPosition = [2, 2, 4], lookDirection = [0, 0, 0], upDirection = [0, 1, 0]) => {
    const viewMatrix = gl_matrix_1.mat4.create();
    const projectionMatrix = gl_matrix_1.mat4.create();
    const viewProjectionMatrix = gl_matrix_1.mat4.create();
    gl_matrix_1.mat4.perspective(projectionMatrix, 2 * Math.PI / 5, aspectRatio, 0.1, 1000.0);
    gl_matrix_1.mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    gl_matrix_1.mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
    const cameraOption = {
        eye: cameraPosition,
        center: lookDirection,
        zoomMax: 100,
        zoomSpeed: 2
    };
    return {
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
        cameraOption
    };
};
exports.CreateViewProjection = CreateViewProjection;
const CreateGPUBufferUint = (device, data, usageFlag = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};
exports.CreateGPUBufferUint = CreateGPUBufferUint;
const CreateGPUBuffer = (device, data, usageFlag = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};
exports.CreateGPUBuffer = CreateGPUBuffer;
const InitGPU = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const checkgpu = exports.CheckWebGPU();
    if (checkgpu.includes('Your current browser does not support WebGPU!')) {
        console.log(checkgpu);
        throw ('Your current browser does not support WebGPU!');
    }
    const canvas = document.getElementById('canvas-webgpu');
    const adapter = yield ((_a = navigator.gpu) === null || _a === void 0 ? void 0 : _a.requestAdapter());
    const device = yield (adapter === null || adapter === void 0 ? void 0 : adapter.requestDevice());
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        alphaMode: 'opaque'
    });
    return { device, canvas, format, context };
});
exports.InitGPU = InitGPU;
const CheckWebGPU = () => {
    let result = 'Great, your current browser supports WebGPU!';
    if (!navigator.gpu) {
        result = `Your current browser does not support WebGPU! Make sure you are on a system 
        with WebGPU enabled. Currently, WebGPU is supported in  
        <a href="https://www.google.com/chrome/canary/">Chrome canary</a>
        with the flag "enable-unsafe-webgpu" enabled. See the 
        <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"> 
        Implementation Status</a> page for more details.   
        You can also use your regular Chrome to try a pre-release version of WebGPU via
        <a href="https://developer.chrome.com/origintrials/#/view_trial/118219490218475521">Origin Trial</a>.                
        `;
    }
    const canvas = document.getElementById('canvas-webgpu');
    if (canvas) {
        const div = document.getElementsByClassName('item2')[0];
        if (div) {
            canvas.width = div.offsetWidth;
            canvas.height = div.offsetHeight;
            function windowResize() {
                canvas.width = div.offsetWidth;
                canvas.height = div.offsetHeight;
            }
            ;
            window.addEventListener('resize', windowResize);
        }
    }
    return result;
};
exports.CheckWebGPU = CheckWebGPU;


/***/ }),

/***/ "./src/loadData.ts":
/*!*************************!*\
  !*** ./src/loadData.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LoadData = void 0;
const gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
const atom_1 = __webpack_require__(/*! ./atom */ "./src/atom.ts");
const chain_1 = __webpack_require__(/*! ./chain */ "./src/chain.ts");
const residue_1 = __webpack_require__(/*! ./residue */ "./src/residue.ts");
const LoadData = (dataString) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = { x: 0, y: 0, z: 0 };
    let chains = [];
    let chain = new chain_1.Chain("-1", []);
    let residue = new residue_1.Residue("", -1, []);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineParseResult = ParseDataLine(line);
        if (lineParseResult == null) {
            continue;
        }
        if (residue.id != lineParseResult.residueId) {
            if (residue.id != -1) {
                if (chain.name != lineParseResult.chainName) {
                    if (chain.name != "-1") {
                        chains.push(chain);
                    }
                    chain = new chain_1.Chain(lineParseResult.chainName, []);
                }
                chain.residues.push(residue);
            }
            residue = new residue_1.Residue(lineParseResult.residueName, lineParseResult.residueId, []);
        }
        residue.atoms.push(lineParseResult.atom);
        sums.x += lineParseResult.atom.x;
        sums.y += lineParseResult.atom.y;
        sums.z += lineParseResult.atom.z;
        atoms.push(lineParseResult.atom);
    }
    if (residue.id != -1) {
        chain.residues.push(residue);
    }
    if (chain.name != "-1") {
        chains.push(chain);
    }
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x -= sums.x / atoms.length;
        atoms[i].y -= sums.y / atoms.length;
        atoms[i].z -= sums.z / atoms.length;
    }
    return { atoms: atoms, chains: chains };
};
exports.LoadData = LoadData;
const ParseDataLine = (line) => {
    let match = line.match(/ATOM +\d+ +(\w+) +(\w+) +(\w+) +(\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(\w)/);
    if (match == null) {
        return null;
    }
    const residueAtomName = match[1];
    const residueName = match[2];
    const chainName = match[3];
    const residueId = parseInt(match[4]);
    const atomName = match[10];
    const position = gl_matrix_1.vec3.fromValues(parseFloat(match[5]), parseFloat(match[6]), parseFloat(match[7]));
    const atom = new atom_1.Atom(position[0], position[1], position[2], atomName, residueAtomName);
    return { residueAtomName, residueName, chainName, residueId, atomName, position, atom };
};


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const helper_1 = __webpack_require__(/*! ./helper */ "./src/helper.ts");
const shader_wgsl_1 = __importDefault(__webpack_require__(/*! ./shader.wgsl */ "./src/shader.wgsl"));
__webpack_require__(/*! ./site.css */ "./src/site.css");
const gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
const jquery_1 = __importDefault(__webpack_require__(/*! jquery */ "./node_modules/jquery/dist/jquery.js"));
const createCamera = __webpack_require__(/*! 3d-view-controls */ "./node_modules/3d-view-controls/camera.js");
const Create3DObject = (isAnimation = true) => __awaiter(void 0, void 0, void 0, function* () {
    const gpu = yield helper_1.InitGPU();
    const device = gpu.device;
    // create vertex buffers
    const cubeData = helper_1.CreateMesh();
    const numberOfVertices = cubeData.positions.length / 3;
    const vertexBuffer = helper_1.CreateGPUBuffer(device, cubeData.positions);
    const colorBuffer = helper_1.CreateGPUBuffer(device, cubeData.colors);
    let percentageShown = 1;
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: shader_wgsl_1.default
            }),
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 4 * 3,
                    attributes: [{
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0
                        }]
                },
                {
                    arrayStride: 4 * 3,
                    attributes: [{
                            shaderLocation: 1,
                            format: "float32x3",
                            offset: 0
                        }]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({
                code: shader_wgsl_1.default
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: gpu.format
                }
            ]
        },
        primitive: {
            topology: "triangle-list",
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    // create uniform data
    const modelMatrix = gl_matrix_1.mat4.create();
    const mvpMatrix = gl_matrix_1.mat4.create();
    let vMatrix = gl_matrix_1.mat4.create();
    let vpMatrix = gl_matrix_1.mat4.create();
    const vp = helper_1.CreateViewProjection(gpu.canvas.width / gpu.canvas.height, [0, 5, 45]);
    vpMatrix = vp.viewProjectionMatrix;
    // add rotation and camera:
    let rotation = gl_matrix_1.vec3.fromValues(0, 0, 0);
    var camera = createCamera(gpu.canvas, vp.cameraOption);
    // create uniform buffer and layout
    const uniformBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: 0,
                    size: 64
                }
            }]
    });
    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const renderPassDescription = {
        colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
                loadValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: "store",
        }
    };
    function draw() {
        if (!isAnimation) {
            if (camera.tick()) {
                const pMatrix = vp.projectionMatrix;
                vMatrix = camera.matrix;
                gl_matrix_1.mat4.multiply(vpMatrix, pMatrix, vMatrix);
            }
        }
        helper_1.CreateTransforms(modelMatrix, [0, 0, 0], rotation);
        gl_matrix_1.mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
        device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix);
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(renderPassDescription);
        let numberOfVerticesToDraw = Math.round(numberOfVertices * percentageShown) - Math.round(numberOfVertices * percentageShown) % 3;
        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, colorBuffer);
        renderPass.setBindGroup(0, uniformBindGroup);
        //renderPass.draw(numberOfVertices);
        renderPass.draw(numberOfVerticesToDraw);
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
    let sliderPercentageShown = document.getElementById("sliderPercentageShown");
    sliderPercentageShown.oninput = (e) => {
        percentageShown = parseFloat(sliderPercentageShown.value) / 100;
    };
    helper_1.CreateAnimation(draw, rotation, isAnimation);
});
let is_animation = false;
Create3DObject(is_animation);
jquery_1.default('#id-radio input:radio').on('click', function () {
    let val = jquery_1.default('input[name="options"]:checked').val();
    is_animation = val === 'animation' ? true : false;
    Create3DObject(is_animation);
});
window.addEventListener('resize', function () {
    Create3DObject(is_animation);
});


/***/ }),

/***/ "./src/meshHelpers.ts":
/*!****************************!*\
  !*** ./src/meshHelpers.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateSphereGeometry = exports.CubeData = void 0;
const CubeData = () => {
    const positions = new Float32Array([
        // front
        -1, -1, 1,
        1, -1, 1,
        1, 1, 1,
        1, 1, 1,
        -1, 1, 1,
        -1, -1, 1,
        // right
        1, -1, 1,
        1, -1, -1,
        1, 1, -1,
        1, 1, -1,
        1, 1, 1,
        1, -1, 1,
        // back
        -1, -1, -1,
        -1, 1, -1,
        1, 1, -1,
        1, 1, -1,
        1, -1, -1,
        -1, -1, -1,
        // left
        -1, -1, 1,
        -1, 1, 1,
        -1, 1, -1,
        -1, 1, -1,
        -1, -1, -1,
        -1, -1, 1,
        // top
        -1, 1, 1,
        1, 1, 1,
        1, 1, -1,
        1, 1, -1,
        -1, 1, -1,
        -1, 1, 1,
        // bottom
        -1, -1, 1,
        -1, -1, -1,
        1, -1, -1,
        1, -1, -1,
        1, -1, 1,
        -1, -1, 1
    ]);
    const colors = new Float32Array([
        // front - blue
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        // right - red
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        //back - yellow
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        //left - aqua
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        // top - green
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        // bottom - fuchsia
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1
    ]);
    return {
        positions,
        colors
    };
};
exports.CubeData = CubeData;
// https://www.songho.ca/opengl/gl_sphere.html
const CreateSphereGeometry = (radius, sectorCount, stackCount) => {
    let x, y, z, xy; // vertex position
    let nx, ny, nz, lengthInv = 1.0 / radius; // vertex normal
    let s, t; // vertex texCoord
    let sectorStep = 2 * Math.PI / sectorCount;
    let stackStep = Math.PI / stackCount;
    let sectorAngle, stackAngle;
    let vertices = [];
    for (let i = 0; i <= stackCount; i++) {
        stackAngle = Math.PI / 2 - i * stackStep; // starting from pi/2 to -pi/2
        xy = radius * Math.cos(stackAngle); // r * cos(u)
        z = radius * Math.sin(stackAngle); // r * sin(u)
        // add (sectorCount+1) vertices per stack
        // the first and last vertices have same position and normal, but different tex coords
        for (let j = 0; j <= sectorCount; ++j) {
            sectorAngle = j * sectorStep; // starting from 0 to 2pi
            // vertex position (x, y, z)
            x = xy * Math.cos(sectorAngle); // r * cos(u) * cos(v)
            y = xy * Math.sin(sectorAngle); // r * cos(u) * sin(v)
            vertices.push(x);
            vertices.push(y);
            vertices.push(z);
            /*// normalized vertex normal (nx, ny, nz)
            nx = x * lengthInv;
            ny = y * lengthInv;
            nz = z * lengthInv;
            normals.push_back(nx);
            normals.push_back(ny);
            normals.push_back(nz);

            // vertex tex coord (s, t) range between [0, 1]
            s = (float)j / sectorCount;
            t = (float)i / stackCount;
            texCoords.push_back(s);
            texCoords.push_back(t);*/
        }
    }
    let indices = [];
    let k1, k2;
    for (let i = 0; i < stackCount; ++i) {
        k1 = i * (sectorCount + 1); // beginning of current stack
        k2 = k1 + sectorCount + 1; // beginning of next stack
        for (let j = 0; j < sectorCount; ++j, ++k1, ++k2) {
            // 2 triangles per sector excluding first and last stacks
            // k1 => k2 => k1+1
            if (i != 0) {
                indices.push(k1);
                indices.push(k2);
                indices.push(k1 + 1);
            }
            // k1+1 => k2 => k2+1
            if (i != (stackCount - 1)) {
                indices.push(k1 + 1);
                indices.push(k2);
                indices.push(k2 + 1);
            }
        }
    }
    let resultPositions = new Float32Array(indices.length * 3);
    for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        resultPositions[i * 3] = vertices[index * 3];
        resultPositions[i * 3 + 1] = vertices[index * 3 + 1];
        resultPositions[i * 3 + 2] = vertices[index * 3 + 2];
    }
    return { positions: resultPositions, colors: new Float32Array(resultPositions.length).map((v) => 1) };
};
exports.CreateSphereGeometry = CreateSphereGeometry;


/***/ }),

/***/ "./src/residue.ts":
/*!************************!*\
  !*** ./src/residue.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Residue = void 0;
class Residue {
    constructor(name, id, atoms) {
        this.name = name;
        this.id = id;
        this.atoms = atoms;
    }
}
exports.Residue = Residue;


/***/ }),

/***/ "./src/shader.wgsl":
/*!*************************!*\
  !*** ./src/shader.wgsl ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// vertex shader\n\nstruct Uniforms {\n    mvpMatrix : mat4x4<f32>,\n};\n@binding(0) @group(0) var<uniform> uniforms : Uniforms;\n\nstruct Output {\n    @builtin(position) Position : vec4<f32>,\n    @location(0) vColor : vec4<f32>,\n};\n\n@vertex\nfn vs_main(@location(0) pos: vec4<f32>, @location(1) color: vec4<f32>) -> Output {\n    var output: Output;\n    output.Position = uniforms.mvpMatrix * pos;\n    output.vColor = color;\n    return output;\n}\n\n// fragment shader\n\n @fragment\nfn fs_main(@location(0) vColor: vec4<f32>) -> @location(0) vec4<f32> {\n    return vColor;\n}");

/***/ }),

/***/ "./node_modules/turntable-camera-controller/turntable.js":
/*!***************************************************************!*\
  !*** ./node_modules/turntable-camera-controller/turntable.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = createTurntableController

var filterVector = __webpack_require__(/*! filtered-vector */ "./node_modules/filtered-vector/fvec.js")
var invert44     = __webpack_require__(/*! gl-mat4/invert */ "./node_modules/gl-mat4/invert.js")
var rotateM      = __webpack_require__(/*! gl-mat4/rotate */ "./node_modules/gl-mat4/rotate.js")
var cross        = __webpack_require__(/*! gl-vec3/cross */ "./node_modules/gl-vec3/cross.js")
var normalize3   = __webpack_require__(/*! gl-vec3/normalize */ "./node_modules/gl-vec3/normalize.js")
var dot3         = __webpack_require__(/*! gl-vec3/dot */ "./node_modules/gl-vec3/dot.js")

function len3(x, y, z) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2))
}

function clamp1(x) {
  return Math.min(1.0, Math.max(-1.0, x))
}

function findOrthoPair(v) {
  var vx = Math.abs(v[0])
  var vy = Math.abs(v[1])
  var vz = Math.abs(v[2])

  var u = [0,0,0]
  if(vx > Math.max(vy, vz)) {
    u[2] = 1
  } else if(vy > Math.max(vx, vz)) {
    u[0] = 1
  } else {
    u[1] = 1
  }

  var vv = 0
  var uv = 0
  for(var i=0; i<3; ++i ) {
    vv += v[i] * v[i]
    uv += u[i] * v[i]
  }
  for(var i=0; i<3; ++i) {
    u[i] -= (uv / vv) *  v[i]
  }
  normalize3(u, u)
  return u
}

function TurntableController(zoomMin, zoomMax, center, up, right, radius, theta, phi) {
  this.center = filterVector(center)
  this.up     = filterVector(up)
  this.right  = filterVector(right)
  this.radius = filterVector([radius])
  this.angle  = filterVector([theta, phi])
  this.angle.bounds = [[-Infinity,-Math.PI/2], [Infinity,Math.PI/2]]
  this.setDistanceLimits(zoomMin, zoomMax)

  this.computedCenter = this.center.curve(0)
  this.computedUp     = this.up.curve(0)
  this.computedRight  = this.right.curve(0)
  this.computedRadius = this.radius.curve(0)
  this.computedAngle  = this.angle.curve(0)
  this.computedToward = [0,0,0]
  this.computedEye    = [0,0,0]
  this.computedMatrix = new Array(16)
  for(var i=0; i<16; ++i) {
    this.computedMatrix[i] = 0.5
  }

  this.recalcMatrix(0)
}

var proto = TurntableController.prototype

proto.setDistanceLimits = function(minDist, maxDist) {
  if(minDist > 0) {
    minDist = Math.log(minDist)
  } else {
    minDist = -Infinity
  }
  if(maxDist > 0) {
    maxDist = Math.log(maxDist)
  } else {
    maxDist = Infinity
  }
  maxDist = Math.max(maxDist, minDist)
  this.radius.bounds[0][0] = minDist
  this.radius.bounds[1][0] = maxDist
}

proto.getDistanceLimits = function(out) {
  var bounds = this.radius.bounds[0]
  if(out) {
    out[0] = Math.exp(bounds[0][0])
    out[1] = Math.exp(bounds[1][0])
    return out
  }
  return [ Math.exp(bounds[0][0]), Math.exp(bounds[1][0]) ]
}

proto.recalcMatrix = function(t) {
  //Recompute curves
  this.center.curve(t)
  this.up.curve(t)
  this.right.curve(t)
  this.radius.curve(t)
  this.angle.curve(t)

  //Compute frame for camera matrix
  var up     = this.computedUp
  var right  = this.computedRight
  var uu = 0.0
  var ur = 0.0
  for(var i=0; i<3; ++i) {
    ur += up[i] * right[i]
    uu += up[i] * up[i]
  }
  var ul = Math.sqrt(uu)
  var rr = 0.0
  for(var i=0; i<3; ++i) {
    right[i] -= up[i] * ur / uu
    rr       += right[i] * right[i]
    up[i]    /= ul
  }
  var rl = Math.sqrt(rr)
  for(var i=0; i<3; ++i) {
    right[i] /= rl
  }

  //Compute toward vector
  var toward = this.computedToward
  cross(toward, up, right)
  normalize3(toward, toward)

  //Compute angular parameters
  var radius = Math.exp(this.computedRadius[0])
  var theta  = this.computedAngle[0]
  var phi    = this.computedAngle[1]

  var ctheta = Math.cos(theta)
  var stheta = Math.sin(theta)
  var cphi   = Math.cos(phi)
  var sphi   = Math.sin(phi)

  var center = this.computedCenter

  var wx = ctheta * cphi 
  var wy = stheta * cphi
  var wz = sphi

  var sx = -ctheta * sphi
  var sy = -stheta * sphi
  var sz = cphi

  var eye = this.computedEye
  var mat = this.computedMatrix
  for(var i=0; i<3; ++i) {
    var x      = wx * right[i] + wy * toward[i] + wz * up[i]
    mat[4*i+1] = sx * right[i] + sy * toward[i] + sz * up[i]
    mat[4*i+2] = x
    mat[4*i+3] = 0.0
  }

  var ax = mat[1]
  var ay = mat[5]
  var az = mat[9]
  var bx = mat[2]
  var by = mat[6]
  var bz = mat[10]
  var cx = ay * bz - az * by
  var cy = az * bx - ax * bz
  var cz = ax * by - ay * bx
  var cl = len3(cx, cy, cz)
  cx /= cl
  cy /= cl
  cz /= cl
  mat[0] = cx
  mat[4] = cy
  mat[8] = cz

  for(var i=0; i<3; ++i) {
    eye[i] = center[i] + mat[2+4*i]*radius
  }

  for(var i=0; i<3; ++i) {
    var rr = 0.0
    for(var j=0; j<3; ++j) {
      rr += mat[i+4*j] * eye[j]
    }
    mat[12+i] = -rr
  }
  mat[15] = 1.0
}

proto.getMatrix = function(t, result) {
  this.recalcMatrix(t)
  var mat = this.computedMatrix
  if(result) {
    for(var i=0; i<16; ++i) {
      result[i] = mat[i]
    }
    return result
  }
  return mat
}

var zAxis = [0,0,0]
proto.rotate = function(t, dtheta, dphi, droll) {
  this.angle.move(t, dtheta, dphi)
  if(droll) {
    this.recalcMatrix(t)

    var mat = this.computedMatrix
    zAxis[0] = mat[2]
    zAxis[1] = mat[6]
    zAxis[2] = mat[10]

    var up     = this.computedUp
    var right  = this.computedRight
    var toward = this.computedToward

    for(var i=0; i<3; ++i) {
      mat[4*i]   = up[i]
      mat[4*i+1] = right[i]
      mat[4*i+2] = toward[i]
    }
    rotateM(mat, mat, droll, zAxis)
    for(var i=0; i<3; ++i) {
      up[i] =    mat[4*i]
      right[i] = mat[4*i+1]
    }

    this.up.set(t, up[0], up[1], up[2])
    this.right.set(t, right[0], right[1], right[2])
  }
}

proto.pan = function(t, dx, dy, dz) {
  dx = dx || 0.0
  dy = dy || 0.0
  dz = dz || 0.0

  this.recalcMatrix(t)
  var mat = this.computedMatrix

  var dist = Math.exp(this.computedRadius[0])

  var ux = mat[1]
  var uy = mat[5]
  var uz = mat[9]
  var ul = len3(ux, uy, uz)
  ux /= ul
  uy /= ul
  uz /= ul

  var rx = mat[0]
  var ry = mat[4]
  var rz = mat[8]
  var ru = rx * ux + ry * uy + rz * uz
  rx -= ux * ru
  ry -= uy * ru
  rz -= uz * ru
  var rl = len3(rx, ry, rz)
  rx /= rl
  ry /= rl
  rz /= rl

  var vx = rx * dx + ux * dy
  var vy = ry * dx + uy * dy
  var vz = rz * dx + uz * dy
  this.center.move(t, vx, vy, vz)

  //Update z-component of radius
  var radius = Math.exp(this.computedRadius[0])
  radius = Math.max(1e-4, radius + dz)
  this.radius.set(t, Math.log(radius))
}

proto.translate = function(t, dx, dy, dz) {
  this.center.move(t,
    dx||0.0,
    dy||0.0,
    dz||0.0)
}

//Recenters the coordinate axes
proto.setMatrix = function(t, mat, axes, noSnap) {
  
  //Get the axes for tare
  var ushift = 1
  if(typeof axes === 'number') {
    ushift = (axes)|0
  } 
  if(ushift < 0 || ushift > 3) {
    ushift = 1
  }
  var vshift = (ushift + 2) % 3
  var fshift = (ushift + 1) % 3

  //Recompute state for new t value
  if(!mat) { 
    this.recalcMatrix(t)
    mat = this.computedMatrix
  }

  //Get right and up vectors
  var ux = mat[ushift]
  var uy = mat[ushift+4]
  var uz = mat[ushift+8]
  if(!noSnap) {
    var ul = len3(ux, uy, uz)
    ux /= ul
    uy /= ul
    uz /= ul
  } else {
    var ax = Math.abs(ux)
    var ay = Math.abs(uy)
    var az = Math.abs(uz)
    var am = Math.max(ax,ay,az)
    if(ax === am) {
      ux = (ux < 0) ? -1 : 1
      uy = uz = 0
    } else if(az === am) {
      uz = (uz < 0) ? -1 : 1
      ux = uy = 0
    } else {
      uy = (uy < 0) ? -1 : 1
      ux = uz = 0
    }
  }

  var rx = mat[vshift]
  var ry = mat[vshift+4]
  var rz = mat[vshift+8]
  var ru = rx * ux + ry * uy + rz * uz
  rx -= ux * ru
  ry -= uy * ru
  rz -= uz * ru
  var rl = len3(rx, ry, rz)
  rx /= rl
  ry /= rl
  rz /= rl
  
  var fx = uy * rz - uz * ry
  var fy = uz * rx - ux * rz
  var fz = ux * ry - uy * rx
  var fl = len3(fx, fy, fz)
  fx /= fl
  fy /= fl
  fz /= fl

  this.center.jump(t, ex, ey, ez)
  this.radius.idle(t)
  this.up.jump(t, ux, uy, uz)
  this.right.jump(t, rx, ry, rz)

  var phi, theta
  if(ushift === 2) {
    var cx = mat[1]
    var cy = mat[5]
    var cz = mat[9]
    var cr = cx * rx + cy * ry + cz * rz
    var cf = cx * fx + cy * fy + cz * fz
    if(tu < 0) {
      phi = -Math.PI/2
    } else {
      phi = Math.PI/2
    }
    theta = Math.atan2(cf, cr)
  } else {
    var tx = mat[2]
    var ty = mat[6]
    var tz = mat[10]
    var tu = tx * ux + ty * uy + tz * uz
    var tr = tx * rx + ty * ry + tz * rz
    var tf = tx * fx + ty * fy + tz * fz

    phi = Math.asin(clamp1(tu))
    theta = Math.atan2(tf, tr)
  }

  this.angle.jump(t, theta, phi)

  this.recalcMatrix(t)
  var dx = mat[2]
  var dy = mat[6]
  var dz = mat[10]

  var imat = this.computedMatrix
  invert44(imat, mat)
  var w  = imat[15]
  var ex = imat[12] / w
  var ey = imat[13] / w
  var ez = imat[14] / w

  var gs = Math.exp(this.computedRadius[0])
  this.center.jump(t, ex-dx*gs, ey-dy*gs, ez-dz*gs)
}

proto.lastT = function() {
  return Math.max(
    this.center.lastT(),
    this.up.lastT(),
    this.right.lastT(),
    this.radius.lastT(),
    this.angle.lastT())
}

proto.idle = function(t) {
  this.center.idle(t)
  this.up.idle(t)
  this.right.idle(t)
  this.radius.idle(t)
  this.angle.idle(t)
}

proto.flush = function(t) {
  this.center.flush(t)
  this.up.flush(t)
  this.right.flush(t)
  this.radius.flush(t)
  this.angle.flush(t)
}

proto.setDistance = function(t, d) {
  if(d > 0) {
    this.radius.set(t, Math.log(d))
  }
}

proto.lookAt = function(t, eye, center, up) {
  this.recalcMatrix(t)

  eye    = eye    || this.computedEye
  center = center || this.computedCenter
  up     = up     || this.computedUp

  var ux = up[0]
  var uy = up[1]
  var uz = up[2]
  var ul = len3(ux, uy, uz)
  if(ul < 1e-6) {
    return
  }
  ux /= ul
  uy /= ul
  uz /= ul

  var tx = eye[0] - center[0]
  var ty = eye[1] - center[1]
  var tz = eye[2] - center[2]
  var tl = len3(tx, ty, tz)
  if(tl < 1e-6) {
    return
  }
  tx /= tl
  ty /= tl
  tz /= tl

  var right = this.computedRight
  var rx = right[0]
  var ry = right[1]
  var rz = right[2]
  var ru = ux*rx + uy*ry + uz*rz
  rx -= ru * ux
  ry -= ru * uy
  rz -= ru * uz
  var rl = len3(rx, ry, rz)

  if(rl < 0.01) {
    rx = uy * tz - uz * ty
    ry = uz * tx - ux * tz
    rz = ux * ty - uy * tx
    rl = len3(rx, ry, rz)
    if(rl < 1e-6) {
      return
    }
  }
  rx /= rl
  ry /= rl
  rz /= rl

  this.up.set(t, ux, uy, uz)
  this.right.set(t, rx, ry, rz)
  this.center.set(t, center[0], center[1], center[2])
  this.radius.set(t, Math.log(tl))

  var fx = uy * rz - uz * ry
  var fy = uz * rx - ux * rz
  var fz = ux * ry - uy * rx
  var fl = len3(fx, fy, fz)
  fx /= fl
  fy /= fl
  fz /= fl

  var tu = ux*tx + uy*ty + uz*tz
  var tr = rx*tx + ry*ty + rz*tz
  var tf = fx*tx + fy*ty + fz*tz

  var phi   = Math.asin(clamp1(tu))
  var theta = Math.atan2(tf, tr)

  var angleState = this.angle._state
  var lastTheta  = angleState[angleState.length-1]
  var lastPhi    = angleState[angleState.length-2]
  lastTheta      = lastTheta % (2.0 * Math.PI)
  var dp = Math.abs(lastTheta + 2.0 * Math.PI - theta)
  var d0 = Math.abs(lastTheta - theta)
  var dn = Math.abs(lastTheta - 2.0 * Math.PI - theta)
  if(dp < d0) {
    lastTheta += 2.0 * Math.PI
  }
  if(dn < d0) {
    lastTheta -= 2.0 * Math.PI
  }

  this.angle.jump(this.angle.lastT(), lastTheta, lastPhi)
  this.angle.set(t, theta, phi)
}

function createTurntableController(options) {
  options = options || {}

  var center = options.center || [0,0,0]
  var up     = options.up     || [0,1,0]
  var right  = options.right  || findOrthoPair(up)
  var radius = options.radius || 1.0
  var theta  = options.theta  || 0.0
  var phi    = options.phi    || 0.0

  center = [].slice.call(center, 0, 3)

  up = [].slice.call(up, 0, 3)
  normalize3(up, up)

  right = [].slice.call(right, 0, 3)
  normalize3(right, right)

  if('eye' in options) {
    var eye = options.eye
    var toward = [
      eye[0]-center[0],
      eye[1]-center[1],
      eye[2]-center[2]
    ]
    cross(right, toward, up)
    if(len3(right[0], right[1], right[2]) < 1e-6) {
      right = findOrthoPair(up)
    } else {
      normalize3(right, right)
    }

    radius = len3(toward[0], toward[1], toward[2])

    var ut = dot3(up, toward) / radius
    var rt = dot3(right, toward) / radius
    phi    = Math.acos(ut)
    theta  = Math.acos(rt)
  }

  //Use logarithmic coordinates for radius
  radius = Math.log(radius)

  //Return the controller
  return new TurntableController(
    options.zoomMin,
    options.zoomMax,
    center,
    up,
    right,
    radius,
    theta,
    phi)
}

/***/ }),

/***/ "./src/data/atomCovalentRadii.xml":
/*!****************************************!*\
  !*** ./src/data/atomCovalentRadii.xml ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<!--\r\n    Document   : elementCovalentRadii.xml\r\n    Description: List of known elements' covalent radii.\r\n-->\r\n<root>\r\n    <covalent id=\"1\" radius=\"0.23\"/>\r\n    <covalent id=\"2\" radius=\"1.50\"/>\r\n    <covalent id=\"3\" radius=\"1.28\"/>\r\n    <covalent id=\"4\" radius=\"0.96\"/>\r\n    <covalent id=\"5\" radius=\"0.83\"/>\r\n    <covalent id=\"6\" radius=\"0.68\"/>\r\n    <covalent id=\"7\" radius=\"0.68\"/>\r\n    <covalent id=\"8\" radius=\"0.68\"/>\r\n    <covalent id=\"9\" radius=\"0.64\"/>\r\n    <covalent id=\"10\" radius=\"1.50\"/>\r\n    <covalent id=\"11\" radius=\"1.66\"/>\r\n    <covalent id=\"12\" radius=\"1.41\"/>\r\n    <covalent id=\"13\" radius=\"1.21\"/>\r\n    <covalent id=\"14\" radius=\"1.20\"/>\r\n    <covalent id=\"15\" radius=\"1.05\"/>\r\n    <covalent id=\"16\" radius=\"1.02\"/>\r\n    <covalent id=\"17\" radius=\"0.99\"/>\r\n    <covalent id=\"18\" radius=\"1.51\"/>\r\n    <covalent id=\"19\" radius=\"2.03\"/>\r\n    <covalent id=\"20\" radius=\"1.76\"/>\r\n    <covalent id=\"21\" radius=\"1.70\"/>\r\n    <covalent id=\"22\" radius=\"1.60\"/>\r\n    <covalent id=\"23\" radius=\"1.53\"/>\r\n    <covalent id=\"24\" radius=\"1.39\"/>\r\n    <covalent id=\"25\" radius=\"1.61\"/>\r\n    <covalent id=\"26\" radius=\"1.52\"/>\r\n    <covalent id=\"27\" radius=\"1.26\"/>\r\n    <covalent id=\"28\" radius=\"1.24\"/>\r\n    <covalent id=\"29\" radius=\"1.32\"/>\r\n    <covalent id=\"30\" radius=\"1.22\"/>\r\n    <covalent id=\"31\" radius=\"1.22\"/>\r\n    <covalent id=\"32\" radius=\"1.17\"/>\r\n    <covalent id=\"33\" radius=\"1.21\"/>\r\n    <covalent id=\"34\" radius=\"1.22\"/>\r\n    <covalent id=\"35\" radius=\"1.21\"/>\r\n    <covalent id=\"36\" radius=\"1.50\"/>\r\n    <covalent id=\"37\" radius=\"2.20\"/>\r\n    <covalent id=\"38\" radius=\"1.95\"/>\r\n    <covalent id=\"39\" radius=\"1.90\"/>\r\n    <covalent id=\"40\" radius=\"1.75\"/>\r\n    <covalent id=\"41\" radius=\"1.64\"/>\r\n    <covalent id=\"42\" radius=\"1.54\"/>\r\n    <covalent id=\"43\" radius=\"1.47\"/>\r\n    <covalent id=\"44\" radius=\"1.46\"/>\r\n    <covalent id=\"45\" radius=\"1.45\"/>\r\n    <covalent id=\"46\" radius=\"1.39\"/>\r\n    <covalent id=\"47\" radius=\"1.45\"/>\r\n    <covalent id=\"48\" radius=\"1.44\"/>\r\n    <covalent id=\"49\" radius=\"1.42\"/>\r\n    <covalent id=\"50\" radius=\"1.39\"/>\r\n    <covalent id=\"51\" radius=\"1.39\"/>\r\n    <covalent id=\"52\" radius=\"1.47\"/>\r\n    <covalent id=\"53\" radius=\"1.40\"/>\r\n    <covalent id=\"54\" radius=\"1.50\"/>\r\n    <covalent id=\"55\" radius=\"2.44\"/>\r\n    <covalent id=\"56\" radius=\"2.15\"/>\r\n    <covalent id=\"57\" radius=\"2.07\"/>\r\n    <covalent id=\"58\" radius=\"2.04\"/>\r\n    <covalent id=\"59\" radius=\"2.03\"/>\r\n    <covalent id=\"60\" radius=\"2.01\"/>\r\n    <covalent id=\"61\" radius=\"1.99\"/>\r\n    <covalent id=\"62\" radius=\"1.98\"/>\r\n    <covalent id=\"63\" radius=\"1.98\"/>\r\n    <covalent id=\"64\" radius=\"1.96\"/>\r\n    <covalent id=\"65\" radius=\"1.94\"/>\r\n    <covalent id=\"66\" radius=\"1.92\"/>\r\n    <covalent id=\"67\" radius=\"1.92\"/>\r\n    <covalent id=\"68\" radius=\"1.89\"/>\r\n    <covalent id=\"69\" radius=\"1.90\"/>\r\n    <covalent id=\"70\" radius=\"1.87\"/>\r\n    <covalent id=\"71\" radius=\"1.87\"/>\r\n    <covalent id=\"72\" radius=\"1.75\"/>\r\n    <covalent id=\"73\" radius=\"1.70\"/>\r\n    <covalent id=\"74\" radius=\"1.62\"/>\r\n    <covalent id=\"75\" radius=\"1.51\"/>\r\n    <covalent id=\"76\" radius=\"1.44\"/>\r\n    <covalent id=\"77\" radius=\"1.41\"/>\r\n    <covalent id=\"78\" radius=\"1.36\"/>\r\n    <covalent id=\"79\" radius=\"1.50\"/>\r\n    <covalent id=\"80\" radius=\"1.32\"/>\r\n    <covalent id=\"81\" radius=\"1.45\"/>\r\n    <covalent id=\"82\" radius=\"1.46\"/>\r\n    <covalent id=\"83\" radius=\"1.48\"/>\r\n    <covalent id=\"84\" radius=\"1.40\"/>\r\n    <covalent id=\"85\" radius=\"1.21\"/>\r\n    <covalent id=\"86\" radius=\"1.50\"/>\r\n    <covalent id=\"87\" radius=\"2.60\"/>\r\n    <covalent id=\"88\" radius=\"2.21\"/>\r\n    <covalent id=\"89\" radius=\"2.15\"/>\r\n    <covalent id=\"90\" radius=\"2.06\"/>\r\n    <covalent id=\"91\" radius=\"2.00\"/>\r\n    <covalent id=\"92\" radius=\"1.96\"/>\r\n    <covalent id=\"93\" radius=\"1.90\"/>\r\n    <covalent id=\"94\" radius=\"1.87\"/>\r\n    <covalent id=\"95\" radius=\"1.80\"/>\r\n    <covalent id=\"96\" radius=\"1.69\"/>\r\n    <covalent id=\"97\" radius=\"1.54\"/>\r\n    <covalent id=\"98\" radius=\"1.83\"/>\r\n    <covalent id=\"99\" radius=\"1.50\"/>\r\n    <covalent id=\"100\" radius=\"1.50\"/>\r\n    <covalent id=\"101\" radius=\"1.50\"/>\r\n    <covalent id=\"102\" radius=\"1.50\"/>\r\n    <covalent id=\"103\" radius=\"1.50\"/>\r\n    <covalent id=\"104\" radius=\"1.50\"/>\r\n    <covalent id=\"105\" radius=\"1.50\"/>\r\n    <covalent id=\"106\" radius=\"1.50\"/>\r\n    <covalent id=\"107\" radius=\"1.50\"/>\r\n    <covalent id=\"108\" radius=\"1.50\"/>\r\n    <covalent id=\"109\" radius=\"1.50\"/>\r\n    <covalent id=\"110\" radius=\"1.50\"/>\r\n    <covalent id=\"111\" radius=\"1.50\"/>\r\n    <covalent id=\"112\" radius=\"1.50\"/>\r\n    <covalent id=\"113\" radius=\"0.23\"/>\r\n    <covalent id=\"114\" radius=\"0.68\"/>\r\n    <covalent id=\"115\" radius=\"0.23\"/>\r\n</root>\r\n";

/***/ }),

/***/ "./src/data/atomTypes.xml":
/*!********************************!*\
  !*** ./src/data/atomTypes.xml ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<!--\r\n    Document   : elementTypes.xml\r\n    Description: List of known element types (periodic table of elements).\r\n-->\r\n<root>\r\n    <atom identifier=\"H\" name=\"Hydrogen\" number=\"1\" electronegativity=\"2.00\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"He\" name=\"Helium\" number=\"2\" electronegativity=\"0\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"Li\" name=\"Lithium\" number=\"3\" electronegativity=\"0.98\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Be\" name=\"Beryllium\" number=\"4\" electronegativity=\"1.57\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"B\" name=\"Boron\" number=\"5\" electronegativity=\"2.04\" valenceElectrons=\"3\"/>\r\n    <atom identifier=\"C\" name=\"Carbon\" number=\"6\" electronegativity=\"2.55\" valenceElectrons=\"4\"/>\r\n    <atom identifier=\"N\" name=\"Nitrogen\" number=\"7\" electronegativity=\"3.04\" valenceElectrons=\"5\"/>\r\n    <atom identifier=\"O\" name=\"Oxygen\" number=\"8\" electronegativity=\"3.44\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"F\" name=\"Fluorine\" number=\"9\" electronegativity=\"3.98\" valenceElectrons=\"7\"/>\r\n    <atom identifier=\"Ne\" name=\"Neon\" number=\"10\" electronegativity=\"0\" valenceElectrons=\"8\"/>\r\n    <atom identifier=\"Na\" name=\"Sodium\" number=\"11\" electronegativity=\"0.93\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Mg\" name=\"Magnesium\" number=\"12\" electronegativity=\"1.31\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"Al\" name=\"Aluminium\" number=\"13\" electronegativity=\"1.61\" valenceElectrons=\"3\"/>\r\n    <atom identifier=\"Si\" name=\"Silicon\" number=\"14\" electronegativity=\"1.90\" valenceElectrons=\"4\"/>\r\n    <atom identifier=\"P\" name=\"Phosphorus\" number=\"15\" electronegativity=\"2.19\" valenceElectrons=\"5\"/>\r\n    <atom identifier=\"S\" name=\"Sulfur\" number=\"16\" electronegativity=\"2.58\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"Cl\" name=\"Chlorine\" number=\"17\" electronegativity=\"3.16\" valenceElectrons=\"7\"/>\r\n    <atom identifier=\"Ar\" name=\"Argon\" number=\"18\" electronegativity=\"0\" valenceElectrons=\"8\"/>\r\n    <atom identifier=\"K\" name=\"Potassium\" number=\"19\" electronegativity=\"0.82\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Ca\" name=\"Calcium\" number=\"20\" electronegativity=\"1.00\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"Sc\" name=\"Scandium\" number=\"21\" electronegativity=\"1.36\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ti\" name=\"Titanium\" number=\"22\" electronegativity=\"1.54\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"V\" name=\"Vanadium\" number=\"23\" electronegativity=\"1.63\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cr\" name=\"Chromium\" number=\"24\" electronegativity=\"1.66\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Mn\" name=\"Manganese\" number=\"25\" electronegativity=\"1.55\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Fe\" name=\"Iron\" number=\"26\" electronegativity=\"1.83\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Co\" name=\"Cobalt\" number=\"27\" electronegativity=\"1.88\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ni\" name=\"Nickel\" number=\"28\" electronegativity=\"1.91\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cu\" name=\"Copper\" number=\"29\" electronegativity=\"1.90\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Zn\" name=\"Zinc\" number=\"30\" electronegativity=\"1.65\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ga\" name=\"Gallium\" number=\"31\" electronegativity=\"1.81\" valenceElectrons=\"3\"/>\r\n    <atom identifier=\"Ge\" name=\"Germanium\" number=\"32\" electronegativity=\"2.01\" valenceElectrons=\"4\"/>\r\n    <atom identifier=\"As\" name=\"Arsenic\" number=\"33\" electronegativity=\"2.18\" valenceElectrons=\"5\"/>\r\n    <atom identifier=\"Se\" name=\"Selenium\" number=\"34\" electronegativity=\"2.55\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"Br\" name=\"Bromine\" number=\"35\" electronegativity=\"2.96\" valenceElectrons=\"7\"/>\r\n    <atom identifier=\"Kr\" name=\"Krypton\" number=\"36\" electronegativity=\"3.00\" valenceElectrons=\"8\"/>\r\n    <atom identifier=\"Rb\" name=\"Rubidium\" number=\"37\" electronegativity=\"0.82\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Sr\" name=\"Strontium\" number=\"38\" electronegativity=\"0.95\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"Y\" name=\"Yttrium\" number=\"39\" electronegativity=\"1.22\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Zr\" name=\"Zirconium\" number=\"40\" electronegativity=\"1.33\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Nb\" name=\"Niobium\" number=\"41\"  electronegativity=\"1.60\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Mo\" name=\"Molybdenum\" number=\"42\" electronegativity=\"2.16\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Tc\" name=\"Technetium\" number=\"43\" electronegativity=\"1.90\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ru\" name=\"Ruthenium\" number=\"44\" electronegativity=\"2.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Rh\" name=\"Rhodium\" number=\"45\" electronegativity=\"2.28\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pd\" name=\"Palladium\" number=\"46\" electronegativity=\"2.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ag\" name=\"Silver\" number=\"47\" electronegativity=\"1.93\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cd\" name=\"Cadmium\" number=\"48\" electronegativity=\"1.69\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"In\" name=\"Indium\" number=\"49\" electronegativity=\"1.78\" valenceElectrons=\"3\"/>\r\n    <atom identifier=\"Sn\" name=\"Tin\" number=\"50\" electronegativity=\"1.96\" valenceElectrons=\"4\"/>\r\n    <atom identifier=\"Sb\" name=\"Antimony\" number=\"51\" electronegativity=\"2.05\" valenceElectrons=\"5\"/>\r\n    <atom identifier=\"Te\" name=\"Tellurium\" number=\"52\" electronegativity=\"2.10\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"I\" name=\"Iodine\" number=\"53\" electronegativity=\"2.66\" valenceElectrons=\"7\"/>\r\n    <atom identifier=\"Xe\" name=\"Xenon\" number=\"54\" electronegativity=\"2.60\" valenceElectrons=\"8\"/>\r\n    <atom identifier=\"Cs\" name=\"Cesium\" number=\"55\" electronegativity=\"0.79\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Ba\" name=\"Barium\" number=\"56\" electronegativity=\"0.89\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"La\" name=\"Lanthanum\" number=\"57\" electronegativity=\"1.10\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ce\" name=\"Cerium\" number=\"58\" electronegativity=\"1.12\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pr\" name=\"Praseodymium\" number=\"59\" electronegativity=\"1.13\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Nd\" name=\"Neodymium\" number=\"60\" electronegativity=\"1.14\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pm\" name=\"Promethium\" number=\"61\" electronegativity=\"1.13\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Sm\" name=\"Samarium\" number=\"62\" electronegativity=\"1.17\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Eu\" name=\"Europium\" number=\"63\" electronegativity=\"1.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Gd\" name=\"Gadolinium\" number=\"64\" electronegativity=\"1.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Tb\" name=\"Terbium\" number=\"65\" electronegativity=\"1.10\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Dy\" name=\"Dysprosium\" number=\"66\" electronegativity=\"1.22\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ho\" name=\"Holmium\" number=\"67\" electronegativity=\"1.23\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Er\" name=\"Erbium\" number=\"68\" electronegativity=\"1.24\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Tm\" name=\"Thulium\" number=\"69\" electronegativity=\"1.25\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Yb\" name=\"Ytterbium\" number=\"70\" electronegativity=\"1.10\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Lu\" name=\"Lutetium\" number=\"71\" electronegativity=\"1.27\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Hf\" name=\"Hafnium\" number=\"72\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ta\" name=\"Tantalum\" number=\"73\" electronegativity=\"1.50\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"W\" name=\"Tungsten\" number=\"74\" electronegativity=\"2.36\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Re\" name=\"Rhenium\" number=\"75\" electronegativity=\"1.90\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Os\" name=\"Osmium\" number=\"76\" electronegativity=\"2.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ir\" name=\"Iridium\" number=\"77\" electronegativity=\"2.20\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pt\" name=\"Platinum\" number=\"78\" electronegativity=\"2.28\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Au\" name=\"Gold\" number=\"79\" electronegativity=\"2.54\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Hg\" name=\"Mercury\" number=\"80\" electronegativity=\"2.00\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Tl\" name=\"Thallium\" number=\"81\" electronegativity=\"1.62\" valenceElectrons=\"3\"/>\r\n    <atom identifier=\"Pb\" name=\"Lead\" number=\"82\" electronegativity=\"2.33\" valenceElectrons=\"4\"/>\r\n    <atom identifier=\"Bi\" name=\"Bismuth\" number=\"83\" electronegativity=\"2.02\" valenceElectrons=\"5\"/>\r\n    <atom identifier=\"Po\" name=\"Polonium\" number=\"84\" electronegativity=\"2.00\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"At\" name=\"Astatine\" number=\"85\" electronegativity=\"2.20\" valenceElectrons=\"7\"/>\r\n    <atom identifier=\"Rn\" name=\"Radon\" number=\"86\" electronegativity=\"2.20\" valenceElectrons=\"8\"/>\r\n    <atom identifier=\"Fr\" name=\"Francium\" number=\"87\" electronegativity=\"0.70\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"Ra\" name=\"Radium\" number=\"88\" electronegativity=\"0.90\" valenceElectrons=\"2\"/>\r\n    <atom identifier=\"Ac\" name=\"Actinium\" number=\"89\" electronegativity=\"1.10\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Th\" name=\"Thorium\" number=\"90\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pa\" name=\"Protactinium\" number=\"91\" electronegativity=\"1.50\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"U\" name=\"Uranium\" number=\"92\" electronegativity=\"1.38\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Np\" name=\"Neptunium\" number=\"93\" electronegativity=\"1.36\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Pu\" name=\"Plutonium\" number=\"94\" electronegativity=\"1.28\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Am\" name=\"Americium\" number=\"95\" electronegativity=\"1.13\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cm\" name=\"Curium\" number=\"96\" electronegativity=\"1.28\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Bk\" name=\"Berkelium\" number=\"97\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cf\" name=\"Californium\" number=\"98\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Es\" name=\"Einsteinium\" number=\"99\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Fm\" name=\"Fermium\" number=\"100\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Md\" name=\"Mendelevium\" number=\"101\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"No\" name=\"Nobelium\" number=\"102\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Lr\" name=\"Lawrencium\" number=\"103\" electronegativity=\"1.30\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Rf\" name=\"Rutherfordium\" number=\"104\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Db\" name=\"Dubnium\" number=\"105\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Sg\" name=\"Seaborgium\" number=\"106\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Bh\" name=\"Bohrium\" number=\"107\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Hs\" name=\"Hassium\" number=\"108\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Mt\" name=\"Meitnerium\" number=\"109\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Ds\" name=\"Darmstadtium\" number=\"110\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Rg\" name=\"Roentgenium\" number=\"111\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"Cn\" name=\"Copernicium\" number=\"112\" electronegativity=\"0\" valenceElectrons=\"0\"/>\r\n    <atom identifier=\"H (WAT)\" name=\"Hydrogen (Water)\" number=\"113\" electronegativity=\"2.00\" valenceElectrons=\"1\"/>\r\n    <atom identifier=\"O (WAT)\" name=\"Oxygen (Water)\" number=\"114\" electronegativity=\"3.44\" valenceElectrons=\"6\"/>\r\n    <atom identifier=\"D\" name=\"Hydrogen\" number=\"115\" electronegativity=\"2.00\" valenceElectrons=\"1\"/>\r\n</root>\r\n";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=main.bundle.js.map