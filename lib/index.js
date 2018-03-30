/*
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
(function(global) {

'use strict';

const Injector = require('./Injector');
const util = require('./util');

// determine if using node.js or browser
const _nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
const _browser = !_nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');

const constants = {
  JSON_LD_PATCH_V1_CONTEXT: 'https://w3id.org/json-ld-patch/v1'
};

/**
 * Attaches the API to the given object.
 *
 * @param api the object to attach the API to.
 */
function wrap(api) {

const injector = new Injector();

/* Core API */
api.constants = constants;
api.contexts = {
  [constants.JSON_LD_PATCH_V1_CONTEXT]: require('./contexts/json-ld-patch-v1')
};

/**
 * Apply a patch.
 */
api.applyPatch = ({document, patch, frame}) => {
  throw new Error('Not implemented');
};

// expose injector API
api.use = injector.use.bind(injector);

} // end wrap

// used to generate a new API instance
const factory = function() {
  return wrap(function() {return factory();});
};
wrap(factory);

if(_nodejs) {
  // export nodejs API
  module.exports = factory;
} else if(typeof define === 'function' && define.amd) {
  // export AMD API
  define([], function() {
    return factory;
  });
} else if(_browser) {
  // export simple browser API
  if(typeof global.didv1 === 'undefined') {
    global.didv1 = {};
  }
  wrap(global.didv1);
}

})(typeof window !== 'undefined' ? window : this);
