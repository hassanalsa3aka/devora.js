#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = /* @__PURE__ */ Symbol.for("react.element");
    var n = /* @__PURE__ */ Symbol.for("react.portal");
    var p = /* @__PURE__ */ Symbol.for("react.fragment");
    var q = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var r = /* @__PURE__ */ Symbol.for("react.profiler");
    var t = /* @__PURE__ */ Symbol.for("react.provider");
    var u = /* @__PURE__ */ Symbol.for("react.context");
    var v = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var w = /* @__PURE__ */ Symbol.for("react.suspense");
    var x = /* @__PURE__ */ Symbol.for("react.memo");
    var y = /* @__PURE__ */ Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.element");
        var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = /* @__PURE__ */ Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
        var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = /* @__PURE__ */ Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement4(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext3(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = /* @__PURE__ */ Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext3(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement4.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext3;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext3;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/index.js
var require_react = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.production.min.js
var require_react_jsx_runtime_production_min = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.production.min.js"(exports) {
    "use strict";
    var f = require_react();
    var k = /* @__PURE__ */ Symbol.for("react.element");
    var l = /* @__PURE__ */ Symbol.for("react.fragment");
    var m = Object.prototype.hasOwnProperty;
    var n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
    var p = { key: true, ref: true, __self: true, __source: true };
    function q(c, a, g) {
      var b, d = {}, e = null, h = null;
      void 0 !== g && (e = "" + g);
      void 0 !== a.key && (e = "" + a.key);
      void 0 !== a.ref && (h = a.ref);
      for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
      if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
      return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
    }
    exports.Fragment = l;
    exports.jsx = q;
    exports.jsxs = q;
  }
});

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        var React = require_react();
        var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.element");
        var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = /* @__PURE__ */ Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
        var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = /* @__PURE__ */ Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = /* @__PURE__ */ Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var assign = Object.assign;
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher.current;
            ReactCurrentDispatcher.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component) {
          var prototype = Component.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown;
        var specialPropRefWarningShown;
        var didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function warnIfStringRefCannotBeAutoConverted(config, self) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        function defineKeyPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingKey = function() {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingKey.isReactWarning = true;
            Object.defineProperty(props, "key", {
              get: warnAboutAccessingKey,
              configurable: true
            });
          }
        }
        function defineRefPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingRef = function() {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingRef.isReactWarning = true;
            Object.defineProperty(props, "ref", {
              get: warnAboutAccessingRef,
              configurable: true
            });
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function jsxDEV(type, config, maybeKey, source, self) {
          {
            var propName;
            var props = {};
            var key = null;
            var ref = null;
            if (maybeKey !== void 0) {
              {
                checkKeyStringCoercion(maybeKey);
              }
              key = "" + maybeKey;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            if (hasValidRef(config)) {
              ref = config.ref;
              warnIfStringRefCannotBeAutoConverted(config, self);
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
            if (type && type.defaultProps) {
              var defaultProps = type.defaultProps;
              for (propName in defaultProps) {
                if (props[propName] === void 0) {
                  props[propName] = defaultProps[propName];
                }
              }
            }
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
            return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
          }
        }
        var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function isValidElement(object) {
          {
            return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
          }
        }
        function getDeclarationErrorAddendum() {
          {
            if (ReactCurrentOwner$1.current) {
              var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);
              if (name) {
                return "\n\nCheck the render method of `" + name + "`.";
              }
            }
            return "";
          }
        }
        function getSourceInfoErrorAddendum(source) {
          {
            if (source !== void 0) {
              var fileName = source.fileName.replace(/^.*[\\\/]/, "");
              var lineNumber = source.lineNumber;
              return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
            }
            return "";
          }
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          {
            var info = getDeclarationErrorAddendum();
            if (!info) {
              var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
              if (parentName) {
                info = "\n\nCheck the top-level render call using <" + parentName + ">.";
              }
            }
            return info;
          }
        }
        function validateExplicitKey(element, parentType) {
          {
            if (!element._store || element._store.validated || element.key != null) {
              return;
            }
            element._store.validated = true;
            var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
            if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
              return;
            }
            ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
            var childOwner = "";
            if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
              childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
            }
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          {
            if (typeof node !== "object") {
              return;
            }
            if (isArray(node)) {
              for (var i = 0; i < node.length; i++) {
                var child = node[i];
                if (isValidElement(child)) {
                  validateExplicitKey(child, parentType);
                }
              }
            } else if (isValidElement(node)) {
              if (node._store) {
                node._store.validated = true;
              }
            } else if (node) {
              var iteratorFn = getIteratorFn(node);
              if (typeof iteratorFn === "function") {
                if (iteratorFn !== node.entries) {
                  var iterator = iteratorFn.call(node);
                  var step;
                  while (!(step = iterator.next()).done) {
                    if (isValidElement(step.value)) {
                      validateExplicitKey(step.value, parentType);
                    }
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        var didWarnAboutKeySpread = {};
        function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
          {
            var validType = isValidElementType(type);
            if (!validType) {
              var info = "";
              if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
                info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
              }
              var sourceInfo = getSourceInfoErrorAddendum(source);
              if (sourceInfo) {
                info += sourceInfo;
              } else {
                info += getDeclarationErrorAddendum();
              }
              var typeString;
              if (type === null) {
                typeString = "null";
              } else if (isArray(type)) {
                typeString = "array";
              } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
                typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
                info = " Did you accidentally export a JSX literal instead of a component?";
              } else {
                typeString = typeof type;
              }
              error("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
            var element = jsxDEV(type, props, key, source, self);
            if (element == null) {
              return element;
            }
            if (validType) {
              var children = props.children;
              if (children !== void 0) {
                if (isStaticChildren) {
                  if (isArray(children)) {
                    for (var i = 0; i < children.length; i++) {
                      validateChildKeys(children[i], type);
                    }
                    if (Object.freeze) {
                      Object.freeze(children);
                    }
                  } else {
                    error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
                  }
                } else {
                  validateChildKeys(children, type);
                }
              }
            }
            {
              if (hasOwnProperty.call(props, "key")) {
                var componentName = getComponentNameFromType(type);
                var keys = Object.keys(props).filter(function(k) {
                  return k !== "key";
                });
                var beforeExample = keys.length > 0 ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
                if (!didWarnAboutKeySpread[componentName + beforeExample]) {
                  var afterExample = keys.length > 0 ? "{" + keys.join(": ..., ") + ": ...}" : "{}";
                  error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);
                  didWarnAboutKeySpread[componentName + beforeExample] = true;
                }
              }
            }
            if (type === REACT_FRAGMENT_TYPE) {
              validateFragmentProps(element);
            } else {
              validatePropTypes(element);
            }
            return element;
          }
        }
        function jsxWithValidationStatic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, true);
          }
        }
        function jsxWithValidationDynamic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, false);
          }
        }
        var jsx2 = jsxWithValidationDynamic;
        var jsxs2 = jsxWithValidationStatic;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.jsx = jsx2;
        exports.jsxs = jsxs2;
      })();
    }
  }
});

// ../../node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "../../node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_jsx_runtime_production_min();
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// src/index.ts
import { Command } from "commander";

// src/commands/dev.ts
import path11 from "node:path";
import { createServer } from "vite";

// ../core/src/config.ts
function resolveAuthMode(project, appName) {
  const app = project.apps.find((a) => a.name === appName);
  if (!app) throw new Error(`[framework.config] unknown app: "${appName}"`);
  return app.auth ?? project.shared.auth;
}

// ../core/src/serverFn.ts
var DEFAULT_REQUEST_META = { url: "http://localhost/", method: "GET", headers: {} };
function requestContextFields(meta) {
  const source = meta ?? DEFAULT_REQUEST_META;
  let url;
  try {
    url = new URL(source.url);
  } catch {
    url = new URL(DEFAULT_REQUEST_META.url);
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(source.headers)) {
    if (value === void 0) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      try {
        headers.append(name, item);
      } catch {
      }
    }
  }
  let request;
  return {
    url,
    headers,
    method: source.method,
    ip: source.ip,
    get request() {
      if (!request) {
        try {
          request = new Request(url, { method: source.method, headers });
        } catch {
          request = new Request(url, { headers });
        }
      }
      return request;
    }
  };
}

