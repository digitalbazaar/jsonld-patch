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
const deepEqual = require('deep-equal');
const _ = require('lodash');

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

describe('applyPatch', function() {
  it('should properly patch with just the patch, no frame', function (done) {
    jldp.applyPatch(
      {document: framedObject,
       patch: examplePatch}).then(
         function(patchedDoc) {
           assert.deepEqual(
             patchedDoc, expectedPatchedDocument);
           done();
         }).catch(function(error) {done(error);});
  });

  it('should properly patch with just the patch and frame', function (done) {
    jldp.applyPatch(
      {document: flatObject,
       patch: examplePatch,
       frame: exampleFrame}).then(
      function(patchedDoc) {
        assert.deepEqual(
          patchedDoc, expectedPatchedDocument);
        done();
      }).catch(function(error) {done(error);});
  });

  it('should have a consistent order with sets', function(done) {
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
    const patch = [
      {op: 'add', path: '/someSet/6/email', value: 'greatjob@example.org'}]
    // We expect this to have the right ordering based off of the canonized
    // form of the document, which is:
    //   _:c14n0 <http://example.org/anotherSet> "alice" .
    //   _:c14n0 <http://example.org/anotherSet> "bob" .
    //   _:c14n0 <http://example.org/anotherSet> "carol" .
    //   _:c14n0 <http://example.org/content> "kaboom" .
    //   _:c14n0 <http://example.org/id> "https://example.org/obj/blat" .
    //   _:c14n1 <http://example.org/content> "bar" .
    //   _:c14n1 <http://example.org/type> "Foo" .
    //   _:c14n2 <http://example.org/content> "frizzle" .
    //   _:c14n2 <http://example.org/id> "https://example.org/obj/fromp" .
    //   _:c14n3 <http://example.org/someSet> "beepity" .
    //   _:c14n3 <http://example.org/someSet> "boopity" .
    //   _:c14n3 <http://example.org/someSet> "frip" .
    //   _:c14n3 <http://example.org/someSet> "zylophone" .
    //   _:c14n3 <http://example.org/someSet> _:c14n0 .
    //   _:c14n3 <http://example.org/someSet> _:c14n1 .
    //   _:c14n3 <http://example.org/someSet> _:c14n2 .
    //   _:c14n3 <http://example.org/someSet> _:c14n4 .
    //   _:c14n4 <http://example.org/content> "foo" .
    //   _:c14n4 <http://example.org/type> "Bar" .
    const expected = {
      "someSet": [
        "beepity",
        "boopity",
        "frip",
        "zylophone",
        {
          "anotherSet": [
            "alice",
            "bob",
            "carol"
          ],
          "content": "kaboom",
          "id": "https://example.org/obj/blat"
        },
        {
          "content": "bar",
          "type": "Foo"
        },
        {
          "content": "frizzle",
          "id": "https://example.org/obj/fromp",
          "email": "greatjob@example.org"
        },
        {
          "content": "foo",
          "type": "Bar"
        }
      ],
      "@context": {
        "@vocab": "http://example.org/",
        "someSet": {
          "@container": "@set",
          "@id": "http://example.org/someSet"
        }
      }
    };

    jldp.applyPatch(
      {document: docWithSet, frame, patch}).then(
        function(result) {
          assert.deepEqual(result, expected);
          done();
        }).catch(function(error) {done(error);});
  });
});

// FIXME: We shouldn't be relying on a particular patch order.
const expectedPatch = [
  {op: 'replace',
   path: '/contains/title',
   value: 'The Trial and Death of Socrates' },
  {op: 'remove', path: '/contains/contains/description' },
  {op: 'add', path: '/email', value: 'library@example.com' }]

describe('diff', function() {
  it('generates a diff correctly', function(done) {
    jldp.diff(
      flatObject, expectedPatchedDocument,
      {frame: exampleFrame}).then(
        (diff) => {
          assert.deepEqual(diff, expectedPatch);
          done();
        }).catch(done);
  });
});

