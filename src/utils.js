import Base64 from 'Base64';

// See http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
export function btoa(s) {
  return Base64.btoa(unescape(encodeURIComponent(s)));
}

export function base64URLEncode(s) {
  return (
    btoa(s)
      // eslint-disable-next-line
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function modifications(oldObj, newObj) {
  const mods = {};
  if (!oldObj || !newObj) {
    return {};
  }
  for (const prop in oldObj) {
    if ({}.hasOwnProperty.call(oldObj, prop)) {
      if (newObj[prop] !== oldObj[prop]) {
        mods[prop] = { previous: oldObj[prop], current: newObj[prop] };
      }
    }
  }

  return mods;
}

// Events emmited in LDClient's initialize method will happen before the consumer
// can register a listener, so defer them to next tick.
export function onNextTick(cb) {
  setTimeout(cb, 0);
}

/**
 * Wrap a promise to invoke an optional callback upon resolution or rejection.
 *
 * This function assumes the callback follows the Node.js callback type: (err, value) => void
 *
 * If a callback is provided:
 *   - if the promise is resolved, invoke the callback with (null, value)
 *   - if the promise is rejected, invoke the callback with (error, null)
 *
 * @param {Promise<any>} promise
 * @param {Function} callback
 * @returns Promise<any>
 */
export function wrapPromiseCallback(promise, callback) {
  return promise.then(
    value => {
      if (callback) {
        setTimeout(() => {
          callback(null, value);
        }, 0);
      }
      return value;
    },
    error => {
      if (callback) {
        setTimeout(() => {
          callback(error, null);
        }, 0);
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Returns an array of event groups each of which can be safely URL-encoded
 * without hitting the safe maximum URL length of certain browsers.
 * 
 * @param {number} maxLength maximum URL length targeted
 * @param {Array[Object}]} events queue of events to divide
 * @returns Array[Array[Object]]
 */
export function chunkUserEventsForUrl(maxLength, events) {
  var allEvents = events.slice(0);
  var remainingSpace = maxLength;
  var allChunks = [];
  var chunk;

  while (allEvents.length > 0) {
    chunk = [];

    while (remainingSpace > 0) {
      var event = allEvents.pop();
      if (!event) { break; }
      remainingSpace = remainingSpace - base64URLEncode(JSON.stringify(event)).length;
      // If we are over the max size, put this one back on the queue
      // to try in the next round, unless this event alone is larger 
      // than the limit, in which case, screw it, and try it anyway.
      if (remainingSpace < 0 && chunk.length > 0) {
        allEvents.push(event);
      } else {
        chunk.push(event);
      }
    }

    remainingSpace = maxLength;
    allChunks.push(chunk);
  }

  return allChunks;
}