// ../core/src/router.ts
import fs from "node:fs";
import path from "node:path";
var ROUTE_EXTENSIONS = /* @__PURE__ */ new Set([".tsx", ".ts"]);
function matchRoute(routesDir, urlPath) {
  const urlSegments = segmentsOf(normalizePath(urlPath));
  let best = null;
  for (const filePath of collectRouteFiles(routesDir)) {
    const routeSegments = fileToRouteSegments(routesDir, filePath);
    if (routeSegments.length !== urlSegments.length) continue;
    const params = {};
    let dynamicCount = 0;
    let matched = true;
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSeg = routeSegments[i];
      const urlSeg = urlSegments[i];
      if (isDynamicSegment(routeSeg)) {
        params[paramName(routeSeg)] = decodeURIComponent(urlSeg);
        dynamicCount++;
      } else if (routeSeg !== urlSeg) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    if (!best || dynamicCount < best.dynamicCount) {
      best = { filePath, params, dynamicCount };
    }
  }
  if (!best) return null;
  return { filePath: best.filePath, routePath: normalizePath(urlPath), params: best.params };
}
function listRoutePaths(routesDir) {
  return collectRouteFiles(routesDir).map((filePath) => fileToRoutePath(routesDir, filePath));
}
function listRouteFiles(routesDir) {
  return collectRouteFiles(routesDir);
}
function routeFileToPath(routesDir, filePath) {
  return fileToRoutePath(routesDir, filePath);
}
function isDynamicRouteFile(routesDir, filePath) {
  return fileToRouteSegments(routesDir, filePath).some(isDynamicSegment);
}
function resolveStaticRoutePath(routesDir, filePath, params) {
  const segments = fileToRouteSegments(routesDir, filePath).map((segment) => {
    if (!isDynamicSegment(segment)) return segment;
    const name = paramName(segment);
    const value = params[name];
    if (value === void 0) {
      throw new Error(
        `[devora] getStaticParams() entry is missing "${name}" for dynamic route segment "${segment}"`
      );
    }
    return value;
  });
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}
function isDynamicSegment(segment) {
  return segment.startsWith("[") && segment.endsWith("]") && segment.length > 2;
}
function paramName(segment) {
  return segment.slice(1, -1);
}
function normalizePath(urlPath) {
  if (urlPath === "" || urlPath === "/") return "/";
  return urlPath.replace(/\/+$/, "");
}
function segmentsOf(normalized) {
  return normalized === "/" ? [] : normalized.slice(1).split("/");
}
function collectRouteFiles(routesDir) {
  if (!fs.existsSync(routesDir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(routesDir, { withFileTypes: true })) {
    const full = path.join(routesDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (ROUTE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}
function fileToRouteSegments(routesDir, filePath) {
  const rel = path.relative(routesDir, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  const segments = noExt.split(path.sep);
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}
function fileToRoutePath(routesDir, filePath) {
  const segments = fileToRouteSegments(routesDir, filePath);
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}

// ../core/src/theme.ts
var DEVORA_LOGO_URL = "/icons/devorajs-logo-withoutbg.png";
var THEME_CSS = `
:root {
  color-scheme: dark light;
  --devora-bg: #0a0a12;
  --devora-bg-elevated: #13131f;
  --devora-card: #15151f;
  --devora-fg: #f5f5f7;
  --devora-fg-muted: #9d9db0;
  --devora-border: #26262f;
  --devora-accent-from: #3b82f6;
  --devora-accent-to: #a855f7;
  --devora-link: #93c5fd;
  --devora-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25);
  --devora-radius: 10px;
}
@media (prefers-color-scheme: light) {
  :root {
    --devora-bg: #fafafc;
    --devora-bg-elevated: #ffffff;
    --devora-card: #ffffff;
    --devora-fg: #16161f;
    --devora-fg-muted: #5c5c6b;
    --devora-border: #e6e6ee;
    --devora-accent-from: #2563eb;
    --devora-accent-to: #9333ea;
    --devora-link: #2563eb;
    --devora-shadow: 0 1px 2px rgba(20, 20, 40, 0.04), 0 8px 24px rgba(20, 20, 40, 0.06);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--devora-bg);
  color: var(--devora-fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--devora-link); }
h1, h2, h3 { line-height: 1.25; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--devora-bg-elevated);
  border: 1px solid var(--devora-border);
  border-radius: 4px;
  padding: 0.1em 0.4em;
  font-size: 0.9em;
}

/* Header */
.devora-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.875rem 1.5rem;
  background: var(--devora-bg-elevated);
  border-bottom: 1px solid var(--devora-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.devora-header-left { display: flex; align-items: center; gap: 1.75rem; min-width: 0; }
.devora-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--devora-fg);
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}
.devora-brand img { height: 26px; width: 26px; display: block; }
.devora-brand .devora-js {
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  overflow-x: auto;
}
.devora-nav a {
  color: var(--devora-fg-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.devora-nav a:hover { color: var(--devora-fg); }
.devora-app-badge {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--devora-fg-muted);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  flex-shrink: 0;
}

/* Page content */
.devora-page {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
}
.devora-page h1 { font-size: 1.875rem; margin: 0 0 0.625rem; letter-spacing: -0.01em; }
.devora-page > p:first-of-type { margin-top: 0; }
.devora-page p { line-height: 1.65; color: var(--devora-fg-muted); }
.devora-page p code { color: var(--devora-fg); }
.devora-page h2 {
  position: relative;
  margin: 2.75rem 0 1rem;
  padding-left: 1rem;
  font-size: 1.375rem;
  letter-spacing: -0.005em;
}
.devora-page h2:first-of-type { margin-top: 1.75rem; }
.devora-page h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.15em;
  bottom: 0.15em;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--devora-accent-from), var(--devora-accent-to));
}
.devora-page strong { color: var(--devora-fg); }
.devora-page ul, .devora-page ol {
  color: var(--devora-fg-muted);
  line-height: 1.65;
  padding-left: 1.15rem;
}
.devora-page li { margin: 0.4rem 0; }
.devora-page li::marker { color: var(--devora-accent-from); }
.devora-page a { text-underline-offset: 2px; }
.devora-page pre {
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.65;
}
.devora-page pre code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 1em;
}

/* Forms rendered as a card, not bare inputs floating in the page */
.devora-page form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 420px;
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius);
  box-shadow: var(--devora-shadow);
}
.devora-page label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--devora-fg-muted);
  margin-bottom: -0.5rem;
}
.devora-page input, .devora-page textarea {
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--devora-border);
  background: var(--devora-bg);
  color: var(--devora-fg);
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.devora-page textarea { min-height: 6rem; resize: vertical; }
.devora-page input::placeholder, .devora-page textarea::placeholder { color: var(--devora-fg-muted); }
.devora-page input:focus, .devora-page textarea:focus {
  outline: none;
  border-color: var(--devora-accent-from);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}
.devora-page button {
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  align-self: flex-start;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.devora-page button:hover { opacity: 0.92; }
.devora-page button:active { transform: translateY(1px); }
.devora-page button:focus-visible {
  outline: 2px solid var(--devora-accent-from);
  outline-offset: 2px;
}

/* A card-like group for non-form content (e.g. a list, a demo widget) */
.devora-card {
  padding: 1.5rem;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-top: 2px solid var(--devora-accent-from);
  border-radius: var(--devora-radius);
  box-shadow: var(--devora-shadow);
  margin-top: 1.25rem;
}

/* Footer */
.devora-footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  color: var(--devora-fg-muted);
  font-size: 0.8rem;
  border-top: 1px solid var(--devora-border);
}
.devora-footer-custom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
}
.devora-footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.devora-footer img { height: 16px; width: 16px; opacity: 0.7; }
`;

// ../core/src/html.ts
function attrs(pairs) {
  return Object.entries(pairs).filter(([, v]) => v !== void 0 && v !== false).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`).join("");
}
function linkTag(link) {
  return `<link${attrs({
    rel: link.rel,
    href: link.href,
    type: link.type,
    sizes: link.sizes,
    as: link.as,
    media: link.media,
    crossorigin: link.crossorigin,
    hreflang: link.hreflang,
    title: link.title
  })} />`;
}
function headTags(head) {
  if (!head) return [];
  return [
    ...(head.stylesheets ?? []).map((href) => linkTag({ rel: "stylesheet", href })),
    ...(head.links ?? []).map(linkTag),
    ...(head.meta ?? []).map(
      (m) => `<meta${attrs({ name: m.name, property: m.property, "http-equiv": m.httpEquiv, content: m.content })} />`
    ),
    ...(head.scripts ?? []).map(
      (script) => `<script${attrs({
        type: script.type === "classic" ? void 0 : "module",
        src: script.src,
        defer: script.defer,
        async: script.async,
        crossorigin: script.crossorigin
      })}></script>`
    )
  ];
}
function includesTheme(options) {
  const theme = options.appHead?.theme ?? "auto";
  if (theme === true || theme === false) return theme;
  return options.usedShell === true || options.clientRendered === true;
}
function renderHead(meta, options = {}) {
  const { title, description, og } = meta ?? {};
  const ogTitle = og?.title ?? title;
  const ogDescription = og?.description ?? description;
  const appHead = options.appHead;
  const extra = [...headTags(appHead), ...headTags(meta?.head)];
  const declaredMeta = [...appHead?.meta ?? [], ...meta?.head?.meta ?? []];
  const declaredLinks = [...appHead?.links ?? [], ...meta?.head?.links ?? []];
  const theme = includesTheme(options);
  const hasIcon = declaredLinks.some((l) => l.rel.split(/\s+/).includes("icon"));
  const hasViewport = declaredMeta.some((m) => m.name === "viewport");
  const lines = [
    `<meta charset="utf-8" />`,
    hasViewport ? "" : `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    theme && !hasIcon ? `<link rel="icon" href="${DEVORA_LOGO_URL}" />` : "",
    theme ? `<style>${THEME_CSS}</style>` : "",
    ...(options.styles ?? []).map((href) => linkTag({ rel: "stylesheet", href })),
    title ? `<title>${escapeHtml(title)}</title>` : "",
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : "",
    ogTitle ? `<meta property="og:title" content="${escapeHtml(ogTitle)}" />` : "",
    ogDescription ? `<meta property="og:description" content="${escapeHtml(ogDescription)}" />` : "",
    ogTitle || ogDescription ? `<meta property="og:type" content="${escapeHtml(og?.type ?? "website")}" />` : "",
    og?.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : "",
    og?.url ? `<meta property="og:url" content="${escapeHtml(og.url)}" />` : "",
    ...extra
  ].filter(Boolean);
  return `<!doctype html>
<html${appHead?.lang ? ` lang="${escapeHtml(appHead.lang)}"` : ""}>
  <head>
    ${lines.join("\n    ")}
  </head>
  <body>
`;
}
function renderTail(opts) {
  const preambleScript = opts.devPreambleUrl ? `<script type="module" src="${escapeHtml(opts.devPreambleUrl)}"></script>
    ` : "";
  return `    ${preambleScript}${opts.islandScriptUrl ? `<script type="module" src="${escapeHtml(opts.islandScriptUrl)}"></script>` : ""}
    ${opts.csrScriptUrl ? `<script type="module" src="${escapeHtml(opts.csrScriptUrl)}"></script>` : ""}
  </body>
</html>
`;
}
function renderHtmlDocument(opts) {
  return `${renderHead(opts.meta, opts.head)}    <div id="root">${opts.bodyHtml}</div>
${renderTail(opts)}`;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ../core/src/session.ts
import { createHmac, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// ../core/src/csrf.ts
var import_react = __toESM(require_react(), 1);
import { randomBytes, timingSafeEqual } from "node:crypto";
var CSRF_COOKIE_NAME = "devora_csrf";
var CSRF_FORM_FIELD = "_csrf";
function generateCsrfToken() {
  return randomBytes(32).toString("base64url");
}
function verifyCsrfToken(cookieValue, formValue) {
  if (!cookieValue || typeof formValue !== "string" || !formValue) return false;
  const cookieBuf = Buffer.from(cookieValue);
  const formBuf = Buffer.from(formValue);
  if (cookieBuf.length !== formBuf.length) return false;
  return timingSafeEqual(cookieBuf, formBuf);
}

// ../core/src/httpError.ts
var HttpError = class extends Error {
  status;
  constructor(status2, message) {
    super(message);
    this.name = "HttpError";
    this.status = status2;
  }
};
function getHttpErrorStatus(err) {
  if (!err || typeof err !== "object") return void 0;
  const candidate = err.status ?? err.statusCode;
  if (typeof candidate !== "number" || !Number.isInteger(candidate)) return void 0;
  return candidate >= 400 && candidate <= 599 ? candidate : void 0;
}
function jsonMessageResponse(status2, message, headers) {
  return {
    status: status2,
    headers: { ...headers ?? {}, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message })
  };
}
function apiNotFoundResponse() {
  return jsonMessageResponse(404, "Not found");
}
function apiErrorResponse(err) {
  const status2 = getHttpErrorStatus(err);
  if (status2 !== void 0) {
    if (status2 >= 500) console.error("[devora] API route error:", err);
    return jsonMessageResponse(status2, errorMessage(err) || "Request failed");
  }
  console.error("[devora] API route error:", err);
  const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : errorMessage(err) || "Internal Server Error";
  return jsonMessageResponse(500, message);
}
function errorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

// ../core/src/sessionStore.ts
function getSessionState(record, now = Date.now()) {
  if (!record || now >= record.expiresAt) return "dead";
  if (now >= record.activeExpiresAt) return "idle";
  return "active";
}
function isSessionStore(value) {
  if (!value || typeof value !== "object") return false;
  const candidate = value;
  return typeof candidate.get === "function" && typeof candidate.set === "function" && typeof candidate.delete === "function";
}
var SWEEP_EVERY_N_WRITES = 1e3;
function createMemorySessionStore() {
  const records = /* @__PURE__ */ new Map();
  let writesSinceSweep = 0;
  return {
    get(key) {
      const record = records.get(key);
      if (!record) return void 0;
      if (getSessionState(record) === "dead") {
        records.delete(key);
        return void 0;
      }
      return structuredClone(record);
    },
    set(key, record) {
      records.set(key, structuredClone(record));
      if (++writesSinceSweep >= SWEEP_EVERY_N_WRITES) {
        writesSinceSweep = 0;
        const now = Date.now();
        for (const [k, r] of records) {
          if (getSessionState(r, now) === "dead") records.delete(k);
        }
      }
    },
    delete(key) {
      records.delete(key);
    }
  };
}
var MEMORY_STORE_KEY = /* @__PURE__ */ Symbol.for("devora.sessions.memoryStore");
function getProcessMemorySessionStore() {
  const holder = globalThis;
  holder[MEMORY_STORE_KEY] ??= createMemorySessionStore();
  return holder[MEMORY_STORE_KEY];
}

// ../core/src/session.ts
var DEFAULT_SESSION_ACTIVE_PERIOD_MS = 24 * 60 * 60 * 1e3;
var DEFAULT_SESSION_IDLE_PERIOD_MS = 14 * 24 * 60 * 60 * 1e3;
var DEV_INSECURE_SECRET = "dev-insecure-session-secret-do-not-use-in-production";
var warnedForKey;
function resolveSecret(envKey) {
  const configured = process.env[envKey] ?? process.env.DEVORA_SESSION_SECRET;
  if (configured) return configured;
  const label = envKey === "DEVORA_SESSION_SECRET" ? envKey : `${envKey} (or DEVORA_SESSION_SECRET)`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[devora] no session secret configured. Set ${label} before running in production \u2014 see ROADMAP.md #2.`
    );
  }
  if (warnedForKey !== envKey) {
    console.warn(
      `[devora] no ${label} set \u2014 using an insecure dev-only default. Set this before deploying (see ROADMAP.md #2).`
    );
    warnedForKey = envKey;
  }
  return DEV_INSECURE_SECRET;
}
function resolveSessionScope(authMode, appName) {
  if (authMode === "isolated") {
    const envKey = `DEVORA_SESSION_SECRET_${appName.toUpperCase()}`;
    return { name: `devora_session_${appName}`, secret: resolveSecret(envKey) };
  }
  return { name: "devora_session", secret: resolveSecret("DEVORA_SESSION_SECRET") };
}
function sessionStoreKey(sessionId, opts) {
  return createHmac("sha256", opts.secret).update(`${opts.name}:${sessionId}`).digest("base64url");
}
function generateSessionId() {
  return randomBytes2(32).toString("base64url");
}
var SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
function buildCookieAttributes(cookie, maxAgeSeconds, withDomain = false) {
  const attributes = cookie ?? { secure: process.env.NODE_ENV === "production", sameSite: "Lax" };
  let attrs2 = `Path=/; HttpOnly; SameSite=${attributes.sameSite}`;
  if (withDomain && attributes.domain) attrs2 += `; Domain=${attributes.domain}`;
  if (maxAgeSeconds !== void 0) attrs2 += `; Max-Age=${maxAgeSeconds}`;
  return attributes.secure ? `${attrs2}; Secure` : attrs2;
}
var warnedCsrfDisabled = false;
function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}
function readBearerToken(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return void 0;
  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(value);
  return match ? match[1] : void 0;
}
function periodsOf(opts) {
  return {
    active: opts.activePeriodMs ?? DEFAULT_SESSION_ACTIVE_PERIOD_MS,
    idle: opts.idlePeriodMs ?? DEFAULT_SESSION_IDLE_PERIOD_MS
  };
}
async function resolveSession(request, opts, now = Date.now()) {
  const bearer = readBearerToken(request.authorizationHeader);
  const presentedTransport = bearer !== void 0 ? "bearer" : parseCookieHeader(request.cookieHeader)[opts.name] ? "cookie" : void 0;
  const sessionId = bearer ?? parseCookieHeader(request.cookieHeader)[opts.name];
  if (!presentedTransport || !sessionId) return { presentedTransport, state: "none", renewed: false };
  if (!SESSION_ID_PATTERN.test(sessionId)) return { presentedTransport, state: "dead", renewed: false };
  const key = sessionStoreKey(sessionId, opts);
  const record = await opts.store.get(key);
  const state = getSessionState(record, now);
  if (state === "dead" || !record) {
    if (record) await opts.store.delete(key);
    return { presentedTransport, state: "dead", renewed: false };
  }
  if (state === "idle") {
    const { active, idle } = periodsOf(opts);
    const renewedRecord = { data: record.data, activeExpiresAt: now + active, expiresAt: now + active + idle };
    await opts.store.set(key, renewedRecord);
    return { presentedTransport, state, sessionId, record: renewedRecord, renewed: true };
  }
  return { presentedTransport, state, sessionId, record, renewed: false };
}
async function createRequestContext(request, opts, params = {}, meta) {
  const fields = requestContextFields(meta);
  const cookies = parseCookieHeader(request.cookieHeader);
  const resolved = await resolveSession(request, opts);
  const pendingSetCookies = [];
  const pendingWrites = [];
  let currentSessionId = resolved.sessionId;
  let currentRecord = resolved.record;
  let transport = currentRecord ? resolved.presentedTransport : void 0;
  const sessionCookie = (sessionId, record) => `${opts.name}=${sessionId}; ${buildCookieAttributes(opts.cookie, Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1e3)), true)}`;
  const clearedSessionCookie = () => `${opts.name}=; ${buildCookieAttributes(opts.cookie, 0, true)}`;
  if (resolved.presentedTransport === "cookie") {
    if (resolved.state === "dead") pendingSetCookies.push(clearedSessionCookie());
    else if (resolved.renewed && currentSessionId && currentRecord) {
      pendingSetCookies.push(sessionCookie(currentSessionId, currentRecord));
    }
  }
  const csrfEnabled = opts.csrfCookie !== false;
  const incomingCsrfCookie = csrfEnabled ? cookies[CSRF_COOKIE_NAME] : void 0;
  const csrfToken = csrfEnabled ? incomingCsrfCookie ?? generateCsrfToken() : "";
  if (csrfEnabled && !incomingCsrfCookie && resolved.presentedTransport !== "bearer") {
    pendingSetCookies.push(`${CSRF_COOKIE_NAME}=${csrfToken}; ${buildCookieAttributes(opts.cookie)}`);
  }
  const track = (write) => {
    const promise = (async () => write())();
    pendingWrites.push(promise);
    promise.catch(() => {
    });
    return promise;
  };
  const revokeSession = (sessionId) => {
    if (sessionId !== void 0 && sessionId !== currentSessionId) {
      if (!SESSION_ID_PATTERN.test(sessionId)) return Promise.resolve();
      const otherKey = sessionStoreKey(sessionId, opts);
      return track(() => opts.store.delete(otherKey));
    }
    if (currentSessionId === void 0) return Promise.resolve();
    const key = sessionStoreKey(currentSessionId, opts);
    if (transport === "cookie") pendingSetCookies.push(clearedSessionCookie());
    currentSessionId = void 0;
    currentRecord = void 0;
    transport = void 0;
    return track(() => opts.store.delete(key));
  };
  const ctx = {
    params,
    url: fields.url,
    headers: fields.headers,
    method: fields.method,
    ip: fields.ip,
    get request() {
      return fields.request;
    },
    get session() {
      return currentRecord?.data;
    },
    get sessionTransport() {
      return transport;
    },
    requireAuth: () => {
      if (currentRecord === void 0) {
        throw new HttpError(401, "Authentication required");
      }
    },
    setSession: (data, options) => {
      const nextTransport = options?.transport ?? transport ?? "cookie";
      const previousId = currentSessionId;
      const sessionId = generateSessionId();
      const now = Date.now();
      const { active, idle } = periodsOf(opts);
      const record = { data, activeExpiresAt: now + active, expiresAt: now + active + idle };
      currentSessionId = sessionId;
      currentRecord = record;
      transport = nextTransport;
      if (nextTransport === "cookie") pendingSetCookies.push(sessionCookie(sessionId, record));
      return track(async () => {
        if (previousId !== void 0) await opts.store.delete(sessionStoreKey(previousId, opts));
        await opts.store.set(sessionStoreKey(sessionId, opts), record);
        return sessionId;
      });
    },
    revokeSession,
    clearSession: () => revokeSession(),
    verifyCsrf: (submitted) => {
      if (transport === "bearer" && currentRecord !== void 0) return;
      if (!csrfEnabled) {
        if (!warnedCsrfDisabled) {
          console.warn(
            `[devora] ctx.verifyCsrf() rejected a request that isn't Bearer-authenticated: this app has csrf: false in app.config.ts, so no CSRF cookie exists to verify against.`
          );
          warnedCsrfDisabled = true;
        }
        throw new HttpError(403, "Missing or invalid CSRF token");
      }
      const value = typeof submitted === "string" ? submitted : submitted.get(CSRF_FORM_FIELD);
      if (!verifyCsrfToken(incomingCsrfCookie, value)) {
        throw new HttpError(403, "Missing or invalid CSRF token");
      }
    }
  };
  return {
    ctx,
    csrfToken,
    getSetCookie: () => pendingSetCookies.length > 0 ? pendingSetCookies : void 0,
    settle: async () => {
      for (let i = 0; i < pendingWrites.length; i++) await pendingWrites[i];
    }
  };
}
function sessionsDisabledError(method) {
  return new Error(
    `[devora] ctx.${method}() was called, but this app has sessions disabled (auth: "none" in devora.config.ts). Set auth: "shared" or "isolated" for this app if it needs login.`
  );
}
function createNoAuthContext(params = {}, meta) {
  const fields = requestContextFields(meta);
  const ctx = {
    params,
    url: fields.url,
    headers: fields.headers,
    method: fields.method,
    ip: fields.ip,
    get request() {
      return fields.request;
    },
    session: void 0,
    sessionTransport: void 0,
    requireAuth: () => {
      throw sessionsDisabledError("requireAuth");
    },
    setSession: () => {
      throw sessionsDisabledError("setSession");
    },
    revokeSession: () => {
      throw sessionsDisabledError("revokeSession");
    },
    clearSession: () => {
      throw sessionsDisabledError("clearSession");
    },
    verifyCsrf: () => {
      throw sessionsDisabledError("verifyCsrf");
    }
  };
  return { ctx, csrfToken: "", getSetCookie: () => void 0, settle: async () => {
  } };
}

// ../core/src/sessionConfig.ts
import { existsSync, readFileSync } from "node:fs";
import path2 from "node:path";
var SESSION_MANIFEST_FILE = "session-manifest.json";
var SESSION_STORE_BUILD_KEY = "session-store";
function toSessionManifest(sessions) {
  const store = sessions?.store === void 0 ? null : sessions.store === "memory" ? "memory" : "module";
  return {
    store,
    activePeriodMs: sessions?.activeSeconds !== void 0 ? sessions.activeSeconds * 1e3 : void 0,
    idlePeriodMs: sessions?.idleSeconds !== void 0 ? sessions.idleSeconds * 1e3 : void 0
  };
}
function resolveSessionManifest(input) {
  const { appName, authMode, sessions, appSessions } = input;
  const fail = (message) => new Error(`[devora] "${appName}": ${message}`);
  if (authMode === "none") {
    if (appSessions !== void 0 || input.csrf !== void 0) {
      throw fail(
        `app.config.ts sets ${appSessions !== void 0 ? "`sessions`" : "`csrf`"}, but this app has auth: "none" (no sessions at all). Remove it, or give the app auth: "shared"/"isolated" in devora.config.ts.`
      );
    }
    return void 0;
  }
  for (const [where, config] of [
    ["shared.sessions", sessions],
    ["app.config.ts sessions", appSessions]
  ]) {
    for (const key of ["activeSeconds", "idleSeconds"]) {
      const value = config?.[key];
      if (value !== void 0 && !(typeof value === "number" && Number.isFinite(value) && value > 0)) {
        throw fail(`${where}.${key} must be a positive number of seconds (got ${JSON.stringify(value)}).`);
      }
    }
  }
  if (authMode === "shared") {
    if (appSessions?.activeSeconds !== void 0 || appSessions?.idleSeconds !== void 0) {
      throw fail(
        `per-app session lifetimes are only for auth: "isolated" apps \u2014 a shared session is one session across every shared app. Set shared.sessions.activeSeconds/idleSeconds in devora.config.ts instead.`
      );
    }
    if (appSessions?.cookie?.domain !== void 0) {
      throw fail(
        `sessions.cookie.domain in app.config.ts is only for auth: "isolated" apps \u2014 shared apps use shared.sessions.cookie.domain in devora.config.ts.`
      );
    }
  }
  const projectCookie = sessions?.cookie ?? {};
  const appCookie = appSessions?.cookie ?? {};
  const domainSource = authMode === "shared" ? projectCookie.domain : appCookie.domain;
  const domain = domainSource === void 0 ? void 0 : normalizeCookieDomain(domainSource, fail);
  if (authMode === "shared" && domain !== void 0) {
    for (const key of ["secure", "sameSite"]) {
      if (appCookie[key] !== void 0 && appCookie[key] !== projectCookie[key]) {
        throw fail(
          `sessions.cookie.${key} in app.config.ts differs from shared.sessions.cookie, but shared apps share one cookie across ${domain} \u2014 set it once in devora.config.ts.`
        );
      }
    }
  }
  const secure = appCookie.secure ?? projectCookie.secure;
  if (secure !== void 0 && secure !== true && secure !== false && secure !== "auto") {
    throw fail(`sessions.cookie.secure must be true, false or "auto" (got ${JSON.stringify(secure)}).`);
  }
  const rawSameSite = appCookie.sameSite ?? projectCookie.sameSite;
  let sameSite;
  if (rawSameSite !== void 0) {
    const lowered = String(rawSameSite).toLowerCase();
    if (lowered !== "lax" && lowered !== "strict" && lowered !== "none") {
      throw fail(`sessions.cookie.sameSite must be "lax", "strict" or "none" (got ${JSON.stringify(rawSameSite)}).`);
    }
    sameSite = lowered;
  }
  if (sameSite === "none" && secure !== void 0 && secure !== true) {
    throw fail(`sessions.cookie.sameSite "none" requires secure: true \u2014 browsers reject SameSite=None without Secure.`);
  }
  if (domain !== void 0) {
    const appDomain = input.appDomain.trim().toLowerCase().replace(/:\d+$/, "");
    if (appDomain !== domain && !appDomain.endsWith(`.${domain}`)) {
      throw fail(
        `sessions.cookie.domain "${domain}" doesn't cover this app's domain "${input.appDomain}" \u2014 browsers would reject the cookie. Use a domain the app is served from (or a parent of it).`
      );
    }
  }
  const active = authMode === "isolated" ? appSessions?.activeSeconds ?? sessions?.activeSeconds : sessions?.activeSeconds;
  const idle = authMode === "isolated" ? appSessions?.idleSeconds ?? sessions?.idleSeconds : sessions?.idleSeconds;
  const cookie = {};
  if (secure !== void 0) cookie.secure = secure;
  if (sameSite !== void 0) cookie.sameSite = sameSite;
  if (domain !== void 0) cookie.domain = domain;
  return {
    store: sessions?.store === void 0 ? null : sessions.store === "memory" ? "memory" : "module",
    ...active !== void 0 ? { activePeriodMs: active * 1e3 } : {},
    ...idle !== void 0 ? { idlePeriodMs: idle * 1e3 } : {},
    ...Object.keys(cookie).length > 0 ? { cookie } : {},
    ...input.csrf === false ? { csrfCookie: false } : {}
  };
}
function normalizeCookieDomain(raw, fail) {
  const domain = String(raw).trim().toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    throw fail(
      `sessions.cookie.domain "${raw}" must be a plain domain like "example.com" (no scheme, port or path, and not a single label like "localhost").`
    );
  }
  return domain;
}
var SAME_SITE_ATTRIBUTE = {
  lax: "Lax",
  strict: "Strict",
  none: "None"
};
var warnedDevSameSiteNone = false;
function createCookieAttributesResolver(manifest, appName) {
  const sameSite = manifest.cookie?.sameSite ?? "lax";
  if (process.env.NODE_ENV !== "production") {
    if (sameSite === "none" && !warnedDevSameSiteNone) {
      console.warn(
        `[devora] "${appName}": sessions.cookie.sameSite "none" needs Secure, which dev never sets \u2014 dev cookies use SameSite=Lax.`
      );
      warnedDevSameSiteNone = true;
    }
    const devAttributes = { secure: false, sameSite: sameSite === "none" ? "Lax" : SAME_SITE_ATTRIBUTE[sameSite] };
    return () => devAttributes;
  }
  const secure = manifest.cookie?.secure ?? true;
  const domain = manifest.cookie?.domain;
  return (isHttps) => ({
    secure: secure === "auto" ? isHttps : secure,
    sameSite: SAME_SITE_ATTRIBUTE[sameSite],
    ...domain !== void 0 ? { domain } : {}
  });
}
function readSessionManifest(serverOutDir) {
  const manifestPath = path2.join(serverOutDir, SESSION_MANIFEST_FILE);
  if (!existsSync(manifestPath)) return { store: null };
  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}
var warnedUnconfigured = false;
function assertSessionStoreConfigured(manifest) {
  if (manifest.store !== null) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[devora] no session store configured. Set shared.sessions.store in devora.config.ts \u2014 a path to a module whose default export is a SessionStore backed by your database (see packages/backend/AUTH.md), or "memory" to explicitly accept in-process sessions (single long-lived server only \u2014 not serverless).`
    );
  }
  if (!warnedUnconfigured) {
    console.warn(
      `[devora] no shared.sessions.store set in devora.config.ts \u2014 using an in-memory session store (sessions are lost on restart). Production will refuse to start until one is set.`
    );
    warnedUnconfigured = true;
  }
}
function createSessionOptionsResolver(authMode, appName, manifest, loadModule) {
  assertSessionStoreConfigured(manifest);
  const scope = resolveSessionScope(authMode, appName);
  const periods = { activePeriodMs: manifest.activePeriodMs, idlePeriodMs: manifest.idlePeriodMs };
  const cookieAttributes = createCookieAttributesResolver(manifest, appName);
  const csrfCookie = manifest.csrfCookie !== false;
  const loadStore = async () => {
    if (manifest.store !== "module") return getProcessMemorySessionStore();
    let store = (await loadModule()).default;
    const nested = store?.default;
    if (!isSessionStore(store) && isSessionStore(nested)) store = nested;
    if (!isSessionStore(store)) {
      throw new Error(
        "[devora] the shared.sessions.store module must default-export a SessionStore ({ get, set, delete }) \u2014 see defineSessionStore()"
      );
    }
    return store;
  };
  return async (request) => ({
    ...scope,
    ...periods,
    store: await loadStore(),
    cookie: cookieAttributes(request?.isHttps === true),
    csrfCookie
  });
}

// ../core/src/securityHeaders.ts
import { randomBytes as randomBytes3 } from "node:crypto";
var DEFAULT_CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'";
var DEFAULT_FRAME_OPTIONS = "DENY";
var DEFAULT_HSTS_VALUE = "max-age=63072000; includeSubDomains";
function generateNonce() {
  return randomBytes3(16).toString("base64");
}
function addNonceToCsp(csp, nonce) {
  const directives = csp.split(";").map((d) => d.trim()).filter(Boolean);
  const nonceToken = `'nonce-${nonce}'`;
  let sawScriptSrc = false;
  let sawScriptSrcElem = false;
  const updated = directives.map((directive) => {
    if (directive === "script-src" || directive.startsWith("script-src ")) {
      sawScriptSrc = true;
      return `${directive} ${nonceToken}`;
    }
    if (directive === "script-src-elem" || directive.startsWith("script-src-elem ")) {
      sawScriptSrcElem = true;
      return `${directive} ${nonceToken}`;
    }
    return directive;
  });
  if (!sawScriptSrc && !sawScriptSrcElem) {
    updated.push(`script-src 'self' ${nonceToken}`);
  }
  return updated.join("; ");
}
function resolveSecurityHeaders(security, streamingNonce) {
  const baseCsp = security?.csp ?? DEFAULT_CSP;
  const headers = {
    "Content-Security-Policy": streamingNonce ? addNonceToCsp(baseCsp, streamingNonce) : baseCsp,
    "X-Frame-Options": security?.frameOptions ?? DEFAULT_FRAME_OPTIONS
  };
  if (security?.hsts !== false) {
    headers["Strict-Transport-Security"] = DEFAULT_HSTS_VALUE;
  }
  if (security?.noindex === true) {
    headers["X-Robots-Tag"] = "noindex";
  }
  return headers;
}

// ../core/src/sitemap.ts
function generateSitemapXml(routePaths, domain) {
  const urls = routePaths.filter((routePath) => !routePath.includes("[")).map((routePath) => `  <url><loc>https://${domain}${routePath === "/" ? "" : routePath}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ../core/src/islandComponent.tsx
var import_react2 = __toESM(require_react(), 1);
var IslandCollectorContext = (0, import_react2.createContext)(null);
var IslandStreamingContext = (0, import_react2.createContext)(null);
var streamingModuleCache = /* @__PURE__ */ new Map();
function clearStreamingModuleCache() {
  streamingModuleCache.clear();
}

// ../core/src/buildKey.ts
import path3 from "node:path";
function toBuildKey(appRoot, filePath) {
  const rel = path3.relative(appRoot, filePath);
  const noExt = rel.slice(0, -path3.extname(rel).length);
  return noExt.split(path3.sep).join("/").replace(/[[\]]/g, "_");
}

// ../core/src/prodRequestHandler.ts
import path6 from "node:path";
import { pathToFileURL } from "node:url";
import { readFile as readFile2 } from "node:fs/promises";
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "node:fs";

// ../core/src/branding.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ShellUsageContext = (0, import_react3.createContext)(null);

// ../core/src/renderRoute.ts
function resolveRenderMode(routeModule, appDefault) {
  return routeModule.renderMode ?? appDefault ?? "ssr";
}

// ../core/src/csrRoute.ts
function renderCsrShell(routeModule, entryUrl, csrClientUrl, devPreambleUrl, head = {}) {
  const meta = routeModule.meta?.(void 0);
  const canMount = entryUrl !== void 0 && csrClientUrl !== void 0;
  const bodyHtml = canMount ? `<div data-csr-entry="${escapeHtml(entryUrl)}"></div>` : "";
  return renderHtmlDocument({
    bodyHtml,
    meta,
    csrScriptUrl: canMount ? csrClientUrl : void 0,
    devPreambleUrl: canMount ? devPreambleUrl : void 0,
    // Rendered in the browser, so whether it uses PageShell can't be known here.
    head: { ...head, clientRendered: true }
  });
}

// ../core/src/isrCache.ts
import path4 from "node:path";
import { existsSync as existsSync2 } from "node:fs";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
function cachePaths(staticOutDir, routePath) {
  const base = path4.resolve(staticOutDir);
  const dir = routePath === "/" ? base : path4.resolve(base, routePath.slice(1));
  if (dir !== base && !dir.startsWith(base + path4.sep)) {
    throw new Error(
      `[devora] refusing to write ISR cache for route "${routePath}" \u2014 it resolves outside "${staticOutDir}". Check this route's getStaticParams() for a param value containing "/" or "..".`
    );
  }
  return { htmlPath: path4.join(dir, "index.html"), metaPath: path4.join(dir, "index.meta.json") };
}
async function readCachedRoute(staticOutDir, routePath) {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  if (!existsSync2(htmlPath)) return void 0;
  const html = await readFile(htmlPath, "utf-8");
  let renderedAt = 0;
  if (existsSync2(metaPath)) {
    try {
      renderedAt = JSON.parse(await readFile(metaPath, "utf-8")).renderedAt;
    } catch {
    }
  }
  return { html, renderedAt };
}
async function writeAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, data);
  await rename(tempPath, filePath);
}
async function writeCachedRoute(staticOutDir, routePath, html) {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  await mkdir(path4.dirname(htmlPath), { recursive: true });
  await writeAtomic(htmlPath, html);
  await writeAtomic(metaPath, JSON.stringify({ renderedAt: Date.now() }));
}
function isStale(renderedAt, revalidateSeconds) {
  return Date.now() - renderedAt > revalidateSeconds * 1e3;
}

