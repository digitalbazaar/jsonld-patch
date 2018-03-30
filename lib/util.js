/*
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const api = {};
module.exports = api;

// capture the global reference to guard against fakeTimer mocks
const _setImmediate = typeof setImmediate === 'function' && setImmediate;

const _delay = _setImmediate ?
  // not a direct alias (for IE10 compatibility)
  fn => _setImmediate(fn) :
  fn => setTimeout(fn, 0);

if(typeof process === 'object' && typeof process.nextTick === 'function') {
  api.nextTick = process.nextTick;
} else {
  api.nextTick = _delay;
}
api.setImmediate = _setImmediate ? _delay : api.nextTick;

/**
 * Clones a value. If the value is an array or an object it will be deep cloned.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
api.deepClone = value => {
  if(value && typeof value === 'object') {
    let rval;
    if(Array.isArray(value)) {
      rval = new Array(value.length);
      for(let i = 0; i < rval.length; ++i) {
        rval[i] = api.deepClone(value[i]);
      }
    } else {
      rval = {};
      for(let j in value) {
        rval[j] = api.deepClone(value[j]);
      }
    }
    return rval;
  }
  return value;
};

api.callbackify = fn => {
  return async function(...args) {
    const callback = args[args.length - 1];
    if(typeof callback === 'function') {
      args.pop();
    }

    let result;
    try {
      result = await fn.apply(null, args);
    } catch(e) {
      if(typeof callback === 'function') {
        return _invokeCallback(callback, e);
      }
      throw e;
    }

    if(typeof callback === 'function') {
      return _invokeCallback(callback, null, result);
    }

    return result;
  };
};

api.normalizeAsyncFn = (fn, promiseFnLength) => {
  // ensure promise-based function can be called with a callback
  if(fn.length <= promiseFnLength) {
    return api.callbackify(fn);
  }

  // ensure callback-based function will return a Promise
  return async function(...args) {
    const callback = arguments[promiseFnLength];
    if(typeof callback === 'function') {
      args.pop();
    }
    return new Promise((resolve, reject) => {
      args.push((err, result) => {
        if(typeof callback === 'function') {
          return _invokeCallback(callback, err, result);
        } else if(err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
      try {
        fn.apply(null, args);
      } catch(e) {
        if(typeof callback === 'function') {
          return _invokeCallback(callback, e);
        }
        reject(e);
      }
    });
  };
};

function _invokeCallback(callback, err, result) {
  // execute on next tick to prevent "unhandled rejected promise"
  // and simulate what would have happened in a promiseless API
  api.nextTick(() => callback(err, result));
}
