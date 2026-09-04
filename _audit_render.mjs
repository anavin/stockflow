var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// node_modules/react/cjs/react-jsx-runtime.production.js
var require_react_jsx_runtime_production = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    function jsxProd(type, config, maybeKey) {
      var key = null;
      void 0 !== maybeKey && (key = "" + maybeKey);
      void 0 !== config.key && (key = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      config = maybeKey.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== config ? config : null,
        props: maybeKey
      };
    }
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsx = jsxProd;
    exports.jsxs = jsxProd;
  }
});

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
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
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = Children;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, deps) {
      return ReactSharedInternals.H.useEffect(create, deps);
    };
    exports.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.2.8";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    "production" !== process.env.NODE_ENV && function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                null != _ioInfo && (_ioInfo.end = performance.now());
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now());
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            ioInfo.value = thenable;
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Activity = REACT_ACTIVITY_TYPE;
      exports.Children = fnName;
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cacheSignal = function() {
        return null;
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create, deps);
      };
      exports.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.2.8";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    }();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production();
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    "production" !== process.env.NODE_ENV && function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          maybeKey,
          getOwner(),
          debugStack,
          debugTask
        );
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      var React = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(
        React,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    }();
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_jsx_runtime_production();
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// _audit_render.tsx
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";

// lib/pdf/withdrawal-sp-document.tsx
import { Document, Page, Text, View, StyleSheet, Font, Svg, Rect, Image } from "@react-pdf/renderer";

// lib/pdf/logos.ts
var LAB_PARFUMO_LOGO = "data:image/png;base64,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";
var LAB_PARFUMO_AR = 2.4476;
var EVEANDBOY_LOGO = "data:image/png;base64,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";
var EVEANDBOY_AR = 1.4151;

// lib/pdf/code128.ts
var PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
];
var START_B = 104;
var STOP = 106;
function code128(input) {
  const clean = Array.from(String(input || "")).filter((ch) => {
    const c = ch.charCodeAt(0);
    return c >= 32 && c <= 126;
  });
  const values = [START_B];
  for (const ch of clean) values.push(ch.charCodeAt(0) - 32);
  let sum = START_B;
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103);
  values.push(STOP);
  const bars = [];
  let x = 0;
  for (const v of values) {
    const pat = PATTERNS[v];
    for (let i = 0; i < pat.length; i++) {
      const w = pat.charCodeAt(i) - 48;
      const isBar = i % 2 === 0;
      if (isBar) bars.push({ x, w });
      x += w;
    }
  }
  return { bars, totalModules: x };
}

// lib/config.ts
var COMPANY_NAME = "\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 \u0E17\u0E31\u0E0A \u0E44\u0E14\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E08\u0E19\u0E0B\u0E4C \u0E08\u0E33\u0E01\u0E31\u0E14";
var COMPANY_NAME_EN = "Touch Divergence Co., Ltd.";
var COMPANY_ADDRESS = "288/31 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 12 \u0E15.\u0E23\u0E32\u0E0A\u0E32\u0E40\u0E17\u0E27\u0E30 \u0E2D.\u0E1A\u0E32\u0E07\u0E1E\u0E25\u0E35 \u0E08.\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23 10540 \xB7 081-234-1438";
var PLATFORMS = [
  { code: "Shopee", name: "Shopee", prefix: "SH", enabled: true, canImport: true, canCreate: true },
  { code: "Lazada", name: "Lazada", prefix: "LZ", enabled: true, canImport: true, canCreate: true },
  { code: "Tiktok", name: "TikTok", prefix: "TT", enabled: true, canImport: true, canCreate: true },
  { code: "Line", name: "Line", prefix: "LN", enabled: true, canImport: false, canCreate: true },
  { code: "Website", name: "Website", prefix: "WEB", enabled: true, canImport: false, canCreate: true },
  { code: "Office", name: "Office", prefix: "OFF", enabled: true, canImport: false, canCreate: true },
  { code: "CTW", name: "CTW (Central World)", prefix: "WPO", enabled: true, canImport: false, canCreate: true },
  // ใบเบิกโอนสาขา — คลังกลางสร้างเอง → ตัดสต๊อก → ส่งไป CTW
  { code: "Eveandboy", name: "Eveandboy", prefix: "EVB", enabled: true, canImport: false, canCreate: true },
  // ค้าส่งหน้าร้าน — ใบเบิกแบบ PO (มี PO Order Version)
  { code: "KingPower", name: "King Power", prefix: "KP", enabled: true, canImport: false, canCreate: true }
  // ค้าส่งหน้าร้าน — ใบเบิกแบบ PO
];
var WHOLESALE_PLATFORMS = ["CTW", "Eveandboy", "KingPower"];
var isWholesalePlatform = (code) => WHOLESALE_PLATFORMS.includes(code);
var platformName = (code) => PLATFORMS.find((p) => p.code === code)?.name || code || "";
var _rawPeriodStart = process.env.PERIOD_START_DATE || "2026-09-01";
var PERIOD_START = /^\d{4}-\d{2}-\d{2}$/.test(_rawPeriodStart) ? _rawPeriodStart : "";

