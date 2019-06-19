import newHttpRequest from './httpRequest';

export default function makeBrowserPlatform() {
  const ret = {};

  ret.pageIsClosing = false; // this will be set to true by index.js if the page is closing

  // XMLHttpRequest may not exist if we're running in a server-side rendering context
  if (window.XMLHttpRequest) {
    ret.httpRequest = (method, url, headers, body) => newHttpRequest(method, url, headers, body, ret.pageIsClosing);
  }

  let hasCors;
  ret.httpAllowsPost = () => {
    // We compute this lazily because calling XMLHttpRequest() at initialization time can disrupt tests
    if (hasCors === undefined) {
      hasCors = window.XMLHttpRequest ? 'withCredentials' in new window.XMLHttpRequest() : false;
    }
    return hasCors;
  };

  ret.getCurrentUrl = () => window.location.href;

  ret.isDoNotTrack = () => {
    let flag;
    if (window.navigator && window.navigator.doNotTrack !== undefined) {
      flag = window.navigator.doNotTrack; // FF, Chrome
    } else if (window.navigator && window.navigator.msDoNotTrack !== undefined) {
      flag = window.navigator.msDoNotTrack; // IE 9/10
    } else {
      flag = window.doNotTrack; // IE 11+, Safari
    }
    return flag === 1 || flag === true || flag === '1' || flag === 'yes';
  };

  try {
    if (window.localStorage) {
      ret.localStorage = {
        get: key =>
          new Promise(resolve => {
            resolve(window.localStorage.getItem(key));
          }),
        set: (key, value) =>
          new Promise(resolve => {
            window.localStorage.setItem(key, value);
            resolve();
          }),
        clear: key =>
          new Promise(resolve => {
            window.localStorage.removeItem(key);
            resolve();
          }),
      };
    }
  } catch (e) {
    // In some browsers (such as Chrome), even looking at window.localStorage at all will cause a
    // security error if the feature is disabled.
    ret.localStorage = null;
  }

  // The browser built in EventSource implementations do not support
  // setting the method used for the request. When useReport is true,
  // we ensure sending the user in the body of a REPORT request rather
  // than in the URL path. If a polyfill for EventSource supporting
  // setting the request method is provided, we use it to connect to a
  // flag stream that will provide evaluated flags for the specific
  // user. Otherwise, when useReport is true, we fallback to a generic
  // 'ping' stream that informs the SDK to make a separate REPORT
  // request for the user's flag evaluations whenever the flag
  // definitions have been updated.
  let eventSourceAllowsReport;
  if (typeof window.EventSourcePolyfill === 'function' && window.EventSourcePolyfill.supportsSettingMethod === true) {
    eventSourceAllowsReport = true;
  } else {
    eventSourceAllowsReport = false;
  }

  ret.eventSourceAllowsReport = eventSourceAllowsReport;

  // If EventSource does not exist, the absence of eventSourceFactory will make us not try to open streams
  if (window.EventSource) {
    const timeoutMillis = 300000; // this is only used by polyfills - see below

    ret.eventSourceFactory = (url, options) => {
      // The standard EventSource constructor doesn't take any options, just a URL. However, some
      // EventSource polyfills allow us to specify a timeout interval, and in some cases they will
      // default to a too-short timeout if we don't specify one. So, here, we are setting the
      // timeout properties that are used by several popular polyfills.
      const esOptions = {
        heartbeatTimeout: timeoutMillis, // used by "event-source-polyfill" package
        silentTimeout: timeoutMillis, // used by "eventsource-polyfill" package
      };

      // Copy any arguments given to the factory to the EventSource
      // options argument
      if (typeof options === 'object') {
        for (const field in options) {
          const value = options[field];
          if (value) {
            esOptions[field] = value;
          }
        }
      }

      // Here we check if we have a polyfill that supports report and
      // the SDK implementation is attempting to use the REPORT
      // method. If so, we return an instance of the Polyfill,
      // otherwise we use the default browser implementation.
      if (eventSourceAllowsReport && esOptions.method === 'REPORT') {
        return new window.EventSourcePolyfill(url, esOptions);
      } else {
        return new window.EventSource(url, esOptions);
      }
    };

    ret.eventSourceIsActive = es =>
      es.readyState === window.EventSource.OPEN || es.readyState === window.EventSource.CONNECTING;
  }

  ret.userAgent = 'JSClient';

  return ret;
}
