/*
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
(function(global) {

'use strict';

const Injector = require('./Injector');
const util = require('./util');
const lodash = require('./lodash');

// determine if using node.js or browser
const _nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
const _browser = !_nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');

const constants = {
  JSON_LD_PATCH_V1_CONTEXT: 'https://w3id.org/json-ld-patch/v1'
};

const jsonpatch = require('fast-json-patch');
const jsonld = require('jsonld');

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
api.applyPatch = async ({document, patch, frame, context,
                         options={}}) => {
  if (!document) {
    throw new TypeError('`document` is a required argument');
  } else if (!patch) {
    throw new TypeError('`patch` is a required argument');
  }

  let docToPatch;
  if (frame) {
    // Why do we canonize and restore from RDF before framing?
    // The reason is that we need to be able to preserve the ordering
    // of sets, which are normally unordered.
    // However if we're doing a patch need to preserve order because
    // of how json paths are traversed numerically.  Consider what happens
    // if we have a patch to edit /widgets/2/foo but the item in the "set"
    // under widgets shifts around... we'd patch the wrong object!
    let canonized = await jsonld.canonize(
      document, {format: 'application/n-quads'});
    // FIXME: Pull in JSON_LD_PATCH_v1_CONTEXT to options here
    let framed = await jsonld.frame(
      await jsonld.fromRDF(canonized, {format: 'application/n-quads'}),
      frame, options);
    if (framed['@graph'].length === 1) {
      docToPatch = framed['@graph'][0];
      docToPatch['@context'] = framed['@context'];
    } else {
      doctoPatch = framed;
    }
  } else {
    docToPatch = document;
  }

  return jsonpatch.applyPatch(docToPatch, patch).newDocument;
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
