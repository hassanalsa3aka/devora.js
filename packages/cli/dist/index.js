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
        function createElement3(type, config, children) {
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
        function createContext2(defaultValue) {
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
        function useContext2(Context) {
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
          var element = createElement3.apply(this, arguments);
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
        exports.createContext = createContext2;
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
        exports.useContext = useContext2;
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
function renderHead(meta) {
  const { title, description, og } = meta ?? {};
  const ogTitle = og?.title ?? title;
  const ogDescription = og?.description ?? description;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="${DEVORA_LOGO_URL}" />
    <style>${THEME_CSS}</style>
    ${title ? `<title>${escapeHtml(title)}</title>` : ""}
    ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ""}
    ${ogTitle ? `<meta property="og:title" content="${escapeHtml(ogTitle)}" />` : ""}
    ${ogDescription ? `<meta property="og:description" content="${escapeHtml(ogDescription)}" />` : ""}
    ${ogTitle || ogDescription ? `<meta property="og:type" content="${escapeHtml(og?.type ?? "website")}" />` : ""}
    ${og?.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : ""}
    ${og?.url ? `<meta property="og:url" content="${escapeHtml(og.url)}" />` : ""}
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
  return `${renderHead(opts.meta)}    <div id="root">${opts.bodyHtml}</div>
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
function buildCookieAttributes(maxAgeSeconds) {
  let attrs = "Path=/; HttpOnly; SameSite=Lax";
  if (maxAgeSeconds !== void 0) attrs += `; Max-Age=${maxAgeSeconds}`;
  return process.env.NODE_ENV === "production" ? `${attrs}; Secure` : attrs;
}
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
async function createRequestContext(request, opts, params = {}) {
  const cookies = parseCookieHeader(request.cookieHeader);
  const resolved = await resolveSession(request, opts);
  const pendingSetCookies = [];
  const pendingWrites = [];
  let currentSessionId = resolved.sessionId;
  let currentRecord = resolved.record;
  let transport = currentRecord ? resolved.presentedTransport : void 0;
  const sessionCookie = (sessionId, record) => `${opts.name}=${sessionId}; ${buildCookieAttributes(Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1e3)))}`;
  const clearedSessionCookie = () => `${opts.name}=; ${buildCookieAttributes(0)}`;
  if (resolved.presentedTransport === "cookie") {
    if (resolved.state === "dead") pendingSetCookies.push(clearedSessionCookie());
    else if (resolved.renewed && currentSessionId && currentRecord) {
      pendingSetCookies.push(sessionCookie(currentSessionId, currentRecord));
    }
  }
  const incomingCsrfCookie = cookies[CSRF_COOKIE_NAME];
  const csrfToken = incomingCsrfCookie ?? generateCsrfToken();
  if (!incomingCsrfCookie && resolved.presentedTransport !== "bearer") {
    pendingSetCookies.push(`${CSRF_COOKIE_NAME}=${csrfToken}; ${buildCookieAttributes()}`);
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
function createNoAuthContext(params = {}) {
  const ctx = {
    params,
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
  return async () => ({ ...scope, ...periods, store: await loadStore() });
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
import path5 from "node:path";
import { pathToFileURL } from "node:url";
import { readFile as readFile2 } from "node:fs/promises";
import { existsSync as existsSync3 } from "node:fs";

// ../core/src/renderRoute.ts
function resolveRenderMode(routeModule, appDefault) {
  return routeModule.renderMode ?? appDefault ?? "ssr";
}

// ../core/src/csrRoute.ts
function renderCsrShell(routeModule, entryUrl, csrClientUrl, devPreambleUrl) {
  const meta = routeModule.meta?.(void 0);
  const canMount = entryUrl !== void 0 && csrClientUrl !== void 0;
  const bodyHtml = canMount ? `<div data-csr-entry="${escapeHtml(entryUrl)}"></div>` : "";
  return renderHtmlDocument({
    bodyHtml,
    meta,
    csrScriptUrl: canMount ? csrClientUrl : void 0,
    devPreambleUrl: canMount ? devPreambleUrl : void 0
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
      request.params
    ) : createNoAuthContext(request.params);
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
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      req.destroy?.();
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ../core/src/apiRoute.ts
function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
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
function createProdRequestHandler(appRoot, appName, authMode, domain, security, sitemapEnabled, appDefaultRenderMode) {
  const routesDir = path5.join(appRoot, "routes");
  const apiDir = path5.join(appRoot, "api");
  const serverOutDir = path5.join(appRoot, "dist", "server");
  const clientOutDir = path5.join(appRoot, "dist", "client");
  const staticOutDir = path5.join(appRoot, "dist", "static");
  const resolveSessionOptions = authMode === "none" ? void 0 : createSessionOptionsResolver(
    authMode,
    appName,
    readSessionManifest(serverOutDir),
    () => importBuilt(serverOutDir, SESSION_STORE_BUILD_KEY)
  );
  const sessionOptionsForRequest = async () => resolveSessionOptions ? resolveSessionOptions() : void 0;
  const securityHeaders = resolveSecurityHeaders(security);
  const islandManifestPath = path5.join(serverOutDir, "island-manifest.json");
  const csrManifestPath = path5.join(serverOutDir, "csr-route-manifest.json");
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
          body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readRawBody(req);
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
          sessionCookieOptions: await sessionOptionsForRequest(),
          body
        });
        if (apiResult.setCookie) res.setHeader("Set-Cookie", apiResult.setCookie);
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
    if (!match) return false;
    const buildKey = toBuildKey(appRoot, match.filePath);
    const routeModule = await importBuilt(serverOutDir, buildKey);
    const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
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
        sessionCookieOptions: await sessionOptionsForRequest(),
        islandClientUrl: islandClientUrl2,
        nonce
      });
      if (!result2) return false;
      if (result2.setCookie) res.setHeader("Set-Cookie", result2.setCookie);
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
      const html = renderCsrShell(routeModule, csrManifest.routes[buildKey], csrManifest.csrClientUrl);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return true;
    }
    if (renderMode === "ssg" || renderMode === "isr") {
      let cached = await readCachedRoute(staticOutDir, match.routePath);
      if (renderMode === "ssg") {
        if (!cached) return false;
      } else {
        if (isDynamicRouteFile(routesDir, match.filePath) && typeof routeModule.getStaticParams === "function") {
          const declaredParams = await routeModule.getStaticParams();
          const allowed = declaredParams.some(
            (params) => resolveStaticRoutePath(routesDir, match.filePath, params) === match.routePath
          );
          if (!allowed) return false;
        }
        const revalidateSeconds = routeModule.revalidate?.seconds;
        if (!cached || revalidateSeconds !== void 0 && isStale(cached.renderedAt, revalidateSeconds)) {
          const entryServer2 = await importBuilt(serverOutDir, "entry-server");
          const islandClientUrl2 = await readIslandClientUrl(islandManifestPath);
          const { html } = await entryServer2.renderStatic(routeModule, { islandClientUrl: islandClientUrl2, params: match.params });
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
      formData = req.method === "POST" ? await parseFormData(req) : void 0;
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        res.statusCode = 413;
        res.end(err.message);
        return true;
      }
      throw err;
    }
    const result = await entryServer.renderRoute(routeModule, {
      method: req.method ?? "GET",
      formData,
      cookieHeader: req.headers.cookie,
      authorizationHeader: req.headers.authorization,
      params: match.params,
      sessionCookieOptions: await sessionOptionsForRequest(),
      islandClientUrl,
      appDefaultRenderMode
    });
    if (!result) return false;
    if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
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
  const filePath = path5.join(clientOutDir, pathname);
  if (!filePath.startsWith(clientOutDir + path5.sep)) return false;
  if (!existsSync3(filePath)) return false;
  const body = await readFile2(filePath);
  const contentType = ASSET_CONTENT_TYPES[path5.extname(filePath)] ?? "application/octet-stream";
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
  const filePath = path5.join(serverOutDir, `${key}.js`);
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
async function parseFormData(req) {
  const body = (await readBodyWithLimit(req)).toString("utf-8");
  const formData = new FormData();
  new URLSearchParams(body).forEach((value, key) => formData.append(key, value));
  return formData;
}
async function readRawBody(req) {
  return readBodyWithLimit(req);
}

// ../core/src/islandCallPattern.ts
var ISLAND_CALL_RE = /\bisland(?:<[^>]*>)?\(\s*\(\)\s*=>\s*import\(\s*(['"])((?:(?!\1).)+)\1\s*\)\s*\)/g;

// ../core/src/branding.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);

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
import path6 from "node:path";
import { existsSync as existsSync4 } from "node:fs";
import { createJiti } from "jiti";
async function loadProjectConfig(root = process.cwd()) {
  const configPath = path6.join(root, "devora.config.ts");
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
  return path6.join(root, appDir);
}

// ../core/src/loadAppConfig.ts
import path7 from "node:path";
import { existsSync as existsSync5 } from "node:fs";
import { createJiti as createJiti2 } from "jiti";
async function loadAppConfig(appRoot) {
  const configPath = path7.join(appRoot, "app.config.ts");
  if (!existsSync5(configPath)) return {};
  const jiti = createJiti2(import.meta.url, { interopDefault: true });
  const mod = await jiti.import(configPath);
  return mod.default ?? {};
}

// src/server/ssrMiddleware.ts
import path9 from "node:path";

// src/server/devSessionOptions.ts
import path8 from "node:path";
function createDevSessionOptionsResolver(vite, projectRoot, sessions, authMode, appName) {
  if (authMode === "none") return void 0;
  const storeModule = sessions?.store && sessions.store !== "memory" ? path8.resolve(projectRoot, sessions.store) : void 0;
  return createSessionOptionsResolver(
    authMode,
    appName,
    toSessionManifest(sessions),
    () => vite.ssrLoadModule(storeModule)
  );
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
function createSsrMiddleware(vite, appRoot, appName, authMode, domain, sitemapEnabled, appDefaultRenderMode, security, sessions) {
  const routesDir = path9.join(appRoot, "routes");
  const entryServerPath = path9.join(appRoot, "entry-server.tsx");
  const resolveSessionOptions = createDevSessionOptionsResolver(vite, sessions.projectRoot, sessions.config, authMode, appName);
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
    if (!match) return next();
    try {
      const routeModule = await vite.ssrLoadModule(match.filePath);
      const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
      if (renderMode === "csr") {
        const html = renderCsrShell(routeModule, `/@fs/${match.filePath}`, "/csr-client.tsx", DEV_PREAMBLE_URL);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      const entryServer = await vite.ssrLoadModule(entryServerPath);
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
          nonce
        });
        if (!result2) return next();
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
          devPreambleUrl: DEV_PREAMBLE_URL
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      let formData;
      try {
        formData = req.method === "POST" ? await parseFormData2(req) : void 0;
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          res.statusCode = 413;
          res.end(err.message);
          return;
        }
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
        devPreambleUrl: DEV_PREAMBLE_URL
      });
      if (!result) {
        return next();
      }
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
async function parseFormData2(req) {
  const body = (await readBodyWithLimit(req)).toString("utf-8");
  const formData = new FormData();
  new URLSearchParams(body).forEach((value, key) => formData.append(key, value));
  return formData;
}

// src/server/apiMiddleware.ts
import path10 from "node:path";
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
  const apiDir = path10.join(appRoot, "api");
  const resolveSessionOptions = createDevSessionOptionsResolver(vite, options.projectRoot, options.sessions, authMode, appName);
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
        body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBody(req);
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
        body
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
async function readBody(req) {
  return readBodyWithLimit(req);
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

// src/islandsPlugin.ts
function islandsPlugin() {
  return {
    name: "framework:islands",
    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx|ts)$/.test(id) || !code.includes("island")) {
        return null;
      }
      const matches = [...code.matchAll(ISLAND_CALL_RE)];
      if (matches.length === 0) return null;
      let result = code;
      for (const match of matches) {
        const [original, , specifier] = match;
        const resolved = await this.resolve(specifier, id);
        if (!resolved) continue;
        const clientUrl = `/@fs${resolved.id}`;
        const replaced = original.slice(0, -1) + `, ${JSON.stringify(clientUrl)})`;
        result = result.replace(original, replaced);
      }
      return { code: result, map: null };
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
        sessions: opts.sessions
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
        { projectRoot: opts.projectRoot, config: opts.sessions }
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
    if (authMode === "none") {
      assertNoAuthUsage(app.name, [
        ...listRouteFiles(path11.join(appRoot, "routes")),
        ...listRouteFiles(path11.join(appRoot, "api"))
      ]);
    }
    const appConfig = await loadAppConfig(appRoot);
    const preferred = app.devPort ?? DEV_BASE_PORT + project.apps.indexOf(app);
    const port = await findFreePort(preferred, claimed, opts.host ? void 0 : "localhost");
    if (port !== preferred) {
      const reason = claimed.has(preferred) ? "was assigned to an earlier app" : "is in use";
      console.log(`[devora] port ${preferred} ${reason} \u2014 "${app.name}" moved to ${port}`);
    }
    claimed.add(port);
    const server = await createAppDevServer({
      projectRoot: root,
      app,
      appRoot,
      authMode,
      appConfig,
      sessions: project.shared.sessions,
      port,
      host: opts.host
    });
    booted.push({ app, authMode, appRoot, server });
  }
  printBootSummary(booted);
}
function printBootSummary(booted) {
  const lanAddresses = getLanAddresses();
  const exposedUrls = [];
  const lines = [""];
  for (const { app, authMode, appRoot, server } of booted) {
    const address = server.httpServer?.address();
    const port = address?.port ?? server.config.server.port;
    const boundHost = address?.address ?? "localhost";
    const networkHosts = isWildcardAddress(boundHost) ? lanAddresses : isLoopbackAddress(boundHost) ? [] : [boundHost];
    const networkUrls = networkHosts.map((h) => `http://${h}:${port}`);
    if (!isLoopbackAddress(boundHost)) exposedUrls.push(networkUrls[0] ?? `port ${port}`);
    const pages = listRoutePaths(path11.join(appRoot, "routes")).sort();
    const apis = listRoutePaths(path11.join(appRoot, "api")).sort().map((p) => p === "/" ? "/api" : `/api${p}`);
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
      lines.push(`    Routes:   (none yet \u2014 add a file under routes/ or api/)`);
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
import path22 from "node:path";

