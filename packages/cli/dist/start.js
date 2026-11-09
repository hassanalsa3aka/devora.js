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
          var defineDeprecationWarning = function(methodName, info2) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info2[0], info2[1]);
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
        function createElement2(type, config, children) {
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
        function createContext(defaultValue) {
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
        function useContext(Context) {
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
          var info2 = getDeclarationErrorAddendum();
          if (!info2) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info2 = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info2;
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
            var info2 = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info2 += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info2 += sourceInfo;
            } else {
              info2 += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info2 = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info2);
            }
          }
          var element = createElement2.apply(this, arguments);
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
        exports.createContext = createContext;
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
        exports.useContext = useContext;
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

// src/startEntry.ts
import { Command } from "commander";

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
  let headers;
  const getUrl = () => {
    if (!url) {
      try {
        url = new URL(source.url);
      } catch {
        url = new URL(DEFAULT_REQUEST_META.url);
      }
    }
    return url;
  };
  const getHeaders = () => {
    if (!headers) {
      headers = new Headers();
      for (const [name, value] of Object.entries(source.headers)) {
        if (value === void 0) continue;
        for (const item of Array.isArray(value) ? value : [value]) {
          try {
            headers.append(name, item);
          } catch {
          }
        }
      }
    }
    return headers;
  };
  let request;
  return {
    get url() {
      return getUrl();
    },
    get headers() {
      return getHeaders();
    },
    method: source.method,
    ip: source.ip,
    get request() {
      if (!request) {
        try {
          request = new Request(getUrl(), { method: source.method, headers: getHeaders() });
        } catch {
          request = new Request(getUrl(), { headers: getHeaders() });
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
function splitRouteParams(raw = {}) {
  const params = {};
  const catchAll = {};
  for (const [name, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      catchAll[name] = value;
      params[name] = value.join("/");
    } else {
      params[name] = value;
    }
  }
  return { params, catchAll };
}
var RANK = { static: 3, param: 2, catchAll: 1, optionalCatchAll: 0 };
function buildRouteTable(routesDir) {
  const entries = collectRouteFiles(routesDir).map((filePath) => {
    const segments = fileToRouteSegments(routesDir, filePath).map(parseSegment);
    return { filePath, segments, pattern: fileToRoutePath(routesDir, filePath) };
  });
  for (const entry of entries) {
    const rest = entry.segments.findIndex((s) => s.kind === "catchAll" || s.kind === "optionalCatchAll");
    if (rest !== -1 && rest !== entry.segments.length - 1) {
      throw new Error(
        `[devora] ${entry.filePath}: a catch-all segment must be the last part of the route (found ${JSON.stringify(entry.pattern)}). Move the files that sit under it elsewhere.`
      );
    }
  }
  const seen = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const shape = entry.segments.map((s) => s.kind === "static" ? `s:${s.value}` : s.kind).join("/");
    const other = seen.get(shape);
    if (other) {
      throw new Error(
        `[devora] two routes match the same URLs: ${other.filePath} and ${entry.filePath} (both are ${JSON.stringify(entry.pattern)}-shaped). Rename or remove one.`
      );
    }
    seen.set(shape, entry);
  }
  return { entries };
}
function matchInTable(table, urlPath) {
  const normalized = normalizePath(urlPath);
  const urlSegments = segmentsOf(normalized);
  const decoded = [];
  for (const raw of urlSegments) {
    const value = decodeSegment(raw);
    if (value === null) return null;
    decoded.push(value);
  }
  let best = null;
  for (const entry of table.entries) {
    const params = matchSegments(entry.segments, decoded);
    if (!params) continue;
    if (!best || moreSpecific(entry.segments, best.entry.segments)) best = { entry, params };
  }
  if (!best) return null;
  return { filePath: best.entry.filePath, routePath: normalized, params: best.params };
}
function matchSegments(route, url) {
  const params = {};
  for (let i = 0; i < route.length; i++) {
    const seg = route[i];
    if (seg.kind === "catchAll" || seg.kind === "optionalCatchAll") {
      const rest = url.slice(i);
      if (seg.kind === "catchAll" && rest.length === 0) return null;
      params[seg.name] = rest;
      return params;
    }
    const value = url[i];
    if (value === void 0) return null;
    if (seg.kind === "static") {
      if (seg.value !== value) return null;
    } else {
      params[seg.name] = value;
    }
  }
  return url.length === route.length ? params : null;
}
function moreSpecific(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ra = a[i] ? RANK[a[i].kind] : -1;
    const rb = b[i] ? RANK[b[i].kind] : -1;
    if (ra !== rb) return ra > rb;
  }
  return false;
}
function decodeSegment(raw) {
  if (raw === "") return null;
  let value;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (value === "" || value === "." || value === ".." || /[\\/\0]/.test(value)) return null;
  return value;
}
function parseSegment(raw) {
  let m = /^\[\[\.\.\.([^\[\]]+)\]\]$/.exec(raw);
  if (m) return { kind: "optionalCatchAll", name: m[1] };
  m = /^\[\.\.\.([^\[\]]+)\]$/.exec(raw);
  if (m) return { kind: "catchAll", name: m[1] };
  if (isDynamicSegment(raw)) return { kind: "param", name: paramName(raw) };
  return { kind: "static", value: raw };
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
  const out = [];
  for (const segment of fileToRouteSegments(routesDir, filePath)) {
    const parsed = parseSegment(segment);
    if (parsed.kind === "static") {
      out.push(parsed.value);
      continue;
    }
    const value = params[parsed.name];
    if (value === void 0) {
      throw new Error(
        `[devora] getStaticParams() entry is missing "${parsed.name}" for dynamic route segment "${segment}"`
      );
    }
    const isRest = parsed.kind === "catchAll" || parsed.kind === "optionalCatchAll";
    if (isRest !== Array.isArray(value)) {
      throw new Error(
        `[devora] getStaticParams() "${parsed.name}" for "${segment}" must be ${isRest ? "a string[]" : "a string"}`
      );
    }
    const parts = Array.isArray(value) ? value : [value];
    if (parsed.kind === "catchAll" && parts.length === 0) {
      throw new Error(`[devora] getStaticParams() "${parsed.name}" for "${segment}" must have at least one segment`);
    }
    for (const part of parts) {
      if (typeof part !== "string" || part === "" || part === "." || part === ".." || /[\\/\0]/.test(part)) {
        throw new Error(
          `[devora] getStaticParams() "${parsed.name}" contains an unusable path segment ${JSON.stringify(part)} (empty, ".", "..", or containing a slash)`
        );
      }
      out.push(encodeURIComponent(part));
    }
  }
  return out.length === 0 ? "/" : "/" + out.join("/");
}
function isDynamicSegment(segment) {
  return segment.startsWith("[") && segment.endsWith("]") && segment.length > 2;
}
function paramName(segment) {
  return segment.replace(/^\[\[?(\.\.\.)?/, "").replace(/\]\]?$/, "");
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
  --devora-font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --devora-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --devora-text-xs: 0.75rem;
  --devora-text-sm: 0.875rem;
  --devora-text-base: 1rem;
  --devora-text-lg: 1.125rem;
  --devora-text-xl: 1.375rem;
  --devora-text-2xl: clamp(1.875rem, 1.45rem + 1.6vw, 2.5rem);
  --devora-space-1: 0.25rem;
  --devora-space-2: 0.5rem;
  --devora-space-3: 0.75rem;
  --devora-space-4: 1rem;
  --devora-space-6: 1.5rem;
  --devora-space-8: 2rem;
  --devora-space-12: 3rem;
  --devora-radius-sm: 6px;
  --devora-radius: 10px;
  --devora-radius-lg: 14px;
  --devora-content-width: 760px;
  --devora-wide-width: 1120px;
  --devora-gutter: clamp(1rem, 0.6rem + 1.8vw, 1.5rem);

  --devora-bg: #0b0b12;
  --devora-surface: #11111a;
  --devora-header-bg: rgba(17, 17, 26, 0.85);
  --devora-card: #15151f;
  --devora-fg: #f4f4f6;
  --devora-fg-muted: #a6a6b8;
  --devora-fg-subtle: #8a8a9e;
  --devora-border: #262633;
  --devora-border-strong: #383850;
  --devora-accent-from: #3b82f6;
  --devora-accent-to: #a855f7;
  --devora-button-from: #2563eb;
  --devora-button-to: #7c3aed;
  --devora-link: #93b8ff;
  --devora-ring: rgba(120, 160, 255, 0.55);
  --devora-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.45);
  --devora-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.28);
  --devora-hover: rgba(255, 255, 255, 0.06);
}
@media (prefers-color-scheme: light) {
  :root {
    --devora-bg: #f7f7fa;
    --devora-surface: #ffffff;
    --devora-header-bg: rgba(255, 255, 255, 0.88);
    --devora-card: #ffffff;
    --devora-fg: #15151e;
    --devora-fg-muted: #4c4c5c;
    --devora-fg-subtle: #646475;
    --devora-border: #e3e3eb;
    --devora-border-strong: #cdcdd9;
    --devora-accent-from: #2563eb;
    --devora-accent-to: #9333ea;
    --devora-link: #1d4ed8;
    --devora-ring: rgba(37, 99, 235, 0.45);
    --devora-shadow-sm: 0 1px 2px rgba(20, 20, 40, 0.06);
    --devora-shadow: 0 1px 2px rgba(20, 20, 40, 0.05), 0 8px 24px rgba(20, 20, 40, 0.07);
    --devora-hover: rgba(20, 20, 40, 0.05);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--devora-bg);
  color: var(--devora-fg);
  font-family: var(--devora-font);
  font-size: var(--devora-text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--devora-link); text-underline-offset: 3px; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }
