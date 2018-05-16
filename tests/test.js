/**
 * Test runner for JSON-LD Patch library.
 *
 * @author Christopher Lemmer Webber <cwebber@digitalbazaar.com>
 *
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

const assert = require('assert');
const jldp = require('..');

describe('basic applyPatch tests', function() {
  const exampleFrame = {
    '@context': {'@vocab': 'http://example.org/'},
    '@type': 'Library',
    'contains': {
      '@type': 'Book',
      'contains': {
        '@type': 'Chapter'
      }
    }
  };

  const flatObject = {
    '@context': {
      '@vocab': 'http://example.org/',
      'contains': {'@type': '@id'}
    },
    '@graph': [{
      '@id': 'http://example.org/library',
      '@type': 'Library',
      'contains': 'http://example.org/library/the-republic'
    }, {
      '@id': 'http://example.org/library/the-republic',
      '@type': 'Book',
      'creator': 'Plato',
      'title': 'The Republic',
      'contains': 'http://example.org/library/the-republic#introduction'
    }, {
      '@id': 'http://example.org/library/the-republic#introduction',
      '@type': 'Chapter',
      'description': 'An introductory chapter on The Republic.',
      'title': 'The Introduction'
    }]
  };

  const framedObject = {
    '@context': {
      '@vocab': 'http://example.org/'
    },
    '@id': 'http://example.org/library',
    '@type': 'Library',
    'contains': {
      '@id': 'http://example.org/library/the-republic',
      '@type': 'Book',
      'contains': {
        '@id': 'http://example.org/library/the-republic#introduction',
        '@type': 'Chapter',
        'description': 'An introductory chapter on The Republic.',
        'title': 'The Introduction'
      },
      'creator': 'Plato',
      'title': 'The Republic'
    }
  };

  const examplePatch = [
    {op: 'add', path: '/email', value: 'library@example.com'},
    {op: 'replace', path: '/contains/title', 'value': 'The Trial and Death of Socrates'},
    {op: 'remove', path: '/contains/contains/description'}
  ];

  const expectedPatchedDocument = {
    '@context': {
      '@vocab': 'http://example.org/'
    },
    '@id': 'http://example.org/library',
    '@type': 'Library',
    'email': 'library@example.com',
    'contains': {
      '@id': 'http://example.org/library/the-republic',
      '@type': 'Book',
      'contains': {
        '@id': 'http://example.org/library/the-republic#introduction',
        '@type': 'Chapter',
        'title': 'The Introduction'
      },
      'creator': 'Plato',
      'title': 'The Trial and Death of Socrates'
    }
  };

  it('should properly patch with just the patch, no frame', function () {
    jldp.applyPatch(
      {document: framedObject,
       patch: examplePatch},
      function(error, patchedDoc) {
        assert.equal(
          patchedDoc, expectedPatchedDocument);});
  });

  it('should properly patch with just the patch and frame', function () {
    jldp.applyPatch(
      {document: flatObject,
       patch: examplePatch,
       frame: exampleFrame},
      function(error, patchedDoc) {
        assert.equal(
          patchedDoc, expectedPatchedDocument);});
  });

  it('should have a consistent order with sets', function() {
    const docWithSet = {
      '@context': {
        '@vocab': 'http://example.org/',
        'someSet': {
          '@container': '@set',
          '@id': 'http://example.org/someSet'}},
      'someSet': [
        {'id': 'https://example.org/obj/fromp',
         'content': 'frizzle'},
        'frip',
        'zylophone',
        {'type': 'Foo',
         'content': 'bar'},
        {'type': 'Bar',
         'content': 'foo'},
        {'id': 'https://example.org/obj/blat',
         'content': 'kaboom',
         'anotherSet': [
           'alice', 'carol', 'bob']},
        'beepity',
        'boopity']};
    const frame = {
      '@context': {
        '@vocab': 'http://example.org/',
        'someSet': {
          '@container': '@set',
          '@id': 'http://example.org/someSet'}},
      'someSet': {}};
    const expected = {
      "@context": {
        "@vocab": "http://example.org/",
        "someSet": {
          "@container": "@set",
          "@id": "http://example.org/someSet"
        }
      },
      "someSet": [
        "beepity",
        "boopity",
        "frip",
        "zylophone",
        {
          "id": "https://example.org/obj/blat",
          "content": "kaboom",
          "anotherSet": [
            "alice",
            "bob",
            "carol"
          ]
        },
        {
          "type": "Foo",
          "content": "bar"
        },
        {
          "id": "https://example.org/obj/fromp",
          "content": "frizzle"
        },
        {
          "type": "Bar",
          "content": "foo"
        }
      ]
    };

    jldp.applyPatch(
      {document: docWithSet, frame: frame, patch: []},
      (error, doc) => {
        assert.equal(doc, expected);});
  });
});