// lib/eveandboy-data.ts
var EVEANDBOY_BY_KEY = {
  "dreamisland|50": {
    "barcode": "8857128011300",
    "item_name": "LAB PARFUMO-Dream Island Eau De Parfum//50ML"
  },
  "neverblue|50": {
    "barcode": "8857128011287",
    "item_name": "LAB PARFUMO-Never Blue Eau De Parfum//50ML"
  },
  "secretofpeach|50": {
    "barcode": "8857128011119",
    "item_name": "LAB PARFUMO-Secret of Peach Eau De Parfum//50ML"
  },
  "senorita|50": {
    "barcode": "8857128011171",
    "item_name": "LAB PARFUMO-Senorita Eau De Parfum//50ML"
  },
  "vivid|50": {
    "barcode": "8857128011065",
    "item_name": "LAB PARFUMO-Vivid Eau De Parfum//50ML"
  },
  "zeus|50": {
    "barcode": "8857128011027",
    "item_name": "LAB PARFUMO-Zeus Eau De Parfum//50ML"
  },
  "dreamisland|30": {
    "barcode": "8857128011874",
    "item_name": "LAB PARFUMO-Dream Island Eau de Parfum//30ML"
  },
  "labelle|30": {
    "barcode": "8857128011904",
    "item_name": "LAB PARFUMO-La Belle Eau de Parfum//30ML"
  },
  "neverblue|30": {
    "barcode": "8857128011836",
    "item_name": "LAB PARFUMO-Never Blue Eau de Parfum//30ML"
  },
  "persist|30": {
    "barcode": "8857128011881",
    "item_name": "LAB PARFUMO-Persist Eau de Parfum//30ML"
  },
  "secretofpeach|30": {
    "barcode": "8857128011850",
    "item_name": "LAB PARFUMO-Secret of Peach Eau de Parfum//30ML"
  },
  "senorita|30": {
    "barcode": "8857128011867",
    "item_name": "LAB PARFUMO-Senorita Eau de Parfum//30ML"
  },
  "sicilia|30": {
    "barcode": "8857128011911",
    "item_name": "LAB PARFUMO-Sicilia Eau de Parfum//30ML"
  },
  "virginx|30": {
    "barcode": "8857128011997",
    "item_name": "LAB PARFUMO-VirginX Eau de Perfum//30ML"
  },
  "vivid|30": {
    "barcode": "8857128011898",
    "item_name": "LAB PARFUMO-Vivid Eau de Parfum//30ML"
  },
  "zeus|30": {
    "barcode": "8857128011843",
    "item_name": "LAB PARFUMO-Zeus Eau de Parfum//30ML"
  }
};
var EVEANDBOY_BRANCHES = [
  {
    "branch": "06_MGB - MEGA BANGNA",
    "code": "06_MGB",
    "name": "MEGA BANGNA",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 39 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E21\u0E01\u0E32\u0E1A\u0E32\u0E07\u0E19\u0E32 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 1472,1474 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48 1 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 6 \u0E16\u0E19\u0E19\u0E1A\u0E32\u0E07\u0E19\u0E32-\u0E15\u0E23\u0E32\u0E14 \u0E15\u0E33\u0E1A\u0E25\u0E1A\u0E32\u0E07\u0E41\u0E01\u0E49\u0E27 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E1A\u0E32\u0E07\u0E1E\u0E25\u0E35 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23 10540"
  },
  {
    "branch": "07_KRT - TERMINAL 21 KORAT",
    "code": "07_KRT",
    "name": "TERMINAL 21 KORAT",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 99 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E17\u0E2D\u0E21\u0E34\u0E19\u0E2D\u0E2521\u0E42\u0E04\u0E23\u0E32\u0E0A \u0E2B\u0E49\u0E2D\u0E07\u0E2A\u0E15\u0E4A\u0E2D\u0E04 \u0E08\u0E35 01 \u0E0A\u0E31\u0E49\u0E19 \u0E08\u0E35 \u0E16\u0E19\u0E19 \u0E21\u0E34\u0E15\u0E23\u0E20\u0E32\u0E1E-\u0E2B\u0E19\u0E2D\u0E07\u0E04\u0E32\u0E22 \u0E15\u0E33\u0E1A\u0E25\u0E43\u0E19\u0E21\u0E37\u0E2D\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E19\u0E04\u0E23\u0E23\u0E32\u0E0A\u0E2A\u0E35\u0E21\u0E32 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E19\u0E04\u0E23\u0E23\u0E32\u0E0A\u0E2A\u0E35\u0E21\u0E32 30000"
  },
  {
    "branch": "08_SQ1 - SIAM SQUARE ONE",
    "code": "08_SQ1",
    "name": "SIAM SQUARE ONE",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 388 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E2A\u0E22\u0E32\u0E21\u0E2A\u0E41\u0E04\u0E27\u0E23\u0E4C \u0E27\u0E31\u0E19 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E40\u0E2D\u0E1F\u0E40\u0E2D\u0E2A\u0E41\u0E2D\u0E25\u0E08\u0E35 008/1 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48 \u0E41\u0E2D\u0E25\u0E08\u0E35 \u0E16\u0E19\u0E19\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E21 1 \u0E41\u0E02\u0E27\u0E07\u0E1B\u0E17\u0E38\u0E21\u0E27\u0E31\u0E19 \u0E40\u0E02\u0E15\u0E1B\u0E17\u0E38\u0E21\u0E27\u0E31\u0E19 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10330"
  },
  {
    "branch": "10_M07 - THE MALL BANGKAE M07",
    "code": "10_M07",
    "name": "THE MALL BANGKAE M07",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 518 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E14\u0E2D\u0E30\u0E21\u0E2D\u0E25\u0E25\u0E4C\u0E1A\u0E32\u0E07\u0E41\u0E04 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 GT-GT01 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48 G  \u0E16\u0E19\u0E19\u0E40\u0E1E\u0E0A\u0E23\u0E40\u0E01\u0E29\u0E21 \u0E41\u0E02\u0E27\u0E07\u0E1A\u0E32\u0E07\u0E41\u0E04\u0E40\u0E2B\u0E19\u0E37\u0E2D \u0E40\u0E02\u0E15\u0E1A\u0E32\u0E07\u0E41\u0E04 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10160"
  },
  {
    "branch": "11_FSH - FASHION ISLAND",
    "code": "11_FSH",
    "name": "FASHION ISLAND",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 587, 589, 589/7-9 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E41\u0E1F\u0E0A\u0E31\u0E48\u0E19 \u0E44\u0E2D\u0E2A\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C \u0E2B\u0E49\u0E2D\u0E07\u0E2A\u0E15\u0E4A\u0E2D\u0E01 \u0E1A\u0E35 0 \u0E16\u0E19\u0E19\u0E23\u0E32\u0E21\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E32 \u0E41\u0E02\u0E27\u0E07\u0E04\u0E31\u0E19\u0E19\u0E32\u0E22\u0E32\u0E27 \u0E40\u0E02\u0E15\u0E04\u0E31\u0E19\u0E19\u0E32\u0E22\u0E32\u0E27 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10230"
  },
  {
    "branch": "12_ASK - TERMINAL 21 ASOK",
    "code": "12_ASK",
    "name": "TERMINAL 21 ASOK",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 88 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E17\u0E2D\u0E21\u0E34\u0E19\u0E2D\u0E25 21 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E40\u0E2D\u0E2A\u0E40\u0E2D\u0E0A-3-008 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48 3 \u0E0B\u0E2D\u0E22\u0E2A\u0E38\u0E02\u0E38\u0E21\u0E27\u0E34\u0E17 19(\u0E27\u0E31\u0E12\u0E19\u0E32) \u0E16\u0E19\u0E19\u0E2A\u0E38\u0E02\u0E38\u0E21\u0E27\u0E34\u0E17 \u0E41\u0E02\u0E27\u0E07\u0E04\u0E25\u0E2D\u0E07\u0E40\u0E15\u0E22\u0E40\u0E2B\u0E19\u0E37\u0E2D \u0E40\u0E02\u0E15\u0E27\u0E31\u0E12\u0E19\u0E32 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10110"
  },
  {
    "branch": "13_PTY - TERMINAL 21 PATTAYA",
    "code": "13_PTY",
    "name": "TERMINAL 21 PATTAYA",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 777 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E17\u0E2D\u0E21\u0E34\u0E19\u0E2D\u0E25 21 \u0E1E\u0E31\u0E17\u0E22\u0E32 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E40\u0E2D\u0E2A\u0E17\u0E35 09 \u0E0A\u0E31\u0E49\u0E19\u0E40\u0E2D\u0E47\u0E21 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 6 \u0E15\u0E33\u0E1A\u0E25\u0E19\u0E32\u0E40\u0E01\u0E25\u0E37\u0E2D \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E1A\u0E32\u0E07\u0E25\u0E30\u0E21\u0E38\u0E07 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35 20150"
  },
  {
    "branch": "15_SPO - SIAM PREMIUM OUTLET",
    "code": "15_SPO",
    "name": "SIAM PREMIUM OUTLET",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 989 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E2A\u0E22\u0E32\u0E21\u0E1E\u0E23\u0E35\u0E40\u0E21\u0E35\u0E22\u0E21\u0E40\u0E2D\u0E49\u0E32\u0E17\u0E4C\u0E40\u0E25\u0E47\u0E17 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E08\u0E3518 \u0E0A\u0E31\u0E49\u0E19\u0E08\u0E35 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 14 \u0E15\u0E33\u0E1A\u0E25\u0E1A\u0E32\u0E07\u0E40\u0E2A\u0E32\u0E18\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E1A\u0E32\u0E07\u0E40\u0E2A\u0E32\u0E18\u0E07 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23 10570"
  },
  {
    "branch": "17_M06 - THE MALL NGAMWONGWAN M06",
    "code": "17_M06",
    "name": "THE MALL NGAMWONGWAN M06",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 408, 410, 412, 414, 416, 418, 420, 422, 424, 426, 428, 430, 430/1 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E40\u0E2D\u0E2A\u0E17\u0E35 501,506 \u0E0A\u0E31\u0E49\u0E19 5 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E14\u0E2D\u0E30\u0E21\u0E2D\u0E25\u0E25\u0E4C \u0E2A\u0E32\u0E02\u0E32\u0E07\u0E32\u0E21\u0E27\u0E07\u0E28\u0E4C\u0E27\u0E32\u0E19 \u0E16\u0E19\u0E19\u0E07\u0E32\u0E21\u0E27\u0E07\u0E28\u0E4C\u0E27\u0E32\u0E19 \u0E15\u0E33\u0E1A\u0E25\u0E1A\u0E32\u0E07\u0E40\u0E02\u0E19 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E19\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E19\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35 11001"
  },
  {
    "branch": "18_M05 - THE MALL THAPRA M05",
    "code": "18_M05",
    "name": "THE MALL THAPRA M05",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 129 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 ST101 \u0E0A\u0E31\u0E49\u0E19 1 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E14\u0E2D\u0E30\u0E21\u0E2D\u0E25\u0E25\u0E4C \u0E2A\u0E32\u0E02\u0E32\u0E17\u0E48\u0E32\u0E1E\u0E23\u0E30 \u0E16\u0E19\u0E19\u0E23\u0E31\u0E0A\u0E14\u0E32\u0E20\u0E34\u0E40\u0E29\u0E01 \u0E41\u0E02\u0E27\u0E07\u0E1A\u0E38\u0E04\u0E04\u0E42\u0E25 \u0E40\u0E02\u0E15\u0E18\u0E19\u0E1A\u0E38\u0E23\u0E35 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10600"
  },
  {
    "branch": "19_MBK - MBK CENTER",
    "code": "19_MBK",
    "name": "MBK CENTER",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 444 \u0E0A\u0E31\u0E49\u0E19 4 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E2D\u0E47\u0E21\u0E1A\u0E35\u0E40\u0E04 \u0E40\u0E0B\u0E47\u0E19\u0E40\u0E15\u0E2D\u0E23\u0E4C \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 PLA.F04.D009003 , PLAF04.D009004 , PLAF04.D009005 \u0E16\u0E19\u0E19\u0E1E\u0E0D\u0E32\u0E44\u0E17 \u0E41\u0E02\u0E27\u0E07\u0E27\u0E31\u0E07\u0E43\u0E2B\u0E21\u0E48 \u0E40\u0E02\u0E15\u0E1B\u0E17\u0E38\u0E21\u0E27\u0E31\u0E19 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10330"
  },
  {
    "branch": "22_PTN - PLATINUM FASHION MALL",
    "code": "22_PTN",
    "name": "PLATINUM FASHION MALL",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 220 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E42\u0E19\u0E42\u0E27\u0E40\u0E17\u0E25 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E \u0E41\u0E1E\u0E25\u0E17\u0E34\u0E19\u0E31\u0E21 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E1E\u0E35312242 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48 1 \u0E16\u0E19\u0E19\u0E40\u0E1E\u0E0A\u0E23\u0E1A\u0E38\u0E23\u0E35 \u0E41\u0E02\u0E27\u0E07\u0E16\u0E19\u0E19\u0E40\u0E1E\u0E0A\u0E23\u0E1A\u0E38\u0E23\u0E35 \u0E40\u0E02\u0E15\u0E23\u0E32\u0E0A\u0E40\u0E17\u0E27\u0E35 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10400"
  },
  {
    "branch": "30_ACP - AYUTTHAYA CITY PARK",
    "code": "30_ACP",
    "name": "AYUTTHAYA CITY PARK",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 126 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32\u0E0B\u0E34\u0E15\u0E35\u0E49\u0E1E\u0E32\u0E23\u0E4C\u0E04 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E40\u0E2D\u0E2A\u0E40\u0E2D-16 \u0E0A\u0E31\u0E49\u0E19 \u0E1A\u0E35\u0E40\u0E2D\u0E1F \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 3 \u0E16\u0E19\u0E19\u0E2A\u0E32\u0E22\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22 \u0E15\u0E33\u0E1A\u0E25\u0E04\u0E25\u0E2D\u0E07\u0E2A\u0E27\u0E19\u0E1E\u0E25\u0E39 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E1E\u0E23\u0E30\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E1E\u0E23\u0E30\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32 13000"
  },
  {
    "branch": "31_STC - SERMTHAI COMPLEX",
    "code": "31_STC",
    "name": "SERMTHAI COMPLEX",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 76/1-7 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E44\u0E17\u0E22 \u0E04\u0E2D\u0E21\u0E40\u0E1E\u0E25\u0E47\u0E01\u0E0B\u0E4C \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 TU-07 \u0E0A\u0E31\u0E49\u0E19 B \u0E16\u0E19\u0E19\u0E19\u0E04\u0E23\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C \u0E15\u0E33\u0E1A\u0E25\u0E15\u0E25\u0E32\u0E14 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E21\u0E2B\u0E32\u0E2A\u0E32\u0E23\u0E04\u0E32\u0E21 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E21\u0E2B\u0E32\u0E2A\u0E32\u0E23\u0E04\u0E32\u0E21 44000"
  },
  {
    "branch": "32_CHA - CHARN AT THE AVENUE",
    "code": "32_CHA",
    "name": "CHARN AT THE AVENUE",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 104/42 \u0E2D\u0E32\u0E04\u0E32\u0E23 A \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E0A\u0E32\u0E19 \u0E41\u0E2D\u0E47\u0E17 \u0E14\u0E34 \u0E2D\u0E40\u0E27\u0E19\u0E34\u0E27 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 A110.1 \u0E0A\u0E31\u0E49\u0E19 1 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 1 \u0E16\u0E19\u0E19\u0E41\u0E08\u0E49\u0E07\u0E27\u0E31\u0E12\u0E19\u0E30 \u0E41\u0E02\u0E27\u0E07\u0E17\u0E38\u0E48\u0E07\u0E2A\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07 \u0E40\u0E02\u0E15\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E35\u0E48 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10210"
  },
  {
    "branch": "33_HYV - HADYAI VILLAGE",
    "code": "33_HYV",
    "name": "HADYAI VILLAGE",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 538/4 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2B\u0E32\u0E14\u0E43\u0E2B\u0E0D\u0E48 \u0E27\u0E34\u0E25\u0E40\u0E25\u0E08 \u0E2D\u0E32\u0E04\u0E32\u0E23 U \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 U101/1 \u0E0A\u0E31\u0E49\u0E19 1 \u0E16\u0E19\u0E19\u0E01\u0E32\u0E0D\u0E08\u0E19\u0E27\u0E13\u0E34\u0E0A\u0E22\u0E4C \u0E15\u0E33\u0E1A\u0E25\u0E2B\u0E32\u0E14\u0E43\u0E2B\u0E0D\u0E48 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E2B\u0E32\u0E14\u0E43\u0E2B\u0E0D\u0E48 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E07\u0E02\u0E25\u0E32 90110"
  },
  {
    "branch": "35_TSR - THE STREET RATCHADA",
    "code": "35_TSR",
    "name": "THE STREET RATCHADA",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 139 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32 THE STREET RATCHADA \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 S21 \u0E0A\u0E31\u0E49\u0E19 B \u0E16\u0E19\u0E19\u0E23\u0E31\u0E0A\u0E14\u0E32\u0E20\u0E34\u0E40\u0E29\u0E01 \u0E41\u0E02\u0E27\u0E07\u0E14\u0E34\u0E19\u0E41\u0E14\u0E07 \u0E40\u0E02\u0E15\u0E14\u0E34\u0E19\u0E41\u0E14\u0E07 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10400"
  },
  {
    "branch": "36_UNM - UNION MALL",
    "code": "36_UNM",
    "name": "UNION MALL",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 54 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E33\u0E23\u0E04\u0E49\u0E32\u0E22\u0E39\u0E40\u0E19\u0E35\u0E48\u0E22\u0E19\u0E21\u0E2D\u0E25\u0E25\u0E4C \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 2\u0E42\u0E2D-01 \u0E0A\u0E31\u0E49\u0E19 \u0E40\u0E2D\u0E1F-2 \u0E0B\u0E2D\u0E22\u0E25\u0E32\u0E14\u0E1E\u0E23\u0E49\u0E32\u0E27 1 \u0E41\u0E02\u0E27\u0E07\u0E08\u0E2D\u0E21\u0E1E\u0E25 \u0E40\u0E02\u0E15\u0E08\u0E15\u0E38\u0E08\u0E31\u0E01\u0E23 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10900"
  },
  {
    "branch": "40_SHS - SAHATHAI GARDEN PLAZA",
    "code": "40_SHS",
    "name": "SAHATHAI GARDEN PLAZA",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 528/1 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32 \u0E2A\u0E2B\u0E44\u0E17\u0E22 \u0E01\u0E32\u0E23\u0E4C\u0E40\u0E14\u0E49\u0E19 \u0E1E\u0E25\u0E32\u0E0B\u0E48\u0E32 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 226 \u0E0A\u0E31\u0E49\u0E19 2 \u0E16\u0E19\u0E19\u0E15\u0E25\u0E32\u0E14\u0E43\u0E2B\u0E21\u0E48 \u0E15\u0E33\u0E1A\u0E25\u0E15\u0E25\u0E32\u0E14 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35 84000"
  },
  {
    "branch": "41_M10 - THE MALL KORAT M10",
    "code": "41_M10",
    "name": "THE MALL KORAT M10",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 1242/2 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32\u0E40\u0E14\u0E2D\u0E30\u0E21\u0E2D\u0E25\u0E25\u0E4C \u0E42\u0E04\u0E23\u0E32\u0E0A \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 \u0E1A\u0E35\u0E1A\u0E35-07/1 \u0E0A\u0E31\u0E49\u0E19 \u0E1A\u0E35 \u0E16\u0E19\u0E19\u0E21\u0E34\u0E15\u0E23\u0E20\u0E32\u0E1E \u0E15\u0E33\u0E1A\u0E25\u0E43\u0E19\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E19\u0E04\u0E23\u0E23\u0E32\u0E0A\u0E2A\u0E35\u0E21\u0E32 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E19\u0E04\u0E23\u0E23\u0E32\u0E0A\u0E2A\u0E35\u0E21\u0E32 30000"
  },
  {
    "branch": "42_VSN - NAKONSAWAN V SQUARE",
    "code": "42_VSN",
    "name": "NAKONSAWAN V SQUARE",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 320/11 \u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E27\u0E35-\u0E2A\u0E41\u0E04\u0E27\u0E23\u0E4C \u0E1E\u0E25\u0E32\u0E0B\u0E48\u0E32 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 208-210 \u0E0A\u0E31\u0E49\u0E19 2 \u0E16\u0E19\u0E19\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C\u0E27\u0E34\u0E16\u0E35 \u0E15\u0E33\u0E1A\u0E25\u0E1B\u0E32\u0E01\u0E19\u0E49\u0E33\u0E42\u0E1E \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E19\u0E04\u0E23\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E19\u0E04\u0E23\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C 60000"
  },
  {
    "branch": "43_SHN - SAHATHAI PLAZA NAKHON SI THAMMARAT",
    "code": "43_SHN",
    "name": "SAHATHAI PLAZA NAKHON SI THAMMARAT",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 1392 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E2A\u0E2B\u0E44\u0E17\u0E22\u0E1E\u0E25\u0E32\u0E0B\u0E48\u0E32 \u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E18\u0E23\u0E23\u0E21\u0E23\u0E32\u0E0A \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 FB-01-04 \u0E0A\u0E31\u0E49\u0E19 B \u0E16\u0E19\u0E19\u0E28\u0E23\u0E35\u0E1B\u0E23\u0E32\u0E0A\u0E0D\u0E4C \u0E15\u0E33\u0E1A\u0E25\u0E17\u0E48\u0E32\u0E27\u0E31\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E18\u0E23\u0E23\u0E21\u0E23\u0E32\u0E0A 80000"
  },
  {
    "branch": "48_BPH - BLUPORT HUAHIN_BPH",
    "code": "48_BPH",
    "name": "BLUPORT HUAHIN_BPH",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 8/89 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32 BLUPORT HUAHIN \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 1M-011, 1M-012, 1M-013 \u0E0A\u0E31\u0E49\u0E19 1M \u0E0B\u0E2D\u0E22\u0E2B\u0E21\u0E39\u0E48\u0E1A\u0E49\u0E32\u0E19\u0E2B\u0E19\u0E2D\u0E07\u0E41\u0E01 \u0E15\u0E33\u0E1A\u0E25\u0E2B\u0E19\u0E2D\u0E07\u0E41\u0E01 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E2B\u0E31\u0E27\u0E2B\u0E34\u0E19 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E1B\u0E23\u0E30\u0E08\u0E27\u0E1A\u0E04\u0E35\u0E23\u0E35\u0E02\u0E31\u0E19\u0E18\u0E4C 77110"
  },
  {
    "branch": "51_TSP - THE SPHERES",
    "code": "51_TSP",
    "name": "THE SPHERES",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 45/9 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 THE SPHERES PHETKASEM \u0E2D\u0E32\u0E04\u0E32\u0E23 A \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 B7/2 \u0E0A\u0E31\u0E49\u0E19 1 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 6 \u0E15\u0E33\u0E1A\u0E25\u0E2D\u0E49\u0E2D\u0E21\u0E19\u0E49\u0E2D\u0E22 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E01\u0E23\u0E30\u0E17\u0E38\u0E48\u0E21\u0E41\u0E1A\u0E19 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E2A\u0E32\u0E04\u0E23 74130"
  },
  {
    "branch": "52_SNT - SUNEE TOWER UBON",
    "code": "52_SNT",
    "name": "SUNEE TOWER UBON",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 512/8 \u0E2A\u0E38\u0E19\u0E35\u0E22\u0E4C\u0E17\u0E32\u0E27\u0E40\u0E27\u0E2D\u0E23\u0E4C \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 G01 \u0E0A\u0E31\u0E49\u0E19 G \u0E16\u0E19\u0E19\u0E0A\u0E22\u0E32\u0E07\u0E01\u0E39\u0E23 \u0E15\u0E33\u0E1A\u0E25\u0E43\u0E19\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2D\u0E38\u0E1A\u0E25\u0E23\u0E32\u0E0A\u0E18\u0E32\u0E19\u0E35 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2D\u0E38\u0E1A\u0E25\u0E23\u0E32\u0E0A\u0E18\u0E32\u0E19\u0E35 34000"
  },
  {
    "branch": "57_CBL - COSMO BAZAAR LIFESTYLE MALL",
    "code": "57_CBL",
    "name": "COSMO BAZAAR LIFESTYLE MALL",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 101-101/1 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 SF19 \u0E0A\u0E31\u0E49\u0E19 4 \u0E16\u0E19\u0E19\u0E1B\u0E4A\u0E2D\u0E1B\u0E1B\u0E39\u0E25\u0E48\u0E32 \u0E15\u0E33\u0E1A\u0E25\u0E1A\u0E49\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E1B\u0E32\u0E01\u0E40\u0E01\u0E23\u0E47\u0E14 \u0E19\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35 11120"
  },
  {
    "branch": "58_JSP - JUNGCELON SHOPPING CENTER (PHUKET)",
    "code": "58_JSP",
    "name": "JUNGCELON SHOPPING CENTER (PHUKET)",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35181 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E08\u0E31\u0E07\u0E0B\u0E35\u0E25\u0E2D\u0E19 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E481223/7-11,1225 \u0E0A\u0E31\u0E49\u0E19 2 \u0E16\u0E19\u0E19\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E2D\u0E38\u0E17\u0E34\u0E28 200 \u0E1B\u0E35 \u0E15\u0E33\u0E1A\u0E25\u0E1B\u0E48\u0E32\u0E15\u0E2D\u0E07 \u0E2D\u0E33 \u0E40\u0E20\u0E2D \u0E01\u0E30\u0E17\u0E39\u0E49 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15 83150"
  },
  {
    "branch": "61_TMP - THONBURI MARKET PLACE",
    "code": "61_TMP",
    "name": "THONBURI MARKET PLACE",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 54 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E18\u0E19\u0E1A\u0E38\u0E23\u0E35 \u0E21\u0E32\u0E40\u0E01\u0E47\u0E15 \u0E40\u0E1E\u0E25\u0E2A \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48C01 \u0E16\u0E19\u0E19\u0E1A\u0E23\u0E21\u0E23\u0E32\u0E0A\u0E0A\u0E19\u0E19\u0E35 \u0E41\u0E02\u0E27\u0E07\u0E28\u0E32\u0E25\u0E32\u0E18\u0E23\u0E23\u0E21\u0E2A\u0E1E\u0E19\u0E4C \u0E40\u0E02\u0E15\u0E17\u0E27\u0E35\u0E27\u0E31\u0E12\u0E19\u0E32 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E2F 10170"
  },
  {
    "branch": "62_BCA - BIG C AMNAT CHAREON",
    "code": "62_BCA",
    "name": "BIG C AMNAT CHAREON",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48477 \u0E2D\u0E32\u0E04\u0E32\u0E23 Big C super center \u0E0A\u0E31\u0E49\u0E19 \u0E17\u0E35\u0E48G-IN \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 GCR1101, GCR1136/1 \u0E15\u0E33\u0E1A\u0E25\u0E1A\u0E38\u0E48\u0E07 \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2D\u0E33\u0E19\u0E32\u0E08 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14 \u0E2D\u0E33\u0E19\u0E32\u0E08\u0E40\u0E08\u0E23\u0E34\u0E0D 37000"
  },
  {
    "branch": "63_JPS - J-PARK SRI RACHA NIHON MURA",
    "code": "63_JPS",
    "name": "J-PARK SRI RACHA NIHON MURA",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 8 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E40\u0E08\u0E1E\u0E32\u0E23\u0E4C\u0E04 \u0E28\u0E23\u0E35\u0E23\u0E32\u0E0A\u0E32 \u0E19\u0E34\u0E2E\u0E2D\u0E19 \u0E21\u0E39\u0E23\u0E30 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 J1-B2-04 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 6 \u0E15\u0E33\u0E1A\u0E25\u0E2A\u0E38\u0E23\u0E28\u0E31\u0E01\u0E14\u0E4C \u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E28\u0E23\u0E35\u0E23\u0E32\u0E0A\u0E32 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35 20110"
  },
  {
    "branch": "66_JKB - THE JAS KHUBON",
    "code": "66_JKB",
    "name": "THE JAS KHUBON",
    "address": "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 54/12-13 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E41\u0E08\u0E2A \u0E01\u0E23\u0E35\u0E19\u0E27\u0E34\u0E25\u0E40\u0E25\u0E08\u0E04\u0E39\u0E49\u0E1A\u0E2D\u0E19 \u0E0A\u0E31\u0E49\u0E19\u0E17\u0E35\u0E481 \u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 X101,W102 \u0E16\u0E19\u0E19\u0E04\u0E39\u0E49\u0E1A\u0E2D\u0E19 \u0E41\u0E02\u0E27\u0E07\u0E1A\u0E32\u0E07\u0E0A\u0E31\u0E19 \u0E40\u0E02\u0E15\u0E04\u0E25\u0E2D\u0E07\u0E2A\u0E32\u0E21\u0E27\u0E32 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23 10510"
  }
];