// ../core/src/apiDispatch.ts
async function dispatchApiRoute(routeModule, request) {
  if (typeof routeModule.handler !== "function") {
    throw new Error("[devora] API route has no exported `handler` (see apiRoute.ts)");
  }
  if (routeModule.methods && !routeModule.methods.includes(request.method)) {
    return jsonMessageResponse(405, "Method Not Allowed", { Allow: routeModule.methods.join(", ") });
  }
  const apiReq = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    params: request.params ?? {},
    body: request.body
  };
  let getSetCookie = () => void 0;
  let result;
  try {
    const context = request.sessionCookieOptions ? await createRequestContext(
      { cookieHeader: request.cookieHeader, authorizationHeader: request.headers.authorization },
      request.sessionCookieOptions,
      request.params,
      request.meta
    ) : createNoAuthContext(request.params, request.meta);
    getSetCookie = context.getSetCookie;
    result = await routeModule.handler(apiReq, context.ctx);
    await context.settle();
  } catch (err) {
    result = apiErrorResponse(err);
  }
  return { ...result, setCookie: getSetCookie() };
}

// ../core/src/readBody.ts
var MAX_BODY_BYTES = 10 * 1024 * 1024;
var PayloadTooLargeError = class extends Error {
  constructor(maxBytes) {
    super(`[devora] request body exceeds the ${maxBytes}-byte limit`);
    this.name = "PayloadTooLargeError";
  }
};
async function readBodyWithLimit(req, maxBytes = MAX_BODY_BYTES) {
  const declared = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError(maxBytes);
  const chunks = [];
  let total = 0;
  let overflowed = false;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      overflowed = true;
      chunks.length = 0;
      if (total > maxBytes * 2) {
        req.destroy?.();
        break;
      }
      continue;
    }
    chunks.push(chunk);
  }
  if (overflowed) throw new PayloadTooLargeError(maxBytes);
  return Buffer.concat(chunks);
}
var MalformedBodyError = class extends Error {
  constructor(message) {
    super(`[devora] ${message}`);
    this.name = "MalformedBodyError";
  }
};
async function parseFormBody(body, contentType) {
  if (contentType && /^multipart\/form-data\b/i.test(contentType)) {
    try {
      return await new Response(body, { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new MalformedBodyError("malformed multipart/form-data body");
    }
  }
  const formData = new FormData();
  new URLSearchParams(body.toString("utf-8")).forEach((value, key) => formData.append(key, value));
  return formData;
}

// ../core/src/apiRoute.ts
function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

// ../core/src/apiDir.ts
import path5 from "node:path";
var DEFAULT_API_DIR = "api";
function normalizeApiDir(apiDir) {
  if (apiDir === void 0) return DEFAULT_API_DIR;
  const normalized = path5.posix.normalize(apiDir.replace(/\\/g, "/")).replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (normalized === "" || normalized === "." || path5.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`[devora] apiDir "${apiDir}" must be a folder inside the app, e.g. "endpoints".`);
  }
  const first = normalized.split("/")[0];
  if (first === "routes" || first === "dist" || first === "node_modules") {
    throw new Error(`[devora] apiDir "${apiDir}" can't live under ${first}/ \u2014 pick a separate folder, e.g. "endpoints".`);
  }
  return normalized;
}
function resolveApiDir(appRoot, apiDir) {
  return path5.join(appRoot, normalizeApiDir(apiDir));
}

// ../core/src/trustProxy.ts
function trustedProxyHops(setting) {
  if (setting === true) return 1;
  if (typeof setting === "number" && Number.isFinite(setting) && setting > 0) return Math.floor(setting);
  return 0;
}
function forwardedProto(headers) {
  const raw = headers["x-forwarded-proto"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const first = value?.split(",")[0]?.trim().toLowerCase();
  return first || void 0;
}
function isHttpsRequest(req, trustProxy) {
  if (req.socket?.encrypted === true) return true;
  return trustedProxyHops(trustProxy) > 0 && forwardedProto(req.headers) === "https";
}
function clientIp(req, trustProxy) {
  const peer = normalizeIp(req.socket?.remoteAddress);
  const hops = trustedProxyHops(trustProxy);
  if (hops === 0) return peer;
  const raw = req.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(raw) ? raw.join(",") : raw ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const chain = peer === void 0 ? forwarded : [...forwarded, peer];
  if (chain.length === 0) return void 0;
  return normalizeIp(chain[Math.max(0, chain.length - 1 - hops)]);
}
function normalizeIp(value) {
  if (typeof value !== "string" || value === "") return void 0;
  return value.startsWith("::ffff:") && value.includes(".") ? value.slice(7) : value;
}
function describeRequest(req, trustProxy) {
  const scheme = isHttpsRequest(req, trustProxy) ? "https" : "http";
  const forwardedHost = trustedProxyHops(trustProxy) > 0 ? firstHeaderValue(req.headers["x-forwarded-host"]) : void 0;
  const host = forwardedHost ?? firstHeaderValue(req.headers.host) ?? "localhost";
  let url;
  try {
    url = new URL(req.url ?? "/", `${scheme}://${host}`).href;
  } catch {
    url = new URL(req.url ?? "/", "http://localhost").href;
  }
  return { url, method: req.method ?? "GET", headers: req.headers, ip: clientIp(req, trustProxy) };
}
function firstHeaderValue(value) {
  const first = (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
  return first || void 0;
}

// ../core/src/prodRequestHandler.ts
var ASSET_CONTENT_TYPES = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8"
};
function createProdRequestHandler(appRoot, appName, authMode, domain, security, sitemapEnabled, appDefaultRenderMode, options = {}) {
  const routesDir = path6.join(appRoot, "routes");
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const serverOutDir = path6.join(appRoot, "dist", "server");
  const clientOutDir = path6.join(appRoot, "dist", "client");
  const staticOutDir = path6.join(appRoot, "dist", "static");
  const resolveSessionOptions = authMode === "none" ? void 0 : createSessionOptionsResolver(
    authMode,
    appName,
    readSessionManifest(serverOutDir),
    () => importBuilt(serverOutDir, SESSION_STORE_BUILD_KEY)
  );
  const trustProxy = options.trustProxy;
  const sessionOptionsForRequest = async (req) => resolveSessionOptions ? resolveSessionOptions({ isHttps: isHttpsRequest(req, trustProxy) }) : void 0;
  const warnIfSecureCookieOverHttp = createPlainHttpCookieWarning(appName);
  const securityHeaders = resolveSecurityHeaders(security);
  const islandManifestPath = path6.join(serverOutDir, "island-manifest.json");
  const csrManifestPath = path6.join(serverOutDir, "csr-route-manifest.json");
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const head = options.head;
  const routeStyles = readRouteCssManifest(path6.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE));
  const hasEntryServer = existsSync3(path6.join(serverOutDir, "entry-server.js"));
  const hasErrorPage = existsSync3(path6.join(serverOutDir, `${ERROR_PAGE_BUILD_KEY}.js`));
  const loadErrorPage = async () => hasErrorPage ? await importBuilt(serverOutDir, ERROR_PAGE_BUILD_KEY) : void 0;
  const errorPageStyles = routeStyles[ERROR_PAGE_BUILD_KEY];
  const sendErrorPage = async (res, status2, error) => {
    if (!hasEntryServer) return false;
    const entryServer = await importBuilt(serverOutDir, "entry-server");
    const renderError = entryServer.renderRoute?.renderError;
    res.statusCode = status2;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (typeof renderError !== "function") {
      res.end(`<!doctype html><title>${status2}</title><h1>${status2}</h1>`);
      return true;
    }
    res.end(renderError({ status: status2, error, head, errorPage: await loadErrorPage(), errorPageStyles }).html);
    return true;
  };
  return async function handleRequest(req, res) {
    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }
    if (!req.url) return false;
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/sitemap.xml") {
      if (!sitemapEnabled) return false;
      const xml = generateSitemapXml(listRoutePaths(routesDir), domain);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return true;
    }
    if (isApiPath(url.pathname)) {
      const apiMatch = matchRoute(apiDir, url.pathname.slice(4) || "/");
      if (!apiMatch) {
        sendApiResponse(res, apiNotFoundResponse());
        return true;
      }
      try {
        const apiBuildKey = toBuildKey(appRoot, apiMatch.filePath);
        const apiRouteModule = await importBuilt(serverOutDir, apiBuildKey);
        let body;
        try {
          body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBodyWithLimit(req, maxBodyBytes);
        } catch (err) {
          if (err instanceof PayloadTooLargeError) {
            sendApiResponse(res, jsonMessageResponse(413, err.message));
            return true;
          }
          throw err;
        }
        const apiResult = await dispatchApiRoute(apiRouteModule, {
          method: req.method ?? "GET",
          url: req.url,
          headers: req.headers,
          cookieHeader: req.headers.cookie,
          params: apiMatch.params,
          sessionCookieOptions: await sessionOptionsForRequest(req),
          body,
          meta: describeRequest(req, trustProxy)
        });
        if (apiResult.setCookie) {
          res.setHeader("Set-Cookie", apiResult.setCookie);
          warnIfSecureCookieOverHttp(req, apiResult.setCookie);
        }
        sendApiResponse(res, apiResult);
      } catch (err) {
        sendApiResponse(res, apiErrorResponse(err));
      }
      return true;
    }
    if (url.pathname.startsWith("/assets/")) {
      return serveAsset(clientOutDir, url.pathname, res, true);
    }
    if (url.pathname.startsWith("/@")) return false;
    if (url.pathname.includes(".")) {
      return serveAsset(clientOutDir, url.pathname, res, false);
    }
    const match = matchRoute(routesDir, url.pathname);
    if (!match) return sendErrorPage(res, 404);
    const buildKey = toBuildKey(appRoot, match.filePath);
    const routeModule = await importBuilt(serverOutDir, buildKey);
    const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
    const styles = routeStyles[buildKey];
    const meta = describeRequest(req, trustProxy);
    if (renderMode === "streaming") {
      if (routeModule.action) {
        throw new Error(
          `[devora] route "${match.routePath}" is renderMode: "streaming" but exports action \u2014 actions never run for streaming routes.`
        );
      }
      const entryServer2 = await importBuilt(serverOutDir, "entry-server");
      const islandClientUrl2 = await readIslandClientUrl(islandManifestPath);
      const nonce = generateNonce();
      res.setHeader("Content-Security-Policy", resolveSecurityHeaders(security, nonce)["Content-Security-Policy"]);
      const result2 = await entryServer2.renderStreaming(routeModule, {
        cookieHeader: req.headers.cookie,
        authorizationHeader: req.headers.authorization,
        params: match.params,
        sessionCookieOptions: await sessionOptionsForRequest(req),
        islandClientUrl: islandClientUrl2,
        nonce,
        meta,
        head,
        styles,
        errorPage: await loadErrorPage(),
        errorPageStyles
      });
      if (!result2) return false;
      if (result2.error !== void 0 && result2.status >= 500) console.error(`[devora] "${appName}" page error:`, result2.error);
      if (result2.redirectTo) {
        if (result2.setCookie) res.setHeader("Set-Cookie", result2.setCookie);
        res.statusCode = result2.status;
        res.setHeader("Location", result2.redirectTo);
        res.end();
        return true;
      }
      if (result2.setCookie) {
        res.setHeader("Set-Cookie", result2.setCookie);
        warnIfSecureCookieOverHttp(req, result2.setCookie);
      }
      res.statusCode = result2.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      await new Promise((resolve) => {
        res.once("finish", resolve);
        result2.pipeTo(res, (error, phase) => {
          console.error(`[devora] streaming error ("${phase}") on "${match.routePath}":`, error);
          if (phase === "shell" && !res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
            resolve();
          }
        });
      });
      return true;
    }
    if (renderMode === "csr") {
      const csrManifest = await readCsrManifest(csrManifestPath);
      const html = renderCsrShell(routeModule, csrManifest.routes[buildKey], csrManifest.csrClientUrl, void 0, {
        appHead: head,
        styles
      });
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return true;
    }
    if (renderMode === "ssg" || renderMode === "isr") {
      let cached = await readCachedRoute(staticOutDir, match.routePath);
      if (renderMode === "ssg") {
        if (!cached) return sendErrorPage(res, 404);
      } else {
        if (isDynamicRouteFile(routesDir, match.filePath) && typeof routeModule.getStaticParams === "function") {
          const declaredParams = await routeModule.getStaticParams();
          const allowed = declaredParams.some(
            (params) => resolveStaticRoutePath(routesDir, match.filePath, params) === match.routePath
          );
          if (!allowed) return sendErrorPage(res, 404);
        }
        const revalidateSeconds = routeModule.revalidate?.seconds;
        if (!cached || revalidateSeconds !== void 0 && isStale(cached.renderedAt, revalidateSeconds)) {
          const entryServer2 = await importBuilt(serverOutDir, "entry-server");
          const islandClientUrl2 = await readIslandClientUrl(islandManifestPath);
          const { html } = await entryServer2.renderStatic(routeModule, {
            islandClientUrl: islandClientUrl2,
            params: match.params,
            url: new URL(match.routePath, meta.url).href,
            head,
            styles
          });
          await writeCachedRoute(staticOutDir, match.routePath, html);
          cached = { html, renderedAt: Date.now() };
        }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(cached.html);
      return true;
    }
    const entryServer = await importBuilt(serverOutDir, "entry-server");
    const islandClientUrl = await readIslandClientUrl(islandManifestPath);
    let formData;
    try {
      formData = req.method === "POST" ? await parseFormBody(await readBodyWithLimit(req, maxBodyBytes), req.headers["content-type"]) : void 0;
    } catch (err) {
      if (err instanceof PayloadTooLargeError) return sendErrorPage(res, 413, new HttpError(413, "Request body too large"));
      if (err instanceof MalformedBodyError) return sendErrorPage(res, 400, new HttpError(400, "Malformed form body"));
      throw err;
    }
    const result = await entryServer.renderRoute(routeModule, {
      method: req.method ?? "GET",
      formData,
      cookieHeader: req.headers.cookie,
      authorizationHeader: req.headers.authorization,
      params: match.params,
      sessionCookieOptions: await sessionOptionsForRequest(req),
      islandClientUrl,
      appDefaultRenderMode,
      meta,
      head,
      styles,
      errorPage: await loadErrorPage(),
      errorPageStyles
    });
    if (!result) return false;
    if (result.error !== void 0 && result.status >= 500) console.error(`[devora] "${appName}" page error:`, result.error);
    if (result.setCookie) {
      res.setHeader("Set-Cookie", result.setCookie);
      warnIfSecureCookieOverHttp(req, result.setCookie);
    }
    if (result.redirectTo) {
      res.statusCode = result.status;
      res.setHeader("Location", result.redirectTo);
      res.end();
      return true;
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(result.html);
    return true;
  };
}
function createPlainHttpCookieWarning(appName) {
  let warned = false;
  return (req, setCookie) => {
    if (warned || !setCookie.some((cookie) => /;\s*Secure\s*(;|$)/i.test(cookie))) return;
    if (isHttpsRequest(req, true)) return;
    const host = (req.headers.host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1") return;
    warned = true;
    console.warn(
      `[devora] "${appName}": sent a Secure cookie on what looks like a plain-HTTP request (Host: ${req.headers.host ?? "?"}). Browsers drop Secure cookies over HTTP, so logins here won't stick. Serve the app over HTTPS, or set shared.sessions.cookie.secure in devora.config.ts to "auto" (with trustProxy: true in app.config.ts behind an HTTPS proxy) or false.`
    );
  };
}
function sendApiResponse(res, result) {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  res.statusCode = result.status;
  res.end(result.body ?? "");
}
async function readIslandClientUrl(manifestPath) {
  if (!existsSync3(manifestPath)) return void 0;
  try {
    const raw = await readFile2(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.islandClientUrl;
  } catch {
    return void 0;
  }
}
async function readCsrManifest(manifestPath) {
  if (!existsSync3(manifestPath)) return { routes: {} };
  try {
    const parsed = JSON.parse(await readFile2(manifestPath, "utf-8"));
    return { csrClientUrl: parsed.csrClientUrl ?? void 0, routes: parsed.routes ?? {} };
  } catch {
    return { routes: {} };
  }
}
async function serveAsset(clientOutDir, pathname, res, immutable) {
  const filePath = path6.join(clientOutDir, pathname);
  if (!filePath.startsWith(clientOutDir + path6.sep)) return false;
  if (!existsSync3(filePath)) return false;
  const body = await readFile2(filePath);
  const contentType = ASSET_CONTENT_TYPES[path6.extname(filePath)] ?? "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Cache-Control",
    immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600"
  );
  res.end(body);
  return true;
}
async function importBuilt(serverOutDir, key) {
  const filePath = path6.join(serverOutDir, `${key}.js`);
  const mod = await import(
    /* @vite-ignore */
    pathToFileURL(filePath).href
  );
  return unwrapCjsDefaultInterop(mod);
}
function unwrapCjsDefaultInterop(mod) {
  const inner = mod.default;
  if (inner && typeof mod.default !== "function" && typeof inner.default === "function") {
    return inner;
  }
  return mod;
}
var ROUTE_CSS_MANIFEST_FILE = "route-css-manifest.json";
var ERROR_PAGE_BUILD_KEY = "error-page";
function readRouteCssManifest(manifestPath) {
  if (!existsSync3(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync2(manifestPath, "utf-8"));
  } catch {
    return {};
  }
}

// ../core/src/disposeRegistry.ts
function registry() {
  if (!globalThis.__devoraDisposables) {
    globalThis.__devoraDisposables = /* @__PURE__ */ new Map();
  }
  return globalThis.__devoraDisposables;
}
function normalizeKey(fileUrlOrPath) {
  return fileUrlOrPath.startsWith("file://") ? new URL(fileUrlOrPath).pathname : fileUrlOrPath;
}
function runAndClearDisposable(filePath) {
  const key = normalizeKey(filePath);
  const dispose = registry().get(key);
  if (!dispose) return;
  registry().delete(key);
  dispose();
}

// ../core/src/loadProjectConfig.ts
import path7 from "node:path";
import { existsSync as existsSync4 } from "node:fs";
import { createJiti } from "jiti";
async function loadProjectConfig(root = process.cwd()) {
  const configPath = path7.join(root, "devora.config.ts");
  if (!existsSync4(configPath)) {
    throw new Error(
      `[devora] no devora.config.ts found at ${configPath}. Every Devora.js project must declare its apps here \u2014 see architecture doc \xA73.`
    );
  }
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const mod = await jiti.import(configPath);
  const config = mod.default;
  if (!config?.apps?.length) {
    throw new Error(`[devora] devora.config.ts must declare at least one app.`);
  }
  return config;
}
function resolveAppDir(root, appDir) {
  return path7.join(root, appDir);
}

// ../core/src/loadAppConfig.ts
import path8 from "node:path";
import { existsSync as existsSync5 } from "node:fs";
import { createJiti as createJiti2 } from "jiti";
async function loadAppConfig(appRoot) {
  const configPath = path8.join(appRoot, "app.config.ts");
  if (!existsSync5(configPath)) return {};
  const jiti = createJiti2(import.meta.url, { interopDefault: true });
  const mod = await jiti.import(configPath);
  return mod.default ?? {};
}

// src/server/ssrMiddleware.ts
import path10 from "node:path";
import { existsSync as existsSync6 } from "node:fs";

// src/server/devSessionOptions.ts
import path9 from "node:path";
function createDevSessionOptionsResolver(vite, projectRoot, sessions, authMode, appName, manifest = toSessionManifest(sessions)) {
  if (authMode === "none") return void 0;
  const storeModule = sessions?.store && sessions.store !== "memory" ? path9.resolve(projectRoot, sessions.store) : void 0;
  const resolve = createSessionOptionsResolver(authMode, appName, manifest, () => vite.ssrLoadModule(storeModule));
  return () => resolve();
}

// src/server/reactRefreshPreamblePlugin.ts
import viteReact from "@vitejs/plugin-react";
var VIRTUAL_ID = "virtual:devora-react-refresh-preamble";
var RESOLVED_ID = "\0" + VIRTUAL_ID;
function reactRefreshPreamblePlugin() {
  return {
    name: "devora-react-refresh-preamble",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const code = viteReact.preambleCode.replace("__BASE__", "/");
      return { code, map: null };
    }
  };
}
var REACT_REFRESH_PREAMBLE_VIRTUAL_ID = VIRTUAL_ID;

// src/server/ssrMiddleware.ts
var DEV_PREAMBLE_URL = `/@id/${REACT_REFRESH_PREAMBLE_VIRTUAL_ID}`;
function createSsrMiddleware(vite, appRoot, appName, authMode, domain, sitemapEnabled, appDefaultRenderMode, security, sessions, page = {}) {
  const routesDir = path10.join(appRoot, "routes");
  const entryServerPath = path10.join(appRoot, "entry-server.tsx");
  const errorPagePath = ERROR_PAGE_FILES.map((f) => path10.join(appRoot, f)).find((f) => existsSync6(f));
  const { head, trustProxy } = page;
  const maxBodyBytes = page.maxBodyBytes ?? MAX_BODY_BYTES;
  const loadErrorPage = async () => errorPagePath ? await vite.ssrLoadModule(errorPagePath) : void 0;
  const errorPageStyles = () => errorPagePath ? collectCssUrls(vite, errorPagePath) : void 0;
  const sendErrorPage = async (res, status2, error) => {
    const entryServer = await vite.ssrLoadModule(entryServerPath);
    const renderError = entryServer.renderRoute?.renderError;
    res.statusCode = status2;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (typeof renderError !== "function") {
      res.end(`<!doctype html><title>${status2}</title><h1>${status2}</h1>`);
      return;
    }
    res.end(renderError({ status: status2, error, head, errorPage: await loadErrorPage(), errorPageStyles: errorPageStyles() }).html);
  };
  const resolveSessionOptions = createDevSessionOptionsResolver(
    vite,
    sessions.projectRoot,
    sessions.config,
    authMode,
    appName,
    sessions.manifest
  );
  const logPageError = (status2, error) => {
    if (error === void 0 || status2 < 500) return;
    if (error instanceof Error) vite.ssrFixStacktrace(error);
    console.error(`[devora] "${appName}" page error:`, error);
  };
  return async function ssrMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/sitemap.xml") {
      if (!sitemapEnabled) return next();
      const xml = generateSitemapXml(listRoutePaths(routesDir), domain);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return;
    }
    if (url.pathname.startsWith("/@") || url.pathname.includes(".")) {
      return next();
    }
    const match = matchRoute(routesDir, url.pathname);
    if (!match) {
      try {
        return await sendErrorPage(res, 404);
      } catch (err) {
        return next(err);
      }
    }
    try {
      const routeModule = await vite.ssrLoadModule(match.filePath);
      const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
      const styles = collectCssUrls(vite, match.filePath);
      const meta = describeRequest(req, trustProxy);
      if (renderMode === "csr") {
        const html = renderCsrShell(routeModule, `/@fs/${match.filePath}`, "/csr-client.tsx", DEV_PREAMBLE_URL, {
          appHead: head,
          styles
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      const entryServer = await vite.ssrLoadModule(entryServerPath);
      const errorPage = await loadErrorPage();
      if (renderMode === "streaming") {
        if (routeModule.action) {
          throw new Error(
            `[devora] route "${match.routePath}" is renderMode: "streaming" but exports action \u2014 actions never run for streaming routes.`
          );
        }
        const nonce = generateNonce();
        res.setHeader("Content-Security-Policy", resolveSecurityHeaders(security, nonce)["Content-Security-Policy"]);
        const result2 = await entryServer.renderStreaming(routeModule, {
          cookieHeader: req.headers.cookie,
          authorizationHeader: req.headers.authorization,
          params: match.params,
          sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : void 0,
          islandClientUrl: "/island-client.tsx",
          devPreambleUrl: DEV_PREAMBLE_URL,
          nonce,
          meta,
          head,
          styles,
          errorPage,
          errorPageStyles: errorPageStyles()
        });
        if (!result2) return next();
        logPageError(result2.status, result2.error);
        if (result2.redirectTo) {
          if (result2.setCookie) res.setHeader("Set-Cookie", result2.setCookie);
          res.statusCode = result2.status;
          res.setHeader("Location", result2.redirectTo);
          res.end();
          return;
        }
        if (result2.setCookie) res.setHeader("Set-Cookie", result2.setCookie);
        res.statusCode = result2.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        result2.pipeTo(res, (error, phase) => {
          if (phase === "shell") {
            vite.ssrFixStacktrace(error);
            next(error);
            return;
          }
          console.error(`[devora] streaming error on "${match.routePath}":`, error);
        });
        return;
      }
      if (renderMode === "ssg" || renderMode === "isr") {
        if (routeModule.action) {
          throw new Error(
            `[devora] route "${match.routePath}" is renderMode: "${renderMode}" but exports action \u2014 actions never run for ${renderMode} routes.`
          );
        }
        const { html } = await entryServer.renderStatic(routeModule, {
          islandClientUrl: "/island-client.tsx",
          params: match.params,
          devPreambleUrl: DEV_PREAMBLE_URL,
          url: new URL(url.pathname, meta.url).href,
          head,
          styles
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      let formData;
      try {
        formData = req.method === "POST" ? await parseFormBody(await readBodyWithLimit(req, maxBodyBytes), req.headers["content-type"]) : void 0;
      } catch (err) {
        if (err instanceof PayloadTooLargeError) return await sendErrorPage(res, 413, new HttpError(413, "Request body too large"));
        if (err instanceof MalformedBodyError) return await sendErrorPage(res, 400, new HttpError(400, "Malformed form body"));
        throw err;
      }
      const result = await entryServer.renderRoute(routeModule, {
        method: req.method ?? "GET",
        formData,
        cookieHeader: req.headers.cookie,
        authorizationHeader: req.headers.authorization,
        params: match.params,
        sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : void 0,
        // Dev serves any app-root file by path (Vite's own dev middleware) —
        // production resolves a real hashed URL instead, see ROADMAP.md #4.
        islandClientUrl: "/island-client.tsx",
        appDefaultRenderMode,
        devPreambleUrl: DEV_PREAMBLE_URL,
        meta,
        head,
        styles,
        errorPage,
        errorPageStyles: errorPageStyles()
      });
      if (!result) {
        return next();
      }
      logPageError(result.status, result.error);
      if (result.setCookie) {
        res.setHeader("Set-Cookie", result.setCookie);
      }
      if (result.redirectTo) {
        res.statusCode = result.status;
        res.setHeader("Location", result.redirectTo);
        res.end();
        return;
      }
      res.statusCode = result.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(result.html);
    } catch (err) {
      vite.ssrFixStacktrace(err);
      next(err);
    }
  };
}
var ERROR_PAGE_FILES = ["error.tsx", "error.jsx", "error.ts", "error.js"];
var CSS_FILE_RE = /\.(css|scss|sass|less|styl|stylus|pcss|postcss)$/;
function collectCssUrls(vite, file) {
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.id && CSS_FILE_RE.test(node.id)) {
      urls.push(node.url);
      return;
    }
    for (const dep of node.importedModules) visit(dep);
  };
  for (const node of vite.moduleGraph.getModulesByFile(file) ?? []) visit(node);
  return urls;
}

// src/server/apiMiddleware.ts
function createApiMiddlewarePlugin(options) {
  return {
    name: "devora-api-middleware",
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(server, options));
    }
  };
}
function createApiMiddleware(vite, options) {
  const { appRoot, appName, authMode, security } = options;
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const resolveSessionOptions = createDevSessionOptionsResolver(
    vite,
    options.projectRoot,
    options.sessions,
    authMode,
    appName,
    options.sessionManifest
  );
  const securityHeaders = resolveSecurityHeaders(security);
  return async function apiMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = new URL(req.url, "http://localhost");
    if (!isApiPath(url.pathname)) return next();
    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }
    const match = matchRoute(apiDir, url.pathname.slice(4) || "/");
    if (!match) return sendApiResponse2(res, apiNotFoundResponse());
    try {
      const routeModule = await vite.ssrLoadModule(match.filePath);
      let body;
      try {
        body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBodyWithLimit(req, options.maxBodyBytes);
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          return sendApiResponse2(res, jsonMessageResponse(413, err.message));
        }
        throw err;
      }
      const result = await dispatchApiRoute(routeModule, {
        method: req.method ?? "GET",
        url: req.url,
        headers: req.headers,
        cookieHeader: req.headers.cookie,
        params: match.params,
        sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : void 0,
        body,
        meta: describeRequest(req, options.trustProxy)
      });
      if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
      sendApiResponse2(res, result);
    } catch (err) {
      vite.ssrFixStacktrace(err);
      sendApiResponse2(res, apiErrorResponse(err));
    }
  };
}
function sendApiResponse2(res, result) {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  res.statusCode = result.status;
  res.end(result.body ?? "");
}