:where(a, button, input, textarea, select, summary):focus-visible {
  outline: 2px solid var(--devora-ring);
  outline-offset: 2px;
  border-radius: var(--devora-radius-sm);
}
h1, h2, h3 { line-height: 1.2; color: var(--devora-fg); }
code {
  font-family: var(--devora-mono);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 5px;
  padding: 0.1em 0.4em;
  font-size: 0.875em;
}
img { max-width: 100%; }

/* Shell: full-height column; <main> grows, so the footer sits at the
   bottom of a short page and below the content of a long one. */
.devora-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* Header */
.devora-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--devora-header-bg);
  -webkit-backdrop-filter: saturate(180%) blur(10px);
  backdrop-filter: saturate(180%) blur(10px);
  border-bottom: 1px solid var(--devora-border);
}
.devora-header-inner {
  max-width: var(--devora-wide-width);
  margin: 0 auto;
  min-height: 60px;
  padding: var(--devora-space-2) var(--devora-gutter);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--devora-space-2) var(--devora-space-4);
}
.devora-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--devora-space-2);
  text-decoration: none;
  color: var(--devora-fg);
  font-weight: 700;
  font-size: var(--devora-text-lg);
  letter-spacing: -0.01em;
  flex-shrink: 0;
}
.devora-brand img { height: 28px; width: 28px; display: block; }
.devora-brand .devora-js, .devora-gradient-text {
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-app-badge {
  font-size: var(--devora-text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--devora-fg-muted);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  flex-shrink: 0;
}
.devora-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--devora-space-1);
  margin-left: auto;
}
.devora-nav a {
  color: var(--devora-fg-muted);
  text-decoration: none;
  font-size: var(--devora-text-sm);
  font-weight: 500;
  white-space: nowrap;
  padding: 0.4rem 0.65rem;
  border-radius: var(--devora-radius-sm);
  transition: color 0.15s ease, background-color 0.15s ease;
}
.devora-nav a:hover, .devora-nav a[aria-current="page"] { color: var(--devora-fg); background: var(--devora-hover); }
@media (max-width: 640px) {
  /* The nav takes its own row and wraps \u2014 no hidden, sideways-scrolling links. */
  .devora-nav { order: 3; width: 100%; margin: 0 calc(-1 * var(--devora-space-2)); }
}

/* Page content: one centered reading column */
.devora-page {
  flex: 1 0 auto;
  width: 100%;
  max-width: calc(var(--devora-content-width) + 2 * var(--devora-gutter));
  margin: 0 auto;
  padding: clamp(2rem, 1.2rem + 3.5vw, 4rem) var(--devora-gutter) clamp(3rem, 2rem + 4vw, 5rem);
}
.devora-page > :first-child { margin-top: 0; }
.devora-page h1 {
  font-size: var(--devora-text-2xl);
  letter-spacing: -0.02em;
  margin: 0 0 var(--devora-space-4);
}
.devora-page h2 {
  font-size: var(--devora-text-xl);
  letter-spacing: -0.01em;
  margin: var(--devora-space-12) 0 var(--devora-space-4);
  padding-bottom: var(--devora-space-2);
  border-bottom: 1px solid var(--devora-border);
}
.devora-page h3 { font-size: var(--devora-text-lg); margin: var(--devora-space-8) 0 var(--devora-space-3); }
.devora-page p { margin: 0 0 var(--devora-space-4); color: var(--devora-fg-muted); }
.devora-page p code, .devora-page li code { color: var(--devora-fg); }
.devora-lead { font-size: var(--devora-text-lg); color: var(--devora-fg-muted); max-width: 60ch; }
.devora-page strong { color: var(--devora-fg); }
.devora-page ul, .devora-page ol { color: var(--devora-fg-muted); padding-left: 1.25rem; margin: 0 0 var(--devora-space-4); }
.devora-page li { margin: var(--devora-space-2) 0; }
.devora-page li::marker { color: var(--devora-accent-from); }
.devora-page hr { border: 0; border-top: 1px solid var(--devora-border); margin: var(--devora-space-8) 0; }
.devora-page pre {
  margin: 0 0 var(--devora-space-6);
  padding: var(--devora-space-4) 1.125rem;
  overflow-x: auto;
  font-size: var(--devora-text-sm);
  line-height: 1.65;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius);
}
.devora-page pre code { background: transparent; border: none; padding: 0; font-size: 1em; }

/* Cards, and a responsive grid of them */
.devora-card {
  padding: var(--devora-space-6);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius-lg);
  box-shadow: var(--devora-shadow-sm);
  margin: var(--devora-space-6) 0;
}
.devora-card > :first-child { margin-top: 0; }
.devora-card > :last-child { margin-bottom: 0; }
.devora-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--devora-space-4);
  margin: var(--devora-space-8) 0;
}
.devora-grid > .devora-card { margin: 0; }
.devora-card h3 { margin: 0 0 var(--devora-space-2); font-size: var(--devora-text-base); }

/* Forms: a card, labels above full-width fields */
.devora-page form {
  display: flex;
  flex-direction: column;
  gap: var(--devora-space-4);
  max-width: 440px;
  margin: var(--devora-space-6) 0;
  padding: var(--devora-space-6);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius-lg);
  box-shadow: var(--devora-shadow);
}
.devora-page label {
  font-size: var(--devora-text-sm);
  font-weight: 600;
  color: var(--devora-fg);
  margin-bottom: calc(-1 * var(--devora-space-2));
}
.devora-page input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
.devora-page textarea,
.devora-page select {
  width: 100%;
  min-height: 42px;
  padding: 0.55rem 0.75rem;
  border-radius: var(--devora-radius-sm);
  border: 1px solid var(--devora-border-strong);
  background: var(--devora-bg);
  color: var(--devora-fg);
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.devora-page textarea { min-height: 6rem; resize: vertical; }
.devora-page input::placeholder, .devora-page textarea::placeholder { color: var(--devora-fg-subtle); }
.devora-page input:focus, .devora-page textarea:focus, .devora-page select:focus {
  outline: none;
  border-color: var(--devora-accent-from);
  box-shadow: 0 0 0 3px var(--devora-ring);
}
.devora-page button, .devora-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--devora-space-2);
  min-height: 42px;
  padding: 0.55rem 1.25rem;
  border-radius: var(--devora-radius-sm);
  border: none;
  /* Darker than the brand gradient so white text stays above 4.5:1 contrast. */
  background: linear-gradient(90deg, var(--devora-button-from), var(--devora-button-to));
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  font-size: var(--devora-text-sm);
  text-decoration: none;
  cursor: pointer;
  align-self: flex-start;
  box-shadow: var(--devora-shadow-sm);
  transition: filter 0.15s ease, transform 0.1s ease;
}
.devora-page button:hover, .devora-button:hover { filter: brightness(1.08); }
.devora-page button:active, .devora-button:active { transform: translateY(1px); }
.devora-page button:disabled { opacity: 0.55; cursor: not-allowed; }

/* Error and status pages */
.devora-error, .devora-status { text-align: center; padding-top: clamp(3rem, 2rem + 8vw, 7rem); }
.devora-error h1, .devora-status h1 {
  font-size: clamp(3rem, 2rem + 6vw, 5rem);
  letter-spacing: -0.04em;
  margin-bottom: var(--devora-space-2);
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-status h1 { font-size: var(--devora-text-2xl); }
.devora-error pre { text-align: left; }
.devora-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--devora-space-2);
  font-size: var(--devora-text-sm);
  font-weight: 600;
  color: var(--devora-fg);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
}
.devora-pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }

/* Footer */
.devora-footer {
  border-top: 1px solid var(--devora-border);
  background: var(--devora-surface);
  color: var(--devora-fg-subtle);
  font-size: var(--devora-text-sm);
}
.devora-footer-inner {
  max-width: var(--devora-wide-width);
  margin: 0 auto;
  padding: var(--devora-space-6) var(--devora-gutter);
  display: flex;
  flex-direction: column;
  gap: var(--devora-space-4);
}
.devora-footer a { color: var(--devora-fg-muted); }
.devora-footer a:hover { color: var(--devora-fg); }
.devora-footer-custom, .devora-footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--devora-space-3) var(--devora-space-8);
}
.devora-footer-brand { display: inline-flex; align-items: center; gap: var(--devora-space-2); }
.devora-footer-brand a { text-decoration: none; font-weight: 600; }
.devora-footer img { height: 18px; width: 18px; display: block; }
.devora-footer-links { display: flex; flex-wrap: wrap; gap: var(--devora-space-2) var(--devora-space-6); }
.devora-footer-links a { text-decoration: none; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
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
function renderShellMarkup(mainHtml, options = {}) {
  const logo = options.logo === false ? "" : `<img src="${DEVORA_LOGO_URL}" alt="" width="28" height="28" />`;
  const badge = options.badge ? `<span class="devora-app-badge">${escapeHtml(options.badge)}</span>` : "";
  return `<div class="devora-shell"><header class="devora-header"><div class="devora-header-inner"><a href="/" class="devora-brand" aria-label="devora.js home">${logo}<span>devora<span class="devora-js">.js</span></span></a>${badge}</div></header><main class="devora-page${options.mainClass ? ` ${escapeHtml(options.mainClass)}` : ""}">${mainHtml}</main><footer class="devora-footer"><div class="devora-footer-inner"><div class="devora-footer-row"><div class="devora-footer-brand"><span>Built with <a href="https://github.com/hassanalsa3aka/devora.js">devora.js</a></span></div></div></div></footer></div>`;
}

// ../core/src/session.ts
import { createHmac as createHmac2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// ../core/src/configError.ts
var DevoraConfigError = class extends Error {
  name = "DevoraConfigError";
};

// ../core/src/csrf.ts
var import_react = __toESM(require_react(), 1);
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
var CSRF_COOKIE_NAME = "devora_csrf";
var CSRF_FORM_FIELD = "_csrf";
var CSRF_HEADER_NAME = "x-devora-csrf";
function generateCsrfToken() {
  return randomBytes(32).toString("base64url");
}
function deriveSessionCsrfToken(sessionId, options) {
  return createHmac("sha256", options.secret).update(`csrf:${options.name}:${sessionId}`).digest("base64url");
}
function verifyCsrfToken(cookieValue, formValue) {
  if (!cookieValue || typeof formValue !== "string" || !formValue) return false;
  const cookieBuf = Buffer.from(cookieValue);
  const formBuf = Buffer.from(formValue);
  if (cookieBuf.length !== formBuf.length) return false;
  return timingSafeEqual(cookieBuf, formBuf);
}
var CSRF_SAFE_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
function verifyCsrfByDefault(options) {
  if (!options.cookieAuthenticated || options.optedOut || CSRF_SAFE_METHODS.has(options.method.toUpperCase())) return;
  const fromForm = options.formData?.get(CSRF_FORM_FIELD);
  const fromHeader = Array.isArray(options.headerToken) ? options.headerToken[0] : options.headerToken;
  options.verifyCsrf(typeof fromForm === "string" && fromForm ? fromForm : fromHeader ?? "");
}

// ../core/src/httpError.ts
var HttpError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
};
function getHttpErrorStatus(err) {
  if (!err || typeof err !== "object") return void 0;
  const candidate = err.status ?? err.statusCode;
  if (typeof candidate !== "number" || !Number.isInteger(candidate)) return void 0;
  return candidate >= 400 && candidate <= 599 ? candidate : void 0;
}
function jsonMessageResponse(status, message, headers) {
  return {
    status,
    headers: { ...headers ?? {}, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message })
  };
}
function apiNotFoundResponse() {
  return jsonMessageResponse(404, "Not found");
}
function apiErrorResponse(err) {
  const status = getHttpErrorStatus(err);
  if (status !== void 0) {
    if (status >= 500) console.error("[devora] API route error:", err);
    return jsonMessageResponse(status, errorMessage(err) || "Request failed");
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
function backendStatusResponse(appName) {
  return {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify({ app: appName, status: "ok", api: "/api" })
  };
}
function backendStatusPage(appName) {
  const main = `<span class="devora-pill">API is running</span><h1>${escapeHtml(appName)}</h1><p class="devora-lead">This app serves JSON under <code>/api</code>. Its routes live in the app's API folder.</p>`;
  return {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body: renderHtmlDocument({
      bodyHtml: renderShellMarkup(main, { mainClass: "devora-status", badge: appName, logo: false }),
      meta: { title: `${appName} \u2014 API` },
      head: { appHead: { theme: true } }
    })
  };
}
function backendStatusFor(appName, accept) {
  const value = Array.isArray(accept) ? accept.join(",") : accept ?? "";
  return /\btext\/html\b/i.test(value) ? backendStatusPage(appName) : backendStatusResponse(appName);
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
var SESSION_SECRET_DOCS = "https://github.com/hassanalsa3aka/devora.js/blob/main/packages/backend/AUTH.md";
var warnedForKey;
function resolveSecret(envKey) {
  const configured = process.env[envKey] ?? process.env.DEVORA_SESSION_SECRET;
  if (configured) return configured;
  const label = envKey === "DEVORA_SESSION_SECRET" ? envKey : `${envKey} (or DEVORA_SESSION_SECRET)`;
  if (process.env.NODE_ENV === "production") {
    throw new DevoraConfigError(
      `[devora] no session secret configured: set ${label} before running in production (e.g. \`openssl rand -base64 32\`). See ${SESSION_SECRET_DOCS}`
    );
  }
  if (warnedForKey !== envKey) {
    console.warn(
      `[devora] no ${label} set \u2014 using an insecure dev-only default. Set this before deploying \u2014 see ${SESSION_SECRET_DOCS}`
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
  let perSecret = storeKeyMemo.get(opts.secret);
  if (!perSecret) storeKeyMemo.set(opts.secret, perSecret = /* @__PURE__ */ new Map());
  const memoKey = `${opts.name}:${sessionId}`;
  let key = perSecret.get(memoKey);
  if (key === void 0) {
    key = createHmac2("sha256", opts.secret).update(memoKey).digest("base64url");
    if (storeKeyMemoSize >= STORE_KEY_MEMO_MAX) {
      storeKeyMemo.clear();
      storeKeyMemoSize = 0;
      storeKeyMemo.set(opts.secret, perSecret = /* @__PURE__ */ new Map());
    }
    perSecret.set(memoKey, key);
    storeKeyMemoSize++;
  }
  return key;
}
var STORE_KEY_MEMO_MAX = 5e3;
var storeKeyMemo = /* @__PURE__ */ new Map();
var storeKeyMemoSize = 0;
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
    if (!key || Object.prototype.hasOwnProperty.call(cookies, key)) continue;
    const value = part.slice(eq + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
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
var warnedSessionWithoutAuth = /* @__PURE__ */ new Set();
var MAX_WARNED_PATHS = 1e3;
function warnIfSessionReadWithoutAuth(context, urlOrPath) {
  const { sessionRead, requireAuthCalled } = context.authUsage();
  if (!sessionRead || requireAuthCalled) return;
  if (process.env.NODE_ENV === "production") return;
  let pathname = urlOrPath ?? "(unknown path)";
  try {
    pathname = new URL(pathname, "http://localhost").pathname;
  } catch {
  }
  if (warnedSessionWithoutAuth.has(pathname) || warnedSessionWithoutAuth.size >= MAX_WARNED_PATHS) return;
  warnedSessionWithoutAuth.add(pathname);
  console.warn(
    `[devora] ${pathname} read ctx.session but never called ctx.requireAuth(). If this route is for signed-in users only, call ctx.requireAuth() first (a 401 when there is no session); if it also serves signed-out visitors, check ctx.session for undefined before using it. (Shown once per path, in dev only.)`
  );
}
var PRIVATE_NO_STORE = "private, no-store";
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
  const anonymousCsrfToken = csrfEnabled ? incomingCsrfCookie ?? generateCsrfToken() : "";
  if (csrfEnabled && !incomingCsrfCookie && resolved.presentedTransport !== "bearer") {
    pendingSetCookies.push(`${CSRF_COOKIE_NAME}=${anonymousCsrfToken}; ${buildCookieAttributes(opts.cookie)}`);
  }
  const presentedCookieSessionId = csrfEnabled && resolved.presentedTransport === "cookie" && resolved.record !== void 0 ? resolved.sessionId : void 0;
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
  let sessionRead = false;
  let requireAuthCalled = false;
  const split = splitRouteParams(params);
  const ctx = {
    params: split.params,
    catchAll: split.catchAll,
    get url() {
      return fields.url;
    },
    get headers() {
      return fields.headers;
    },
    method: fields.method,
    ip: fields.ip,
    get request() {
      return fields.request;
    },
    get session() {
      sessionRead = true;
      return currentRecord?.data;
    },
    get sessionTransport() {
      return transport;
    },
    requireAuth: () => {
      requireAuthCalled = true;
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
      if (presentedCookieSessionId !== void 0) {
        if (!verifyCsrfToken(deriveSessionCsrfToken(presentedCookieSessionId, opts), value)) {
          throw new HttpError(403, "Missing or invalid CSRF token");
        }
        return;
      }
      if (!verifyCsrfToken(incomingCsrfCookie, value)) {
        throw new HttpError(403, "Missing or invalid CSRF token");
      }
    }
  };
  return {
    ctx,
    // A getter: an action that logs in (setSession) and then renders must get the token of the new session.
    get csrfToken() {
      if (csrfEnabled && currentSessionId !== void 0 && currentRecord !== void 0 && transport === "cookie") {
        return deriveSessionCsrfToken(currentSessionId, opts);
      }
      return anonymousCsrfToken;
    },
    getSetCookie: () => pendingSetCookies.length > 0 ? pendingSetCookies : void 0,
    cookieAuthenticated: resolved.presentedTransport === "cookie" && resolved.record !== void 0,
    authUsage: () => ({ sessionRead, requireAuthCalled }),
    touchesSessionCookie: () => resolved.presentedTransport === "cookie" || pendingSetCookies.some((cookie) => cookie.startsWith(`${opts.name}=`)),
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
  const split = splitRouteParams(params);
  const ctx = {
    params: split.params,
    catchAll: split.catchAll,
    get url() {
      return fields.url;
    },
    get headers() {
      return fields.headers;
    },
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
  }, touchesSessionCookie: () => false, cookieAuthenticated: false, authUsage: () => ({ sessionRead: false, requireAuthCalled: false }) };
}

// ../core/src/sessionConfig.ts
import { existsSync, readFileSync } from "node:fs";
import path2 from "node:path";
var SESSION_MANIFEST_FILE = "session-manifest.json";
var SESSION_STORE_BUILD_KEY = "session-store";
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
    throw new DevoraConfigError(
      `[devora] no session store configured: add sessions: { store: "memory" } under shared in devora.config.ts (one long-running server only; for serverless or several instances use a path to a module that default-exports a SessionStore backed by your database), and set DEVORA_SESSION_SECRET (openssl rand -base64 32). See packages/backend/AUTH.md`
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
var NOSNIFF_HEADER = { name: "X-Content-Type-Options", value: "nosniff" };
var SVG_CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
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
    "X-Frame-Options": security?.frameOptions ?? DEFAULT_FRAME_OPTIONS,
    [NOSNIFF_HEADER.name]: NOSNIFF_HEADER.value
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
async function collectSitemapPaths(routesDir, loadRoute) {
  const out = /* @__PURE__ */ new Set();
  for (const filePath of listRouteFiles(routesDir)) {
    if (!isDynamicRouteFile(routesDir, filePath)) {
      out.add(routeFileToPath(routesDir, filePath));
      continue;
    }
    const mod = await loadRoute(filePath);
    if (!mod?.getStaticParams) continue;
    for (const params of await mod.getStaticParams()) {
      out.add(resolveStaticRoutePath(routesDir, filePath, params));
    }
  }
  return [...out].sort();
}
function generateSitemapXml(routePaths, domain) {
  const urls = routePaths.filter((routePath) => !routePath.includes("[")).map((routePath) => `  <url><loc>https://${domain}${routePath === "/" ? "" : routePath}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ../core/src/staticFiles.ts
import path3 from "node:path";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat as statAsync } from "node:fs/promises";
import { brotliCompress, gzip, constants as zlibConstants } from "node:zlib";
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg"
};
function contentTypeFor(filePath) {
  return CONTENT_TYPES[path3.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
function isCompressible(type) {
  return type.startsWith("text/") || type.startsWith("application/javascript") || type.startsWith("application/json") || type.startsWith("application/xml") || type.startsWith("application/manifest+json") || type.startsWith("image/svg+xml");
}
var MIN_COMPRESS_BYTES = 1024;
var MAX_FILE_BYTES = 2 * 1024 * 1024;
var MAX_CACHE_BYTES = 64 * 1024 * 1024;
var REVALIDATE_MS = 1e3;
var ByteBudget = class {
  constructor(limit = MAX_CACHE_BYTES) {
    this.limit = limit;
  }
  limit;
  used = 0;
  reserve(bytes) {
    if (this.used + bytes > this.limit) return false;
    this.used += bytes;
    return true;
  }
  release(bytes) {
    this.used = Math.max(0, this.used - bytes);
  }
};
function makeStaticBody(body, type, cacheControl) {
  const etag = `"${createHash("sha1").update(body).digest("base64url").slice(0, 22)}"`;
  return { body, type, etag, cacheControl };
}
function acceptsEncoding(header, name) {
  if (!header) return false;
  const value = Array.isArray(header) ? header.join(",") : header;
  for (const part of value.split(",")) {
    const [token, ...params] = part.trim().split(";");
    if (token.trim().toLowerCase() !== name) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return q === void 0 || Number(q.slice(2)) > 0;
  }
  return false;
}
function matchesEtag(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false;
  const value = Array.isArray(ifNoneMatch) ? ifNoneMatch.join(",") : ifNoneMatch;
  if (value.trim() === "*") return true;
  const bare = etag.replace(/^W\//, "");
  return value.split(",").some((candidate) => candidate.trim().replace(/^W\//, "") === bare);
}
function compress(entry, kind) {
  const existing = entry[kind];
  if (existing) return existing;
  const made = new Promise((resolve, reject) => {
    if (kind === "br") {
      brotliCompress(
        entry.body,
        { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5, [zlibConstants.BROTLI_PARAM_SIZE_HINT]: entry.body.length } },
        (err, out) => err ? reject(err) : resolve(out)
      );
    } else {
      gzip(entry.body, { level: 6 }, (err, out) => err ? reject(err) : resolve(out));
    }
  });
  entry[kind] = made;
  made.then(
    (out) => {
      if (entry.budget && entry.reserved !== void 0) {
        if (entry.budget.reserve(out.length)) entry.reserved += out.length;
        else entry[kind] = void 0;
      }
    },
    () => {
      entry[kind] = void 0;
    }
  );
  return made;
}
async function sendStaticBody(req, res, entry) {
  let body = entry.body;
  let etag = entry.etag;
  let encoding;
  const compressible = isCompressible(entry.type) && entry.body.length >= MIN_COMPRESS_BYTES;
  if (compressible) {
    res.setHeader("Vary", "Accept-Encoding");
    const accept = req.headers["accept-encoding"];
    if (acceptsEncoding(accept, "br")) {
      encoding = "br";
      etag = entry.etag.slice(0, -1) + '-br"';
    } else if (acceptsEncoding(accept, "gzip")) {
      encoding = "gzip";
      etag = entry.etag.slice(0, -1) + '-gz"';
    }
  }
  res.setHeader("Content-Type", entry.type);
  res.setHeader("Cache-Control", entry.cacheControl);
  res.setHeader("ETag", etag);
  if (matchesEtag(req.headers["if-none-match"], etag)) {
    res.statusCode = 304;
    res.end();
    return;
  }
  if (encoding) {
    body = await compress(entry, encoding === "br" ? "br" : "gz");
    res.setHeader("Content-Encoding", encoding);
  }
  res.statusCode = 200;
  res.setHeader("Content-Length", body.length);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}
var IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
var PUBLIC_FILE_CACHE = "public, max-age=3600";
var HTML_CACHE = "public, max-age=0, must-revalidate";
function createStaticFileServer(rootDir, budget = new ByteBudget()) {
  const root = path3.resolve(rootDir);
  const metas = /* @__PURE__ */ new Map();
  let realRoot;
  async function realPathInsideRoot(filePath) {
    try {
      realRoot ??= await realpath(root);
      return (await realpath(filePath)).startsWith(realRoot + path3.sep);
    } catch {
      return false;
    }
  }
  function resolveInside(pathname) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return void 0;
    }
    if (decoded.includes("\0") || decoded.includes("\\")) return void 0;
    const filePath = path3.resolve(root, "." + decoded);
    if (!filePath.startsWith(root + path3.sep)) return void 0;
    return filePath;
  }
  function forget(filePath) {
    const old = metas.get(filePath);
    if (old?.body?.reserved) old.body.budget?.release(old.body.reserved);
    metas.delete(filePath);
  }
  async function lookup(filePath, type, cacheControl, confined = false) {
    let meta = metas.get(filePath);
    const now = Date.now();
    if (meta && now - meta.checkedAt > REVALIDATE_MS) {
      let stat2;
      try {
        stat2 = await statAsync(filePath);
      } catch {
        forget(filePath);
        return void 0;
      }
      if (confined && !await realPathInsideRoot(filePath)) {
        forget(filePath);
        return void 0;
      }
      if (stat2.isFile() && stat2.size === meta.size && stat2.mtimeMs === meta.mtimeMs) {
        meta.checkedAt = now;
      } else {
        forget(filePath);
        meta = void 0;
      }
    }
    if (meta) return meta;
    let stat;
    try {
      stat = await statAsync(filePath);
    } catch {
      return void 0;
    }
    if (!stat.isFile()) return void 0;
    if (confined && !await realPathInsideRoot(filePath)) return void 0;
    meta = {
      file: filePath,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      type,
      etag: `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`,
      cacheControl,
      checkedAt: now
    };
    if (stat.size <= MAX_FILE_BYTES && budget.reserve(stat.size)) {
      const body = makeStaticBody(await readFile(filePath), type, cacheControl);
      body.reserved = stat.size;
      body.budget = budget;
      meta.body = body;
    }
    metas.set(filePath, meta);
    return meta;
  }
  async function serveFile(req, res, filePath, type, cacheControl, confined = false) {
    const meta = await lookup(filePath, type, cacheControl, confined);
    if (!meta) return false;
    if (meta.type.startsWith("image/svg+xml")) res.setHeader("Content-Security-Policy", SVG_CSP);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end("Method Not Allowed");
      return true;
    }
    if (meta.body) {
      await sendStaticBody(req, res, meta.body);
      return true;
    }
    res.setHeader("Content-Type", meta.type);
    res.setHeader("Cache-Control", meta.cacheControl);
    res.setHeader("ETag", meta.etag);
    if (matchesEtag(req.headers["if-none-match"], meta.etag)) {
      res.statusCode = 304;
      res.end();
      return true;
    }
    res.statusCode = 200;
    res.setHeader("Content-Length", meta.size);
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    await new Promise((resolve) => {
      const stream = createReadStream(meta.file);
      stream.on("error", () => {
        res.destroy();
        resolve();
      });
      res.on("close", () => {
        stream.destroy();
        resolve();
      });
      stream.on("end", resolve);
      stream.pipe(res);
    });
    return true;
  }
  const serve = async (req, res, pathname, immutable) => {
    const filePath = resolveInside(pathname);
    if (!filePath) return false;
    return serveFile(req, res, filePath, contentTypeFor(filePath), immutable ? IMMUTABLE_CACHE : PUBLIC_FILE_CACHE, true);
  };
  return { serve, serveFile, budget };
}

// ../core/src/buildKey.ts
import path4 from "node:path";
function toBuildKey(appRoot, filePath) {
  const rel = path4.relative(appRoot, filePath);
  const noExt = rel.slice(0, -path4.extname(rel).length);
  return noExt.split(path4.sep).join("/").replace(/[[\]]/g, "_");
}

// ../core/src/prodRequestHandler.ts
import path7 from "node:path";
import { pathToFileURL } from "node:url";
import { readFile as readFile3 } from "node:fs/promises";
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "node:fs";

// ../core/src/rateLimit.ts
import { isIPv6 } from "node:net";
function rateLimitKey(ip) {
  if (!ip) return "unknown";
  let address = ip;
  if (address.startsWith("[") && address.endsWith("]")) address = address.slice(1, -1);
  const zone = address.indexOf("%");
  if (zone !== -1) address = address.slice(0, zone);
  if (!isIPv6(address)) return ip;
  const groups = ipv6Groups(address);
  if (!groups) return ip;
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 65535) {
    return `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
  }
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
}
function ipv6Groups(address) {
  let text = address.toLowerCase();
  const tail = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail) {
    const [a, b, c, d] = tail.slice(1).map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) return void 0;
    text = text.slice(0, tail.index) + (a << 8 | b).toString(16) + ":" + (c << 8 | d).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return void 0;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return void 0;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const groups = all.map((g) => /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN);
  return groups.length === 8 && groups.every((g) => !Number.isNaN(g)) ? groups : void 0;
}
var RATE_LIMIT_MAX_KEYS = 1e4;
var UNCOUNTED_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
var RateLimitError = class extends HttpError {
  constructor(retryAfterSeconds) {
    super(429, "Too many requests, try again later");
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = "RateLimitError";
  }
  retryAfterSeconds;
};
var FixedWindowRateLimiter = class {
  constructor(config, maxKeys = RATE_LIMIT_MAX_KEYS) {
    this.config = config;
    this.maxKeys = maxKeys;
    if (!Number.isInteger(config.max) || config.max < 1 || !Number.isInteger(config.windowSeconds) || config.windowSeconds < 1) {
      throw new Error(
        `[devora] rateLimit needs whole numbers above zero: { max, windowSeconds } (got ${JSON.stringify(config)})`
      );
    }
    this.windowMs = config.windowSeconds * 1e3;
  }
  config;
  maxKeys;
  windows = /* @__PURE__ */ new Map();
  windowMs;
  /** Counts one request for `key`; seconds to wait when it is over the limit, else undefined. */
  hit(key, now = Date.now()) {
    let window2 = this.windows.get(key);
    if (!window2 || window2.resetAt <= now) {
      if (window2) this.windows.delete(key);
      else if (this.windows.size >= this.maxKeys) this.makeRoom(now);
      window2 = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window2);
    }
    window2.count++;
    return window2.count > this.config.max ? Math.max(1, Math.ceil((window2.resetAt - now) / 1e3)) : void 0;
  }
  get size() {
    return this.windows.size;
  }
  makeRoom(now) {
    for (const [key, window2] of this.windows) if (window2.resetAt <= now) this.windows.delete(key);
    while (this.windows.size >= this.maxKeys) this.windows.delete(this.windows.keys().next().value);
  }
};
var limiters = /* @__PURE__ */ new WeakMap();
function enforceRateLimit(config, method, ip) {
  if (!config || UNCOUNTED_METHODS.has(method.toUpperCase())) return;
  let limiter = limiters.get(config);
  if (!limiter) limiters.set(config, limiter = new FixedWindowRateLimiter(config));
  const retryAfter = limiter.hit(rateLimitKey(ip));
  if (retryAfter !== void 0) throw new RateLimitError(retryAfter);
}

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
import path5 from "node:path";
import { existsSync as existsSync2 } from "node:fs";
import { mkdir, readFile as readFile2, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
var ROUTE_PATHS_MEMO_MAX = 2e3;
var routePathsMemo = /* @__PURE__ */ new Map();
function cachedRoutePaths(staticOutDir, routePath) {
  const memoKey = `${staticOutDir}\0${routePath}`;
  const hit = routePathsMemo.get(memoKey);
  if (hit) return hit;
  const value = computeCachedRoutePaths(staticOutDir, routePath);
  if (routePathsMemo.size >= ROUTE_PATHS_MEMO_MAX) routePathsMemo.clear();
  routePathsMemo.set(memoKey, value);
  return value;
}
function computeCachedRoutePaths(staticOutDir, routePath) {
  const base = path5.resolve(staticOutDir);
  const dir = routePath === "/" ? base : path5.resolve(base, routePath.slice(1));
  if (dir !== base && !dir.startsWith(base + path5.sep)) {
    throw new Error(
      `[devora] refusing to write ISR cache for route "${routePath}" \u2014 it resolves outside "${staticOutDir}". Check this route's getStaticParams() for a param value containing "/" or "..".`
    );
  }
  return { htmlPath: path5.join(dir, "index.html"), metaPath: path5.join(dir, "index.meta.json") };
}
async function readCachedRoute(staticOutDir, routePath) {
  const { htmlPath, metaPath } = cachedRoutePaths(staticOutDir, routePath);
  if (!existsSync2(htmlPath)) return void 0;
  const html = await readFile2(htmlPath, "utf-8");
  let renderedAt = 0;
  if (existsSync2(metaPath)) {
    try {
      renderedAt = JSON.parse(await readFile2(metaPath, "utf-8")).renderedAt;
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
  const { htmlPath, metaPath } = cachedRoutePaths(staticOutDir, routePath);
  await mkdir(path5.dirname(htmlPath), { recursive: true });
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
  const split = splitRouteParams(request.params);
  const apiReq = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    params: split.params,
    catchAll: split.catchAll,
    body: request.body
  };
  let getSetCookie = () => void 0;
  let touchesSessionCookie = () => false;
  let authUsage;
  let result;
  try {
    enforceRateLimit(routeModule.rateLimit, request.method, request.meta?.ip);
    const context = request.sessionCookieOptions ? await createRequestContext(
      { cookieHeader: request.cookieHeader, authorizationHeader: request.headers.authorization },
      request.sessionCookieOptions,
      request.params,
      request.meta
    ) : createNoAuthContext(request.params, request.meta);
    getSetCookie = context.getSetCookie;
    touchesSessionCookie = context.touchesSessionCookie;
    authUsage = context;
    verifyCsrfByDefault({
      method: request.method,
      cookieAuthenticated: context.cookieAuthenticated,
      optedOut: routeModule.csrf === false,
      verifyCsrf: context.ctx.verifyCsrf,
      headerToken: request.headers[CSRF_HEADER_NAME]
    });
    result = await routeModule.handler(apiReq, context.ctx);
    await context.settle();
  } catch (err) {
    result = apiErrorResponse(err);
    if (err instanceof RateLimitError) result = { ...result, headers: { ...result.headers, "Retry-After": String(err.retryAfterSeconds) } };
  }
  if (authUsage) warnIfSessionReadWithoutAuth(authUsage, request.url);
  return { ...result, setCookie: getSetCookie(), noStore: touchesSessionCookie() };
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
var MAX_FORM_FIELDS = 1e3;
var MAX_FORM_FILES = 20;
var FormLimitError = class extends Error {
  status = 413;
  constructor(what, limit) {
    super(`Too many form ${what} (the limit is ${limit})`);
    this.name = "FormLimitError";
  }
};
function checkMultipartParts(body, contentType, maxFields, maxFiles) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const value = boundary?.[1] ?? boundary?.[2]?.trim();
  if (!value) return;
  const delimiter = Buffer.from(`--${value}`);
  const headerEnd = Buffer.from("\r\n\r\n");
  let fields = 0;
  let files = 0;
  let at = body.indexOf(delimiter);
  while (at !== -1) {
    const partStart = at + delimiter.length;
    if (body[partStart] === 45 && body[partStart + 1] === 45) break;
    const headersEnd = body.indexOf(headerEnd, partStart);
    if (headersEnd === -1) break;
    const headers = body.subarray(partStart, headersEnd).toString("latin1");
    if (/^content-disposition:[^\r\n]*;\s*filename\*?=/im.test(headers)) {
      if (++files > maxFiles) throw new FormLimitError("files", maxFiles);
    } else if (++fields > maxFields) {
      throw new FormLimitError("fields", maxFields);
    }
    at = body.indexOf(delimiter, headersEnd);
  }
}
async function parseFormBody(body, contentType, limits = {}) {
  const maxFields = limits.maxFields ?? MAX_FORM_FIELDS;
  const maxFiles = limits.maxFiles ?? MAX_FORM_FILES;
  if (contentType && /^multipart\/form-data\b/i.test(contentType)) {
    checkMultipartParts(body, contentType, maxFields, maxFiles);
    try {
      return await new Response(body, { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new MalformedBodyError("malformed multipart/form-data body");
    }
  }
  const text = body.toString("utf-8");
  let pairs = text === "" ? 0 : 1;
  for (let i = text.indexOf("&"); i !== -1; i = text.indexOf("&", i + 1)) {
    if (++pairs > maxFields) throw new FormLimitError("fields", maxFields);
  }
  if (pairs > maxFields) throw new FormLimitError("fields", maxFields);
  const formData = new FormData();
  new URLSearchParams(text).forEach((value, key) => formData.append(key, value));
  return formData;
}

// ../core/src/apiRoute.ts
function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

// ../core/src/fastPathname.ts
var PLAIN_TARGET = /^\/[A-Za-z0-9_\-./]*(?:\?[^#]*)?$/;
var DOT_SEGMENT = /(?:^|\/)\.\.?(?:\/|$)/;
function requestPathname(target) {
  if (PLAIN_TARGET.test(target)) {
    const q = target.indexOf("?");
    const p = q === -1 ? target : target.slice(0, q);
    if (!p.includes("//") && !DOT_SEGMENT.test(p)) return p;
  }
  return new URL(target, "http://localhost").pathname;
}

// ../core/src/ttlMemo.ts
function ttlMemo(load, ttlMs, now = Date.now) {
  let value;
  let loadedAt = 0;
  return () => {
    const t = now();
    if (!value || t - loadedAt >= ttlMs) {
      const p = load();
      value = p;
      loadedAt = t;
      p.catch(() => {
        if (value === p) value = void 0;
      });
    }
    return value;
  };
}

// ../core/src/apiDir.ts
import path6 from "node:path";
var DEFAULT_API_DIR = "api";
function normalizeApiDir(apiDir) {
  if (apiDir === void 0) return DEFAULT_API_DIR;
  const normalized = path6.posix.normalize(apiDir.replace(/\\/g, "/")).replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (normalized === "" || normalized === "." || path6.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`[devora] apiDir "${apiDir}" must be a folder inside the app, e.g. "endpoints".`);
  }
  const first = normalized.split("/")[0];
  if (first === "routes" || first === "dist" || first === "node_modules") {
    throw new Error(`[devora] apiDir "${apiDir}" can't live under ${first}/ \u2014 pick a separate folder, e.g. "endpoints".`);
  }
  return normalized;
}
function resolveApiDir(appRoot, apiDir) {
  return path6.join(appRoot, normalizeApiDir(apiDir));
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
  const host = requestHost(req, trustProxy) ?? "localhost";
  const target = req.url ?? "/";
  let url;
  return {
    get url() {
      if (url === void 0) {
        const pathAndQuery = targetPathAndQuery(target);
        try {
          url = new URL(`${scheme}://${host}${pathAndQuery}`).href;
        } catch {
          url = new URL(pathAndQuery, "http://localhost").href;
        }
      }
      return url;
    },
    method: req.method ?? "GET",
    headers: req.headers,
    ip: clientIp(req, trustProxy)
  };
}
function requestHost(req, trustProxy) {
  const forwardedHost = trustedProxyHops(trustProxy) > 0 ? firstHeaderValue(req.headers["x-forwarded-host"]) : void 0;
  return forwardedHost ?? firstHeaderValue(req.headers.host);
}
function firstHeaderValue(value) {
  const first = (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
  return first || void 0;
}
function targetPathAndQuery(target) {
  let pathAndQuery;
  if (target.startsWith("/")) pathAndQuery = target;
  else {
    try {
      const parsed = new URL(target);
      pathAndQuery = `${parsed.pathname}${parsed.search}`;
    } catch {
      return "/";
    }
  }
  return pathAndQuery.startsWith("//") ? `/${pathAndQuery.replace(/^\/+/, "")}` : pathAndQuery;
}

// ../core/src/allowedHosts.ts
var LOOPBACK = ["localhost", "127.0.0.1", "::1"];
function normalizeHost(value) {
  if (!value) return void 0;
  let host = value.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end === -1) return void 0;
    host = host.slice(1, end);
  } else {
    const colon = host.indexOf(":");
    if (colon !== -1 && host.indexOf(":", colon + 1) === -1) host = host.slice(0, colon);
  }
  host = host.replace(/\.$/, "");
  if (!host || /[\s/\\@?#]/.test(host)) return void 0;
  return host;
}
function createHostCheck(allowedHosts, options = {}) {
  if (allowedHosts === void 0) return void 0;
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    throw new Error(`[devora] app.config.ts allowedHosts must be a non-empty list of hosts, e.g. ["app.example.com", ".example.com"]`);
  }
  const exact = /* @__PURE__ */ new Set();
  const suffixes = [];
  for (const entry of allowedHosts) {
    const wildcard = typeof entry === "string" && entry.startsWith(".");
    const host = typeof entry === "string" ? normalizeHost(wildcard ? entry.slice(1) : entry) : void 0;
    if (!host || typeof entry === "string" && /^[a-z]+:\/\//i.test(entry)) {
      throw new Error(`[devora] app.config.ts allowedHosts entry ${JSON.stringify(entry)} is not a host such as "app.example.com" or ".example.com"`);
    }
    if (wildcard) suffixes.push(host);
    else exact.add(host);
  }
  if (options.allowLoopback) for (const host of LOOPBACK) exact.add(host);
  return (value) => {
    const host = normalizeHost(value);
    if (host === void 0) return false;
    if (exact.has(host)) return true;
    return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  };
}
function sendUnknownHost(res) {
  res.statusCode = 400;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Bad Request: unknown host");
}

// ../core/src/cors.ts
var DEFAULT_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
var ORIGIN_RE = /^https?:\/\/(\*\.)?[a-z0-9.-]+(:\d+)?$/i;
function validateCorsConfig(appName, cors) {
  if (cors === void 0) return;
  const fail = (message) => new Error(`[devora] "${appName}": cors.${message}`);
  if (cors.origins !== "*") {
    if (!Array.isArray(cors.origins) || cors.origins.length === 0) throw fail(`origins must be "*" or a non-empty list of origins`);
    for (const origin of cors.origins) {
      if (typeof origin !== "string" || !ORIGIN_RE.test(origin)) {
        throw fail(`origins: "${origin}" isn't an origin \u2014 use scheme://host[:port] with no path, e.g. "https://app.example.com"`);
      }
    }
  }
  if (cors.credentials === true && cors.origins === "*") {
    throw fail(`credentials: true can't be combined with origins: "*" \u2014 list the origins that may send cookies`);
  }
}
function originAllowed(cors, origin) {
  if (cors.origins === "*") return true;
  const lower = origin.toLowerCase();
  return cors.origins.some((allowed) => {
    const pattern = allowed.toLowerCase();
    if (!pattern.includes("*.")) return pattern === lower;
    const [scheme, rest] = pattern.split("://*.");
    return lower.startsWith(`${scheme}://`) && lower.endsWith(`.${rest}`) && lower.length > `${scheme}://.${rest}`.length;
  });
}
function corsResponse(cors, method, headers) {
  const originHeader = headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const isPreflight = method === "OPTIONS" && headers["access-control-request-method"] !== void 0;
  if (!cors || !origin) return { headers: {}, preflight: false };
  if (!originAllowed(cors, origin)) return { headers: { Vary: "Origin" }, preflight: false };
  const out = {
    "Access-Control-Allow-Origin": cors.origins === "*" ? "*" : origin,
    Vary: "Origin"
  };
  if (cors.credentials) out["Access-Control-Allow-Credentials"] = "true";
  if (cors.exposeHeaders?.length) out["Access-Control-Expose-Headers"] = cors.exposeHeaders.join(", ");
  if (isPreflight) {
    out["Access-Control-Allow-Methods"] = (cors.methods ?? DEFAULT_METHODS).join(", ");
    const requested = headers["access-control-request-headers"];
    const allowHeaders = cors.allowHeaders?.join(", ") ?? (Array.isArray(requested) ? requested.join(", ") : requested);
    if (allowHeaders) out["Access-Control-Allow-Headers"] = allowHeaders;
    out["Access-Control-Max-Age"] = String(cors.maxAge ?? 600);
  }
  return { headers: out, preflight: isPreflight };
}

// ../core/src/prodRequestHandler.ts
function createProdRequestHandler(appRoot, appName, authMode, domain, security, sitemapEnabled, appDefaultRenderMode, options = {}) {
  const routesDir = path7.join(appRoot, "routes");
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const serverOutDir = path7.join(appRoot, "dist", "server");
  const clientOutDir = path7.join(appRoot, "dist", "client");
  const staticOutDir = path7.join(appRoot, "dist", "static");
  const resolveSessionOptions = authMode === "none" ? void 0 : createSessionOptionsResolver(
    authMode,
    appName,
    readSessionManifest(serverOutDir),
    () => importBuilt(serverOutDir, SESSION_STORE_BUILD_KEY)
  );
  const trustProxy = options.trustProxy;
  const hostAllowed = createHostCheck(options.allowedHosts);
  const sessionOptionsForRequest = async (req) => resolveSessionOptions ? resolveSessionOptions({ isHttps: isHttpsRequest(req, trustProxy) }) : void 0;
  const warnIfSecureCookieOverHttp = createPlainHttpCookieWarning(appName);
  const securityHeaders = resolveSecurityHeaders(security);
  const securityHeaderEntries = Object.entries(securityHeaders);
  const islandManifestPath = path7.join(serverOutDir, "island-manifest.json");
  const csrManifestPath = path7.join(serverOutDir, "csr-route-manifest.json");
  const currentIslandClientUrl = ttlMemo(() => readIslandClientUrl(islandManifestPath), 1e3);
  const currentCsrManifest = ttlMemo(() => readCsrManifest(csrManifestPath), 1e3);
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const formLimits = { maxFields: options.maxFormFields, maxFiles: options.maxFormFiles };
  const head = options.head;
  const routeStyles = readRouteCssManifest(path7.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE));
  const buildKeys = /* @__PURE__ */ new Map();
  const buildKeyFor = (file) => {
    let key = buildKeys.get(file);
    if (key === void 0) buildKeys.set(file, key = toBuildKey(appRoot, file));
    return key;
  };
  const hasEntryServer = existsSync3(path7.join(serverOutDir, "entry-server.js"));
  const hasErrorPage = existsSync3(path7.join(serverOutDir, `${ERROR_PAGE_BUILD_KEY}.js`));
  const loadErrorPage = async () => hasErrorPage ? await importBuilt(serverOutDir, ERROR_PAGE_BUILD_KEY) : void 0;
  const errorPageStyles = routeStyles[ERROR_PAGE_BUILD_KEY];
  const sendErrorPage = async (res, status, error) => {
    if (!hasEntryServer) return false;
    const entryServer = await importBuilt(serverOutDir, "entry-server");
    const renderError = entryServer.renderRoute?.renderError;
    res.statusCode = status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (typeof renderError !== "function") {
      res.end(`<!doctype html><title>${status}</title><h1>${status}</h1>`);
      return true;
    }
    res.end(renderError({ status, error, head, errorPage: await loadErrorPage(), errorPageStyles }).html);
    return true;
  };
  let sitemapXml;
  let routeTable;
  const matchPageRoute = (urlPath) => matchInTable(routeTable ??= buildRouteTable(routesDir), urlPath);
  let apiTable;
  const staticFiles = createStaticFileServer(clientOutDir);
  const serveClientFile = staticFiles.serve;
  return async function handleRequest(req, res) {
    for (let i = 0; i < securityHeaderEntries.length; i++) res.setHeader(securityHeaderEntries[i][0], securityHeaderEntries[i][1]);
    if (!req.url) return false;
    if (hostAllowed && !hostAllowed(requestHost(req, trustProxy))) {
      sendUnknownHost(res);
      return true;
    }
    const pathname = requestPathname(req.url);
    if (pathname === "/sitemap.xml" && sitemapEnabled) {
      sitemapXml ??= collectSitemapPaths(routesDir, async (file) => {
        return await importBuilt(serverOutDir, buildKeyFor(file));
      }).then((paths) => generateSitemapXml(paths, domain));
      const xml = await sitemapXml;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return true;
    }
    if (isApiPath(pathname)) {
      const cors = corsResponse(options.cors, req.method ?? "GET", req.headers);
      for (const [name, value] of Object.entries(cors.headers)) res.setHeader(name, value);
      if (cors.preflight) {
        res.statusCode = 204;
        res.end();
        return true;
      }
      const apiMatch = matchInTable(apiTable ??= buildRouteTable(apiDir), pathname.slice(4) || "/");
      if (!apiMatch) {
        sendApiResponse(res, apiNotFoundResponse());
        return true;
      }
      try {
        const apiBuildKey = buildKeyFor(apiMatch.filePath);
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
        sendApiResponse(res, apiResult, apiResult.noStore);
      } catch (err) {
        sendApiResponse(res, apiErrorResponse(err));
      }
      return true;
    }
    if (pathname.startsWith("/assets/")) {
      return serveClientFile(req, res, pathname, true);
    }
    if (pathname.startsWith("/@")) return false;
    if (pathname.includes(".")) {
      if (await serveClientFile(req, res, pathname, false)) return true;
    }
    const match = matchPageRoute(pathname);
    if (!match) {
      if (!hasEntryServer && pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
        sendApiResponse(res, backendStatusFor(appName, req.headers.accept));
        return true;
      }
      return sendErrorPage(res, 404);
    }
    const buildKey = buildKeyFor(match.filePath);
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
      const islandClientUrl2 = await currentIslandClientUrl();
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
      if (result2.noStore) res.setHeader("Cache-Control", PRIVATE_NO_STORE);
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
      const csrManifest = await currentCsrManifest();
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
      if (renderMode === "ssg") {
        const { htmlPath } = cachedRoutePaths(staticOutDir, match.routePath);
        if (await staticFiles.serveFile(req, res, htmlPath, "text/html; charset=utf-8", HTML_CACHE)) return true;
        return sendErrorPage(res, 404);
      }
      let cached = await readCachedRoute(staticOutDir, match.routePath);
      {
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
          const islandClientUrl2 = await currentIslandClientUrl();
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
    const islandClientUrl = await currentIslandClientUrl();
    let formData;
    try {
      formData = req.method === "POST" ? await parseFormBody(await readBodyWithLimit(req, maxBodyBytes), req.headers["content-type"], formLimits) : void 0;
    } catch (err) {
      if (err instanceof FormLimitError) return sendErrorPage(res, 413, new HttpError(413, err.message));
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
    if (result.noStore) res.setHeader("Cache-Control", PRIVATE_NO_STORE);
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
function sendApiResponse(res, result, noStore = false) {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  if (noStore) res.setHeader("Cache-Control", PRIVATE_NO_STORE);
  res.statusCode = result.status;
  res.end(result.body ?? "");
}
async function readIslandClientUrl(manifestPath) {
  if (!existsSync3(manifestPath)) return void 0;
  try {
    const raw = await readFile3(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.islandClientUrl;
  } catch {
    return void 0;
  }
}
async function readCsrManifest(manifestPath) {
  if (!existsSync3(manifestPath)) return { routes: {} };
  try {
    const parsed = JSON.parse(await readFile3(manifestPath, "utf-8"));
    return { csrClientUrl: parsed.csrClientUrl ?? void 0, routes: parsed.routes ?? {} };
  } catch {
    return { routes: {} };
  }
}
var builtModules = /* @__PURE__ */ new Map();
function importBuilt(serverOutDir, key) {
  let perDir = builtModules.get(serverOutDir);
  if (!perDir) builtModules.set(serverOutDir, perDir = /* @__PURE__ */ new Map());
  let loaded = perDir.get(key);
  if (!loaded) {
    const modules = perDir;
    loaded = importBuiltUncached(path7.join(serverOutDir, `${key}.js`));
    modules.set(key, loaded);
    loaded.catch(() => modules.delete(key));
  }
  return loaded;
}
async function importBuiltUncached(filePath) {
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

// ../core/src/loadProjectConfig.ts
import path8 from "node:path";
import { existsSync as existsSync4 } from "node:fs";
import { createJiti } from "jiti";
async function loadProjectConfig(root = process.cwd()) {
  const configPath = path8.join(root, "devora.config.ts");
  if (!existsSync4(configPath)) {
    throw new Error(
      `[devora] no devora.config.ts found at ${configPath}. Every Devora.js project must declare its apps here \u2014 see architecture doc \xA73.`
    );
  }
  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
  const mod = await jiti.import(configPath);
  const config = mod.default;
  if (!config?.apps?.length) {
    throw new Error(`[devora] devora.config.ts must declare at least one app.`);
  }
  return config;
}
function resolveAppDir(root, appDir) {
  return path8.join(root, appDir);
}

// ../core/src/loadAppConfig.ts
import path9 from "node:path";
import { existsSync as existsSync5 } from "node:fs";
import { createJiti as createJiti2 } from "jiti";
async function loadAppConfig(appRoot) {
  const configPath = path9.join(appRoot, "app.config.ts");
  if (!existsSync5(configPath)) return {};
  const jiti = createJiti2(import.meta.url, { interopDefault: true, moduleCache: false });
  const mod = await jiti.import(configPath);
  return mod.default ?? {};
}

// ../../adapters/adapter-node/src/index.ts
import http from "node:http";
var DEFAULT_SERVER_LIMITS = {
  headersTimeoutMs: 15e3,
  requestTimeoutMs: 6e4,
  keepAliveTimeoutMs: 5e3,
  maxHeaderBytes: 16384
};
function resolveServerLimits(overrides = {}) {
  const limits = { ...DEFAULT_SERVER_LIMITS };
  for (const key of Object.keys(DEFAULT_SERVER_LIMITS)) {
    const value = overrides[key];
    if (value === void 0) continue;
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`[adapter-node] app.config.ts server.${key} must be a whole number above zero (got ${String(value)})`);
    }
    limits[key] = value;
  }
  if (limits.headersTimeoutMs > limits.requestTimeoutMs) {
    throw new Error(
      `[adapter-node] app.config.ts server.headersTimeoutMs (${limits.headersTimeoutMs}) can't be longer than requestTimeoutMs (${limits.requestTimeoutMs})`
    );
  }
  return limits;
}
function createNodeServer(opts) {
  const handleRequest = createProdRequestHandler(
    opts.appRoot,
    opts.appName,
    opts.authMode,
    opts.domain,
    opts.security,
    opts.sitemapEnabled,
    opts.defaultRenderMode,
    {
      apiDir: opts.apiDir,
      trustProxy: opts.trustProxy,
      head: opts.head,
      maxBodyBytes: opts.maxBodyBytes,
      maxFormFields: opts.maxFormFields,
      maxFormFiles: opts.maxFormFiles,
      cors: opts.cors,
      allowedHosts: opts.allowedHosts
    }
  );
  const limits = resolveServerLimits(opts.serverLimits);
  const server = http.createServer(
    {
      maxHeaderSize: limits.maxHeaderBytes,
      // How often Node checks headersTimeout/requestTimeout (its default is every 30 s).
      connectionsCheckingInterval: Math.min(1e3, limits.headersTimeoutMs)
    },
    (req, res) => {
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
    }
  );
  server.headersTimeout = limits.headersTimeoutMs;
  server.requestTimeout = limits.requestTimeoutMs;
  server.keepAliveTimeout = limits.keepAliveTimeoutMs;
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

// src/build/loadEnvFiles.ts
import path11 from "node:path";
import { existsSync as existsSync6 } from "node:fs";

// src/build/envFiles.ts
import { readFileSync as readFileSync3 } from "node:fs";
function parseEnv(text) {
  const out = {};
  const lines = text.replace(/\r\n?/g, "\n");
  const pattern = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
  for (const match of lines.matchAll(pattern)) {
    const key = match[1];
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    out[key] = value;
  }
  return out;
}
function expandEnv(values, environment) {
  const result = {};
  const resolve = (key, seen) => {
    if (key in result) return result[key];
    if (key in values && !seen.has(key)) {
      seen.add(key);
      return result[key] = expand(values[key], seen);
    }
    return environment[key] ?? "";
  };
  const expand = (value, seen) => value.replace(/(.?)\$(?:\{([\w.-]+)\}|([\w]+))/g, (whole, before, braced, bare) => {
    if (before === "\\") return whole.slice(1);
    return before + resolve(braced ?? bare, new Set(seen));
  }).replace(/\\\$/g, "$");
  for (const key of Object.keys(values)) result[key] = resolve(key, /* @__PURE__ */ new Set());
  return result;
}
function readEnvFiles(root, mode, files, environment) {
  const merged = {};
  for (const file of files) {
    try {
      Object.assign(merged, parseEnv(readFileSync3(`${root}/${file}`, "utf8")));
    } catch {
    }
  }
  void mode;
  return expandEnv(merged, environment);
}

// ../scaffold/src/resolveAuthChoice.ts
import { createInterface } from "node:readline/promises";

// ../scaffold/src/resolveEngineChoice.ts
import { createInterface as createInterface2 } from "node:readline/promises";

// ../scaffold/src/resolveScopeChoice.ts
import { createInterface as createInterface3 } from "node:readline/promises";

// ../scaffold/src/scaffoldAppFiles.ts
var SCAFFOLD_API_DIR = "endpoints";
var API_DIR_CONFIG_LINES = `  // API routes live in ${SCAFFOLD_API_DIR}/ (served under /api) \u2014 not api/, which
  // Vercel would turn into separate functions. See docs/guides/DEPLOYING.md.
  apiDir: "${SCAFFOLD_API_DIR}",
`;

// ../scaffold/src/scaffoldProjectFiles.ts
import path10 from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path10.dirname(fileURLToPath(import.meta.url));

// ../scaffold/src/terminal.ts
function detectColorLevel(env, isTTY) {
  const force = env.FORCE_COLOR;
  if (force !== void 0) {
    if (force === "0" || force === "false") return 0;
    if (force === "1" || force === "2" || force === "3") return Number(force);
    return Math.max(1, depthFromEnv(env));
  }
  if (env.NO_COLOR !== void 0 && env.NO_COLOR !== "") return 0;
  if (!isTTY || env.TERM === "dumb") return 0;
  return depthFromEnv(env);
}
function depthFromEnv(env) {
  const colorterm = env.COLORTERM?.toLowerCase();
  if (colorterm === "truecolor" || colorterm === "24bit") return 3;
  if (env.TERM?.includes("256")) return 2;
  return 1;
}
function terminalInfo(stream = process.stdout, env = process.env) {
  const isTTY = stream.isTTY === true;
  return {
    level: detectColorLevel(env, isTTY),
    interactive: isTTY && env.TERM !== "dumb" && !isCI(env),
    columns: stream.columns && stream.columns > 0 ? stream.columns : 80
  };
}
function isCI(env) {
  return env.CI !== void 0 && env.CI !== "" && env.CI !== "false" && env.CI !== "0" || env.CONTINUOUS_INTEGRATION !== void 0;
}
var BLUE = [59, 130, 246];
var VIOLET = [168, 85, 247];
var GREEN = [34, 197, 94];
var YELLOW = [234, 179, 8];
var RED = [239, 68, 68];
var BASIC = { blue: 34, violet: 35, green: 32, yellow: 33, red: 31 };
function fg(level, rgb, basic) {
  if (level === 3) return `\x1B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
  if (level === 2) return `\x1B[38;5;${to256(rgb)}m`;
  return `\x1B[${basic}m`;
}
function to256([r, g, b]) {
  const q = (v) => Math.round(v / 255 * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}
function createPaint(level) {
  const wrap = (open, close) => (text) => level === 0 || text === "" ? text : `${open}${text}${close}`;
  const color = (rgb, name) => wrap(fg(level, rgb, BASIC[name]), "\x1B[39m");
  return {
    level,
    bold: wrap("\x1B[1m", "\x1B[22m"),
    dim: wrap("\x1B[2m", "\x1B[22m"),
    blue: color(BLUE, "blue"),
    violet: color(VIOLET, "violet"),
    green: color(GREEN, "green"),
    yellow: color(YELLOW, "yellow"),
    red: color(RED, "red")
  };
}
var MARK_PIXELS = [
  "        #      ",
  "       ##      ",
  "       ##      ",
  "  #######  #   ",
  " ########  ##  ",
  "##     ##   ## ",
  "##     ##    ##",
  "##     ##   ## ",
  " ########  ##  ",
  "  #######  #   "
];
var MARK_WIDTH = MARK_PIXELS[0].length;
function markLines() {
  const lines = [];
  for (let row = 0; row < MARK_PIXELS.length; row += 2) {
    const top = MARK_PIXELS[row];
    const bottom = MARK_PIXELS[row + 1];
    let line = "";
    for (let col = 0; col < MARK_WIDTH; col++) {
      const t = top[col] === "#";
      const b = bottom[col] === "#";
      line += t && b ? "\u2588" : t ? "\u2580" : b ? "\u2584" : " ";
    }
    lines.push(line);
  }
  return lines;
}
function colorMarkLine(line, level) {
  if (level === 0) return line;
  let out = "";
  for (let col = 0; col < line.length; col++) {
    const ch = line[col];
    if (ch === " ") {
      out += ch;
      continue;
    }
    const t = col / (MARK_WIDTH - 1);
    const rgb = [0, 1, 2].map((i) => Math.round(BLUE[i] + (VIOLET[i] - BLUE[i]) * t));
    out += fg(level, rgb, t < 0.5 ? BASIC.blue : BASIC.violet) + ch;
  }
  return `${out}\x1B[39m`;
}
var MIN_COLUMNS_FOR_MARK = 2 + MARK_WIDTH + 2 + 24;
function formatHeader(opts, term) {
  const paint = createPaint(term.level);
  const name = `${paint.bold("devora")}${paint.violet(".js")}${opts.version ? ` ${paint.dim(opts.version)}` : ""}`;
  const detail = opts.detail ? paint.dim(opts.detail) : "";
  if (!term.interactive || term.columns < MIN_COLUMNS_FOR_MARK) {
    const glyph = term.interactive ? `${paint.blue("d")}${paint.violet("\u203A")} ` : "";
    const line = `  ${glyph}${name}${detail ? `  ${detail}` : ""}`;
    if (!detail || !term.interactive || stripAnsi(line).length <= term.columns) return line;
    return `  ${glyph}${name}
  ${glyph ? "   " : ""}${detail}`;
  }
  const beside = ["", name, detail, "", ""];
  return markLines().map((line, i) => {
    const drawn = line.trimEnd();
    const mark = colorMarkLine(drawn, term.level);
    return beside[i] ? `  ${mark}${" ".repeat(MARK_WIDTH - drawn.length)}  ${beside[i]}` : `  ${mark}`;
  }).join("\n");
}
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

// src/terminal/output.ts
var CLI_VERSION = true ? "0.4.0" : "0.0.0-source";
var quiet = false;
function setQuiet(value) {
  quiet = value === true;
}
function info(message) {
  if (!quiet) console.log(message);
}
function printHeader(detail) {
  if (quiet) return;
  console.log(`
${formatHeader({ version: CLI_VERSION, detail }, terminalInfo(process.stdout))}
`);
}

// src/build/loadEnvFiles.ts
var loadedKeys = /* @__PURE__ */ new Set();
function loadProjectEnv(root, mode) {
  const files = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`].filter((f) => existsSync6(path11.join(root, f)));
  if (files.length === 0) return [];
  const before = new Set(Object.keys(process.env));
  const loaded = readEnvFiles(root, mode, files, process.env);
  for (const [key, value] of Object.entries(loaded)) {
    if (!before.has(key)) {
      process.env[key] = value;
      loadedKeys.add(key);
    }
  }
  info(`[devora] loaded ${files.join(", ")}`);
  return files;
}

// src/commands/start.ts
async function start(opts) {
  printHeader("start \xB7 production server");
  forceProductionNodeEnv("start");
  const root = process.cwd();
  loadProjectEnv(root, "production");
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
    validateCorsConfig(app.name, appConfig.cors);
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
      maxFormFields: appConfig.maxFormFields,
      maxFormFiles: appConfig.maxFormFiles,
      cors: appConfig.cors,
      serverLimits: appConfig.server,
      allowedHosts: appConfig.allowedHosts,
      port: ports ? ports.get(app.name) : explicitPort ?? DEFAULT_BASE_PORT,
      host
    });
  }
}

// src/startCommand.ts
var QUIET_HELP = "only warnings, errors and the app URLs \u2014 no header, route tables or progress lines";
function addStartCommand(program2) {
  program2.command("start").description("Serve a production build (adapter-node) \u2014 run `devora build` first").option("--app <name>", "serve only this app").option("--port <port>", "starting port (default: $PORT, else 4173; increments per app)").option("--host <host>", "interface to bind (default: $HOST, else all interfaces)").option("--quiet", QUIET_HELP).action(async (opts) => start(opts));
}

// src/fatal.ts
function reportFatal(err) {
  if (err instanceof Error && err.name === "DevoraConfigError") {
    console.error(err.message);
    process.exitCode = 1;
    return true;
  }
  return false;
}

// src/startEntry.ts
var program = new Command();
program.name("devora").description("Devora.js CLI \u2014 the multi-app, security-first framework").version(CLI_VERSION);
program.hook("preAction", (_program, command) => setQuiet(command.opts().quiet));
addStartCommand(program);
program.parseAsync(process.argv.filter((arg) => arg !== "--")).catch((err) => {
  if (reportFatal(err)) return;
  throw err;
});
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
*/