// lib/pdf/fonts.ts
var NOTO_SANS_THAI_REGULAR = "data:font/ttf;base64,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A+gAKAH0ACgCagBVAjQANwI8ADgCXQA3AjwAFwENAEgBDQBIAVgADwI8AD8CPAAVAmcANwJnADcCZwA3AmcANwJ3AFUBGQAoAAD+EwI8ADIB/QAoAf0AJwE2ACgBNgAnAmoAVQJqAAkBtwAoAAD/ggECAE4BAgBMAQL/2AEC//UBAgBVAQL//wEC/+wBAgAbAQL/yQEC/8kCFgBVAhYAVQECAFUBAgBMAQIAVQECAEECPAAyAQL/9wOnAFUAAP9sAUIAKAI8AEACagBVAmoAVQJqAFUCagBVAjwAMgJqAFUChgAZAl0ANwJdADcCXQA3Al0ANwOyADYA9QAoAAD/rgJdADcCXQA3Al0ANwI8AFkBZQAgAXgAIAJdADcCXQA3AfT//QJnAFUCjwA3ASwAKAEsAB4DPwAxAQwASAEMAEgCPAAyAmcANwGyAAwBsgAYAZgAQQGgAB8BZwAMAWcADACvAAwArwAMAPoAHwDhAEEBnQBVAZ0AVQGdAEcBnQA+A0AAMQEsACgAAP+UAd8AMwHfADMB3wAzAd8AMwHfADMCAQA7AQwAHwI8ACwCPAA3AXQACgI8ACABaQAQAWkAEAFpABACZwBVAjwALQG/ACgDBQARAjwAMAJqAE8CagBPAmoATwJqAE8CagBPAmoATwJqAE8CagBPAbz//gJqAE8CagBPAfwAAAMSAAsDEgALAxIACwMSAAsDEgALAhEAEgH+AAEB/gABAf4AAQH+AAECPAAOAf4AAQHWACcB1gAnAdYAJwHWACcCPAAxAfQAvgH0ALkBeQAoAAIAAAAAAAD/nAAyAAAAAAAAAAAAAAAAAAAAAAAAAAABywAAAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQAQARYBFwEYARkBGgEbARwBHQEeAR8BIAEhASIBIwEkASUBJgEnASgBKQEqASsBLAEtAS4BLwEwATEBMgEzATQBNQE2ATcBOAE5AToBOwE8AT0BPgE/AUABQQFCAUMBRAFFAUYBRwFIAUkBSgFLAUwBTQFOAU8BUAFRAVIBUwFUAVUBVgFXAVgBWQFaAVsBXAFdAV4BXwFgAWEBYgFjAWQBZQFmAAMBZwFoAWkBagFrAWwBbQFuAW8BcAFxAXIBcwF0AXUBdgF3AXgBeQF6AXsBfAF9AX4BfwGAAYEBggAkAJAAyQGDAMcAYgCtAYQBhQBjAK4AJQAmAP0A/wBkAYYAJwGHAYgAKABlAYkAyADKAYoAywGLAYwBjQDpACkAKgD4AY4BjwGQACsBkQAsAMwAzQDOAPoAzwGSAZMALQAuAZQALwGVAZYBlwDiADAAMQGYAZkBmgBmADIAsADQANEAZwDTAZsBnACRAK8AMwA0ADUBnQGeAZ8ANgGgAOQA+wGhADcBogGjAO0AOADUAaQA1QBoANYBpQGmAacBqAA5ADoBqQGqAasBrAA7ADwA6wGtALsBrgA9Aa8A5gGwAEQAaQGxAGsAjQGyAGwAoABqAbMACQG0AG4AQQBhAA0AIwBtAEUAPwBfAF4AYAA+AEAA2wG1AIcARgD+AOEBtgEAAG8BtwDeAbgAhADYAbkAHQAPAboBuwCLAEcBvAEBAIMAjgG9ALgABwDcAb4ASABwAb8AcgBzAcAAcQAbAKsBwQCzALIBwgHDACAA6gHEAAQAowBJABgAFwBKAPkBxQHGAIkAQwHHACEAqQCqAL4AvwBLAcgA3wHJAEwAdAB2AHcA1wB1AcoBywBNAcwATgHNAE8BzgHPAdAAHwDjAFAB0QDvAPAAUQHSAdMB1AAcAHgABgBSAHkAewB8ALEA4AHVAHoB1gHXABQAnQCeAKEAfQHYAFMAiAALAAwACAARAMMADgBUACIAogAFAMUAtAC1ALYAtwDEAAoAVQHZAdoB2wCKAN0B3ABWAd0A5QD8Ad4AhgAeABoAGQASAIUAVwHfAeAA7gAWANkAjAAVAFgAfgHhAIAAgQB/AeIB4wBCAeQB5QBZAFoB5gHnAegB6QBbAFwA7AHqALoAlgHrAF0B7ADnAe0AEwHuAe8B8AJDUgROVUxMB3VuaTBFNUEHdW5pMEUzRgd1bmkwRTFBB3VuaTBFMDgHdW5pMEUwQQd1bmkwRTA5B3VuaTBFMEMHdW5pMEUwRQ11bmkwRTBFLnNob3J0B3VuaTBFMTQHdW5pMEU1OAd1bmkwRTU1B3VuaTBFMUQHdW5pMEUxRgd1bmkwRTRGB3VuaTBFNTQHdW5pMEUyQgd1bmkwRTJFB3VuaTIwMTAHdW5pMEUwMgd1bmkwRTA1B3VuaTBFMDMHdW5pMEUwNAd1bmkwRTA2B3VuaTBFNUIHdW5pMEUwMQd1bmkwRTQ1B3VuaTBFMkMNdW5pMEUyQy5zaG9ydAd1bmkwRTI1B3VuaTBFMjYNdW5pMEUyNi5zaG9ydAt1bmkwRTI2MEU0NQd1bmkwMzMxC3VuaTAzMzEuYWx0B3VuaTBFNEIOdW5pMEU0Qi5uYXJyb3cNdW5pMEU0Qi5zbWFsbAd1bmkwRTQ4DnVuaTBFNDgubmFycm93DXVuaTBFNDguc21hbGwHdW5pMEUzMQ51bmkwRTMxLm5hcnJvdwd1bmkwRTQ5DnVuaTBFNDkubmFycm93DXVuaTBFNDkuc21hbGwHdW5pMEU0QQ51bmkwRTRBLm5hcnJvdw11bmkwRTRBLnNtYWxsB3VuaTBFNDcOdW5pMEU0Ny5uYXJyb3cHdW5pMEU0Ngd1bmkwRTIxB3VuaTAwQTAHdW5pMEUwNwd1bmkwRTREDnVuaTBFNEQubmFycm93B3VuaTBFNTkHdW5pMEUxMwd1bmkwRTE5B3VuaTBFMkQHdW5pMEU1MQd1bmkwRTJGB3VuaTBFM0ENdW5pMEUzQS5zbWFsbAd1bmkwRTFFB3VuaTBFMUMHdW5pMEUyMAd1bmkwRTFCB3VuaTBFMjMHdW5pMEUyNA11bmkwRTI0LnNob3J0C3VuaTBFMjQwRTQ1B3VuaTBFMzAHdW5pMEUzMgd1bmkwRTQxB3VuaTBFNDQHdW5pMEU0Mwd1bmkwRTMzB3VuaTBFNDAHdW5pMEUzNA51bmkwRTM0Lm5hcnJvdwd1bmkwRTM1DnVuaTBFMzUubmFycm93B3VuaTBFNDIHdW5pMEUzOA11bmkwRTM4LnNtYWxsB3VuaTBFMzYOdW5pMEUzNi5uYXJyb3cHdW5pMEUzNw51bmkwRTM3Lm5hcnJvdwd1bmkwRTM5DXVuaTBFMzkuc21hbGwHdW5pMEU1Nwd1bmkwRTU2B3VuaTBFMjkHdW5pMEUyOAd1bmkwRTBCB3VuaTBFMkEHdW5pMEU0Qw51bmkwRTRDLm5hcnJvdw11bmkwRTRDLnNtYWxsB3VuaTBFMTEHdW5pMEUxMgd1bmkwRTE3B3VuaTBFMTAMdW5pMEUxMC5sZXNzB3VuaTBFMTgHdW5pMEUxNgd1bmkwRTUzCXRpbGRlY29tYgd1bmkwRTBGDXVuaTBFMEYuc2hvcnQHdW5pMEUxNQd1bmkwRTUyB3VuaTAyQkMHdW5pMDJENwd1bmkyMDBCB3VuaTIwMEMHdW5pMjAwRAd1bmkyNUNDB3VuaTBFMjcHdW5pMEU0RQd1bmkwRTIyB3VuaTBFMEQMdW5pMEUwRC5sZXNzB3VuaTBFNTAGQWJyZXZlB0FtYWNyb24HQW9nb25lawpDZG90YWNjZW50BkRjYXJvbgZEY3JvYXQGRWNhcm9uCkVkb3RhY2NlbnQHRW1hY3JvbgNFbmcHRW9nb25lawd1bmkwMTIyCkdkb3RhY2NlbnQHdW5pMUU5RQRIYmFyB0ltYWNyb24HSW9nb25lawd1bmkwMTM2BkxhY3V0ZQZMY2Fyb24HdW5pMDEzQgZOYWN1dGUGTmNhcm9uB3VuaTAxNDUNT2h1bmdhcnVtbGF1dAdPbWFjcm9uBlJhY3V0ZQZSY2Fyb24HdW5pMDE1NgZTYWN1dGUHdW5pMDIxOAZUY2Fyb24HdW5pMDIxQQZVYnJldmUNVWh1bmdhcnVtbGF1dAdVbWFjcm9uB1VvZ29uZWsFVXJpbmcGV2FjdXRlC1djaXJjdW1mbGV4CVdkaWVyZXNpcwZXZ3JhdmULWWNpcmN1bWZsZXgGWWdyYXZlBlphY3V0ZQpaZG90YWNjZW50BmFicmV2ZQlhY3V0ZWNvbWIHYW1hY3Jvbgdhb2dvbmVrB3VuaTAzMDYHdW5pMDMwQwpjZG90YWNjZW50B3VuaTAzMjcHdW5pMDMwMgd1bmkwMzI2B3VuaTAzMTIGZGNhcm9uB3VuaTAzMDgHdW5pMDMwNwZlY2Fyb24KZWRvdGFjY2VudAdlbWFjcm9uA2VuZwdlb2dvbmVrBEV1cm8HdW5pMDEyMwpnZG90YWNjZW50CWdyYXZlY29tYgRoYmFyB3VuaTAzMEIHaW1hY3Jvbgdpb2dvbmVrB3VuaTAyMzcHdW5pMDEzNwZsYWN1dGUGbGNhcm9uB3VuaTAxM0MHdW5pMDMwNAZuYWN1dGUGbmNhcm9uB3VuaTAxNDYHdW5pMDMyOA1vaHVuZ2FydW1sYXV0B29tYWNyb24Jb3ZlcnNjb3JlBnJhY3V0ZQZyY2Fyb24HdW5pMDE1Nwd1bmkwMzBBBnNhY3V0ZQd1bmkwMjE5BnRjYXJvbgd1bmkwMjFCBnVicmV2ZQ11aHVuZ2FydW1sYXV0B3VtYWNyb24HdW9nb25lawV1cmluZwZ3YWN1dGULd2NpcmN1bWZsZXgJd2RpZXJlc2lzBndncmF2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AiICGAABAiIAAAABAh8CGAABAgkAAAABAdgCGAABAb4AAAABAd8CGAABAdICGAABAc3/QwABAhAAAAABA1ICGAABAz8AAAABAhgCGAABAiMAAAABAeoCGAABAe0CGAABAcQAAAABAhkCGAABAfoAAAABAgn/XgABAfgCGAABAgn/QwABAcACGAABAY8AAAABAXoCGAABAf8CGAABAgoAAAABAjACGAABAmQCGAABAisAAAABAbcAAAABAgwCGAABAgwAAAABAzQCGAABAzQAAAABAbcCGAABAYsAAAABAhUCGAABAf8AAAABAgECHQABAdsCGAABAeoAAAABAigCGAABAhEAAAABAhoAAAABAf0CGAABAggAAAABAgUCGAABAfIAAAABAhUAAAABAcAAAAABAhACGAABAhsAAAABAdECGAABAdQCGAABAcYAAAABAgkCGAABAgYAAAABAd0CGAABAicAAAABAZQCGAABAjAAAAABAg8CGAABAhcAAAABAgr/XgABAf4CGAABAgr/QwABAzgCGAABAyQAAAABAgECGAABAgsAAAABAd0CFgABAb0AAAABAcQCGAABAasAAAABAgoCGAABAfYAAAACAA8ABQAMAAAADwAQAAgAEwAUAAoAFwAbAAwAHQAdABEAHwAjABIAOAA4ABcAOgA6ABgAPgBAABkARQBLABwAYwBmACMAawBxACcAdAB2AC4AfQB+ADEAgACCADMAJwAAAOwAAADmAAEA4AABANoAAQDUAAEA4AABAM4AAQDUAAEA4AABAMgAAQDgAAEAwgABANQAAQDgAAEAzgABANQAAQDgAAEA2gABAOAAAQDOAAAAvAAAALYAAQDgAAEA2gABAOAAAQDaAAAAvAAAALAAAQDgAAEA2gABAOAAAQDIAAAAvAAAAKoAAQDgAAEApAABANQAAQCeAAEA4AAB/7ICGAAB/uMCGAAB/7D/XQAB/6//XQAB/6//XgAB/6cAAAAB/xwCGQAB/x4CGAAB/xwCGAAB/6cDBAAB/x0CGAAB/6cCGAAB/8gAAAAB/90AAAACAAgAJQA2AAAAOwA8ABIAQwBEABQAVABXABYAWQBgABoAaABqACIAcwBzACUAfwB/ACYAAgBeAAAB+QLKAAMABwAAMxEhESUhESFeAZv+mAE1/ssCyv02MwJkAAIAEv//Ap0CLgAf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";
var NOTO_SANS_THAI_BOLD = "data:font/ttf;base64,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AjwAKwJrAC0CPAAgAR4AOQEeADkBgwAUAjwAMQI8ABECeQAtAnkALQJ5AC0CeQAtAscATgFqACgAAP3uAjwAKwJnACgCZwAoAXAAKAFwACgCkQBOApEAAgIEACgAAP9pATEASAExAE4BMf/FATH/8QExAE4BMf/kATH/8wExAC0BMf/AATH/wAJsAE4CbABOATEATgExAE4BMQBOATEARQI8ACsBMf/0A9YATgAA/1sBQgAeAjwAPwKRAE4CkQBOApEATgKRAE4CPAAgApEATgKGABYCawAtAmsALQJrAC0CawAtA9IALQEWACgAAP+dAmsALQJrAC0CawAtAjwAOwF/ABcBhAAcAmsALQJrAC0B9P/9AnkATgKPADcBUwAoAVMAHgOFAB8BHQA5AR0AOQI8ACsCeQAtAd0AAwHdABsB2ABBAgEAHwG9AAwBvQAMANkADADZAAwBHQAfAQoAQQHGAE4BxgBOAcYAKgHGAEgDQAAxAUUAKAAA/4kB8QAtAfEALQHxACUB8QAtAfEALQHmADQBHQAfAjwAGwI8ACMBnQAHAjwAKAGyABcBsgAXAbIAFwJ5AE4CPAAmAeUAKAMFABECPAAmApEASwKRAEsCkQBLApEASwKRAEsCkQBLApEASwKRAEsBm//+ApEASwKRAEsCOQAAA1gACgNYAAoDWAAKA1gACgNYAAoCQgAFAjkAAAI5AAACOQAAAjkAAAI8AAMCOQAAAegAGwHoABsB6AAbAegAGwI8ACQB9ACrAfQAowGbACgAAgAAAAAAAP+cADIAAAAAAAAAAAAAAAAAAAAAAAAAAAHLAAABAgEDAQQBBQEGAQcBCAEJAQoBCwEMAQ0BDgEPARABEQESARMBFAEVABABFgEXARgBGQEaARsBHAEdAR4BHwEgASEBIgEjASQBJQEmAScBKAEpASoBKwEsAS0BLgEvATABMQEyATMBNAE1ATYBNwE4ATkBOgE7ATwBPQE+AT8BQAFBAUIBQwFEAUUBRgFHAUgBSQFKAUsBTAFNAU4BTwFQAVEBUgFTAVQBVQFWAVcBWAFZAVoBWwFcAV0BXgFfAWABYQFiAWMBZAFlAWYAAwFnAWgBaQFqAWsBbAFtAW4BbwFwAXEBcgFzAXQBdQF2AXcBeAF5AXoBewF8AX0BfgF/AYABgQGCACQAkADJAYMAxwBiAK0BhAGFAGMArgAlACYA/QD/AGQBhgAnAYcBiAAoAGUBiQDIAMoBigDLAYsBjAGNAOkAKQAqAPgBjgGPAZAAKwGRACwAzADNAM4A+gDPAZIBkwAtAC4BlAAvAZUBlgGXAOIAMAAxAZgBmQGaAGYAMgCwANAA0QBnANMBmwGcAJEArwAzADQANQGdAZ4BnwA2AaAA5AD7AaEANwGiAaMA7QA4ANQBpADVAGgA1gGlAaYBpwGoADkAOgGpAaoBqwGsADsAPADrAa0AuwGuAD0BrwDmAbAARABpAbEAawCNAbIAbACgAGoBswAJAbQAbgBBAGEADQAjAG0ARQA/AF8AXgBgAD4AQADbAbUAhwBGAP4A4QG2AQAAbwG3AN4BuACEANgBuQAdAA8BugG7AIsARwG8AQEAgwCOAb0AuAAHANwBvgBIAHABvwByAHMBwABxABsAqwHBALMAsgHCAcMAIADqAcQABACjAEkAGAAXAEoA+QHFAcYAiQBDAccAIQCpAKoAvgC/AEsByADfAckATAB0AHYAdwDXAHUBygHLAE0BzABOAc0ATwHOAc8B0AAfAOMAUAHRAO8A8ABRAdIB0wHUABwAeAAGAFIAeQB7AHwAsQDgAdUAegHWAdcAFACdAJ4AoQB9AdgAUwCIAAsADAAIABEAwwAOAFQAIgCiAAUAxQC0ALUAtgC3AMQACgBVAdkB2gHbAIoA3QHcAFYB3QDlAPwB3gCGAB4AGgAZABIAhQBXAd8B4ADuABYA2QCMABUAWAB+AeEAgACBAH8B4gHjAEIB5AHlAFkAWgHmAecB6AHpAFsAXADsAeoAugCWAesAXQHsAOcB7QATAe4B7wHwAkNSBE5VTEwHdW5pMEU1QQd1bmkwRTNGB3VuaTBFMUEHdW5pMEUwOAd1bmkwRTBBB3VuaTBFMDkHdW5pMEUwQwd1bmkwRTBFDXVuaTBFMEUuc2hvcnQHdW5pMEUxNAd1bmkwRTU4B3VuaTBFNTUHdW5pMEUxRAd1bmkwRTFGB3VuaTBFNEYHdW5pMEU1NAd1bmkwRTJCB3VuaTBFMkUHdW5pMjAxMAd1bmkwRTAyB3VuaTBFMDUHdW5pMEUwMwd1bmkwRTA0B3VuaTBFMDYHdW5pMEU1Qgd1bmkwRTAxB3VuaTBFNDUHdW5pMEUyQw11bmkwRTJDLnNob3J0B3VuaTBFMjUHdW5pMEUyNg11bmkwRTI2LnNob3J0C3VuaTBFMjYwRTQ1B3VuaTAzMzELdW5pMDMzMS5hbHQHdW5pMEU0Qg51bmkwRTRCLm5hcnJvdw11bmkwRTRCLnNtYWxsB3VuaTBFNDgOdW5pMEU0OC5uYXJyb3cNdW5pMEU0OC5zbWFsbAd1bmkwRTMxDnVuaTBFMzEubmFycm93B3VuaTBFNDkOdW5pMEU0OS5uYXJyb3cNdW5pMEU0OS5zbWFsbAd1bmkwRTRBDnVuaTBFNEEubmFycm93DXVuaTBFNEEuc21hbGwHdW5pMEU0Nw51bmkwRTQ3Lm5hcnJvdwd1bmkwRTQ2B3VuaTBFMjEHdW5pMDBBMAd1bmkwRTA3B3VuaTBFNEQOdW5pMEU0RC5uYXJyb3cHdW5pMEU1OQd1bmkwRTEzB3VuaTBFMTkHdW5pMEUyRAd1bmkwRTUxB3VuaTBFMkYHdW5pMEUzQQ11bmkwRTNBLnNtYWxsB3VuaTBFMUUHdW5pMEUxQwd1bmkwRTIwB3VuaTBFMUIHdW5pMEUyMwd1bmkwRTI0DXVuaTBFMjQuc2hvcnQLdW5pMEUyNDBFNDUHdW5pMEUzMAd1bmkwRTMyB3VuaTBFNDEHdW5pMEU0NAd1bmkwRTQzB3VuaTBFMzMHdW5pMEU0MAd1bmkwRTM0DnVuaTBFMzQubmFycm93B3VuaTBFMzUOdW5pMEUzNS5uYXJyb3cHdW5pMEU0Mgd1bmkwRTM4DXVuaTBFMzguc21hbGwHdW5pMEUzNg51bmkwRTM2Lm5hcnJvdwd1bmkwRTM3DnVuaTBFMzcubmFycm93B3VuaTBFMzkNdW5pMEUzOS5zbWFsbAd1bmkwRTU3B3VuaTBFNTYHdW5pMEUyOQd1bmkwRTI4B3VuaTBFMEIHdW5pMEUyQQd1bmkwRTRDDnVuaTBFNEMubmFycm93DXVuaTBFNEMuc21hbGwHdW5pMEUxMQd1bmkwRTEyB3VuaTBFMTcHdW5pMEUxMAx1bmkwRTEwLmxlc3MHdW5pMEUxOAd1bmkwRTE2B3VuaTBFNTMJdGlsZGVjb21iB3VuaTBFMEYNdW5pMEUwRi5zaG9ydAd1bmkwRTE1B3VuaTBFNTIHdW5pMDJCQwd1bmkwMkQ3B3VuaTIwMEIHdW5pMjAwQwd1bmkyMDBEB3VuaTI1Q0MHdW5pMEUyNwd1bmkwRTRFB3VuaTBFMjIHdW5pMEUwRAx1bmkwRTBELmxlc3MHdW5pMEU1MAZBYnJldmUHQW1hY3JvbgdBb2dvbmVrCkNkb3RhY2NlbnQGRGNhcm9uBkRjcm9hdAZFY2Fyb24KRWRvdGFjY2VudAdFbWFjcm9uA0VuZwdFb2dvbmVrB3VuaTAxMjIKR2RvdGFjY2VudAd1bmkxRTlFBEhiYXIHSW1hY3JvbgdJb2dvbmVrB3VuaTAxMzYGTGFjdXRlBkxjYXJvbgd1bmkwMTNCBk5hY3V0ZQZOY2Fyb24HdW5pMDE0NQ1PaHVuZ2FydW1sYXV0B09tYWNyb24GUmFjdXRlBlJjYXJvbgd1bmkwMTU2BlNhY3V0ZQd1bmkwMjE4BlRjYXJvbgd1bmkwMjFBBlVicmV2ZQ1VaHVuZ2FydW1sYXV0B1VtYWNyb24HVW9nb25lawVVcmluZwZXYWN1dGULV2NpcmN1bWZsZXgJV2RpZXJlc2lzBldncmF2ZQtZY2lyY3VtZmxleAZZZ3JhdmUGWmFjdXRlClpkb3RhY2NlbnQGYWJyZXZlCWFjdXRlY29tYgdhbWFjcm9uB2FvZ29uZWsHdW5pMDMwNgd1bmkwMzBDCmNkb3RhY2NlbnQHdW5pMDMyNwd1bmkwMzAyB3VuaTAzMjYHdW5pMDMxMgZkY2Fyb24HdW5pMDMwOAd1bmkwMzA3BmVjYXJvbgplZG90YWNjZW50B2VtYWNyb24DZW5nB2VvZ29uZWsERXVybwd1bmkwMTIzCmdkb3RhY2NlbnQJZ3JhdmVjb21iBGhiYXIHdW5pMDMwQgdpbWFjcm9uB2lvZ29uZWsHdW5pMDIzNwd1bmkwMTM3BmxhY3V0ZQZsY2Fyb24HdW5pMDEzQwd1bmkwMzA0Bm5hY3V0ZQZuY2Fyb24HdW5pMDE0Ngd1bmkwMzI4DW9odW5nYXJ1bWxhdXQHb21hY3JvbglvdmVyc2NvcmUGcmFjdXRlBnJjYXJvbgd1bmkwMTU3B3VuaTAzMEEGc2FjdXRlB3VuaTAyMTkGdGNhcm9uB3VuaTAyMUIGdWJyZXZlDXVodW5nYXJ1bWxhdXQHdW1hY3Jvbgd1b2dvbmVrBXVyaW5nBndhY3V0ZQt3Y2lyY3VtZmxleAl3ZGllcmVzaXMGd2dyYXZlC3ljaXJjdW1mbGV4Bnln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";