// src/server/securityHeadersMiddleware.ts
function createSecurityHeadersMiddleware(security) {
  const headers = resolveSecurityHeaders(security);
  return function securityHeadersMiddleware(_req, res, next) {
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    next();
  };
}

// src/build/islandCalls.ts
var CORE_MODULES = /* @__PURE__ */ new Set(["@devorajs/core", "@devorajs/core/client"]);
function isNode(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string";
}
function walk(node, visit) {
  visit(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) if (isNode(item)) walk(item, visit);
    } else if (isNode(child)) {
      walk(child, visit);
    }
  }
}
function findIslandCalls(program2) {
  const localNames = /* @__PURE__ */ new Set();
  const namespaces = /* @__PURE__ */ new Set();
  for (const statement of program2.body ?? []) {
    if (statement.type !== "ImportDeclaration") continue;
    const source = statement.source.value;
    if (typeof source !== "string" || !CORE_MODULES.has(source)) continue;
    for (const spec of statement.specifiers) {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.imported;
        const importedName = imported.type === "Identifier" ? imported.name : imported.value;
        if (importedName === "island") localNames.add(spec.local.name);
      } else if (spec.type === "ImportNamespaceSpecifier") {
        namespaces.add(spec.local.name);
      }
    }
  }
  const supported = [];
  const unsupported = [];
  if (localNames.size === 0 && namespaces.size === 0) return { supported, unsupported };
  walk(program2, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee;
    const isIsland = callee.type === "Identifier" && localNames.has(callee.name) || callee.type === "MemberExpression" && !callee.computed && callee.object.type === "Identifier" && namespaces.has(callee.object.name) && callee.property.name === "island";
    if (!isIsland) return;
    const args = node.arguments;
    const loader = args[0];
    const specifier = loader ? literalImportSpecifier(loader) : void 0;
    if (specifier === void 0) {
      unsupported.push({ start: node.start, alreadyResolved: false });
      return;
    }
    supported.push({ start: node.start, specifier, insertAt: loader.end, alreadyResolved: args.length > 1 });
  });
  return { supported, unsupported };
}
function literalImportSpecifier(loader) {
  if (loader.type !== "ArrowFunctionExpression" || loader.params.length !== 0) return void 0;
  const body = loader.body;
  if (body.type !== "ImportExpression") return void 0;
  const source = body.source;
  if (source.type === "Literal" && typeof source.value === "string") return source.value;
  if (source.type === "TemplateLiteral" && source.expressions.length === 0) {
    const quasi = source.quasis[0];
    const cooked = quasi?.value?.cooked;
    return typeof cooked === "string" ? cooked : void 0;
  }
  return void 0;
}
var UNSUPPORTED_ISLAND_CALL_MESSAGE = '[devora] island() must be called as island(() => import("./Component")) \u2014 with a literal path, so the build knows which file to ship to the browser. Wrap a computed or shared loader in that form at the call site.';
function insertIslandUrls(code, edits) {
  let result = code;
  for (const edit of [...edits].sort((a, b) => b.insertAt - a.insertAt)) {
    result = result.slice(0, edit.insertAt) + `, ${JSON.stringify(edit.url)}` + result.slice(edit.insertAt);
  }
  return result;
}
var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeMappingLine(line, state) {
  const segments = [];
  let generatedColumn = 0;
  for (const segment of line.split(",")) {
    if (!segment) continue;
    const values = [];
    let value = 0;
    let shift = 0;
    for (const char of segment) {
      const digit = BASE64.indexOf(char);
      value += (digit & 31) << shift;
      if (digit & 32) {
        shift += 5;
      } else {
        values.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
    }
    generatedColumn += values[0] ?? 0;
    if (values.length >= 4) {
      state[0] += values[1];
      state[1] += values[2];
      state[2] += values[3];
      segments.push([generatedColumn, state[0], state[1], state[2]]);
    }
  }
  return segments;
}
function originalLocation(code, offset, map) {
  if (!map?.mappings) return void 0;
  const before = code.slice(0, offset);
  const generatedLine = before.split("\n").length - 1;
  const generatedColumn = offset - (before.lastIndexOf("\n") + 1);
  const state = [0, 0, 0];
  const lines = map.mappings.split(";");
  let best;
  for (let i = 0; i <= generatedLine && i < lines.length; i++) {
    const segments = decodeMappingLine(lines[i], state);
    if (i !== generatedLine) continue;
    for (const segment of segments) if (segment[0] <= generatedColumn) best = segment;
  }
  return best ? { line: best[2] + 1, column: best[3] } : void 0;
}

// src/islandsPlugin.ts
function islandsPlugin() {
  return {
    name: "framework:islands",
    async transform(code, id) {
      if (id.includes("node_modules") || id.startsWith("\0") || !/\.(tsx|ts|jsx|js|mjs)$/.test(id) || !code.includes("island")) {
        return null;
      }
      const { supported, unsupported } = findIslandCalls(this.parse(code));
      if (unsupported.length > 0) {
        const loc = originalLocation(code, unsupported[0].start, this.getCombinedSourcemap());
        if (loc) this.error({ message: UNSUPPORTED_ISLAND_CALL_MESSAGE, id, loc: { file: id, ...loc } });
        this.error(UNSUPPORTED_ISLAND_CALL_MESSAGE, unsupported[0].start);
      }
      const edits = [];
      for (const call of supported) {
        if (call.alreadyResolved) continue;
        const resolved = await this.resolve(call.specifier, id);
        if (!resolved) continue;
        edits.push({ insertAt: call.insertAt, url: `/@fs${resolved.id.split("?")[0]}` });
      }
      if (edits.length === 0) return null;
      return { code: insertIslandUrls(code, edits), map: null };
    }
  };
}

// src/server/moduleDisposePlugin.ts
function moduleDisposePlugin() {
  return {
    name: "devora-module-dispose",
    handleHotUpdate(ctx) {
      const files = /* @__PURE__ */ new Set([ctx.file, ...ctx.modules.map((m) => m.file).filter((f) => f !== null)]);
      for (const file of files) {
        runAndClearDisposable(file);
      }
      clearStreamingModuleCache();
    }
  };
}

// src/build/checkNoAuthUsage.ts
import fs2 from "node:fs";
var SESSION_METHOD_CALL_RE = /\bctx\.(requireAuth|setSession|revokeSession|clearSession|verifyCsrf)\s*\(/g;
function checkNoAuthUsage(sourceFiles) {
  const violations = [];
  for (const file of sourceFiles) {
    const code = fs2.readFileSync(file, "utf-8");
    for (const match of code.matchAll(SESSION_METHOD_CALL_RE)) {
      violations.push({ file, method: match[1] });
    }
  }
  return violations;
}
function assertNoAuthUsage(appName, sourceFiles) {
  const violations = checkNoAuthUsage(sourceFiles);
  if (violations.length === 0) return;
  const lines = violations.map((v) => `  - ${v.file}: ctx.${v.method}()`);
  throw new Error(
    `[devora] app "${appName}" has auth: "none" in devora.config.ts, but the following route(s) call session methods that will throw at request time:
${lines.join("\n")}
Set auth: "shared" or "isolated" for "${appName}" if it needs login, or remove these calls.`
  );
}

// src/build/devoraError.ts
function isDevoraError(err) {
  return err instanceof Error && err.message.startsWith("[devora]");
}

// src/server/devNetwork.ts
import net from "node:net";
import os from "node:os";
var DEV_BASE_PORT = 1e4;
function isAcceptingConnections(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(300, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}
function canBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}
async function isPortFree(port, bindHost) {
  if (await isAcceptingConnections(port, "127.0.0.1") || await isAcceptingConnections(port, "::1")) return false;
  return canBind(port, bindHost);
}
async function findFreePort(preferred, claimed, bindHost, maxAttempts = 100) {
  for (let port = preferred; port < preferred + maxAttempts && port <= 65535; port++) {
    if (claimed.has(port)) continue;
    if (await isPortFree(port, bindHost)) return port;
  }
  throw new Error(`[devora] no free port found in ${preferred}\u2013${preferred + maxAttempts - 1}`);
}
function getLanAddresses() {
  const addresses = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const info of iface ?? []) {
      if (info.family !== "IPv4" || info.internal || info.address.startsWith("169.254.")) continue;
      addresses.push(info.address);
    }
  }
  return addresses;
}
function isLoopbackAddress(address) {
  return address === "::1" || address === "localhost" || address.startsWith("127.") || address === "::ffff:127.0.0.1";
}
function isWildcardAddress(address) {
  return address === "::" || address === "0.0.0.0" || address === "";
}

// src/commands/dev.ts
async function createAppDevServer(opts) {
  const { app, appRoot, authMode, appConfig } = opts;
  const sessionManifest = resolveSessionManifest({
    appName: app.name,
    appDomain: app.domain,
    authMode,
    sessions: opts.sessions,
    appSessions: appConfig.sessions,
    csrf: appConfig.csrf
  });
  const server = await createServer({
    root: appRoot,
    appType: "custom",
    // we own the HTML response — see ../server/ssrMiddleware.ts
    // strictPort: the port was already checked and chosen by dev() below
    // (which logs any move), so Vite silently picking yet another one would
    // make the printed URLs wrong. `host` is only passed when --host was
    // given — otherwise it's left to the app's own vite.config.ts (default:
    // loopback only), and the boot output reports whatever actually bound.
    server: { port: opts.port, strictPort: true, ...opts.host ? { host: true } : {} },
    configFile: path11.join(appRoot, "vite.config.ts"),
    // Injected here rather than requiring every app's vite.config.ts to
    // import framework internals — Vite merges this with the app's own
    // plugins array (see ROADMAP.md #3).
    // apiMiddlewarePlugin must run before Vite's own internal middlewares
    // (see apiMiddleware.ts's doc comment on why) — passed as a plugin,
    // not a post-hoc server.middlewares.use() call, for exactly that
    // reason.
    plugins: [
      islandsPlugin(),
      moduleDisposePlugin(),
      reactRefreshPreamblePlugin(),
      createApiMiddlewarePlugin({
        appRoot,
        appName: app.name,
        authMode,
        security: appConfig.security,
        projectRoot: opts.projectRoot,
        sessions: opts.sessions,
        apiDir: appConfig.apiDir,
        sessionManifest,
        maxBodyBytes: appConfig.maxBodyBytes,
        trustProxy: appConfig.trustProxy
      })
    ]
  });
  server.middlewares.use(createSecurityHeadersMiddleware(appConfig.security));
  if (appConfig.backendOnly !== true) {
    server.middlewares.use(
      createSsrMiddleware(
        server,
        appRoot,
        app.name,
        authMode,
        app.domain,
        appConfig.sitemap === true,
        appConfig.defaultRenderMode,
        appConfig.security,
        { projectRoot: opts.projectRoot, config: opts.sessions, manifest: sessionManifest },
        { head: appConfig.head, maxBodyBytes: appConfig.maxBodyBytes, trustProxy: appConfig.trustProxy }
      )
    );
  }
  await server.listen();
  return server;
}
async function dev(opts) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  const claimed = /* @__PURE__ */ new Set();
  const booted = [];
  for (const app of apps) {
    const authMode = resolveAuthMode(project, app.name);
    const appRoot = resolveAppDir(root, app.dir);
    const appConfig = await loadAppConfig(appRoot);
    if (authMode === "none") {
      assertNoAuthUsage(app.name, [
        ...listRouteFiles(path11.join(appRoot, "routes")),
        ...listRouteFiles(resolveApiDir(appRoot, appConfig.apiDir))
      ]);
    }
    const preferred = app.devPort ?? DEV_BASE_PORT + project.apps.indexOf(app);
    const port = await findFreePort(preferred, claimed, opts.host ? void 0 : "localhost");
    if (port !== preferred) {
      const reason = claimed.has(preferred) ? "was assigned to an earlier app" : "is in use";
      console.log(`[devora] port ${preferred} ${reason} \u2014 "${app.name}" moved to ${port}`);
    }
    claimed.add(port);
    let server;
    try {
      server = await createAppDevServer({
        projectRoot: root,
        app,
        appRoot,
        authMode,
        appConfig,
        sessions: project.shared.sessions,
        port,
        host: opts.host
      });
    } catch (err) {
      if (!isDevoraError(err)) throw err;
      console.error(err.message);
      process.exit(1);
    }
    booted.push({ app, authMode, appRoot, apiDir: appConfig.apiDir, server });
  }
  printBootSummary(booted);
}
function printBootSummary(booted) {
  const lanAddresses = getLanAddresses();
  const exposedUrls = [];
  const lines = [""];
  for (const { app, authMode, appRoot, apiDir, server } of booted) {
    const address = server.httpServer?.address();
    const port = address?.port ?? server.config.server.port;
    const boundHost = address?.address ?? "localhost";
    const networkHosts = isWildcardAddress(boundHost) ? lanAddresses : isLoopbackAddress(boundHost) ? [] : [boundHost];
    const networkUrls = networkHosts.map((h) => `http://${h}:${port}`);
    if (!isLoopbackAddress(boundHost)) exposedUrls.push(networkUrls[0] ?? `port ${port}`);
    const pages = listRoutePaths(path11.join(appRoot, "routes")).sort();
    const apis = listRoutePaths(resolveApiDir(appRoot, apiDir)).sort().map((p) => p === "/" ? "/api" : `/api${p}`);
    lines.push(`  ${app.name}  (auth: ${authMode}, prod domain: ${app.domain})`);
    lines.push(`    Local:    http://localhost:${port}/`);
    for (const url of networkUrls) lines.push(`    Network:  ${url}/`);
    if (networkUrls.length === 0) {
      lines.push(
        isWildcardAddress(boundHost) ? `    Network:  (all interfaces, but no LAN address detected)` : `    Network:  use --host to expose`
      );
    }
    if (apis.length > 0) {
      lines.push(`    API:      ${networkUrls[0] ?? `http://localhost:${port}`}/api`);
    }
    const routeRows = [...pages.map((p) => ["page", p]), ...apis.map((p) => ["api", p])];
    if (routeRows.length > 0) {
      lines.push(`    Routes:`);
      for (const [kind, routePath] of routeRows) lines.push(`      ${kind.padEnd(5)}${routePath}`);
    } else {
      lines.push(`    Routes:   (none yet \u2014 add a file under routes/ or ${normalizeApiDir(apiDir)}/)`);
    }
    lines.push("");
  }
  if (exposedUrls.length > 0) {
    lines.push(
      `  \u26A0 Dev server is reachable on your local network at ${exposedUrls[0]} \u2014 anyone on this network can access it.`
    );
    lines.push("");
  }
  console.log(lines.join("\n"));
}

// src/build/buildForAdapter.ts
import path24 from "node:path";

// src/build/buildAppServer.ts
import path13 from "node:path";
import { existsSync as existsSync8 } from "node:fs";
import { copyFile, mkdir as mkdir2, readdir, readFile as readFile4, writeFile as writeFile2 } from "node:fs/promises";
import { build as viteBuild2 } from "vite";

// src/build/buildAppClient.ts
import path12 from "node:path";
import { readFile as readFile3, cp } from "node:fs/promises";
import { existsSync as existsSync7 } from "node:fs";
import { build as viteBuild, resolveConfig } from "vite";
import { createHash } from "node:crypto";

// src/build/discoverCsrRouteFiles.ts
import fs3 from "node:fs";
var CSR_RENDER_MODE_RE = /renderMode\s*=\s*["']csr["']/;
function discoverCsrRouteFiles(sourceFiles) {
  return sourceFiles.filter((file) => CSR_RENDER_MODE_RE.test(fs3.readFileSync(file, "utf-8")));
}

// src/build/buildAppClient.ts
async function buildAppClient(appRoot, islandFiles) {
  const routesDir = path12.join(appRoot, "routes");
  const routeFiles = listRouteFiles(routesDir);
  const csrFiles = discoverCsrRouteFiles(routeFiles);
  if (islandFiles.length === 0 && csrFiles.length === 0) {
    const resolved = await resolveConfig(
      { root: appRoot, configFile: path12.join(appRoot, "vite.config.ts") },
      "build"
    );
    if (resolved.publicDir && existsSync7(resolved.publicDir)) {
      await cp(resolved.publicDir, path12.join(appRoot, "dist", "client"), { recursive: true });
    }
    return { islandUrls: /* @__PURE__ */ new Map(), csrUrls: /* @__PURE__ */ new Map() };
  }
  const islandClientPath = path12.join(appRoot, "island-client.tsx");
  const csrClientPath = path12.join(appRoot, "csr-client.tsx");
  const clientOutDir = path12.join(appRoot, "dist", "client");
  const input = {};
  if (islandFiles.length > 0) input["island-client"] = islandClientPath;
  if (csrFiles.length > 0) input["csr-client"] = csrClientPath;
  for (const file of islandFiles) {
    input[clientEntryName(appRoot, file)] = file;
  }
  for (const file of csrFiles) {
    input[toBuildKey(appRoot, file)] = file;
  }
  await viteBuild({
    root: appRoot,
    configFile: path12.join(appRoot, "vite.config.ts"),
    build: {
      outDir: clientOutDir,
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input,
        // Real, previously-undiscovered bug, found while verifying csr's
        // production build by actually inspecting a built chunk's exports
        // (not just its content-type/status code, which is all earlier
        // island verification checked): Rollup's default
        // preserveEntrySignatures ("exports-only") does NOT reliably keep
        // an entry's `export default` when nothing in the same build
        // graph statically imports it — which is every entry here, since
        // each is only ever reached via a browser's own runtime
        // `import(url)` to a URL outside this build's static graph, not a
        // static import Rollup can see. Confirmed directly: without this,
        // `import()`-ing a built island/csr chunk in plain Node returned
        // `{ default: undefined }` — the component code was silently
        // tree-shaken away entirely, not just misplaced. "strict" forces
        // Rollup to treat every entry's exports as used, regardless of
        // whether anything in the graph statically references them.
        preserveEntrySignatures: "strict"
      }
    }
  });
  const manifestPath = path12.join(clientOutDir, ".vite", "manifest.json");
  if (!existsSync7(manifestPath)) {
    throw new Error(`[devora] client build for islands/csr produced no manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(await readFile3(manifestPath, "utf-8"));
  const islandUrls = /* @__PURE__ */ new Map();
  const csrUrls = /* @__PURE__ */ new Map();
  let islandClientUrl;
  let csrClientUrl;
  for (const entry of Object.values(manifest)) {
    if (!entry.isEntry || !entry.src) continue;
    const absoluteSrc = path12.resolve(appRoot, entry.src);
    if (absoluteSrc === islandClientPath) {
      islandClientUrl = `/${entry.file}`;
    } else if (absoluteSrc === csrClientPath) {
      csrClientUrl = `/${entry.file}`;
    } else if (islandFiles.includes(absoluteSrc)) {
      islandUrls.set(absoluteSrc, `/${entry.file}`);
    } else if (csrFiles.includes(absoluteSrc)) {
      csrUrls.set(absoluteSrc, `/${entry.file}`);
    }
  }
  return { islandUrls, islandClientUrl, csrUrls, csrClientUrl };
}
function clientEntryName(appRoot, file) {
  const relative = path12.relative(appRoot, file);
  if (!relative.startsWith("..") && !path12.isAbsolute(relative)) return toBuildKey(appRoot, file);
  const hash = createHash("sha256").update(file).digest("hex").slice(0, 8);
  return `shared/${path12.basename(file, path12.extname(file))}-${hash}`.replace(/[[\]]/g, "_");
}

// src/build/islandsBuildPlugin.ts
import { createHash as createHash2 } from "node:crypto";
var ISLAND_PLACEHOLDER_RE = /__DEVORA_ISLAND_[0-9a-f]{16}__/g;
function islandsBuildPlugin(collected) {
  return {
    name: "framework:islands-build",
    async transform(code, id) {
      if (id.includes("node_modules") || id.startsWith("\0") || !/\.(tsx|ts|jsx|js|mjs)$/.test(id) || !code.includes("island")) {
        return null;
      }
      const { supported, unsupported } = findIslandCalls(this.parse(code));
      if (unsupported.length > 0) {
        const loc = originalLocation(code, unsupported[0].start, this.getCombinedSourcemap());
        if (loc) this.error({ message: UNSUPPORTED_ISLAND_CALL_MESSAGE, id, loc: { file: id, ...loc } });
        this.error(UNSUPPORTED_ISLAND_CALL_MESSAGE, unsupported[0].start);
      }
      const edits = [];
      for (const call of supported) {
        if (call.alreadyResolved) continue;
        const resolved = await this.resolve(call.specifier, id);
        if (!resolved || resolved.external) {
          this.error(`[devora] island() import "${call.specifier}" doesn't resolve to a file in this app`, call.start);
        }
        const file = resolved.id.split("?")[0];
        const placeholder = `__DEVORA_ISLAND_${createHash2("sha256").update(file).digest("hex").slice(0, 16)}__`;
        collected.set(placeholder, file);
        edits.push({ insertAt: call.insertAt, url: placeholder });
      }
      if (edits.length === 0) return null;
      return { code: insertIslandUrls(code, edits), map: null };
    }
  };
}

