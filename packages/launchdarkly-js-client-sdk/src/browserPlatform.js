import newHttpRequest from './httpRequest';

export default function makeRnPlatform() {
  const ret = {};

  ret.pageIsClosing = false; // not relative for RN, but it's referenced in a number of places

  // XMLHttpRequest may not exist if we're running in a server-side rendering context
  if (global.XMLHttpRequest) {
    ret.httpRequest = (method, url, headers, body) => newHttpRequest(method, url, headers, body, ret.pageIsClosing);
  }

  let hasCors;
  ret.httpAllowsPost = () => {
    // We compute this lazily because calling XMLHttpRequest() at initialization time can disrupt tests
    if (hasCors === undefined) {
      hasCors = global.XMLHttpRequest ? 'withCredentials' in new global.XMLHttpRequest() : false;
    }
    return hasCors;
  };

  ret.getCurrentUrl = () => 'wealthsimple://';

  ret.isDoNotTrack = () => {
    return false;
  };

  try {
    if (global.localStorage) {
      ret.localStorage = {
        get: key =>
          new Promise(resolve => {
            resolve(global.localStorage.getItem(key));
          }),
        set: (key, value) =>
          new Promise(resolve => {
            global.localStorage.setItem(key, value);
            resolve();
          }),
        clear: key =>
          new Promise(resolve => {
            global.localStorage.removeItem(key);
            resolve();
          }),
      };
    }
  } catch (e) {
    // In some browsers (such as Chrome), even looking at global.localStorage at all will cause a
    // security error if the feature is disabled.
    ret.localStorage = null;
  }

  ret.userAgent = 'JSClient';

  return ret;
}