// lib/pdf/withdrawal-sp-document.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var fontRegistered = false;
function registerFontOnce() {
  if (fontRegistered) return;
  Font.register({
    family: "NotoSansThai",
    fonts: [
      { src: NOTO_SANS_THAI_REGULAR, fontWeight: "normal" },
      { src: NOTO_SANS_THAI_BOLD, fontWeight: "bold" }
    ]
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontRegistered = true;
}
var T = (s2) => {
  if (s2 == null || s2 === "") return "-";
  const v = String(s2).trim();
  return v || "-";
};
var C = { ink: "#1a1614", muted: "#6b645d", faint: "#9a938c", border: "#cfc9c1", soft: "#f5f3ef", brand: "#ee4d2d", line: "#e6e1da" };
var s = StyleSheet.create({
  // A4 landscape content height = 595.28 - padding(40) ≈ 555 → ล็อกกล่องใบ = 552 (ทุกใบสูงเท่ากัน ขอบบน/ล่างตรงกัน)
  page: { fontFamily: "NotoSansThai", fontSize: 8, color: C.ink, paddingVertical: 20, paddingHorizontal: 20 },
  pageRow: { flexDirection: "row", alignItems: "stretch" },
  panel: { flex: 1, height: 552, borderWidth: 1, borderColor: C.ink, padding: 9, flexDirection: "column" },
  // full = A4 portrait เต็มแผ่น: ไม่ล็อกความสูง ให้เนื้อหาไหลลงตามปกติ (กันตัวหนังสือซ้อนกัน)
  panelFull: { borderWidth: 1, borderColor: C.ink, padding: 14, flexDirection: "column" },
  spacer: { flexGrow: 1 },
  // ดันลายเซ็นลงล่างสุด (ไม่มีเส้น/เลข)
  // dashed fold/cut line down the middle between the two copies
  divider: { width: 18, alignItems: "center" },
  dividerLine: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.muted, borderStyle: "dashed" },
  cutLabel: { fontSize: 6, color: C.faint, marginVertical: 3 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingBottom: 5, marginBottom: 5 },
  company: { fontSize: 10, fontWeight: "bold" },
  companyEn: { fontSize: 6.5, color: C.muted, marginTop: 1 },
  titleWrap: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontWeight: "bold" },
  docSub: { fontSize: 7, color: C.faint },
  badge: { marginTop: 3, alignSelf: "flex-end", borderWidth: 0.8, borderColor: C.brand, color: C.brand, fontSize: 6.5, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3, fontWeight: "bold" },
  // ชิปประเภทการส่ง (ส่งด่วน/ส่งทันที) — เล็ก อยู่ในช่องหมายเหตุ (สีแยกประเภท ชัดแม้ขาวดำ: กรอบ+ตัวหนา)
  noteChip: { fontWeight: "bold", fontSize: 7, borderWidth: 0.8, borderRadius: 2, paddingHorizontal: 3, paddingVertical: 0.5, marginRight: 3 },
  noteChipExpress: { borderColor: "#b91c1c", backgroundColor: "#fde4e4", color: "#b91c1c" },
  noteChipNow: { borderColor: "#c2410c", backgroundColor: "#ffe9d3", color: "#c2410c" },
  band: { flexDirection: "row", backgroundColor: C.soft, borderWidth: 0.5, borderColor: C.border, marginBottom: 5 },
  bandCell: { flex: 1, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: C.border },
  bandLabel: { fontSize: 6, color: C.muted },
  bandVal: { fontSize: 8.5, fontWeight: "bold" },
  // Order No. + barcode strip (แนวนอน: เลขซ้าย บาร์โค้ดขวา) — ดีไซน์แรก
  bcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 0.8, borderColor: C.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 5 },
  bcLeft: {},
  bcLabel: { fontSize: 6.5, color: C.muted },
  bcValue: { fontSize: 11, fontWeight: "bold", letterSpacing: 0.6 },
  bcRight: { alignItems: "center" },
  bcText: { fontSize: 6.5, color: C.muted, marginTop: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  field: { width: "50%", flexDirection: "row", marginBottom: 2, paddingRight: 6 },
  fieldFull: { width: "100%", flexDirection: "row", marginBottom: 2 },
  fLabel: { color: C.muted, width: 54, fontSize: 7 },
  fVal: { fontWeight: "bold", flex: 1, fontSize: 7.5 },
  th: { flexDirection: "row", backgroundColor: C.soft, borderTopWidth: 0.8, borderColor: C.border },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderColor: C.line, minHeight: 14 },
  trLast: { borderBottomWidth: 0.8, borderColor: C.border },
  cell: { paddingVertical: 2.5, paddingHorizontal: 3, fontSize: 7.5 },
  hCell: { fontWeight: "bold", fontSize: 7, color: C.muted },
  foot: { flexDirection: "row", borderTopWidth: 0.8, borderBottomWidth: 0.8, borderColor: C.border, backgroundColor: C.soft },
  blankCell: { paddingVertical: 2.5, paddingHorizontal: 3 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 4 },
  sign: { width: "30%", alignItems: "center" },
  signLine: { borderTopWidth: 0.6, borderColor: C.muted, width: "100%", marginBottom: 3 },
  signLabel: { fontSize: 7, color: C.muted }
});
var COL_HALF = [16, 46, 104, 42, 34, 28, 30, 62];
var COL_FULL = [22, 60, 150, 55, 45, 36, 40, 127];
function Barcode({ value, width = 250, height = 50 }) {
  const bc = code128(value);
  const scale = width / bc.totalModules;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { width, height, children: bc.bars.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rect, { x: b.x * scale, y: 0, width: b.w * scale, height, fill: "#000" }, i)) });
}
function Field({ label, value, full }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: full ? s.fieldFull : s.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.fLabel, children: T(label) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.fVal, children: T(value) })
  ] });
}
function Sign({ label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.sign, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: s.signLine }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.signLabel, children: `( ${T(label)} )` })
  ] });
}
function fmtDate(d) {
  if (!d) return "-";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}