// src/build/buildAppServer.ts
async function buildAppServer(appRoot, options = {}) {
  const routesDir = path13.join(appRoot, "routes");
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const entryServerPath = path13.join(appRoot, "entry-server.tsx");
  const serverOutDir = path13.join(appRoot, "dist", "server");
  const clientOutDir = path13.join(appRoot, "dist", "client");
  const input = options.backendOnly ? {} : { "entry-server": entryServerPath };
  for (const filePath of listRouteFiles(routesDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  const errorPagePath = options.backendOnly ? void 0 : ERROR_PAGE_FILES.map((f) => path13.join(appRoot, f)).find((f) => existsSync8(f));
  if (errorPagePath) input[ERROR_PAGE_BUILD_KEY] = errorPagePath;
  for (const filePath of listRouteFiles(apiDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  if (options.sessions?.storeModulePath) {
    input[SESSION_STORE_BUILD_KEY] = options.sessions.storeModulePath;
  }
  const islandPlaceholders = /* @__PURE__ */ new Map();
  const routeCss = {};
  await viteBuild2({
    root: appRoot,
    configFile: path13.join(appRoot, "vite.config.ts"),
    plugins: [islandsBuildPlugin(islandPlaceholders), routeCssPlugin(routeCss)],
    build: {
      ssr: true,
      ssrEmitAssets: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      rollupOptions: { input }
    }
  });
  const islandFiles = [...new Set(islandPlaceholders.values())];
  const { islandUrls, islandClientUrl, csrUrls, csrClientUrl } = options.backendOnly ? { islandUrls: /* @__PURE__ */ new Map(), islandClientUrl: void 0, csrUrls: /* @__PURE__ */ new Map(), csrClientUrl: void 0 } : await buildAppClient(appRoot, islandFiles);
  if (islandPlaceholders.size > 0) {
    await replaceIslandPlaceholders(serverOutDir, islandPlaceholders, islandUrls);
  }
  await publishSsrAssets(serverOutDir, clientOutDir);
  await writeFile2(path13.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE), JSON.stringify(routeCss, null, 2));
  if (options.sessions) {
    await writeFile2(path13.join(serverOutDir, SESSION_MANIFEST_FILE), JSON.stringify(options.sessions.manifest, null, 2));
  }
  await writeFile2(
    path13.join(serverOutDir, "island-manifest.json"),
    JSON.stringify({ islandClientUrl: islandClientUrl ?? null }, null, 2)
  );
  const csrRoutes = {};
  for (const [absPath, url] of csrUrls) {
    csrRoutes[toBuildKey(appRoot, absPath)] = url;
  }
  await writeFile2(
    path13.join(serverOutDir, "csr-route-manifest.json"),
    JSON.stringify({ csrClientUrl: csrClientUrl ?? null, routes: csrRoutes }, null, 2)
  );
  return { serverOutDir };
}
function routeCssPlugin(out) {
  return {
    name: "devora:route-css",
    generateBundle(_options, bundle) {
      const chunks = /* @__PURE__ */ new Map();
      for (const item of Object.values(bundle)) if (item.type === "chunk") chunks.set(item.fileName, item);
      for (const chunk of chunks.values()) {
        if (!chunk.isEntry) continue;
        const css = /* @__PURE__ */ new Set();
        const seen = /* @__PURE__ */ new Set();
        const visit = (fileName) => {
          if (seen.has(fileName)) return;
          seen.add(fileName);
          const current = chunks.get(fileName);
          if (!current) return;
          const meta = current.viteMetadata;
          for (const file of meta?.importedCss ?? []) css.add(`/${file}`);
          for (const dep of [...current.imports, ...current.dynamicImports]) visit(dep);
        };
        visit(chunk.fileName);
        if (css.size > 0) out[chunk.name] = [...css];
      }
    }
  };
}
async function replaceIslandPlaceholders(serverOutDir, placeholders, islandUrls) {
  for (const file of await listFiles(serverOutDir, ".js")) {
    const code = await readFile4(file, "utf-8");
    if (!code.includes("__DEVORA_ISLAND_")) continue;
    const replaced = code.replace(ISLAND_PLACEHOLDER_RE, (placeholder) => {
      const source = placeholders.get(placeholder);
      const url = source ? islandUrls.get(source) : void 0;
      if (!url) {
        throw new Error(`[devora] the client build produced no bundle for island ${source ?? placeholder} \u2014 please report this`);
      }
      return url;
    });
    await writeFile2(file, replaced);
  }
}
async function publishSsrAssets(serverOutDir, clientOutDir) {
  const assetsDir = path13.join(serverOutDir, "assets");
  if (!existsSync8(assetsDir)) return;
  for (const file of await listFiles(assetsDir)) {
    if (/\.(m?js|map)$/.test(file)) continue;
    const dest = path13.join(clientOutDir, "assets", path13.relative(assetsDir, file));
    await mkdir2(path13.dirname(dest), { recursive: true });
    await copyFile(file, dest);
  }
}
async function listFiles(dir, extension) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path13.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full, extension));
    else if (!extension || entry.name.endsWith(extension)) out.push(full);
  }
  return out;
}

// src/build/buildAppStatic.ts
import path14 from "node:path";
import fs4 from "node:fs";
import { pathToFileURL as pathToFileURL2 } from "node:url";
async function buildAppStatic(appRoot, serverOutDir, appDefaultRenderMode, options = {}) {
  if (options.backendOnly) return { staticRoutes: [] };
  const routesDir = path14.join(appRoot, "routes");
  const staticOutDir = path14.join(appRoot, "dist", "static");
  const islandManifestPath = path14.join(serverOutDir, "island-manifest.json");
  const islandClientUrl = await readIslandClientUrl(islandManifestPath);
  const staticRoutes = [];
  const candidates = listRouteFiles(routesDir).filter((filePath) => {
    const declared = readDeclaredRenderMode(fs4.readFileSync(filePath, "utf-8"));
    if (declared === "unknown") return true;
    const mode = declared ?? appDefaultRenderMode ?? "ssr";
    return mode === "ssg" || mode === "isr";
  });
  if (candidates.length === 0) return { staticRoutes };
  const entryServer = await importBuilt2(serverOutDir, "entry-server");
  const routeCss = readJson(path14.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE)) ?? {};
  const origin = options.domain ? `https://${options.domain}` : "http://localhost";
  for (const filePath of candidates) {
    const key = toBuildKey(appRoot, filePath);
    const routeModule = await importBuilt2(serverOutDir, key);
    const mode = resolveRenderMode(routeModule, appDefaultRenderMode);
    if (mode !== "ssg" && mode !== "isr") continue;
    const pageOptions = (routePath2) => ({ islandClientUrl, url: new URL(routePath2, origin).href, head: options.head, styles: routeCss[key] });
    if (routeModule.action) {
      throw new Error(
        `[devora] route "${key}" is renderMode: "${mode}" but exports action \u2014 actions never run for ${mode} routes.`
      );
    }
    if (isDynamicRouteFile(routesDir, filePath)) {
      if (typeof routeModule.getStaticParams !== "function") {
        throw new Error(
          `[devora] route "${routeFileToPath(routesDir, filePath)}" is a dynamic route (renderMode: "${mode}") \u2014 needs a getStaticParams() export to know which values to pre-render. Add one, or use renderMode: "ssr"/"csr" instead.`
        );
      }
      const paramSets = await routeModule.getStaticParams();
      for (const params of paramSets) {
        const routePath2 = resolveStaticRoutePath(routesDir, filePath, params);
        const { html: html2 } = await entryServer.renderStatic(routeModule, { ...pageOptions(routePath2), params });
        await writeCachedRoute(staticOutDir, routePath2, html2);
        staticRoutes.push(routePath2);
      }
      continue;
    }
    const routePath = routeFileToPath(routesDir, filePath);
    const { html } = await entryServer.renderStatic(routeModule, pageOptions(routePath));
    await writeCachedRoute(staticOutDir, routePath, html);
    staticRoutes.push(routePath);
  }
  return { staticRoutes };
}
async function importBuilt2(serverOutDir, key) {
  const filePath = path14.join(serverOutDir, `${key}.js`);
  return import(pathToFileURL2(filePath).href);
}
var LITERAL_RENDER_MODE_RE = /export\s+(?:const|let|var)\s+renderMode\s*(?::\s*[\w.<>"' |]+)?=\s*["'](ssr|ssg|csr|streaming|isr)["']/;
var ANY_RENDER_MODE_EXPORT_RE = /export\s+(?:const|let|var|function)\s+renderMode\b|export\s*\{[^}]*\brenderMode\b[^}]*\}/;
function readDeclaredRenderMode(source) {
  const literal = LITERAL_RENDER_MODE_RE.exec(source);
  if (literal) return literal[1];
  return ANY_RENDER_MODE_EXPORT_RE.test(source) ? "unknown" : void 0;
}
function readJson(file) {
  try {
    return JSON.parse(fs4.readFileSync(file, "utf-8"));
  } catch {
    return void 0;
  }
}

// src/build/runPrebuild.ts
import path15 from "node:path";
import { spawnSync } from "node:child_process";
function runPrebuild(appName, appRoot, prebuild, projectRoot = appRoot) {
  const commands = prebuild === void 0 ? [] : Array.isArray(prebuild) ? prebuild : [prebuild];
  for (const command of commands) {
    if (typeof command !== "string" || command.trim() === "") {
      throw new Error(`[devora] "${appName}": prebuild entries must be non-empty strings`);
    }
    console.log(`[devora] "${appName}" prebuild: ${command}`);
    const binDirs = [.../* @__PURE__ */ new Set([path15.join(appRoot, "node_modules", ".bin"), path15.join(projectRoot, "node_modules", ".bin")])];
    const env = { ...process.env, PATH: [...binDirs, process.env.PATH ?? ""].join(path15.delimiter) };
    const result = spawnSync(command, { cwd: appRoot, shell: true, stdio: "inherit", env });
    if (result.error) {
      throw new Error(`[devora] "${appName}": prebuild "${command}" couldn't start: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const how = result.signal ? `was killed by ${result.signal}` : `exited with code ${result.status}`;
      throw new Error(`[devora] "${appName}": prebuild "${command}" ${how} \u2014 build stopped.`);
    }
  }
}

// src/build/preflight.ts
import path16 from "node:path";
import { existsSync as existsSync9, readFileSync as readFileSync3, statSync } from "node:fs";
var PreflightError = class extends Error {
  constructor(appName) {
    super(`[devora] "${appName}": preflight checks failed \u2014 nothing was built.`);
  }
};
function preflightSessions(input) {
  const { appName, authMode, sessions, adapter, env } = input;
  if (authMode === "none") return [];
  const issues = [];
  const onPlatform = adapter === "vercel" ? env.VERCEL === "1" : env.NETLIFY === "true";
  const where = adapter === "vercel" ? "the Vercel project's Environment Variables" : "the Netlify site's environment variables";
  const appKey = `DEVORA_SESSION_SECRET_${appName.toUpperCase()}`;
  const keys = authMode === "isolated" ? [appKey, "DEVORA_SESSION_SECRET"] : ["DEVORA_SESSION_SECRET"];
  if (!keys.some((k) => env[k])) {
    const label = authMode === "isolated" ? `${appKey} (or DEVORA_SESSION_SECRET)` : "DEVORA_SESSION_SECRET";
    issues.push({
      level: onPlatform ? "error" : "warning",
      message: onPlatform ? `auth: "${authMode}" needs ${label}, and it isn't set in this build's environment \u2014 the deployed function would fail every request. Add it in ${where} and redeploy.` : `auth: "${authMode}" needs ${label} at runtime. It isn't set here, which is fine for a local build \u2014 make sure it's set in ${where}.`
    });
  }
  if (authMode === "isolated" && !/^[A-Z_][A-Z0-9_]*$/.test(appKey)) {
    issues.push({
      level: "warning",
      message: `${appKey} isn't a valid environment variable name on most platforms (app names with "-" produce one). Use DEVORA_SESSION_SECRET for this app, or rename it.`
    });
  }
  if (sessions?.store === void 0) {
    issues.push({
      level: "error",
      message: `no shared.sessions.store in devora.config.ts \u2014 a production function refuses to start without one. Point it at a module default-exporting a DB-backed SessionStore.`
    });
  } else if (sessions.store === "memory") {
    issues.push({
      level: "warning",
      message: `shared.sessions.store is "memory" \u2014 on serverless each function instance has its own empty store, so logins won't stick. Use a DB-backed store before relying on sessions in production.`
    });
  }
  return issues;
}
function preflightVercelLayout(input) {
  const { appRoot, outputDir, apiDir } = input;
  const issues = [];
  const endsInVercelOutput = path16.basename(outputDir) === "output" && path16.basename(path16.dirname(outputDir)) === ".vercel";
  if (!endsInVercelOutput) {
    issues.push({
      level: "warning",
      message: `output goes to ${outputDir}, but Vercel only reads <project root>/.vercel/output. Use --out=<your Vercel Root Directory>/.vercel/output.`
    });
    return issues;
  }
  const vercelRoot = path16.dirname(path16.dirname(outputDir));
  const reservedApi = path16.join(vercelRoot, "api");
  if (existsSync9(reservedApi) && statSync(reservedApi).isDirectory()) {
    const isThisAppsApiDir = vercelRoot === appRoot && apiDir === "api";
    issues.push({
      level: "warning",
      message: `${reservedApi} exists at the root of the Vercel project. Vercel treats every file in a top-level api/ as its own serverless function (or type-checks it with its own tsconfig), on top of the function devora builds \u2014 expect the Hobby plan's 12-function limit or TS2835 errors. ` + (isThisAppsApiDir ? `Fix: rename this app's api/ folder (e.g. to endpoints/) and set apiDir: "endpoints" in app.config.ts \u2014 URLs stay under /api.` : `Fix: move or rename that folder, or deploy from a different Root Directory.`)
    });
  }
  return issues;
}
function preflightNetlifyToml(input) {
  const tomlPath = path16.join(input.appRoot, "netlify.toml");
  if (input.apiDir === "api" || !existsSync9(tomlPath)) return [];
  const expected = `netlify/functions/ssr/${input.apiDir}/**`;
  if (readFileSync3(tomlPath, "utf-8").includes(expected)) return [];
  return [
    {
      level: "warning",
      message: `apiDir is "${input.apiDir}", but netlify.toml's [functions.ssr] included_files doesn't list "${expected}" \u2014 add it, or the deployed function won't find any API route.`
    }
  ];
}
function reportPreflight(appName, issues) {
  for (const issue of issues) {
    const line = `[devora] "${appName}" preflight ${issue.level}: ${issue.message}`;
    if (issue.level === "error") console.error(line);
    else console.warn(line);
  }
  return issues.some((i) => i.level === "error");
}

// ../../adapters/adapter-vercel/src/index.ts
import path20 from "node:path";
import { existsSync as existsSync13, readFileSync as readFileSync5 } from "node:fs";
import { mkdir as mkdir3, writeFile as writeFile3, cp as cp2, readFile as readFile5, rm as rm2 } from "node:fs/promises";
import { createRequire } from "node:module";

