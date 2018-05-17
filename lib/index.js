/*
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
(function(global) {

'use strict';

const Injector = require('./Injector');
const util = require('./util');
const _ = require('lodash');

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
 * Apply a patch, possibly framing beforehand.
 *
 * If a frame is supplied, the document is canonized before framing.
 * This ensures that the patch will always patch the document in the
 * right order, for example.
 *
 * This function accepts only keyword arguments unpacked from its first
 * argument.
 *
 * @keyword [document] the document to patch (required)
 * @keyword [patch] the patch to apply (required)
 * @keyword [frame] framing to perform before this patch is applied
 * @keyword [context] a json-ld context which should be "implied"
 *   during canonization, framing, etc.
 * @keyword [options] additional options supplied to json-ld operations
 * @keyword [canonizationFormat]
 *   (such as canonization and framing) performed during this procedure,
 *   if being framed
 */
api.applyPatch = async ({document, patch, frame, options, context={},
                         canonizationFormat='application/n-quads'}) => {
  options = _.assign(
    options,
    {expandContext: context,
     format: canonizationFormat});

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
      document, options);
    // FIXME: Pull in JSON_LD_PATCH_v1_CONTEXT to options here
    let framed = await jsonld.frame(
      await jsonld.fromRDF(canonized, options),
      frame, options);
    if (framed['@graph'].length === 1) {
      docToPatch = framed['@graph'][0];
      docToPatch['@context'] = framed['@context'];
    } else {
      docToPatch = framed;
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