var isBag = (p) => /ถุง/.test(String(p || ""));
var isFreeItem = (it) => !!it.is_free || isBag(it.product);
var TYPE_ORDER = ["PARFUM", "EDP+", "EDT", "EDP"];
var typeRank = (t) => {
  const i = TYPE_ORDER.indexOf(String(t || "").trim());
  return i < 0 ? 9 : i;
};
var mlOf = (sz) => {
  const m = String(sz || "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};
function Panel({ order: order2, copyLabel, full = false }) {
  const items = [...order2.items ?? []].sort((a, b) => (isFreeItem(a) ? 1 : 0) - (isFreeItem(b) ? 1 : 0) || typeRank(a.ptype) - typeRank(b.ptype) || mlOf(b.size) - mlOf(a.size) || String(a.product || "").localeCompare(String(b.product || ""), "th"));
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const addr = [order2.address, order2.subdistrict, order2.district, order2.province, order2.postcode].filter(Boolean).join(" ");
  const n = items.length;
  const COL = full ? COL_FULL : COL_HALF;
  const [T0, T1, T2, T3, T4, T5] = full ? [92, 68, 46, 33, 23, 13] : [70, 55, 40, 31, 22, 14];
  const rowH = n > T0 ? 4.7 : n > T1 ? 5.4 : n > T2 ? 6.3 : n > T3 ? 7.4 : n > T4 ? 9.5 : n > T5 ? 11 : 14;
  const cfs = n > T0 ? 4.7 : n > T1 ? 5 : n > T2 ? 5.4 : n > T3 ? 6 : n > T4 ? 6.6 : n > T5 ? 7 : 7.5;
  const CAP = full ? 112 : 78;
  const shownItems = n > CAP ? items.slice(0, CAP - 1) : items;
  const truncated = n - shownItems.length;
  const pv = n > T3 ? 0.8 : n > T5 ? 1.3 : 2.5;
  const signGap = n > T3 ? 3 : n > T5 ? 6 : 14;
  const bcH = n > T3 ? 22 : n > T5 ? 26 : 34;
  const rowStyle = { minHeight: rowH };
  const cStyle = { fontSize: cfs, paddingVertical: pv };
  const noteText = order2.note || "";
  const isExpress = noteText.includes("\u0E2A\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19");
  const isNow = noteText.includes("\u0E2A\u0E48\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35");
  const restNote = noteText.replace("\u0E2A\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19", "").replace("\u0E2A\u0E48\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35", "").replace(/\s{2,}/g, " ").trim();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: full ? s.panelFull : s.panel, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.head, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.company, children: T(COMPANY_NAME) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.companyEn, children: COMPANY_NAME_EN })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.titleWrap, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.docTitle, children: T("\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.docSub, children: "Goods Issue Form" }),
        copyLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.badge, children: T(copyLabel) }) : null
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.band, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.bandCell, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandLabel, children: "Shop" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandVal, children: T(order2.platform) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.bandCell, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandLabel, children: T("\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandVal, children: T(order2.doc_no) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: [s.bandCell, { borderRightWidth: 0 }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandLabel, children: T("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bandVal, children: fmtDate(order2.doc_date) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.bcRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.bcLeft, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bcLabel, children: "Order No." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bcValue, children: T(order2.order_no) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.bcRight, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Barcode, { value: order2.order_no, width: 185, height: bcH }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.bcText, children: order2.order_no })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.grid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49", value: order2.username }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A", value: order2.receiver }),
      order2.phone && String(order2.phone).trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23", value: order2.phone, full: true }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: { width: "100%", flexDirection: "row" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32", value: order2.customer_type || (order2.purchase_count ? Number(order2.purchase_count) > 1 ? "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E01\u0E48\u0E32" : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48" : null) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E0B\u0E37\u0E49\u0E2D\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48", value: order2.purchase_count ?? (order2.customer_type === "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48" ? 1 : null) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48", value: addr, full: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E41\u0E04\u0E21\u0E40\u0E1B\u0E0D", value: order2.campaign }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "\u0E09\u0E35\u0E14\u0E01\u0E25\u0E34\u0E48\u0E19\u0E01\u0E25\u0E48\u0E2D\u0E07", value: order2.box_scent }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.fieldFull, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.fLabel, children: T("\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }, children: [
          isExpress && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.noteChip, s.noteChipExpress], children: T("\u0E2A\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19") }),
          isNow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.noteChip, s.noteChipNow], children: T("\u0E2A\u0E48\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35") }),
          restNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.fVal, children: restNote }) : !isExpress && !isNow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.fVal, children: T(null) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: s.th, children: ["#", "Grade", "\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32 (EDP)", "\u0E02\u0E19\u0E32\u0E14", "\u0E08\u0E33\u0E19\u0E27\u0E19", "Free", "\u0E2B\u0E19\u0E48\u0E27\u0E22", "SKU"].map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, s.hCell, { width: COL[i], textAlign: i === 4 ? "right" : "left" }], children: T(h) }, i)) }),
      shownItems.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: [s.tr, rowStyle], wrap: false, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[0], color: C.faint }], children: i + 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[1], color: C.faint }], children: T(it.ptype) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[2], fontWeight: "bold" }], children: T(it.product) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[3] }], children: T(it.size) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[4], textAlign: "right", fontWeight: "bold" }], children: Number(it.qty) || 0 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[5], color: isFreeItem(it) ? C.brand : C.faint }], children: isFreeItem(it) ? "Free" : "-" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[6] }], children: T(it.unit) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[7], fontSize: cfs - 0.8 }], children: it.sku || "" })
      ] }, i)),
      truncated > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: [s.tr, rowStyle], wrap: false, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL.reduce((a, w) => a + w, 0), color: C.brand, fontWeight: "bold" }], children: `\u26A0 \u0E41\u0E25\u0E30\u0E2D\u0E35\u0E01 ${truncated} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u2014 \u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E43\u0E19 1 \u0E43\u0E1A (\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21\u0E19\u0E31\u0E1A\u0E04\u0E23\u0E1A \xB7 \u0E04\u0E27\u0E23\u0E41\u0E1A\u0E48\u0E07\u0E43\u0E1A)` }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.foot, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[0] + COL[1] + COL[2] + COL[3], textAlign: "right", fontWeight: "bold" }], children: T("\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[4], textAlign: "right", fontWeight: "bold" }], children: total }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [s.cell, cStyle, { width: COL[5] + COL[6] + COL[7] }], children: " " })
      ] })
    ] }),
    !full && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: s.spacer }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: [s.signRow, { marginTop: full ? 14 : signGap }], children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sign, { label: "\u0E1C\u0E39\u0E49\u0E40\u0E1A\u0E34\u0E01" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sign, { label: "\u0E1C\u0E39\u0E49\u0E15\u0E23\u0E27\u0E08" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sign, { label: "\u0E1C\u0E39\u0E49\u0E08\u0E48\u0E32\u0E22\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32" })
    ] })
  ] });
}
function OrderPageHalf({ order: order2 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, { size: "A4", orientation: "landscape", style: s.page, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.pageRow, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { order: order2, copyLabel: "\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A \xB7 ORIGINAL" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: s.divider, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: s.dividerLine }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: s.cutLabel, children: T("\u0E15\u0E31\u0E14") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: s.dividerLine })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { order: order2, copyLabel: "\u0E2A\u0E33\u0E40\u0E19\u0E32 \xB7 COPY" })
  ] }) });
}
function OrderPage({ order: order2 }) {
  return isWholesalePlatform(order2.platform) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WholesaleDocPage, { order: order2, mode: "issue" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderPageHalf, { order: order2 });
}
function WithdrawalDocument({ order: order2 }) {
  registerFontOnce();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Document, { title: `\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01 ${order2.doc_no || order2.order_no}`, author: "Lab Parfumo", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderPage, { order: order2 }) });
}
var MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var fmtDateEN = (d) => {
  if (!d) return "";
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return y && m && dd ? `${+dd} ${MON_EN[+m - 1]} ${y}` : String(d).slice(0, 10);
};
var AC = "#22303f";
var ACS = "#eef1f4";
var dn = StyleSheet.create({
  page: { fontFamily: "NotoSansThai", fontSize: 9, color: C.ink, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 38 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headRight: { width: 250, alignItems: "flex-end" },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 14 },
  partner: { fontSize: 13, fontWeight: "bold", color: C.faint, letterSpacing: 1 },
  title: { fontSize: 19, fontWeight: "bold", color: AC, textAlign: "right", letterSpacing: 0.5 },
  titleEn: { fontSize: 8.5, color: C.muted, textAlign: "right", marginTop: 1, letterSpacing: 1.5 },
  metaWrap: { width: 178, alignSelf: "flex-end", marginTop: 6 },
  metaRow: { flexDirection: "row", marginTop: 3.5, width: "100%" },
  metaL: { fontSize: 8, color: C.muted, textAlign: "right", width: 74 },
  metaV: { fontSize: 8.5, fontWeight: "bold", flex: 1, textAlign: "right", paddingLeft: 8 },
  accentBar: { height: 2.4, backgroundColor: AC, marginTop: 10, marginBottom: 13 },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  card: { flex: 1, borderWidth: 0.7, borderColor: C.border, borderRadius: 3 },
  cardHead: { backgroundColor: ACS, paddingVertical: 3.5, paddingHorizontal: 8, fontSize: 7.5, fontWeight: "bold", color: AC },
  cardBody: { paddingVertical: 6, paddingHorizontal: 8 },
  cardName: { fontSize: 9.5, fontWeight: "bold" },
  cardText: { fontSize: 7.8, color: C.muted, marginTop: 2.5, lineHeight: 1.35 },
  kv: { flexDirection: "row", marginTop: 2.5 },
  kvL: { fontSize: 7.8, color: C.muted, width: 46 },
  kvV: { fontSize: 8.2, fontWeight: "bold", flex: 1 },
  tableWrap: { borderWidth: 0.7, borderColor: C.border, borderRadius: 3, overflow: "hidden" },
  th: { flexDirection: "row", backgroundColor: "#f1f4f7", borderBottomWidth: 1.2, borderBottomColor: AC },
  thCell: { paddingVertical: 5, paddingHorizontal: 8, fontSize: 8, fontWeight: "bold", color: AC, letterSpacing: 0.3 },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderColor: C.line },
  cell: { paddingVertical: 4.5, paddingHorizontal: 8, fontSize: 8.5 },
  totalWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalBox: { flexDirection: "row", alignItems: "center", backgroundColor: ACS, borderLeftWidth: 2.4, borderLeftColor: AC, paddingVertical: 5, paddingHorizontal: 12 },
  signRow: { flexDirection: "row", gap: 10, marginTop: 30 },
  signBox: { flex: 1, borderWidth: 0.7, borderColor: C.border, borderRadius: 3, overflow: "hidden", minHeight: 104 },
  signBar: { backgroundColor: ACS, paddingVertical: 4, paddingHorizontal: 8, fontSize: 8.5, fontWeight: "bold", color: AC },
  signBody: { paddingVertical: 7, paddingHorizontal: 8 },
  signCap: { fontSize: 7, color: C.faint, marginBottom: 8 },
  signLine: { fontSize: 8, color: C.muted, marginBottom: 13 },
  footer: { position: "absolute", bottom: 22, left: 38, right: 38, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.6, borderColor: C.line, paddingTop: 5 },
  footText: { fontSize: 6.8, color: C.faint }
});
var DN_COL = [118, 302, 56, 52];
function WholesaleDocPage({ order: order2, mode }) {
  const isEvb = String(order2.platform) === "Eveandboy";
  const nkey = (x) => (x || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const evbOf = (it) => isEvb ? EVEANDBOY_BY_KEY[`${nkey(it.product)}|${mlOf(it.size)}`] : void 0;
  const items = [...order2.items ?? []].filter((it) => (it.product || "").trim());
  const total = items.reduce((s2, it) => s2 + (Number(it.qty) || 0), 0);
  const addr = isEvb ? EVEANDBOY_BRANCHES.find((b) => b.branch === order2.branch)?.address || "" : "";
  const partner = platformName(order2.platform).toUpperCase();
  const isDelivery = mode === "delivery";
  const title = isDelivery ? "\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07" : "\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32";
  const titleEn = isDelivery ? "DELIVERY NOTE" : "GOODS ISSUE FORM";
  const meta = isDelivery ? [["Delivery No. :", "\u2014"], ["Delivery Date :", fmtDateEN(order2.doc_date)], ["PO Order No. :", T(order2.order_no)]] : [["\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01 :", T(order2.doc_no)], ["\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 :", fmtDateEN(order2.doc_date)], ["PO Order No. :", T(order2.order_no)]];
  const signs = isDelivery ? [["From", "Sender: LAB PARFUMO"], ["Approved by", ""], ["Received by", `Recipient: ${partner}`]] : [["\u0E1C\u0E39\u0E49\u0E40\u0E1A\u0E34\u0E01", ""], ["\u0E1C\u0E39\u0E49\u0E08\u0E48\u0E32\u0E22\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32", ""], ["\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A", ""]];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, { size: "A4", style: dn.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.head, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.brandWrap, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { src: LAB_PARFUMO_LOGO, style: { height: 40, width: 40 * LAB_PARFUMO_AR } }),
        isEvb ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { src: EVEANDBOY_LOGO, style: { height: 40, width: 40 * EVEANDBOY_AR } }) : partner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.partner, children: partner }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.headRight, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.title, children: T(title) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.titleEn, children: titleEn }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: dn.metaWrap, children: meta.map(([l, v], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.metaRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.metaL, children: l }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.metaV, children: v || " " })
        ] }, i)) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: dn.accentBar }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.infoRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.card, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardHead, children: isDelivery ? "FROM / \u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07" : "\u0E1C\u0E39\u0E49\u0E40\u0E1A\u0E34\u0E01 / FROM" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.cardBody, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardName, children: `${T(COMPANY_NAME)}  ` }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardText, children: `${COMPANY_ADDRESS}  ` })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.card, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardHead, children: isDelivery ? "DELIVER TO / \u0E2A\u0E48\u0E07\u0E16\u0E36\u0E07" : "\u0E2A\u0E48\u0E07\u0E44\u0E1B\u0E17\u0E35\u0E48 / DELIVER TO" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.cardBody, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardName, children: partner }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.kv, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.kvL, children: "Branch" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.kvV, children: T(order2.branch) })
          ] }),
          order2.branch_code ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.kv, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.kvL, children: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E32\u0E02\u0E32" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.kvV, children: T(order2.branch_code) })
          ] }) : null,
          addr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.cardText, children: `${addr}  ` }) : null
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.tableWrap, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: dn.th, fixed: true, children: ["Product Code", "Name", "Size", "Qty"].map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [dn.thCell, { width: DN_COL[i], textAlign: i === 3 ? "right" : "left" }], children: h }, i)) }),
      items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.tr, wrap: false, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [dn.cell, { width: DN_COL[0], letterSpacing: 0.3 }], children: T(evbOf(it)?.barcode || it.barcode) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [dn.cell, { width: DN_COL[1], fontWeight: "bold" }], children: T(evbOf(it)?.item_name || it.product) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [dn.cell, { width: DN_COL[2], color: C.muted }], children: T(it.size) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: [dn.cell, { width: DN_COL[3], textAlign: "right", fontWeight: "bold" }], children: Number(it.qty) || 0 })
      ] }, it.id ?? i))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: dn.totalWrap, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.totalBox, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: { fontSize: 8.5, color: C.muted, marginRight: 22 }, children: "\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19 \xB7 Total" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: { fontSize: 12, fontWeight: "bold", color: AC }, children: total }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: { fontSize: 8, color: C.muted, marginLeft: 4 }, children: "\u0E0A\u0E34\u0E49\u0E19" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, { style: dn.signRow, children: signs.map(([bar, cap], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.signBox, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.signBar, children: bar }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.signBody, children: [
        cap ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.signCap, children: cap }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.signLine, children: "\u0E0A\u0E37\u0E48\u0E2D / Name" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.signLine, children: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 / Date" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.signLine, children: "\u0E25\u0E32\u0E22\u0E40\u0E0B\u0E47\u0E19 / Signature" })
      ] })
    ] }, i)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(View, { style: dn.footer, fixed: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.footText, children: `${T(COMPANY_NAME)} \xB7 ${titleEn}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, { style: dn.footText, render: ({ pageNumber, totalPages }) => `${T(order2.order_no)}  \xB7  \u0E2B\u0E19\u0E49\u0E32 ${pageNumber}/${totalPages}` })
    ] })
  ] });
}
function DeliveryNoteDocument({ order: order2 }) {
  registerFontOnce();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Document, { title: `\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 ${order2.order_no}`, author: "Lab Parfumo", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WholesaleDocPage, { order: order2, mode: "delivery" }) });
}

// _audit_render.tsx
var order = {
  order_no: "SP-TESTGLYPH-001",
  platform: "Shopee",
  doc_no: "SH-2609-0001",
  doc_date: "2026-09-04",
  username: "\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49",
  receiver: "\u0E2D\u0E19\u0E32\u0E27\u0E34\u0E19\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E44\u0E17\u0E22",
  phone: "0812341438",
  customer_type: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E01\u0E48\u0E32",
  purchase_count: 3,
  address: "288/31 \u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48 12",
  subdistrict: "\u0E23\u0E32\u0E0A\u0E32\u0E40\u0E17\u0E27\u0E30",
  district: "\u0E1A\u0E32\u0E07\u0E1E\u0E25\u0E35",
  province: "\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23",
  postcode: "10540",
  campaign: "\u0E41\u0E04\u0E21\u0E40\u0E1B\u0E0D\u0E17\u0E14\u0E2A\u0E2D\u0E1A",
  box_scent: "\u0E01\u0E25\u0E34\u0E48\u0E19\u0E17\u0E14\u0E2A\u0E2D\u0E1A",
  note: "\u0E2A\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19 \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E44\u0E17\u0E22",
  items: [
    { id: 1, line_no: 1, product: "Zeus", size: "50 ml", is_free: false, qty: 2, unit: "\u0E02\u0E27\u0E14", ptype: "EDP", sku: "Z50-001" },
    { id: 2, line_no: 2, product: "\u0E16\u0E38\u0E07\u0E01\u0E23\u0E30\u0E14\u0E32\u0E29\u0E44\u0E17\u0E22", size: "Size S", is_free: true, qty: 1, unit: "\u0E43\u0E1A", ptype: null, sku: "" }
  ]
};
var wholesale = {
  ...order,
  order_no: "WPO-TEST-002",
  platform: "Eveandboy",
  branch: "\u0E40\u0E0B\u0E47\u0E19\u0E17\u0E23\u0E31\u0E25\u0E40\u0E27\u0E34\u0E25\u0E14\u0E4C",
  branch_code: "EVB-001",
  stock_issued_at: "2026-09-04T00:00:00Z",
  items: [
    { id: 1, line_no: 1, product: "Zeus", size: "50 ml", is_free: false, qty: 5, unit: "\u0E02\u0E27\u0E14", ptype: "EDP", barcode: "8857128011027" }
  ]
};
async function main() {
  const b1 = await renderToBuffer(WithdrawalDocument({ order }));
  writeFileSync("_audit_withdrawal.pdf", b1);
  const b2 = await renderToBuffer(DeliveryNoteDocument({ order: wholesale }));
  writeFileSync("_audit_delivery.pdf", b2);
  console.log("done", b1.length, b2.length);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
/*! Bundled license information:

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