// ../../adapters/adapter-vercel/src/bundleForDeploy.ts
import path17 from "node:path";
import { readdir as readdir2 } from "node:fs/promises";
import { existsSync as existsSync10 } from "node:fs";
import * as esbuild from "esbuild";
var CJS_REQUIRE_BANNER = 'import { createRequire as __devoraCreateRequire } from "node:module"; globalThis.require ??= __devoraCreateRequire(import.meta.url);';
async function bundleForDeploy(wrapperPath, serverOutDir, options = {}) {
  await esbuild.build({
    entryPoints: [wrapperPath],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: wrapperPath,
    allowOverwrite: true,
    banner: { js: CJS_REQUIRE_BANNER },
    logLevel: "silent"
  });
  const routesOutDir = path17.join(serverOutDir, "routes");
  const routeFiles = existsSync10(routesOutDir) ? await findJsFiles(routesOutDir) : [];
  const apiOutDir = path17.join(serverOutDir, options.apiDir ?? "api");
  const apiFiles = existsSync10(apiOutDir) ? await findJsFiles(apiOutDir) : [];
  const entryServerPath = path17.join(serverOutDir, "entry-server.js");
  const entryPoints = existsSync10(entryServerPath) ? [entryServerPath] : [];
  const sessionStorePath = path17.join(serverOutDir, "session-store.js");
  if (existsSync10(sessionStorePath)) entryPoints.push(sessionStorePath);
  const errorPagePath = path17.join(serverOutDir, "error-page.js");
  if (existsSync10(errorPagePath)) entryPoints.push(errorPagePath);
  await esbuild.build({
    entryPoints: [...entryPoints, ...routeFiles, ...apiFiles],
    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    external: ["react", "react-dom", "react-dom/*"],
    outdir: serverOutDir,
    outbase: serverOutDir,
    allowOverwrite: true,
    banner: { js: CJS_REQUIRE_BANNER },
    logLevel: "silent"
  });
}
async function findJsFiles(dir) {
  const entries = await readdir2(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path17.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

// ../../adapters/adapter-vercel/src/runtime.ts
import path18 from "node:path";
import { existsSync as existsSync11, readFileSync as readFileSync4 } from "node:fs";
var VERCEL_SUPPORTED_NODE_MAJORS = [24, 22];
var VERCEL_DEFAULT_NODE_MAJOR = 24;
function resolveVercelRuntime(input) {
  const supportedList = VERCEL_SUPPORTED_NODE_MAJORS.map((m) => `nodejs${m}.x`).join(", ");
  if (input.override !== void 0) {
    const runtime = typeof input.override === "number" ? `nodejs${input.override}.x` : input.override.trim();
    const match = /^nodejs(\d+)\.x$/.exec(runtime);
    if (!match) {
      return {
        runtime,
        source: "app.config.ts vercel.runtime",
        warnings: [],
        error: `vercel.runtime "${runtime}" is not a Vercel Node runtime name (expected e.g. "nodejs22.x").`
      };
    }
    const major = Number(match[1]);
    const warnings = VERCEL_SUPPORTED_NODE_MAJORS.includes(major) ? [] : [
      `vercel.runtime "${runtime}" isn't one this adapter knows Vercel supports (${supportedList}) \u2014 using it as given; Vercel will reject the deploy if it doesn't accept it.`
    ];
    return { runtime, source: "app.config.ts vercel.runtime", warnings };
  }
  const range = input.enginesNode?.trim() ? parseRange(input.enginesNode) : void 0;
  if (input.enginesNode?.trim() && !range) {
    const fallback = pickWithoutEngines(input.runningNodeVersion);
    return {
      ...fallback,
      warnings: [`couldn't parse engines.node "${input.enginesNode}" \u2014 ignoring it.`]
    };
  }
  if (!range) return { ...pickWithoutEngines(input.runningNodeVersion), warnings: [] };
  const runningMajor = Number(input.runningNodeVersion.split(".")[0]);
  if (VERCEL_SUPPORTED_NODE_MAJORS.includes(runningMajor) && rangeAllowsMajor(range, runningMajor)) {
    return {
      runtime: `nodejs${runningMajor}.x`,
      source: `the running Node ${runningMajor} (satisfies engines.node "${input.enginesNode}")`,
      warnings: []
    };
  }
  for (const major of VERCEL_SUPPORTED_NODE_MAJORS) {
    if (rangeAllowsMajor(range, major)) {
      return { runtime: `nodejs${major}.x`, source: `engines.node "${input.enginesNode}"`, warnings: [] };
    }
  }
  return {
    runtime: "",
    source: `engines.node "${input.enginesNode}"`,
    warnings: [],
    error: `engines.node "${input.enginesNode}" allows no Node version Vercel supports (${supportedList}). Widen engines.node, or set vercel: { runtime: "nodejs${VERCEL_DEFAULT_NODE_MAJOR}.x" } in app.config.ts.`
  };
}
function pickWithoutEngines(runningNodeVersion) {
  const runningMajor = Number(runningNodeVersion.split(".")[0]);
  if (VERCEL_SUPPORTED_NODE_MAJORS.includes(runningMajor)) {
    return { runtime: `nodejs${runningMajor}.x`, source: `the running Node ${runningMajor}` };
  }
  return {
    runtime: `nodejs${VERCEL_DEFAULT_NODE_MAJOR}.x`,
    source: `Vercel's default (the running Node ${runningMajor} isn't a Vercel runtime)`
  };
}
function readEnginesNode(appRoot, projectRoot) {
  for (const dir of [appRoot, projectRoot]) {
    const pkgPath = path18.join(dir, "package.json");
    if (!existsSync11(pkgPath)) continue;
    try {
      const engines = JSON.parse(readFileSync4(pkgPath, "utf-8")).engines;
      if (typeof engines?.node === "string") return engines.node;
    } catch {
    }
  }
  return void 0;
}
var ZERO = [0, 0, 0];
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
function parsePartial(raw) {
  const s = raw.replace(/^v/, "");
  if (s === "*" || s === "x" || s === "X") return { v: ZERO, parts: 0 };
  const pieces = s.split(".");
  if (pieces.length > 3) return void 0;
  const nums = [];
  for (const p of pieces) {
    if (p === "x" || p === "X" || p === "*") break;
    if (!/^\d+$/.test(p)) return void 0;
    nums.push(Number(p));
  }
  return { v: [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0], parts: nums.length };
}
function bumpPartial(v, parts) {
  if (parts === 0) return void 0;
  if (parts === 1) return [v[0] + 1, 0, 0];
  if (parts === 2) return [v[0], v[1] + 1, 0];
  return v;
}
function parseComparator(token) {
  const m = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(token);
  if (!m) return void 0;
  const op = m[1] ?? "";
  const partial = parsePartial(m[2]);
  if (!partial) return void 0;
  const { v, parts } = partial;
  switch (op) {
    case ">=":
      return { lo: v, loInclusive: true, hiInclusive: false };
    case ">": {
      const bumped = bumpPartial(v, parts);
      return parts === 3 ? { lo: v, loInclusive: false, hiInclusive: false } : { lo: bumped ?? ZERO, loInclusive: true, hiInclusive: false };
    }
    case "<":
      return { lo: ZERO, loInclusive: true, hi: v, hiInclusive: false };
    case "<=": {
      const bumped = bumpPartial(v, parts);
      return parts === 3 ? { lo: ZERO, loInclusive: true, hi: v, hiInclusive: true } : { lo: ZERO, loInclusive: true, hi: bumped, hiInclusive: false };
    }
    case "^":
      return { lo: v, loInclusive: true, hi: v[0] > 0 || parts <= 1 ? [v[0] + 1, 0, 0] : [0, v[1] + 1, 0], hiInclusive: false };
    case "~":
      return { lo: v, loInclusive: true, hi: parts <= 1 ? [v[0] + 1, 0, 0] : [v[0], v[1] + 1, 0], hiInclusive: false };
    default: {
      if (parts === 3) return { lo: v, loInclusive: true, hi: v, hiInclusive: true };
      return { lo: v, loInclusive: true, hi: bumpPartial(v, parts), hiInclusive: false };
    }
  }
}
function parseRange(raw) {
  const alternatives = raw.split("||").map((s) => s.trim());
  const range = [];
  for (const alt of alternatives) {
    if (alt === "") return void 0;
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(alt);
    const tokens = hyphen ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`] : alt.replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/);
    const set = [];
    for (const t of tokens) {
      const interval = parseComparator(t);
      if (!interval) return void 0;
      set.push(interval);
    }
    range.push(set);
  }
  return range;
}
function rangeAllowsMajor(range, major) {
  return range.some((set) => {
    let lo = [major, 0, 0];
    let loInclusive = true;
    let hi = [major + 1, 0, 0];
    let hiInclusive = false;
    for (const iv of set) {
      const c2 = cmp(iv.lo, lo);
      if (c2 > 0 || c2 === 0 && !iv.loInclusive) {
        lo = iv.lo;
        loInclusive = iv.loInclusive;
      }
      if (iv.hi) {
        const d = hi ? cmp(iv.hi, hi) : -1;
        if (d < 0 || d === 0 && !iv.hiInclusive) {
          hi = iv.hi;
          hiInclusive = iv.hiInclusive;
        }
      }
    }
    if (!hi) return true;
    const c = cmp(lo, hi);
    return c < 0 || c === 0 && loInclusive && hiInclusive;
  });
}

// ../../adapters/adapter-vercel/src/deploy.ts
import path19 from "node:path";
import { existsSync as existsSync12 } from "node:fs";
import { spawn } from "node:child_process";
function isVercelLinked(appRoot) {
  return existsSync12(path19.join(appRoot, ".vercel", "project.json"));
}
function deployToVercel(appRoot, opts = {}) {
  return new Promise((resolve) => {
    const args = ["--yes", "vercel@latest", "deploy", "--prebuilt"];
    if (opts.prod) args.push("--prod");
    const child = spawn("npx", args, { cwd: appRoot, stdio: "inherit" });
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    child.on("error", () => resolve({ ok: false }));
  });
}

// ../../adapters/adapter-vercel/src/index.ts
var VERCEL_DOCS_URL = "https://devorajs-docs-docs.vercel.app/deployment";
var require2 = createRequire(import.meta.url);
async function vendorRuntimeDependency(resolveFrom, pkgName, destNodeModules, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(pkgName)) return;
  seen.add(pkgName);
  const pkgJsonPath = require2.resolve(`${pkgName}/package.json`, { paths: [resolveFrom] });
  const pkgDir = path20.dirname(pkgJsonPath);
  await cp2(pkgDir, path20.join(destNodeModules, pkgName), { recursive: true, dereference: true });
  const pkgJson = JSON.parse(await readFile5(pkgJsonPath, "utf-8"));
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    await vendorRuntimeDependency(pkgDir, dep, destNodeModules, seen);
  }
}
async function writeVercelOutput(app, appRoot, authMode, security, sitemapEnabled, defaultRenderMode, options = {}) {
  const apiDir = options.apiDir ?? "api";
  const outputDir = options.outputDir ?? path20.join(appRoot, ".vercel", "output");
  const runtime = options.runtime ?? resolveDefaultRuntime(appRoot);
  const trustProxy = options.trustProxy ?? true;
  const funcDir = path20.join(outputDir, "functions", "index.func");
  const clientOutDir = path20.join(appRoot, "dist", "client");
  const staticOutDir = path20.join(appRoot, "dist", "static");
  if (path20.basename(outputDir) === "output" && path20.basename(path20.dirname(outputDir)) === ".vercel") {
    await rm2(outputDir, { recursive: true, force: true });
  }
  await mkdir3(path20.join(outputDir, "static"), { recursive: true });
  await mkdir3(funcDir, { recursive: true });
  if (existsSync13(path20.join(appRoot, "routes"))) {
    await cp2(path20.join(appRoot, "routes"), path20.join(funcDir, "routes"), { recursive: true });
  }
  if (existsSync13(path20.join(appRoot, apiDir))) {
    await cp2(path20.join(appRoot, apiDir), path20.join(funcDir, apiDir), { recursive: true });
  }
  await cp2(path20.join(appRoot, "dist", "server"), path20.join(funcDir, "dist", "server"), { recursive: true });
  if (existsSync13(clientOutDir)) {
    await cp2(clientOutDir, path20.join(outputDir, "static"), { recursive: true });
  }
  if (existsSync13(staticOutDir)) {
    await cp2(staticOutDir, path20.join(outputDir, "static"), { recursive: true });
    await cp2(staticOutDir, path20.join(funcDir, "dist", "static"), { recursive: true });
  }
  await writeFile3(path20.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile3(
    path20.join(funcDir, "index.mjs"),
    `import { createProdRequestHandler } from "@devorajs/core";

// appRoot is this function's own directory \u2014 routes/ and dist/server
// were copied in alongside this file by writeVercelOutput.
const handleRequest = createProdRequestHandler(
  new URL(".", import.meta.url).pathname,
  ${JSON.stringify(app.name)},
  ${JSON.stringify(authMode)},
  ${JSON.stringify(app.domain)},
  ${JSON.stringify(security ?? {})},
  ${JSON.stringify(sitemapEnabled)},
  ${JSON.stringify(defaultRenderMode ?? null)},
  ${JSON.stringify({ apiDir, trustProxy, head: options.head, maxBodyBytes: options.maxBodyBytes })}
);

export default async function handler(req, res) {
  try {
    const handled = await handleRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.end("Not found");
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
`
  );
  await bundleForDeploy(path20.join(funcDir, "index.mjs"), path20.join(funcDir, "dist", "server"), { apiDir });
  const funcNodeModules = path20.join(funcDir, "node_modules");
  await mkdir3(funcNodeModules, { recursive: true });
  await vendorRuntimeDependency(reactResolveBase(appRoot), "react", funcNodeModules);
  if (existsSync13(path20.join(funcDir, "dist", "server", "entry-server.js"))) {
    await vendorRuntimeDependency(appRoot, "react-dom", funcNodeModules);
  }
  await writeFile3(
    path20.join(funcDir, ".vc-config.json"),
    JSON.stringify({ runtime, handler: "index.mjs", launcherType: "Nodejs" }, null, 2)
  );
  const config = {
    version: 3,
    routes: [
      ...security?.noindex === true ? [{ src: "/(.*)", headers: { "X-Robots-Tag": "noindex" }, continue: true }] : [],
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index" }
    ]
  };
  await writeFile3(path20.join(outputDir, "config.json"), JSON.stringify(config, null, 2));
  console.log(
    `[adapter-vercel] wrote ${outputDir} for "${app.name}" (${runtime}). Deploy it with your Vercel project or \`vercel deploy --prebuilt\` \u2014 guide: ${VERCEL_DOCS_URL}`
  );
}
function resolveDefaultRuntime(appRoot) {
  const resolved = resolveVercelRuntime({
    enginesNode: readEnginesNode(appRoot, appRoot),
    runningNodeVersion: process.versions.node
  });
  if (resolved.error) throw new Error(`[adapter-vercel] ${resolved.error}`);
  return resolved.runtime;
}
function reactResolveBase(appRoot) {
  try {
    require2.resolve("react/package.json", { paths: [appRoot] });
    return appRoot;
  } catch {
    let dir = path20.dirname(require2.resolve("@devorajs/core", { paths: [appRoot] }));
    while (dir !== path20.dirname(dir)) {
      const pkgPath = path20.join(dir, "package.json");
      if (existsSync13(pkgPath) && JSON.parse(readFileSync5(pkgPath, "utf-8")).name === "@devorajs/core") {
        return dir;
      }
      dir = path20.dirname(dir);
    }
    return appRoot;
  }
}

// ../../adapters/adapter-netlify/src/index.ts
import path23 from "node:path";
import { existsSync as existsSync16, readFileSync as readFileSync6 } from "node:fs";
import { mkdir as mkdir4, writeFile as writeFile4, cp as cp3, readFile as readFile6 } from "node:fs/promises";
import { createRequire as createRequire2 } from "node:module";

// ../../adapters/adapter-netlify/src/bundleForDeploy.ts
import path21 from "node:path";
import { readdir as readdir3 } from "node:fs/promises";
import { existsSync as existsSync14 } from "node:fs";
import * as esbuild2 from "esbuild";
var CJS_REQUIRE_BANNER2 = 'import { createRequire as __devoraCreateRequire } from "node:module"; globalThis.require ??= __devoraCreateRequire(import.meta.url);';
async function bundleForDeploy2(wrapperPath, serverOutDir, options = {}) {
  await esbuild2.build({
    entryPoints: [wrapperPath],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: wrapperPath,
    allowOverwrite: true,
    banner: { js: CJS_REQUIRE_BANNER2 },
    logLevel: "silent"
  });
  const routesOutDir = path21.join(serverOutDir, "routes");
  const routeFiles = existsSync14(routesOutDir) ? await findJsFiles2(routesOutDir) : [];
  const apiOutDir = path21.join(serverOutDir, options.apiDir ?? "api");
  const apiFiles = existsSync14(apiOutDir) ? await findJsFiles2(apiOutDir) : [];
  const entryServerPath = path21.join(serverOutDir, "entry-server.js");
  const entryPoints = existsSync14(entryServerPath) ? [entryServerPath] : [];
  const sessionStorePath = path21.join(serverOutDir, "session-store.js");
  if (existsSync14(sessionStorePath)) entryPoints.push(sessionStorePath);
  const errorPagePath = path21.join(serverOutDir, "error-page.js");
  if (existsSync14(errorPagePath)) entryPoints.push(errorPagePath);
  await esbuild2.build({
    entryPoints: [...entryPoints, ...routeFiles, ...apiFiles],
    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    external: ["react", "react-dom", "react-dom/*"],
    outdir: serverOutDir,
    outbase: serverOutDir,
    allowOverwrite: true,
    banner: { js: CJS_REQUIRE_BANNER2 },
    logLevel: "silent"
  });
}
async function findJsFiles2(dir) {
  const entries = await readdir3(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path21.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsFiles2(full));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

// ../../adapters/adapter-netlify/src/deploy.ts
import path22 from "node:path";
import { existsSync as existsSync15 } from "node:fs";
import { spawn as spawn2 } from "node:child_process";
function isNetlifyLinked(appRoot) {
  return existsSync15(path22.join(appRoot, ".netlify", "state.json"));
}
function deployToNetlify(appRoot, opts = {}) {
  return new Promise((resolve) => {
    const args = ["--yes", "netlify-cli@latest", "deploy"];
    if (opts.prod) args.push("--prod");
    const child = spawn2("npx", args, { cwd: appRoot, stdio: "inherit" });
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    child.on("error", () => resolve({ ok: false }));
  });
}

// ../../adapters/adapter-netlify/src/index.ts
var NETLIFY_DOCS_URL = "https://devorajs-docs-docs.vercel.app/deployment";
var require3 = createRequire2(import.meta.url);
async function vendorRuntimeDependency2(resolveFrom, pkgName, destNodeModules, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(pkgName)) return;
  seen.add(pkgName);
  const pkgJsonPath = require3.resolve(`${pkgName}/package.json`, { paths: [resolveFrom] });
  const pkgDir = path23.dirname(pkgJsonPath);
  await cp3(pkgDir, path23.join(destNodeModules, pkgName), { recursive: true, dereference: true });
  const pkgJson = JSON.parse(await readFile6(pkgJsonPath, "utf-8"));
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    await vendorRuntimeDependency2(pkgDir, dep, destNodeModules, seen);
  }
}
async function writeNetlifyConfig(app, appRoot, authMode, security, sitemapEnabled, defaultRenderMode, options = {}) {
  const apiDir = options.apiDir ?? "api";
  const trustProxy = options.trustProxy ?? true;
  const funcDir = path23.join(appRoot, "netlify", "functions", "ssr");
  const staticOutDir = path23.join(appRoot, "dist", "static");
  await mkdir4(funcDir, { recursive: true });
  if (existsSync16(path23.join(appRoot, "routes"))) {
    await cp3(path23.join(appRoot, "routes"), path23.join(funcDir, "routes"), { recursive: true });
  }
  if (existsSync16(path23.join(appRoot, apiDir))) {
    await cp3(path23.join(appRoot, apiDir), path23.join(funcDir, apiDir), { recursive: true });
  }
  await cp3(path23.join(appRoot, "dist", "server"), path23.join(funcDir, "dist", "server"), { recursive: true });
  if (existsSync16(staticOutDir)) {
    await cp3(staticOutDir, path23.join(funcDir, "dist", "static"), { recursive: true });
    await cp3(staticOutDir, path23.join(appRoot, "dist", "client"), { recursive: true });
  }
  await writeFile4(path23.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile4(
    path23.join(funcDir, "ssr.mjs"),
    `import { createProdRequestHandler } from "@devorajs/core";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";

const handleRequest = createProdRequestHandler(
  new URL(".", import.meta.url).pathname,
  ${JSON.stringify(app.name)},
  ${JSON.stringify(authMode)},
  ${JSON.stringify(app.domain)},
  ${JSON.stringify(security ?? {})},
  ${JSON.stringify(sitemapEnabled)},
  ${JSON.stringify(defaultRenderMode ?? null)},
  ${JSON.stringify({ apiDir, trustProxy, head: options.head, maxBodyBytes: options.maxBodyBytes })}
);

export default async (request, context) => {
  const bodyBuf = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
  const req = Readable.from(bodyBuf.length ? [bodyBuf] : []);
  const reqUrl = new URL(request.url);
  req.url = reqUrl.pathname + reqUrl.search;
  req.method = request.method;
  req.headers = Object.fromEntries(request.headers);
  req.socket = { encrypted: reqUrl.protocol === "https:", remoteAddress: context?.ip };

  let statusCode = 200;
  const resHeaders = new Headers();
  const chunks = [];
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headersSent = false;
  res.setHeader = (k, v) => {
    if (Array.isArray(v)) { resHeaders.delete(k); for (const item of v) resHeaders.append(k, String(item)); }
    else resHeaders.set(k, v);
  };
  res.getHeader = (k) => resHeaders.get(k) ?? undefined;
  res.write = (chunk) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); return true; };
  res.end = (chunk) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    res.headersSent = true;
    res.emit("finish");
  };

  try {
    const handled = await handleRequest(req, res);
    if (!handled) return new Response("Not found", { status: 404 });
    return new Response(Buffer.concat(chunks), { status: res.statusCode, headers: resHeaders });
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
`
  );
  await bundleForDeploy2(path23.join(funcDir, "ssr.mjs"), path23.join(funcDir, "dist", "server"), { apiDir });
  const funcNodeModules = path23.join(funcDir, "node_modules");
  await mkdir4(funcNodeModules, { recursive: true });
  await vendorRuntimeDependency2(reactResolveBase2(appRoot), "react", funcNodeModules);
  if (existsSync16(path23.join(funcDir, "dist", "server", "entry-server.js"))) {
    await vendorRuntimeDependency2(appRoot, "react-dom", funcNodeModules);
  }
  if (security?.noindex === true) {
    const clientOutDir = path23.join(appRoot, "dist", "client");
    await mkdir4(clientOutDir, { recursive: true });
    const headersPath = path23.join(clientOutDir, "_headers");
    const existing = existsSync16(headersPath) ? await readFile6(headersPath, "utf-8") : "";
    const rule = "/*\n  X-Robots-Tag: noindex\n";
    if (!existing.includes("X-Robots-Tag: noindex")) {
      await writeFile4(headersPath, existing ? `${existing.replace(/\n*$/, "\n")}
${rule}` : rule);
    }
  }
  console.log(
    `[adapter-netlify] wrote ${funcDir} for "${app.name}". Netlify picks it up via this app's netlify.toml \u2014 guide: ${NETLIFY_DOCS_URL}`
  );
}
function reactResolveBase2(appRoot) {
  try {
    require3.resolve("react/package.json", { paths: [appRoot] });
    return appRoot;
  } catch {
    let dir = path23.dirname(require3.resolve("@devorajs/core", { paths: [appRoot] }));
    while (dir !== path23.dirname(dir)) {
      const pkgPath = path23.join(dir, "package.json");
      if (existsSync16(pkgPath) && JSON.parse(readFileSync6(pkgPath, "utf-8")).name === "@devorajs/core") {
        return dir;
      }
      dir = path23.dirname(dir);
    }
    return appRoot;
  }
}

// src/build/buildForAdapter.ts
async function buildAppForAdapter(root, project, app, adapter, options = {}) {
  const appRoot = resolveAppDir(root, app.dir);
  const appConfig = await loadAppConfig(appRoot);
  const apiDir = normalizeApiDir(appConfig.apiDir);
  const authMode = resolveAuthMode(project, app.name);
  if (authMode === "none") {
    assertNoAuthUsage(app.name, [
      ...listRouteFiles(path24.join(appRoot, "routes")),
      ...listRouteFiles(path24.join(appRoot, apiDir))
    ]);
  }
  const sessionManifest = resolveSessionManifest({
    appName: app.name,
    appDomain: app.domain,
    authMode,
    sessions: project.shared.sessions,
    appSessions: appConfig.sessions,
    csrf: appConfig.csrf
  });
  const issues = [];
  let vercelRuntime;
  const vercelOutputDir = options.out ? path24.resolve(root, options.out) : path24.join(appRoot, ".vercel", "output");
  if (adapter === "vercel" || adapter === "netlify") {
    issues.push(...preflightSessions({ appName: app.name, authMode, sessions: project.shared.sessions, adapter, env: process.env }));
  }
  if (adapter === "vercel") {
    const resolved = resolveVercelRuntime({
      override: appConfig.vercel?.runtime,
      enginesNode: readEnginesNode(appRoot, root),
      runningNodeVersion: process.versions.node
    });
    for (const warning of resolved.warnings) issues.push({ level: "warning", message: warning });
    if (resolved.error) {
      issues.push({ level: "error", message: resolved.error });
    } else {
      vercelRuntime = resolved.runtime;
      console.log(`[devora] "${app.name}" Vercel runtime: ${resolved.runtime} (from ${resolved.source})`);
    }
    issues.push(...preflightVercelLayout({ appRoot, outputDir: vercelOutputDir, apiDir }));
  }
  if (adapter === "netlify") issues.push(...preflightNetlifyToml({ appRoot, apiDir }));
  if (reportPreflight(app.name, issues)) throw new PreflightError(app.name);
  runPrebuild(app.name, appRoot, appConfig.prebuild, root);
  const backendOnly = appConfig.backendOnly === true;
  console.log(`[devora] building "${app.name}" (SSR)...`);
  const sessionsConfig = project.shared.sessions;
  const sessions = sessionManifest === void 0 ? void 0 : {
    manifest: sessionManifest,
    storeModulePath: sessionsConfig?.store && sessionsConfig.store !== "memory" ? path24.resolve(root, sessionsConfig.store) : void 0
  };
  const { serverOutDir } = await buildAppServer(appRoot, { backendOnly, sessions, apiDir });
  console.log(`[devora] "${app.name}" built \u2192 ${serverOutDir}`);
  const { staticRoutes } = await buildAppStatic(appRoot, serverOutDir, appConfig.defaultRenderMode, {
    backendOnly,
    head: appConfig.head,
    domain: app.domain
  });
  if (staticRoutes.length > 0) {
    console.log(`[devora] "${app.name}" pre-rendered (ssg/isr): ${staticRoutes.join(", ")}`);
  }
  if (adapter === "vercel" || adapter === "netlify") {
    const sitemapEnabled = appConfig.sitemap === true;
    if (adapter === "vercel") {
      await writeVercelOutput(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode, {
        apiDir,
        outputDir: vercelOutputDir,
        runtime: vercelRuntime,
        trustProxy: appConfig.trustProxy,
        head: appConfig.head,
        maxBodyBytes: appConfig.maxBodyBytes
      });
    } else {
      await writeNetlifyConfig(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode, {
        apiDir,
        trustProxy: appConfig.trustProxy,
        head: appConfig.head,
        maxBodyBytes: appConfig.maxBodyBytes
      });
    }
  }
  return { appRoot, serverOutDir, staticRoutes };
}

// src/build/productionEnv.ts
function forceProductionNodeEnv(command) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  if (previous === "production") return;
  const wasUnset = previous === void 0 || previous === "";
  if (wasUnset && command !== "start") return;
  console.log(
    `[devora] NODE_ENV=production (${wasUnset ? "was unset" : `overriding "${previous}"`}) \u2014 devora ${command} always runs in production mode`
  );
}
function parsePort(raw, source) {
  const trimmed = raw.trim();
  const port = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[devora] ${source} must be a port number from 1 to 65535 (got "${raw}")`);
    return void 0;
  }
  return port;
}

// src/commands/build.ts
var BUILD_ADAPTERS = ["vercel", "netlify"];
async function build3(opts) {
  forceProductionNodeEnv("build");
  if (opts.adapter !== void 0 && !BUILD_ADAPTERS.includes(opts.adapter)) {
    console.error(
      `[devora] unknown --adapter "${opts.adapter}" \u2014 use ${BUILD_ADAPTERS.join(" or ")}. For a Node server (adapter-node), leave --adapter off: \`devora build\`, then \`devora start\`.`
    );
    process.exit(1);
  }
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  if (opts.out !== void 0) {
    if (opts.adapter !== "vercel") {
      console.error(`[devora] --out only applies to --adapter=vercel (Netlify reads the output path from the app's netlify.toml)`);
      process.exit(1);
    }
    if (apps.length !== 1) {
      console.error(`[devora] --out needs exactly one app \u2014 add --app=<name> (each app is its own Vercel project)`);
      process.exit(1);
    }
  }
  for (const app of apps) {
    try {
      await buildAppForAdapter(root, project, app, opts.adapter, { out: opts.out });
    } catch (err) {
      console.error(err instanceof PreflightError || isDevoraError(err) ? err.message : err);
      process.exit(1);
    }
  }
}

// ../../adapters/adapter-node/src/index.ts
import http from "node:http";
function createNodeServer(opts) {
  const handleRequest = createProdRequestHandler(
    opts.appRoot,
    opts.appName,
    opts.authMode,
    opts.domain,
    opts.security,
    opts.sitemapEnabled,
    opts.defaultRenderMode,
    { apiDir: opts.apiDir, trustProxy: opts.trustProxy, head: opts.head, maxBodyBytes: opts.maxBodyBytes }
  );
  const server = http.createServer((req, res) => {
    handleRequest(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end("Not found");
      }
    }).catch((err) => {
      console.error(`[adapter-node] "${opts.appName}"`, err);
      if (!res.headersSent) res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[adapter-node] "${opts.appName}": port ${opts.port} already in use`);
    } else if (err.code === "EADDRNOTAVAIL" || err.code === "ENOTFOUND") {
      console.error(`[adapter-node] "${opts.appName}": can't bind host "${opts.host}" (${err.code}) \u2014 check HOST / --host`);
    } else {
      console.error(`[adapter-node] "${opts.appName}"`, err);
    }
    process.exitCode = 1;
  });
  const onListening = () => {
    const where = opts.host === void 0 ? `http://localhost:${opts.port} (all interfaces)` : `http://${formatHost(opts.host)}:${opts.port}`;
    console.log(`[adapter-node] "${opts.appName}" \u2192 ${where} (from ${opts.appRoot}/dist/server)`);
  };
  if (opts.host === void 0) server.listen(opts.port, onListening);
  else server.listen(opts.port, opts.host, onListening);
  return server;
}
function formatHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