// src/build/buildAppServer.ts
import path14 from "node:path";
import { writeFile as writeFile2 } from "node:fs/promises";
import { build as viteBuild2 } from "vite";

// src/build/buildAppClient.ts
import path13 from "node:path";
import { readFile as readFile3, cp } from "node:fs/promises";
import { existsSync as existsSync6 } from "node:fs";
import { build as viteBuild, resolveConfig } from "vite";

// src/build/discoverIslandFiles.ts
import fs3 from "node:fs";
import path12 from "node:path";
var RESOLVE_EXTENSIONS = ["", ".tsx", ".ts", ".jsx", ".js"];
function discoverIslandFiles(sourceFiles) {
  const found = /* @__PURE__ */ new Set();
  for (const file of sourceFiles) {
    const code = fs3.readFileSync(file, "utf-8");
    for (const match of code.matchAll(ISLAND_CALL_RE)) {
      const resolved = resolveSpecifier(path12.dirname(file), match[2]);
      if (resolved) found.add(resolved);
    }
  }
  return [...found];
}
function resolveSpecifier(fromDir, specifier) {
  const base = path12.resolve(fromDir, specifier);
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = base + ext;
    if (fs3.existsSync(candidate)) return candidate;
  }
  return null;
}

// src/build/discoverCsrRouteFiles.ts
import fs4 from "node:fs";
var CSR_RENDER_MODE_RE = /renderMode\s*=\s*["']csr["']/;
function discoverCsrRouteFiles(sourceFiles) {
  return sourceFiles.filter((file) => CSR_RENDER_MODE_RE.test(fs4.readFileSync(file, "utf-8")));
}

// src/build/buildAppClient.ts
async function buildAppClient(appRoot) {
  const routesDir = path13.join(appRoot, "routes");
  const routeFiles = listRouteFiles(routesDir);
  const islandFiles = discoverIslandFiles(routeFiles);
  const csrFiles = discoverCsrRouteFiles(routeFiles);
  if (islandFiles.length === 0 && csrFiles.length === 0) {
    const resolved = await resolveConfig(
      { root: appRoot, configFile: path13.join(appRoot, "vite.config.ts") },
      "build"
    );
    if (resolved.publicDir && existsSync6(resolved.publicDir)) {
      await cp(resolved.publicDir, path13.join(appRoot, "dist", "client"), { recursive: true });
    }
    return { islandUrls: /* @__PURE__ */ new Map(), csrUrls: /* @__PURE__ */ new Map() };
  }
  const islandClientPath = path13.join(appRoot, "island-client.tsx");
  const csrClientPath = path13.join(appRoot, "csr-client.tsx");
  const clientOutDir = path13.join(appRoot, "dist", "client");
  const input = {};
  if (islandFiles.length > 0) input["island-client"] = islandClientPath;
  if (csrFiles.length > 0) input["csr-client"] = csrClientPath;
  for (const file of islandFiles) {
    input[toBuildKey(appRoot, file)] = file;
  }
  for (const file of csrFiles) {
    input[toBuildKey(appRoot, file)] = file;
  }
  await viteBuild({
    root: appRoot,
    configFile: path13.join(appRoot, "vite.config.ts"),
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
  const manifestPath = path13.join(clientOutDir, ".vite", "manifest.json");
  if (!existsSync6(manifestPath)) {
    throw new Error(`[devora] client build for islands/csr produced no manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(await readFile3(manifestPath, "utf-8"));
  const islandUrls = /* @__PURE__ */ new Map();
  const csrUrls = /* @__PURE__ */ new Map();
  let islandClientUrl;
  let csrClientUrl;
  for (const entry of Object.values(manifest)) {
    if (!entry.isEntry || !entry.src) continue;
    const absoluteSrc = path13.resolve(appRoot, entry.src);
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

// src/build/islandsBuildPlugin.ts
function islandsBuildPlugin(islandUrls) {
  return {
    name: "framework:islands-build",
    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx|ts)$/.test(id) || !code.includes("island")) {
        return null;
      }
      const matches = [...code.matchAll(ISLAND_CALL_RE)];
      if (matches.length === 0) return null;
      let result = code;
      for (const match of matches) {
        const [original, , specifier] = match;
        const resolved = await this.resolve(specifier, id);
        if (!resolved) continue;
        const url = islandUrls.get(resolved.id);
        if (!url) continue;
        const replaced = original.slice(0, -1) + `, ${JSON.stringify(url)})`;
        result = result.replace(original, replaced);
      }
      return { code: result, map: null };
    }
  };
}

// src/build/buildAppServer.ts
async function buildAppServer(appRoot, options = {}) {
  const routesDir = path14.join(appRoot, "routes");
  const apiDir = path14.join(appRoot, "api");
  const entryServerPath = path14.join(appRoot, "entry-server.tsx");
  const serverOutDir = path14.join(appRoot, "dist", "server");
  const { islandUrls, islandClientUrl, csrUrls, csrClientUrl } = options.backendOnly ? { islandUrls: /* @__PURE__ */ new Map(), islandClientUrl: void 0, csrUrls: /* @__PURE__ */ new Map(), csrClientUrl: void 0 } : await buildAppClient(appRoot);
  const input = options.backendOnly ? {} : { "entry-server": entryServerPath };
  for (const filePath of listRouteFiles(routesDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  for (const filePath of listRouteFiles(apiDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  if (options.sessions?.storeModulePath) {
    input[SESSION_STORE_BUILD_KEY] = options.sessions.storeModulePath;
  }
  await viteBuild2({
    root: appRoot,
    configFile: path14.join(appRoot, "vite.config.ts"),
    plugins: [islandsBuildPlugin(islandUrls)],
    build: {
      ssr: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      rollupOptions: { input }
    }
  });
  if (options.sessions) {
    await writeFile2(path14.join(serverOutDir, SESSION_MANIFEST_FILE), JSON.stringify(options.sessions.manifest, null, 2));
  }
  await writeFile2(
    path14.join(serverOutDir, "island-manifest.json"),
    JSON.stringify({ islandClientUrl: islandClientUrl ?? null }, null, 2)
  );
  const csrRoutes = {};
  for (const [absPath, url] of csrUrls) {
    csrRoutes[toBuildKey(appRoot, absPath)] = url;
  }
  await writeFile2(
    path14.join(serverOutDir, "csr-route-manifest.json"),
    JSON.stringify({ csrClientUrl: csrClientUrl ?? null, routes: csrRoutes }, null, 2)
  );
  return { serverOutDir };
}

// src/build/buildAppStatic.ts
import path15 from "node:path";
import { pathToFileURL as pathToFileURL2 } from "node:url";
async function buildAppStatic(appRoot, serverOutDir, appDefaultRenderMode, options = {}) {
  if (options.backendOnly) return { staticRoutes: [] };
  const routesDir = path15.join(appRoot, "routes");
  const staticOutDir = path15.join(appRoot, "dist", "static");
  const islandManifestPath = path15.join(serverOutDir, "island-manifest.json");
  const islandClientUrl = await readIslandClientUrl(islandManifestPath);
  const entryServer = await importBuilt2(serverOutDir, "entry-server");
  const staticRoutes = [];
  for (const filePath of listRouteFiles(routesDir)) {
    const key = toBuildKey(appRoot, filePath);
    const routeModule = await importBuilt2(serverOutDir, key);
    const mode = resolveRenderMode(routeModule, appDefaultRenderMode);
    if (mode !== "ssg" && mode !== "isr") continue;
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
        const { html: html2 } = await entryServer.renderStatic(routeModule, { islandClientUrl, params });
        const routePath2 = resolveStaticRoutePath(routesDir, filePath, params);
        await writeCachedRoute(staticOutDir, routePath2, html2);
        staticRoutes.push(routePath2);
      }
      continue;
    }
    const { html } = await entryServer.renderStatic(routeModule, { islandClientUrl });
    const routePath = routeFileToPath(routesDir, filePath);
    await writeCachedRoute(staticOutDir, routePath, html);
    staticRoutes.push(routePath);
  }
  return { staticRoutes };
}
async function importBuilt2(serverOutDir, key) {
  const filePath = path15.join(serverOutDir, `${key}.js`);
  return import(pathToFileURL2(filePath).href);
}

// ../../adapters/adapter-vercel/src/index.ts
import path18 from "node:path";
import { existsSync as existsSync9 } from "node:fs";
import { mkdir as mkdir2, writeFile as writeFile3, cp as cp2, readFile as readFile4 } from "node:fs/promises";
import { createRequire } from "node:module";

// ../../adapters/adapter-vercel/src/bundleForDeploy.ts
import path16 from "node:path";
import { readdir } from "node:fs/promises";
import { existsSync as existsSync7 } from "node:fs";
import * as esbuild from "esbuild";
async function bundleForDeploy(wrapperPath, serverOutDir) {
  await esbuild.build({
    entryPoints: [wrapperPath],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: wrapperPath,
    allowOverwrite: true,
    logLevel: "silent"
  });
  const routesOutDir = path16.join(serverOutDir, "routes");
  const routeFiles = existsSync7(routesOutDir) ? await findJsFiles(routesOutDir) : [];
  const apiDir = path16.join(serverOutDir, "api");
  const apiFiles = existsSync7(apiDir) ? await findJsFiles(apiDir) : [];
  const entryServerPath = path16.join(serverOutDir, "entry-server.js");
  const entryPoints = existsSync7(entryServerPath) ? [entryServerPath] : [];
  const sessionStorePath = path16.join(serverOutDir, "session-store.js");
  if (existsSync7(sessionStorePath)) entryPoints.push(sessionStorePath);
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
    logLevel: "silent"
  });
}
async function findJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path16.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

// ../../adapters/adapter-vercel/src/deploy.ts
import path17 from "node:path";
import { existsSync as existsSync8 } from "node:fs";
import { spawn } from "node:child_process";
function isVercelLinked(appRoot) {
  return existsSync8(path17.join(appRoot, ".vercel", "project.json"));
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
var require2 = createRequire(import.meta.url);
async function vendorRuntimeDependency(resolveFrom, pkgName, destNodeModules, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(pkgName)) return;
  seen.add(pkgName);
  const pkgJsonPath = require2.resolve(`${pkgName}/package.json`, { paths: [resolveFrom] });
  const pkgDir = path18.dirname(pkgJsonPath);
  await cp2(pkgDir, path18.join(destNodeModules, pkgName), { recursive: true, dereference: true });
  const pkgJson = JSON.parse(await readFile4(pkgJsonPath, "utf-8"));
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    await vendorRuntimeDependency(pkgDir, dep, destNodeModules, seen);
  }
}
async function writeVercelOutput(app, appRoot, authMode, security, sitemapEnabled, defaultRenderMode) {
  const outputDir = path18.join(appRoot, ".vercel", "output");
  const funcDir = path18.join(outputDir, "functions", "index.func");
  const clientOutDir = path18.join(appRoot, "dist", "client");
  const staticOutDir = path18.join(appRoot, "dist", "static");
  await mkdir2(path18.join(outputDir, "static"), { recursive: true });
  await mkdir2(funcDir, { recursive: true });
  if (existsSync9(path18.join(appRoot, "routes"))) {
    await cp2(path18.join(appRoot, "routes"), path18.join(funcDir, "routes"), { recursive: true });
  }
  if (existsSync9(path18.join(appRoot, "api"))) {
    await cp2(path18.join(appRoot, "api"), path18.join(funcDir, "api"), { recursive: true });
  }
  await cp2(path18.join(appRoot, "dist", "server"), path18.join(funcDir, "dist", "server"), { recursive: true });
  if (existsSync9(clientOutDir)) {
    await cp2(clientOutDir, path18.join(outputDir, "static"), { recursive: true });
  }
  if (existsSync9(staticOutDir)) {
    await cp2(staticOutDir, path18.join(outputDir, "static"), { recursive: true });
    await cp2(staticOutDir, path18.join(funcDir, "dist", "static"), { recursive: true });
  }
  await writeFile3(path18.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile3(
    path18.join(funcDir, "index.mjs"),
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
  ${JSON.stringify(defaultRenderMode ?? null)}
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
  await bundleForDeploy(path18.join(funcDir, "index.mjs"), path18.join(funcDir, "dist", "server"));
  const funcNodeModules = path18.join(funcDir, "node_modules");
  await mkdir2(funcNodeModules, { recursive: true });
  await vendorRuntimeDependency(appRoot, "react", funcNodeModules);
  await vendorRuntimeDependency(appRoot, "react-dom", funcNodeModules);
  await writeFile3(
    path18.join(funcDir, ".vc-config.json"),
    JSON.stringify({ runtime: "nodejs20.x", handler: "index.mjs", launcherType: "Nodejs" }, null, 2)
  );
  const config = {
    version: 3,
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index" }]
  };
  await writeFile3(path18.join(outputDir, "config.json"), JSON.stringify(config, null, 2));
  console.log(
    `[adapter-vercel] wrote ${outputDir} for "${app.name}" (${app.domain}) \u2014 verified locally in isolation, NOT deployed to real Vercel infrastructure (no platform access here), see ROADMAP.md #4`
  );
}

// ../../adapters/adapter-netlify/src/index.ts
import path21 from "node:path";
import { existsSync as existsSync12 } from "node:fs";
import { mkdir as mkdir3, writeFile as writeFile4, cp as cp3, readFile as readFile5 } from "node:fs/promises";
import { createRequire as createRequire2 } from "node:module";

// ../../adapters/adapter-netlify/src/bundleForDeploy.ts
import path19 from "node:path";
import { readdir as readdir2 } from "node:fs/promises";
import { existsSync as existsSync10 } from "node:fs";
import * as esbuild2 from "esbuild";
async function bundleForDeploy2(wrapperPath, serverOutDir) {
  await esbuild2.build({
    entryPoints: [wrapperPath],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: wrapperPath,
    allowOverwrite: true,
    logLevel: "silent"
  });
  const routesOutDir = path19.join(serverOutDir, "routes");
  const routeFiles = existsSync10(routesOutDir) ? await findJsFiles2(routesOutDir) : [];
  const apiDir = path19.join(serverOutDir, "api");
  const apiFiles = existsSync10(apiDir) ? await findJsFiles2(apiDir) : [];
  const entryServerPath = path19.join(serverOutDir, "entry-server.js");
  const entryPoints = existsSync10(entryServerPath) ? [entryServerPath] : [];
  const sessionStorePath = path19.join(serverOutDir, "session-store.js");
  if (existsSync10(sessionStorePath)) entryPoints.push(sessionStorePath);
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
    logLevel: "silent"
  });
}
async function findJsFiles2(dir) {
  const entries = await readdir2(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path19.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsFiles2(full));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

// ../../adapters/adapter-netlify/src/deploy.ts
import path20 from "node:path";
import { existsSync as existsSync11 } from "node:fs";
import { spawn as spawn2 } from "node:child_process";
function isNetlifyLinked(appRoot) {
  return existsSync11(path20.join(appRoot, ".netlify", "state.json"));
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
var require3 = createRequire2(import.meta.url);
async function vendorRuntimeDependency2(resolveFrom, pkgName, destNodeModules, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(pkgName)) return;
  seen.add(pkgName);
  const pkgJsonPath = require3.resolve(`${pkgName}/package.json`, { paths: [resolveFrom] });
  const pkgDir = path21.dirname(pkgJsonPath);
  await cp3(pkgDir, path21.join(destNodeModules, pkgName), { recursive: true, dereference: true });
  const pkgJson = JSON.parse(await readFile5(pkgJsonPath, "utf-8"));
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    await vendorRuntimeDependency2(pkgDir, dep, destNodeModules, seen);
  }
}
async function writeNetlifyConfig(app, appRoot, authMode, security, sitemapEnabled, defaultRenderMode) {
  const funcDir = path21.join(appRoot, "netlify", "functions", "ssr");
  const staticOutDir = path21.join(appRoot, "dist", "static");
  await mkdir3(funcDir, { recursive: true });
  if (existsSync12(path21.join(appRoot, "routes"))) {
    await cp3(path21.join(appRoot, "routes"), path21.join(funcDir, "routes"), { recursive: true });
  }
  if (existsSync12(path21.join(appRoot, "api"))) {
    await cp3(path21.join(appRoot, "api"), path21.join(funcDir, "api"), { recursive: true });
  }
  await cp3(path21.join(appRoot, "dist", "server"), path21.join(funcDir, "dist", "server"), { recursive: true });
  if (existsSync12(staticOutDir)) {
    await cp3(staticOutDir, path21.join(funcDir, "dist", "static"), { recursive: true });
    await cp3(staticOutDir, path21.join(appRoot, "dist", "client"), { recursive: true });
  }
  await writeFile4(path21.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile4(
    path21.join(funcDir, "ssr.mjs"),
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
  ${JSON.stringify(defaultRenderMode ?? null)}
);

export default async (request) => {
  const bodyBuf = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
  const req = Readable.from(bodyBuf.length ? [bodyBuf] : []);
  const reqUrl = new URL(request.url);
  req.url = reqUrl.pathname + reqUrl.search;
  req.method = request.method;
  req.headers = Object.fromEntries(request.headers);

  let statusCode = 200;
  const resHeaders = new Headers();
  const chunks = [];
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headersSent = false;
  res.setHeader = (k, v) => resHeaders.set(k, v);
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
  await bundleForDeploy2(path21.join(funcDir, "ssr.mjs"), path21.join(funcDir, "dist", "server"));
  const funcNodeModules = path21.join(funcDir, "node_modules");
  await mkdir3(funcNodeModules, { recursive: true });
  await vendorRuntimeDependency2(appRoot, "react", funcNodeModules);
  await vendorRuntimeDependency2(appRoot, "react-dom", funcNodeModules);
  console.log(
    `[adapter-netlify] wrote ${funcDir} for "${app.name}" (${app.domain}) \u2014 verified locally in isolation, NOT deployed to real Netlify infrastructure (no platform access here), see ROADMAP.md #4`
  );
}

// src/build/buildForAdapter.ts
async function buildAppForAdapter(root, project, app, adapter) {
  const appRoot = resolveAppDir(root, app.dir);
  const appConfig = await loadAppConfig(appRoot);
  const authMode = resolveAuthMode(project, app.name);
  if (authMode === "none") {
    assertNoAuthUsage(app.name, [
      ...listRouteFiles(path22.join(appRoot, "routes")),
      ...listRouteFiles(path22.join(appRoot, "api"))
    ]);
  }
  const backendOnly = appConfig.backendOnly === true;
  console.log(`[devora] building "${app.name}" (SSR)...`);
  const sessionsConfig = project.shared.sessions;
  const sessions = authMode === "none" ? void 0 : {
    manifest: toSessionManifest(sessionsConfig),
    storeModulePath: sessionsConfig?.store && sessionsConfig.store !== "memory" ? path22.resolve(root, sessionsConfig.store) : void 0
  };
  const { serverOutDir } = await buildAppServer(appRoot, { backendOnly, sessions });
  console.log(`[devora] "${app.name}" built \u2192 ${serverOutDir}`);
  const { staticRoutes } = await buildAppStatic(appRoot, serverOutDir, appConfig.defaultRenderMode, { backendOnly });
  if (staticRoutes.length > 0) {
    console.log(`[devora] "${app.name}" pre-rendered (ssg/isr): ${staticRoutes.join(", ")}`);
  }
  if (adapter === "vercel" || adapter === "netlify") {
    const sitemapEnabled = appConfig.sitemap === true;
    if (adapter === "vercel") {
      await writeVercelOutput(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode);
    } else {
      await writeNetlifyConfig(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode);
    }
  }
  return { appRoot, serverOutDir, staticRoutes };
}

// src/commands/build.ts
async function build3(opts) {
  process.env.NODE_ENV = "production";
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  for (const app of apps) {
    await buildAppForAdapter(root, project, app, opts.adapter);
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
    opts.defaultRenderMode
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
    } else {
      console.error(`[adapter-node] "${opts.appName}"`, err);
    }
    process.exitCode = 1;
  });
  server.listen(opts.port, () => {
    console.log(`[adapter-node] "${opts.appName}" \u2192 http://localhost:${opts.port} (from ${opts.appRoot}/dist/server)`);
  });
  return server;
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
  process.env.NODE_ENV = "production";
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;
  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }
  const explicitPort = opts.port ? Number.parseInt(opts.port, 10) : void 0;
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
      port: ports ? ports.get(app.name) : explicitPort ?? DEFAULT_BASE_PORT
    });
  }
}