// src/build/portScheme.ts
var DEFAULT_BASE_PORT = 4173;
function assignPorts(apps, basePort = DEFAULT_BASE_PORT) {
  const ports = /* @__PURE__ */ new Map();
  let port = basePort;
  for (const app of apps) {
    ports.set(app.name, port);
    port += 1;
  }
  return ports;
}

// src/commands/start.ts
async function start(opts) {
  forceProductionNodeEnv("start");
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  let explicitPort;
  if (opts.port !== void 0 || process.env.PORT) {
    const fromEnv = opts.port === void 0;
    explicitPort = parsePort(fromEnv ? process.env.PORT : opts.port, fromEnv ? "PORT" : "--port");
    if (explicitPort === void 0) process.exit(1);
    if (fromEnv) console.log(`[devora] port ${explicitPort} (from PORT)`);
  }
  const host = (opts.host ?? process.env.HOST)?.trim() || void 0;
  if (host !== void 0 && opts.host === void 0) console.log(`[devora] binding ${host} (from HOST)`);
  const ports = opts.app ? void 0 : assignPorts(project.apps, explicitPort ?? DEFAULT_BASE_PORT);
  for (const app of apps) {
    const authMode = resolveAuthMode(project, app.name);
    const appRoot = resolveAppDir(root, app.dir);
    const appConfig = await loadAppConfig(appRoot);
    createNodeServer({
      appRoot,
      appName: app.name,
      authMode,
      domain: app.domain,
      security: appConfig.security,
      sitemapEnabled: appConfig.sitemap === true,
      defaultRenderMode: appConfig.defaultRenderMode,
      apiDir: appConfig.apiDir,
      trustProxy: appConfig.trustProxy,
      head: appConfig.head,
      maxBodyBytes: appConfig.maxBodyBytes,
      port: ports ? ports.get(app.name) : explicitPort ?? DEFAULT_BASE_PORT,
      host
    });
  }
}

// src/commands/deploy.ts
async function deploy(opts) {
  forceProductionNodeEnv("deploy");
  if (opts.adapter !== "vercel" && opts.adapter !== "netlify") {
    console.error(`[devora] unknown --adapter "${opts.adapter}" \u2014 use vercel or netlify`);
    process.exit(1);
  }
  const adapter = opts.adapter;
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  const isLinked = adapter === "vercel" ? isVercelLinked : isNetlifyLinked;
  const deployFn = adapter === "vercel" ? deployToVercel : deployToNetlify;
  const linkCmd = adapter === "vercel" ? "vercel link" : "netlify link";
  const deployed = [];
  const skipped = [];
  const failed = [];
  for (const app of apps) {
    try {
      const { appRoot } = await buildAppForAdapter(root, project, app, adapter);
      if (!isLinked(appRoot)) {
        console.log(
          `[devora] "${app.name}" isn't linked to a ${adapter} project yet \u2014 run \`cd ${app.dir} && ${linkCmd}\` first. Skipping.`
        );
        skipped.push(app.name);
        continue;
      }
      console.log(
        `[devora] deploying "${app.name}" to ${adapter} (${opts.prod ? "production" : "preview"})...`
      );
      const { ok } = await deployFn(appRoot, { prod: opts.prod });
      if (ok) {
        deployed.push(app.name);
      } else {
        console.error(`[devora] "${app.name}" deploy failed \u2014 see ${adapter} CLI output above.`);
        failed.push(app.name);
      }
    } catch (err) {
      console.error(`[devora] "${app.name}" failed before deploy could run:`, err);
      failed.push(app.name);
    }
  }
  console.log(`
[devora] deploy summary (${adapter}):`);
  console.log(`  deployed: ${deployed.length > 0 ? deployed.join(", ") : "none"}`);
  console.log(`  skipped (not linked): ${skipped.length > 0 ? skipped.join(", ") : "none"}`);
  console.log(`  failed: ${failed.length > 0 ? failed.join(", ") : "none"}`);
  if (opts.app && deployed.length === 0) process.exit(1);
  if (failed.length > 0) process.exit(1);
}

// src/commands/new.ts
import path27 from "node:path";
import { existsSync as existsSync17 } from "node:fs";
import { writeFile as writeFile6, readFile as readFile7 } from "node:fs/promises";

// ../scaffold/src/resolveAuthChoice.ts
import { createInterface } from "node:readline/promises";
async function resolveAuthChoice(explicit, appName) {
  if (explicit === "shared" || explicit === "isolated" || explicit === "none") return explicit;
  if (explicit) {
    console.error(`[devora] --auth must be "shared", "isolated", or "none" (got "${explicit}")`);
    process.exit(1);
  }
  if (!process.stdin.isTTY) return "shared";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(
      `Does "${appName}" need auth/sessions? [shared/isolated/none] (default: shared): `
    )).trim();
    if (answer === "isolated") return "isolated";
    if (answer === "none") return "none";
    return "shared";
  } finally {
    rl.close();
  }
}

// ../scaffold/src/resolveScopeChoice.ts
import { createInterface as createInterface2 } from "node:readline/promises";

// ../scaffold/src/scaffoldAppFiles.ts
import path25 from "node:path";
import { mkdir as mkdir5, writeFile as writeFile5 } from "node:fs/promises";
var SCAFFOLD_API_DIR = "endpoints";
var API_DIR_CONFIG_LINES = `  // API routes live in ${SCAFFOLD_API_DIR}/ (served under /api) \u2014 not api/, which
  // Vercel would turn into separate functions. See DEPLOYING.md.
  apiDir: "${SCAFFOLD_API_DIR}",
`;
async function scaffoldAppFiles(appDir, appName, opts) {
  const { authMode, coreVersion, cliInvocation, cliVersion } = opts;
  const kind = opts.kind ?? "pages";
  const withBackend = opts.withBackend ?? true;
  const devoraCmd = cliInvocation === "monorepo" ? "cd ../.. && node packages/cli/dist/index.js" : "cd ../.. && ./node_modules/.bin/devora";
  await mkdir5(path25.join(appDir, kind === "api" ? SCAFFOLD_API_DIR : "routes"), { recursive: true });
  await writeFile5(
    path25.join(appDir, "package.json"),
    JSON.stringify(
      {
        name: `@project/app-${appName}`,
        version: "0.1.0",
        private: true,
        type: "module",
        // vite/@vitejs/plugin-react are real "dependencies", NOT
        // devDependencies — same reasoning, and the same real bug, as
        // @devorajs/cli in scaffoldProjectFiles.ts: vite.config.ts needs
        // them at BUILD time, and a platform's production-only install
        // (confirmed on a real Netlify deploy: `Cannot find package
        // '@vitejs/plugin-react'` from vite.config.ts, only after fixing
        // the identical @devorajs/cli issue one level up) skips
        // devDependencies entirely. "Needed to build" and "needed to run
        // in production" aren't the same question here — this file
        // doesn't ship in dist/ output, but it has to resolve *during* the
        // build that produces dist/.
        dependencies: {
          "@devorajs/core": coreVersion,
          ...withBackend ? { "@devorajs/backend": "*" } : {},
          // A backend-only app renders no pages, so it needs no React at
          // all; it still needs vite, which runs its dev server and build.
          ...kind === "pages" ? { react: "^18.3.0", "react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0" } : {},
          vite: "^5.4.0",
          // Only for a standalone (create-devora) app — see cliVersion's
          // doc comment for why a workspace-scoped platform install needs
          // this declared here too, not just at the project root.
          ...cliInvocation === "standalone" ? { "@devorajs/cli": cliVersion } : {}
        }
      },
      null,
      2
    ) + "\n"
  );
  await writeFile5(
    path25.join(appDir, "tsconfig.json"),
    `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "." },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["dist", "node_modules", "netlify", ".vercel", ".netlify"]
}
`
  );
  if (kind === "api") {
    await writeFile5(
      path25.join(appDir, "app.config.ts"),
      `import { defineApp } from "@devorajs/core/config";

// Backend-only app: API routes under ${SCAFFOLD_API_DIR}/, no pages and no client build.
export default defineApp({
  backendOnly: true,
` + API_DIR_CONFIG_LINES + `});
`
    );
    await writeFile5(
      path25.join(appDir, "vite.config.ts"),
      `import { defineConfig } from "vite";

// Backend-only app \u2014 nothing here ever ships to a browser, so no React
// plugin and no public assets. Vite still runs this app's dev server.
export default defineConfig({});
`
    );
  } else {
    await writeFile5(
      path25.join(appDir, "app.config.ts"),
      `import { defineApp } from "@devorajs/core/config";

export default defineApp({
  defaultRenderMode: "ssr",
  // Opt-in, off by default \u2014 see ROADMAP.md #7. Turn on for a
  // public-facing app; leave off for an internal one.
  sitemap: false,
` + API_DIR_CONFIG_LINES + `  // Tags for every page's <head> (a route adds its own via meta().head):
  // head: { lang: "en", stylesheets: ["/styles.css"], links: [{ rel: "icon", href: "/favicon.png" }] },
});
`
    );
    await writeFile5(
      path25.join(appDir, "vite.config.ts"),
      `import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Shared brand assets (logo, favicon) \u2014 see packages/core/src/theme.ts.
  publicDir: path.resolve(__dirname, "../../assets"),
  // Explicit modern target \u2014 esbuild 0.25+ can no longer down-level
  // destructuring to Vite's old default multi-browser target list.
  build: {
    target: "es2022",
  },
});
`
    );
    await writeFile5(
      path25.join(appDir, "entry-server.tsx"),
      `import { createElement } from "react";
import { renderToString, renderToPipeableStream } from "react-dom/server";
import { createRenderRoute, createRenderStatic, createRenderStreaming } from "@devorajs/core";

// Framework SSR entry point for this app \u2014 loaded via vite.ssrLoadModule
// so react-dom/server resolves against this app's own node_modules. The
// actual render logic lives once in @devorajs/core's renderRoute.ts,
// shared by every app; this file only supplies the React bindings that
// genuinely can't be shared.
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
export const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
`
    );
    await writeFile5(
      path25.join(appDir, "error.tsx"),
      `import { PageShell, type ErrorPageProps } from "@devorajs/core";

// Rendered for unmatched URLs (404) and for errors a page throws \u2014 an
// HttpError keeps its status (401 from ctx.requireAuth(), 403 from
// ctx.verifyCsrf(), your own 400/404). \`message\` is safe to show: for an
// unexpected error it's just "Internal Server Error" in production.
export function meta({ status }: ErrorPageProps) {
  return { title: status === 404 ? "Not found" : \`Error \${status}\` };
}

export default function ErrorPage({ status, message }: ErrorPageProps) {
  return (
    <PageShell appName="${appName}">
      <h1>{status}</h1>
      <p>{message}</p>
      <p><a href="/">Back to the home page</a></p>
    </PageShell>
  );
}
`
    );
    await writeFile5(
      path25.join(appDir, "island-client.tsx"),
      `import { hydrateIslands } from "@devorajs/core/client";

// Only requested when a page actually used an island() \u2014 see
// packages/core/src/islandComponent.tsx. Real hydration logic lives
// once in @devorajs/core (shared by every app, including MutationObserver
// support for an island that streams in after this script runs) \u2014 this
// file only calls it.
hydrateIslands();
`
    );
    await writeFile5(
      path25.join(appDir, "csr-client.tsx"),
      `import { hydrateCsrRoutes } from "@devorajs/core/client";

// Only requested when a page's renderMode is "csr" \u2014 see
// packages/core/src/csrRoute.ts. Real logic lives once in
// @devorajs/core, shared by every app.
hydrateCsrRoutes();
`
    );
  }
  await writeFile5(
    path25.join(appDir, "vercel.json"),
    JSON.stringify(
      {
        $schema: "https://openapi.vercel.sh/vercel.json",
        // A real, previously undiscovered gap, found via an actual Vercel
        // deploy (git-integration import, not the `vercel deploy --prebuilt`
        // CLI flow) — without this, Vercel's zero-config detection runs
        // plain `vite build`, which fails outright ("Could not resolve entry
        // module index.html") since this isn't a conventional Vite SPA.
        // `writeVercelOutput` already produces `.vercel/output` (Build
        // Output API v3) at this app's own root when run with
        // --adapter=vercel; Vercel auto-detects and prefers that over any
        // "Output Directory" setting once it exists, so nothing else needs
        // overriding here — just which command actually runs.
        buildCommand: `${devoraCmd} build --app=${appName} --adapter=vercel`,
        // Vercel's dashboard cosmetically labels this app "Vite" (it sees
        // `vite` in package.json devDependencies) even though buildCommand
        // above already overrides what runs — `framework: null` tells
        // Vercel not to apply *any* framework-specific zero-config
        // assumptions at all, belt-and-suspenders against a future one
        // (routing/output-dir defaults, etc.) surfacing the same way the
        // build-command one did.
        framework: null
      },
      null,
      2
    ) + "\n"
  );
  await writeFile5(
    path25.join(appDir, "netlify.toml"),
    `[build]
  command = "${devoraCmd} build --app=${appName} --adapter=netlify"
  publish = "dist/client"
  functions = "netlify/functions"

[functions.ssr]
  included_files = ["netlify/functions/ssr/routes/**", "netlify/functions/ssr/${SCAFFOLD_API_DIR}/**", "netlify/functions/ssr/dist/**", "netlify/functions/ssr/package.json", "netlify/functions/ssr/node_modules/**"]

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/ssr"
  status = 200
`
  );
  if (kind === "api") {
    await scaffoldApiRoutes(appDir, authMode);
    return;
  }
  await writeFile5(
    path25.join(appDir, "routes", "index.tsx"),
    `import { PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "${appName}" };
}

export async function loader() {
  return {};
}

export default function Index() {
  return (
    <PageShell appName="${appName}">
      <h1>Welcome to ${appName}</h1>
      <p>Edit apps/${appName}/routes/index.tsx to get started.</p>
    </PageShell>
  );
}
`
  );
  if (authMode !== "none") {
    await writeFile5(
      path25.join(appDir, "routes", "login.tsx"),
      `import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Log in", description: "${appName} login (demo)" };
}

// Demo only: the framework provides the session itself (an opaque ID in an
// HttpOnly cookie, stored server-side and revocable). Checking who someone is
// stays bring-your-own (\xA76/\xA711): a real app verifies a password/token
// against its own DB/provider before calling ctx.setSession(); this route
// trusts any submitted username so the session flow can be exercised end to end.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const username = String(formData.get("username") ?? "");
  if (!username) throw new Error("username required");
  await ctx.setSession({ username });
  return redirect("/");
}

export default function Login({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="${appName}">
      <h1>Log in</h1>
      <p><strong>Demo only</strong> \u2014 accepts any username with no password check.</p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <input name="username" placeholder="username" />
        <button type="submit">Log in</button>
      </form>
    </PageShell>
  );
}
`
    );
    await writeFile5(
      path25.join(appDir, "routes", "logout.tsx"),
      `import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Log out", description: "${appName} logout" };
}

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  // Revoked server-side \u2014 dead everywhere, not just in this browser.
  await ctx.revokeSession();
  return redirect("/login");
}

export default function Logout({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="${appName}">
      <h1>Log out</h1>
      {/* POST-only, never a bare <a href="/logout"> \u2014 a GET-triggered logout
          is itself a CSRF-adjacent footgun. */}
      <form method="post">
        <CsrfField token={csrfToken} />
        <button type="submit">Log out</button>
      </form>
    </PageShell>
  );
}
`
    );
    await writeFile5(
      path25.join(appDir, "routes", "account.tsx"),
      `import type { RequestContext } from "@devorajs/core";
import { PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Account", description: "${appName} account (protected demo)" };
}

// ctx.requireAuth() throws if there's no active session \u2014 see
// packages/core/src/session.ts and apps/dashboard/routes/settings.tsx for
// the same pattern against the shared backend.
export async function loader(ctx: RequestContext) {
  ctx.requireAuth();
  return { session: ctx.session };
}

export default function Account({ data }: { data?: { session: unknown } }) {
  return (
    <PageShell appName="${appName}">
      <h1>Account</h1>
      <p>Protected demo route \u2014 only reachable with an active session (see routes/login.tsx).</p>
      <pre>{JSON.stringify(data?.session, null, 2)}</pre>
    </PageShell>
  );
}
`
    );
  }
}
async function scaffoldApiRoutes(appDir, authMode) {
  await writeFile5(
    path25.join(appDir, SCAFFOLD_API_DIR, "health.ts"),
    `import { apiRoute } from "@devorajs/core";

// GET /api/health
export const methods = ["GET"];
export const handler = apiRoute(() => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ok: true }),
}));
`
  );
  if (authMode === "none") return;
  await writeFile5(
    path25.join(appDir, SCAFFOLD_API_DIR, "session.ts"),
    `import { apiRoute, HttpError } from "@devorajs/core";

// POST /api/session   { "username": "..." } -> { "token": "..." }
// DELETE /api/session (Authorization: Bearer <token>) -> revokes it
//
// Demo only: accepts any username with no password check. A real app
// verifies credentials against its own database before setSession().
export const methods = ["POST", "DELETE"];

export const handler = apiRoute(async (req, ctx) => {
  if (req.method === "DELETE") {
    ctx.requireAuth();
    await ctx.revokeSession();
    return { status: 204 };
  }

  let username: unknown;
  try {
    username = JSON.parse(req.body.toString("utf-8") || "{}").username;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof username !== "string" || !username) throw new HttpError(400, "username required");

  const token = await ctx.setSession({ username }, { transport: "bearer" });
  return {
    status: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  };
});
`
  );
  await writeFile5(
    path25.join(appDir, SCAFFOLD_API_DIR, "me.ts"),
    `import { apiRoute } from "@devorajs/core";

// GET /api/me (Authorization: Bearer <token>) \u2014 401 without a valid session.
export const methods = ["GET"];
export const handler = apiRoute((_req, ctx) => {
  ctx.requireAuth();
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: ctx.session }),
  };
});
`
  );
}

// ../scaffold/src/scaffoldProjectFiles.ts
import path26 from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path26.dirname(fileURLToPath(import.meta.url));