// src/commands/deploy.ts
async function deploy(opts) {
  process.env.NODE_ENV = "production";
  if (opts.adapter !== "vercel" && opts.adapter !== "netlify") {
    console.error(`[devora] --adapter must be "vercel" or "netlify"`);
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
import path25 from "node:path";
import { existsSync as existsSync13 } from "node:fs";
import { writeFile as writeFile6, readFile as readFile6 } from "node:fs/promises";

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

// ../scaffold/src/scaffoldAppFiles.ts
import path23 from "node:path";
import { mkdir as mkdir4, writeFile as writeFile5 } from "node:fs/promises";
async function scaffoldAppFiles(appDir, appName, opts) {
  const { authMode, coreVersion, cliInvocation, cliVersion } = opts;
  const devoraCmd = cliInvocation === "monorepo" ? "cd ../.. && node packages/cli/dist/index.js" : "cd ../.. && ./node_modules/.bin/devora";
  await mkdir4(path23.join(appDir, "routes"), { recursive: true });
  await writeFile5(
    path23.join(appDir, "package.json"),
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
          "@devorajs/backend": "*",
          react: "^18.3.0",
          "react-dom": "^18.3.0",
          "@vitejs/plugin-react": "^4.3.0",
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
    path23.join(appDir, "tsconfig.json"),
    `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "." },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["dist", "node_modules"]
}
`
  );
  await writeFile5(
    path23.join(appDir, "app.config.ts"),
    `import { defineApp } from "@devorajs/core/config";

export default defineApp({
  defaultRenderMode: "ssr",
  // Opt-in, off by default \u2014 see ROADMAP.md #7. Turn on for a
  // public-facing app; leave off for an internal one.
  sitemap: false,
});
`
  );
  await writeFile5(
    path23.join(appDir, "vite.config.ts"),
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
    path23.join(appDir, "entry-server.tsx"),
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
    path23.join(appDir, "island-client.tsx"),
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
    path23.join(appDir, "csr-client.tsx"),
    `import { hydrateCsrRoutes } from "@devorajs/core/client";

// Only requested when a page's renderMode is "csr" \u2014 see
// packages/core/src/csrRoute.ts. Real logic lives once in
// @devorajs/core, shared by every app.
hydrateCsrRoutes();
`
  );
  await writeFile5(
    path23.join(appDir, "vercel.json"),
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
    path23.join(appDir, "netlify.toml"),
    `[build]
  command = "${devoraCmd} build --app=${appName} --adapter=netlify"
  publish = "dist/client"
  functions = "netlify/functions"

[functions.ssr]
  included_files = ["netlify/functions/ssr/routes/**", "netlify/functions/ssr/api/**", "netlify/functions/ssr/dist/**", "netlify/functions/ssr/package.json", "netlify/functions/ssr/node_modules/**"]

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/ssr"
  status = 200
`
  );
  await writeFile5(
    path23.join(appDir, "routes", "index.tsx"),
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
      path23.join(appDir, "routes", "login.tsx"),
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
      path23.join(appDir, "routes", "logout.tsx"),
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
      path23.join(appDir, "routes", "account.tsx"),
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

// ../scaffold/src/scaffoldProjectFiles.ts
import path24 from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path24.dirname(fileURLToPath(import.meta.url));

// src/commands/new.ts
async function detectScaffoldContext(root) {
  if (existsSync13(path25.join(root, "packages", "cli", "dist", "index.js"))) {
    return { cliInvocation: "monorepo", coreVersion: "*" };
  }
  let coreVersion = "*";
  let cliVersion;
  const rootPkgPath = path25.join(root, "package.json");
  if (existsSync13(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(await readFile6(rootPkgPath, "utf-8"));
      coreVersion = rootPkg.dependencies?.["@devorajs/core"] ?? rootPkg.devDependencies?.["@devorajs/core"] ?? coreVersion;
      cliVersion = rootPkg.dependencies?.["@devorajs/cli"] ?? rootPkg.devDependencies?.["@devorajs/cli"];
    } catch {
    }
  }
  return { cliInvocation: "standalone", coreVersion, cliVersion };
}
async function scaffoldApp(appName, opts) {
  const root = process.cwd();
  const appDir = path25.join(root, "apps", appName);
  if (existsSync13(appDir)) {
    console.error(`[devora] apps/${appName} already exists`);
    process.exit(1);
  }
  const authMode = await resolveAuthChoice(opts.auth, appName);
  const context = await detectScaffoldContext(root);
  await scaffoldAppFiles(appDir, appName, {
    authMode,
    coreVersion: context.coreVersion,
    cliInvocation: context.cliInvocation,
    cliVersion: context.cliVersion
  });
  const configPath = path25.join(root, "devora.config.ts");
  if (existsSync13(configPath)) {
    const original = await readFile6(configPath, "utf-8");
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
import path26 from "node:path";
import { existsSync as existsSync14 } from "node:fs";
import { readFile as readFile7, writeFile as writeFile7, rm as rm2 } from "node:fs/promises";
async function removeApp(appName) {
  const root = process.cwd();
  const appDir = path26.join(root, "apps", appName);
  const configPath = path26.join(root, "devora.config.ts");
  let removedFromConfig = false;
  if (existsSync14(configPath)) {
    const original = await readFile7(configPath, "utf-8");
    const entryRe = new RegExp(`[ \\t]*\\{ name: "${appName}"[^\\n]*\\},\\n`);
    const updated = original.replace(entryRe, "");
    if (updated !== original) {
      await writeFile7(configPath, updated);
      removedFromConfig = true;
    }
  }
  const dirExisted = existsSync14(appDir);
  if (dirExisted) {
    await rm2(appDir, { recursive: true, force: true });
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
import path27 from "node:path";
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
  const outPath = opts.out ?? path27.join(root, opts.target === "nginx" ? "nginx.conf" : "Caddyfile");
  await writeFile8(outPath, output);
  console.log(`[devora] generated ${opts.target} config for ${project.apps.length} app(s) \u2192 ${outPath}`);
  console.log(`[devora] no hand-editing needed \u2014 domains came straight from devora.config.ts`);
}

// src/commands/split.ts
import path30 from "node:path";
import { existsSync as existsSync15 } from "node:fs";
import { rm as rm3 } from "node:fs/promises";

// src/build/resolveSplitTarget.ts
import path29 from "node:path";

// src/build/gitHelpers.ts
import { execFileSync } from "node:child_process";
import path28 from "node:path";
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
    const path33 = rest.join(" ");
    const name = key.replace(/^submodule\./, "").replace(/\.path$/, "");
    const urlResult = git(["config", "--file", ".gitmodules", "--get", `submodule.${name}.url`], repoRoot);
    entries.push({ name, path: path33, url: urlResult.stdout.trim() });
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
  const resolvedRoot = path28.resolve(root);
  const resolvedTarget = path28.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot + path28.sep)) {
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
    const target2 = path29.join(root, project.shared.backend);
    assertInsideRoot(root, target2, "shared.backend");
    return target2;
  }
  const app = project.apps.find((a) => a.name === name);
  if (!app) {
    throw new Error(`[devora] no app named "${name}" in devora.config.ts (and it isn't "backend" either)`);
  }
  const target = path29.join(root, app.dir);
  assertInsideRoot(root, target, `apps.${name}.dir`);
  return target;
}
function nameForSplitTarget(root, project, relativePath) {
  if (path29.normalize(project.shared.backend) === path29.normalize(relativePath)) {
    return "backend";
  }
  const app = project.apps.find((a) => path29.normalize(a.dir) === path29.normalize(relativePath));
  return app?.name ?? relativePath;
}

// src/build/confirmAction.ts
import { createInterface as createInterface2 } from "node:readline/promises";
async function confirmAction(message, opts) {
  if (opts.yes) return true;
  if (!process.stdin.isTTY) {
    console.error(`[devora] ${message} \u2014 refusing without --yes in a non-interactive shell.`);
    return false;
  }
  const rl = createInterface2({ input: process.stdin, output: process.stdout });
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
  const relPath = path30.relative(root, targetPath);
  if (!existsSync15(targetPath)) {
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
    await rm3(targetPath, { recursive: true, force: true });
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
import path31 from "node:path";
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
      const targetPath = path31.join(root, s.path);
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
    const relPath = path31.relative(root, target.path);
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
import path32 from "node:path";
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
    const targetPath = path32.join(root, sub.path);
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
program.name("devora").description("Devora.js CLI \u2014 the multi-app, security-first framework").version("0.1.0");
program.command("dev").description("Run all apps in dev mode (or one with --app)").option("--app <name>", "run only this app").option(
  "--host",
  "listen on all network interfaces (so a phone/other device on your LAN can reach it) \u2014 off by default"
).action(async (opts) => dev(opts));
program.command("build").description("Build all apps (or one with --app)").option("--app <name>", "build only this app").option("--adapter <target>", "also write output for this adapter: vercel or netlify").action(async (opts) => build3(opts));
program.command("start").description("Serve a production build (adapter-node) \u2014 run `devora build` first").option("--app <name>", "serve only this app").option("--port <port>", "starting port (default 4173, increments per app)").action(async (opts) => start(opts));
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