// src/commands/new.ts
async function detectScaffoldContext(root) {
  if (existsSync17(path27.join(root, "packages", "cli", "dist", "index.js"))) {
    return { cliInvocation: "monorepo", coreVersion: "*" };
  }
  let coreVersion = "*";
  let cliVersion;
  const rootPkgPath = path27.join(root, "package.json");
  if (existsSync17(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(await readFile7(rootPkgPath, "utf-8"));
      coreVersion = rootPkg.dependencies?.["@devorajs/core"] ?? rootPkg.devDependencies?.["@devorajs/core"] ?? coreVersion;
      cliVersion = rootPkg.dependencies?.["@devorajs/cli"] ?? rootPkg.devDependencies?.["@devorajs/cli"];
    } catch {
    }
  }
  return { cliInvocation: "standalone", coreVersion, cliVersion };
}
async function scaffoldApp(appName, opts) {
  const root = process.cwd();
  const appDir = path27.join(root, "apps", appName);
  if (existsSync17(appDir)) {
    console.error(`[devora] apps/${appName} already exists`);
    process.exit(1);
  }
  const authMode = await resolveAuthChoice(opts.auth, appName);
  const context = await detectScaffoldContext(root);
  await scaffoldAppFiles(appDir, appName, {
    authMode,
    coreVersion: context.coreVersion,
    cliInvocation: context.cliInvocation,
    cliVersion: context.cliVersion,
    // A create-devora "frontend only" project has no packages/backend —
    // depending on @devorajs/backend there would break every install.
    withBackend: existsSync17(path27.join(root, "packages", "backend", "package.json"))
  });
  const configPath = path27.join(root, "devora.config.ts");
  if (existsSync17(configPath)) {
    const original = await readFile7(configPath, "utf-8");
    const domain = opts.domain ?? `${appName}.example.com`;
    const insertion = `    { name: "${appName}", dir: "apps/${appName}", domain: "${domain}", auth: "${authMode}" },
  ],`;
    const updated = original.replace(/\n\s*\],/, `
${insertion}`);
    if (updated !== original) {
      await writeFile6(configPath, updated);
      console.log(`[devora] registered "${appName}" in devora.config.ts (domain: ${domain})`);
    } else {
      console.log(
        `[devora] scaffolded apps/${appName} \u2014 could not auto-edit devora.config.ts, add it manually`
      );
    }
  }
  console.log(`[devora] created apps/${appName}`);
  console.log(`[devora] run "pnpm install" (or npm/yarn) to link its dependencies, then "devora dev --app=${appName}"`);
}
var newApp = scaffoldApp;

// src/commands/remove.ts
import path28 from "node:path";
import { existsSync as existsSync18 } from "node:fs";
import { readFile as readFile8, writeFile as writeFile7, rm as rm3 } from "node:fs/promises";
async function removeApp(appName) {
  const root = process.cwd();
  const appDir = path28.join(root, "apps", appName);
  const configPath = path28.join(root, "devora.config.ts");
  let removedFromConfig = false;
  if (existsSync18(configPath)) {
    const original = await readFile8(configPath, "utf-8");
    const entryRe = new RegExp(`[ \\t]*\\{ name: "${appName}"[^\\n]*\\},\\n`);
    const updated = original.replace(entryRe, "");
    if (updated !== original) {
      await writeFile7(configPath, updated);
      removedFromConfig = true;
    }
  }
  const dirExisted = existsSync18(appDir);
  if (dirExisted) {
    await rm3(appDir, { recursive: true, force: true });
  }
  if (!removedFromConfig && !dirExisted) {
    console.error(`[devora] "${appName}" not found \u2014 no apps/${appName} directory and no matching entry in devora.config.ts`);
    process.exit(1);
  }
  console.log(
    removedFromConfig ? `[devora] removed "${appName}" from devora.config.ts` : `[devora] "${appName}" wasn't registered in devora.config.ts \u2014 nothing to unregister there`
  );
  console.log(
    dirExisted ? `[devora] deleted apps/${appName}` : `[devora] apps/${appName} didn't exist on disk \u2014 nothing to delete`
  );
}

// src/commands/list.ts
async function list() {
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  if (project.apps.length === 0) {
    console.log("[devora] no apps registered in devora.config.ts");
    return;
  }
  console.log(`[devora] ${project.apps.length} app(s) in devora.config.ts:
`);
  for (const app of project.apps) {
    const authMode = resolveAuthMode(project, app.name);
    console.log(`  ${app.name}`);
    console.log(`    dir:    ${app.dir}`);
    console.log(`    domain: ${app.domain}`);
    console.log(`    auth:   ${authMode}${app.auth ? "" : " (project default)"}`);
  }
}

// src/commands/generate-proxy.ts
import path29 from "node:path";
import { writeFile as writeFile8 } from "node:fs/promises";
var VALID_HOSTNAME = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
function assertValidDomain(app) {
  if (!VALID_HOSTNAME.test(app.domain)) {
    throw new Error(
      `[devora] app "${app.name}" has an invalid domain ("${app.domain}") \u2014 refusing to generate a proxy config from it. A domain must look like a real hostname (letters, digits, hyphens, dots only).`
    );
  }
}
function nginxBlock(app, appPort) {
  return `server {
    listen 80;
    server_name ${app.domain};

    # No HTTPS by default \u2014 plain HTTP only, since this environment has no
    # real domain/DNS to issue a certificate against. The standard next step
    # on a real VPS with ${app.domain} actually resolving is \`certbot --nginx
    # -d ${app.domain}\`, which rewrites this block in place to add the
    # \`listen 443 ssl;\` + \`ssl_certificate\`/\`ssl_certificate_key\` directives
    # and a matching :80 redirect \u2014 not attempted here since automating real
    # ACME issuance needs infrastructure this command can't assume exists.

    location / {
        proxy_pass http://127.0.0.1:${appPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
}
function caddyBlock(app, appPort) {
  return `${app.domain} {
    reverse_proxy 127.0.0.1:${appPort}
}
`;
}
async function generateProxy(opts) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  if (opts.target !== "nginx" && opts.target !== "caddy") {
    console.error(`[devora] --target must be "nginx" or "caddy"`);
    process.exit(1);
  }
  for (const app of project.apps) assertValidDomain(app);
  const ports = assignPorts(project.apps);
  const blocks = project.apps.map((app) => {
    const appPort = ports.get(app.name);
    return opts.target === "nginx" ? nginxBlock(app, appPort) : caddyBlock(app, appPort);
  });
  const output = blocks.join("\n");
  const outPath = opts.out ?? path29.join(root, opts.target === "nginx" ? "nginx.conf" : "Caddyfile");
  await writeFile8(outPath, output);
  console.log(`[devora] generated ${opts.target} config for ${project.apps.length} app(s) \u2192 ${outPath}`);
  console.log(`[devora] no hand-editing needed \u2014 domains came straight from devora.config.ts`);
}

// src/commands/split.ts
import path32 from "node:path";
import { existsSync as existsSync19 } from "node:fs";
import { rm as rm4 } from "node:fs/promises";

// src/build/resolveSplitTarget.ts
import path31 from "node:path";

// src/build/gitHelpers.ts
import { execFileSync } from "node:child_process";
import path30 from "node:path";
function git(args, cwd) {
  try {
    const stdout = execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout: stdout.toString(), stderr: "" };
  } catch (err) {
    const e = err;
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "" };
  }
}
function gitOrThrow(args, cwd) {
  const result = git(args, cwd);
  if (result.code !== 0) {
    throw new Error(`[devora] git ${args.join(" ")} failed (cwd: ${cwd}):
${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
function isGitClean(pathspec, cwd) {
  const result = git(["status", "--porcelain", "--", pathspec], cwd);
  return result.code === 0 && result.stdout.trim() === "";
}
function listSubmodules(repoRoot) {
  const result = git(["config", "--file", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"], repoRoot);
  if (result.code !== 0 || result.stdout.trim() === "") return [];
  const entries = [];
  for (const line of result.stdout.trim().split("\n")) {
    const [key, ...rest] = line.split(" ");
    const path35 = rest.join(" ");
    const name = key.replace(/^submodule\./, "").replace(/\.path$/, "");
    const urlResult = git(["config", "--file", ".gitmodules", "--get", `submodule.${name}.url`], repoRoot);
    entries.push({ name, path: path35, url: urlResult.stdout.trim() });
  }
  return entries;
}
function revListCounts(cwd, theirRef, ourRef = "HEAD") {
  const result = git(["rev-list", "--left-right", "--count", `${theirRef}...${ourRef}`], cwd);
  if (result.code !== 0) return { behind: 0, ahead: 0 };
  const [behind, ahead] = result.stdout.trim().split(/\s+/).map(Number);
  return { behind: behind ?? 0, ahead: ahead ?? 0 };
}
function assertInsideRoot(root, targetPath, label) {
  const resolvedRoot = path30.resolve(root);
  const resolvedTarget = path30.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot + path30.sep)) {
    throw new Error(
      `[devora] refusing to operate on "${label}" \u2014 it resolves to "${resolvedTarget}", outside the project root ("${resolvedRoot}"). Check devora.config.ts / .gitmodules for a path escaping the project.`
    );
  }
}
function conflictedFiles(cwd) {
  const result = git(["diff", "--name-only", "--diff-filter=U"], cwd);
  return result.stdout.trim() === "" ? [] : result.stdout.trim().split("\n");
}

// src/build/resolveSplitTarget.ts
function resolveSplitTarget(root, project, name) {
  if (name === "backend") {
    if (!project.shared.backend) {
      throw new Error(`[devora] this project has no shared backend (no shared.backend in devora.config.ts)`);
    }
    const target2 = path31.join(root, project.shared.backend);
    assertInsideRoot(root, target2, "shared.backend");
    return target2;
  }
  const app = project.apps.find((a) => a.name === name);
  if (!app) {
    throw new Error(`[devora] no app named "${name}" in devora.config.ts (and it isn't "backend" either)`);
  }
  const target = path31.join(root, app.dir);
  assertInsideRoot(root, target, `apps.${name}.dir`);
  return target;
}
function nameForSplitTarget(root, project, relativePath) {
  if (project.shared.backend && path31.normalize(project.shared.backend) === path31.normalize(relativePath)) {
    return "backend";
  }
  const app = project.apps.find((a) => path31.normalize(a.dir) === path31.normalize(relativePath));
  return app?.name ?? relativePath;
}

// src/build/confirmAction.ts
import { createInterface as createInterface3 } from "node:readline/promises";
async function confirmAction(message, opts) {
  if (opts.yes) return true;
  if (!process.stdin.isTTY) {
    console.error(`[devora] ${message} \u2014 refusing without --yes in a non-interactive shell.`);
    return false;
  }
  const rl = createInterface3({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${message} [y/N]: `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

// src/commands/split.ts
async function split(name, opts) {
  if (!opts.repo) {
    console.error(`[devora] --repo=<git-url> is required \u2014 create the empty remote repo yourself first.`);
    process.exit(1);
  }
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const targetPath = resolveSplitTarget(root, project, name);
  const relPath = path32.relative(root, targetPath);
  if (!existsSync19(targetPath)) {
    console.error(`[devora] ${relPath} doesn't exist`);
    process.exit(1);
  }
  if (listSubmodules(root).some((s) => s.path === relPath)) {
    console.error(`[devora] ${relPath} is already a submodule \u2014 nothing to split.`);
    process.exit(1);
  }
  if (!isGitClean(relPath, root)) {
    console.error(
      `[devora] ${relPath} has uncommitted changes \u2014 commit or stash them first, so "split" starts from a known state.`
    );
    process.exit(1);
  }
  console.log(`[devora] about to split ${relPath} into its own repo:`);
  console.log(`  1. Extract ${relPath}'s real commit history (git subtree split) and push it to ${opts.repo}.`);
  console.log(`  2. Remove ${relPath} from this repo's own tracked files.`);
  console.log(`  3. Re-add it as a git submodule pointing at ${opts.repo}.`);
  console.log(`  Nothing is committed here in this repo \u2014 you review and commit yourself afterward.`);
  const confirmed = await confirmAction(`Proceed?`, opts);
  if (!confirmed) {
    console.log(`[devora] aborted \u2014 nothing changed.`);
    return;
  }
  const splitBranch = `devora-split-${Date.now()}`;
  try {
    const splitResult = git(["subtree", "split", `--prefix=${relPath}`, "-b", splitBranch], root);
    if (splitResult.code !== 0) {
      throw new Error(
        `[devora] "git subtree split" failed \u2014 nothing has changed yet:
${splitResult.stderr || splitResult.stdout}`
      );
    }
    const push = git(["push", opts.repo, `${splitBranch}:main`], root);
    if (push.code !== 0) {
      throw new Error(
        `[devora] failed to push ${relPath}'s extracted history to ${opts.repo}:
${push.stderr}
Nothing in this repo has changed yet \u2014 fix the remote (does it exist? do you have push access?) and retry.`
      );
    }
    gitOrThrow(["rm", "-r", "--cached", relPath], root);
    await rm4(targetPath, { recursive: true, force: true });
    const addResult = git(["submodule", "add", opts.repo, relPath], root);
    if (addResult.code !== 0) {
      throw new Error(
        `[devora] "git submodule add" failed after ${relPath} was already removed from this repo's tracked files:
${addResult.stderr}
Your real content (with its real history) is safely pushed to ${opts.repo} \u2014 run \`git submodule add ${opts.repo} ${relPath}\` manually to finish, or \`git checkout -- ${relPath}\` to abandon the split and restore the original tracked files.`
      );
    }
    console.log(`[devora] ${relPath} is now a submodule pointing at ${opts.repo}, with its real commit history.`);
    console.log(`[devora] review with \`git status\` / \`git diff --cached\`, then commit yourself.`);
  } finally {
    git(["branch", "-D", splitBranch], root);
  }
}

// src/commands/sync.ts
import path33 from "node:path";
async function sync(names, opts) {
  if (opts.fromMain === opts.toMain) {
    console.error(`[devora] specify exactly one of --from-main or --to-main.`);
    process.exit(1);
  }
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  let anyFailed = false;
  let targets;
  if (opts.all) {
    targets = [];
    for (const s of listSubmodules(root)) {
      const targetPath = path33.join(root, s.path);
      try {
        assertInsideRoot(root, targetPath, s.path);
        targets.push({ name: s.path, path: targetPath });
      } catch (err) {
        console.error(`[devora] skipping "${s.path}": ${err.message}`);
        anyFailed = true;
      }
    }
  } else {
    targets = names.map((name) => ({ name, path: resolveSplitTarget(root, project, name) }));
  }
  if (targets.length === 0) {
    console.log(`[devora] nothing to sync \u2014 no split-off apps/backend found.`);
    if (anyFailed) process.exit(1);
    return;
  }
  for (const target of targets) {
    const relPath = path33.relative(root, target.path);
    console.log(`
[devora] ${relPath}:`);
    const fetch = git(["fetch", "origin"], target.path);
    if (fetch.code !== 0) {
      console.error(`  fetch failed: ${fetch.stderr}`);
      anyFailed = true;
      continue;
    }
    if (opts.fromMain) {
      anyFailed = !await syncFromMain(root, target.path, relPath, opts) || anyFailed;
    } else {
      anyFailed = !await syncToMain(target.path, relPath, opts) || anyFailed;
    }
  }
  if (anyFailed) process.exit(1);
}
async function syncFromMain(root, targetPath, relPath, opts) {
  const log = git(["log", "--oneline", "HEAD..origin/main"], targetPath);
  if (log.stdout.trim() === "") {
    console.log(`  up to date with origin/main \u2014 nothing to pull.`);
    return true;
  }
  console.log(`  ${log.stdout.trim().split("\n").length} commit(s) to pull from origin/main:`);
  console.log(
    log.stdout.trim().split("\n").map((line) => `    ${line}`).join("\n")
  );
  const confirmed = await confirmAction(`  Merge these into ${relPath}?`, opts);
  if (!confirmed) {
    console.log(`  skipped.`);
    return true;
  }
  const merge = git(["merge", "origin/main", "--no-edit"], targetPath);
  if (merge.code !== 0) {
    const conflicts = conflictedFiles(targetPath);
    if (conflicts.length > 0) {
      console.error(`  merge conflict \u2014 resolve manually inside ${relPath}:`);
      for (const file of conflicts) {
        const diffStat = git(["diff", "--stat", "HEAD", "origin/main", "--", file], targetPath);
        console.error(`    ${file}${diffStat.stdout ? ` (${diffStat.stdout.trim()})` : ""}`);
      }
      console.error(`  this is a real conflict \u2014 not auto-resolved. Fix it inside ${relPath}, then commit there.`);
    } else {
      console.error(`  merge failed: ${merge.stderr}`);
    }
    return false;
  }
  git(["add", relPath], root);
  console.log(`  merged. Updated gitlink staged in the main repo \u2014 commit there yourself.`);
  return true;
}
async function syncToMain(targetPath, relPath, opts) {
  const log = git(["log", "--oneline", "origin/main..HEAD"], targetPath);
  if (log.stdout.trim() === "") {
    console.log(`  nothing local to push \u2014 up to date with origin/main.`);
    return true;
  }
  console.log(`  ${log.stdout.trim().split("\n").length} local commit(s) to push to origin/main:`);
  console.log(
    log.stdout.trim().split("\n").map((line) => `    ${line}`).join("\n")
  );
  const confirmed = await confirmAction(`  Push these from ${relPath} to its own origin/main?`, opts);
  if (!confirmed) {
    console.log(`  skipped.`);
    return true;
  }
  const push = git(["push", "origin", "HEAD:main"], targetPath);
  if (push.code !== 0) {
    console.error(`  push failed (likely diverged \u2014 pull with --from-main first): ${push.stderr}`);
    return false;
  }
  console.log(`  pushed.`);
  return true;
}

// src/commands/status.ts
import path34 from "node:path";
async function status() {
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const submodules = listSubmodules(root);
  if (submodules.length === 0) {
    console.log(`[devora] no split-off apps/backend \u2014 nothing to report (see \`devora split\`).`);
    return;
  }
  console.log(`[devora] sync status:
`);
  for (const sub of submodules) {
    const targetPath = path34.join(root, sub.path);
    try {
      assertInsideRoot(root, targetPath, sub.path);
    } catch (err) {
      console.log(`  ${sub.path} \u2192 ${sub.url}`);
      console.log(`    skipped: ${err.message}`);
      continue;
    }
    const name = nameForSplitTarget(root, project, sub.path);
    git(["fetch", "origin"], targetPath);
    const { behind, ahead } = revListCounts(targetPath, "origin/main");
    const gitlinkDirty = git(["status", "--porcelain", "--", sub.path], root).stdout.trim() !== "";
    let state;
    if (ahead > 0 && behind > 0) {
      state = `diverged \u2014 ${ahead} local commit(s), ${behind} remote commit(s) not pulled`;
    } else if (ahead > 0) {
      state = `${ahead} local commit(s) not pushed \u2014 run \`devora sync ${name} --to-main\``;
    } else if (behind > 0) {
      state = `${behind} remote commit(s) not pulled \u2014 run \`devora sync ${name} --from-main\``;
    } else {
      state = `up to date`;
    }
    if (gitlinkDirty) {
      state += ` (gitlink change not yet committed in the main repo)`;
    }
    console.log(`  ${sub.path} \u2192 ${sub.url}`);
    console.log(`    ${state}`);
  }
}

// src/index.ts
var program = new Command();
program.name("devora").description("Devora.js CLI \u2014 the multi-app, security-first framework").version(true ? "0.3.1" : "0.0.0-source");
program.command("dev").description("Run all apps in dev mode (or one with --app)").option("--app <name>", "run only this app").option(
  "--host",
  "listen on all network interfaces (so a phone/other device on your LAN can reach it) \u2014 off by default"
).action(async (opts) => dev(opts));
program.command("build").description("Build all apps (or one with --app)").option("--app <name>", "build only this app").option("--adapter <target>", "also write output for this adapter: vercel or netlify").option(
  "--out <dir>",
  "with --adapter=vercel and --app: write the Build Output API directory here instead of apps/<name>/.vercel/output (e.g. --out=.vercel/output when the Vercel project's Root Directory is the repo root)"
).action(async (opts) => build3(opts));
program.command("start").description("Serve a production build (adapter-node) \u2014 run `devora build` first").option("--app <name>", "serve only this app").option("--port <port>", "starting port (default: $PORT, else 4173; increments per app)").option("--host <host>", "interface to bind (default: $HOST, else all interfaces)").action(async (opts) => start(opts));
program.command("deploy").description(
  "Build and deploy to Vercel or Netlify (all apps, or one with --app) \u2014 each app must already be linked (`vercel link` / `netlify link`) to its own project/site"
).requiredOption("--adapter <target>", "vercel or netlify").option("--app <name>", "deploy only this app").option("--prod", "deploy to production (default: preview)").action(async (opts) => deploy(opts));
program.command("new <appName>").description("Scaffold a new app inside the project").option("--domain <domain>", "domain to register in devora.config.ts").option("--auth <mode>", 'auth mode for this app: "shared", "isolated", or "none" (prompts if omitted)').action(async (appName, opts) => newApp(appName, opts));
program.command("add <appName>").description("Scaffold a new app inside the project and register it in devora.config.ts (alias for `new`)").option("--domain <domain>", "domain to register in devora.config.ts").option("--auth <mode>", 'auth mode for this app: "shared", "isolated", or "none" (prompts if omitted)').action(async (appName, opts) => scaffoldApp(appName, opts));
program.command("remove <appName>").alias("rm").description("Delete apps/<name> and its devora.config.ts entry (undoes new/add)").action(async (appName) => removeApp(appName));
program.command("list").alias("ls").description("List every app registered in devora.config.ts").action(async () => list());
program.command("split <name>").description(
  'Convert apps/<name> (or the literal "backend") into a git submodule pointing at --repo (create the empty remote yourself first)'
).requiredOption("--repo <url>", "the empty remote repo's URL").option("--yes", "skip the confirmation prompt (for scripted use)").action(async (name, opts) => split(name, opts));
program.command("sync [names...]").description("Pull/push a split-off app or backend against its own remote \u2014 one of --from-main or --to-main is required").option("--from-main", "merge the split repo's latest into the local checkout").option("--to-main", "push local commits made inside the split repo's checkout").option("--all", "every split-off app/backend, instead of naming them").option("--yes", "skip the confirmation prompt (for scripted use)").action(async (names, opts) => sync(names, opts));
program.command("status").description("Sync state (up to date / unpushed / unpulled / diverged) across every split-off app/backend").action(async () => status());
program.command("generate:proxy").description("Generate a reverse-proxy config from devora.config.ts domains").requiredOption("--target <target>", "nginx or caddy").option("--out <path>", "output file path").action(async (opts) => generateProxy(opts));
var argv = process.argv.filter((arg) => arg !== "--");
program.parseAsync(argv);
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
