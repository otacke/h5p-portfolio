import URLTools from '@services/urltools.js';
import { describe, expect, test } from '@jest/globals';

describe('URLTools', () => {

  describe('extractFragmentsFromURL', () => {
    test('Handling empty input', () => {
      expect(URLTools.extractFragmentsFromURL()).toEqual({});
      expect(URLTools.extractFragmentsFromURL(null)).toEqual({});
      expect(URLTools.extractFragmentsFromURL('')).toEqual({});
      expect(URLTools.extractFragmentsFromURL(undefined, null)).toEqual({});
      expect(URLTools.extractFragmentsFromURL(undefined, '')).toEqual({});
    });

    describe('Handling valid URLs', () => {
      let testCases = [
        {
          name: 'no hash, no search', hash: '', search: '',
          result: {}
        },
        {
          name: 'hash as #, search', hash: '#', search: '',
          result: {}
        },
        {
          name: 'no hash, search as ?', hash: '', search: '?',
          result: {}
        },
        {
          name: 'regularHash, search queries: 1', hash: '#someHash', search: '?foo=1',
          result: {
            foo: '1'
          }
        },
        {
          name: 'regularHash, search queries: 2', hash: '#someHash', search: '?foo=1&bar=2',
          result: {
            foo: '1',
            bar: '2'
          }
        }
      ];

      testCases.forEach((testCase) => {
        test(testCase.name, () => {
          let contextWindow = {
            location: { hash: testCase.hash, search: testCase.search }
          };
          expect(URLTools.extractFragmentsFromURL(contextWindow))
            .toEqual(testCase.result);
        });
      });
    });

    describe('Handling invalid URLs', () => {
      let testCases = [
        {
          name: 'invalid hash (InteractiveBook format) values: 1', hash: '#foo=1', search: '',
          result: {
            foo: '1'
          }
        },
        {
          name: 'invalid hash (InteractiveBook format) values: 2', hash: '#foo=1&bar=2', search: '',
          result: {
            foo: '1',
            bar: '2'
          }
        },
        {
          name:
            'invalid hash (InteractiveBook format) values: 2, extra search', hash: '#foo=1&bar=2', search: '?batz=3',
          result: {
            foo: '1',
            bar: '2',
            batz: '3'
          }
        },
        {
          name:
            'invalid hash (InteractiveBook format) values: 2, duplicate search', hash: '#foo=1&bar=2', search: '?foo=3',
          result: {
            foo: '3',
            bar: '2'
          }
        }
      ];

      testCases.forEach((testCase) => {
        test(testCase.name, () => {
          let contextWindow = {
            location: { hash: testCase.hash, search: testCase.search }
          };
          expect(URLTools.extractFragmentsFromURL(contextWindow))
            .toEqual(testCase.result);
        });
      });
    });

    describe('Handling validation', () => {
      const validate = (fragments) => {
        return fragments.foo === '1';
      };

      test('Valid fragments', () => {
        let contextWindow = {
          location: { hash: '', search: '?foo=1' }
        };
        expect(URLTools.extractFragmentsFromURL(contextWindow, validate))
          .toEqual({ foo: '1' });

        contextWindow = {
          location: { hash: '', search: '?foo=2' }
        };
        expect(URLTools.extractFragmentsFromURL(contextWindow, validate))
          .toEqual({});
      });
    });
  });

  describe('parseURLQueryString', () => {
    test('Handling empty input', () => {
      expect(URLTools.parseURLQueryString()).toEqual({});
      expect(URLTools.parseURLQueryString(null)).toEqual({});
      expect(URLTools.parseURLQueryString('')).toEqual({});
    });

    test('Handling valid queryStrings', () => {
      expect(URLTools.parseURLQueryString('?foo=1'))
        .toEqual({ foo: '1' });
      expect(URLTools.parseURLQueryString('?foo=1&bar=2'))
        .toEqual({ foo: '1', bar: '2' });
      expect(URLTools.parseURLQueryString('?foo=1&bar=2&batz=3'))
        .toEqual({ foo: '1', bar: '2', batz: '3' });
    });

    test('Handling invalid queryStrings', () => {
      expect(URLTools.parseURLQueryString('foo=1'))
        .toEqual({ foo: '1' });
      expect(URLTools.parseURLQueryString('foo=1&bar=2'))
        .toEqual({ foo: '1', bar: '2' });
      expect(URLTools.parseURLQueryString('foobar'))
        .toEqual({});
      expect(URLTools.parseURLQueryString('foo&bar'))
        .toEqual({});
      expect(URLTools.parseURLQueryString('foo=1&bar'))
        .toEqual({ foo: '1' });
      expect(URLTools.parseURLQueryString('foo&bar=2'))
        .toEqual({ bar: '2' });
      expect(URLTools.parseURLQueryString('?foo=1&bar'))
        .toEqual({ foo: '1' });
      expect(URLTools.parseURLQueryString('?foo&bar=2'))
        .toEqual({ bar: '2' });
    });
  });

  describe('stringifyURLQueries', () => {
    test('Handling empty input', () => {
      expect(URLTools.stringifyURLQueries()).toEqual('');
      expect(URLTools.stringifyURLQueries(null)).toEqual('');
      expect(URLTools.stringifyURLQueries('')).toEqual('');
    });

    test('Handling valid queryStrings', () => {
      expect(URLTools.stringifyURLQueries({ foo: '1' }))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '2' }))
        .toEqual('foo=1&bar=2');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '2', batz: '3' }))
        .toEqual('foo=1&bar=2&batz=3');
    });

    test('Handling invalid queryStrings', () => {
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: undefined }))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: null }))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '' }))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '2', batz: undefined }))
        .toEqual('foo=1&bar=2');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '2', batz: null }))
        .toEqual('foo=1&bar=2');
      expect(URLTools.stringifyURLQueries({ foo: '1', bar: '2', batz: '' }))
        .toEqual('foo=1&bar=2');
    });

    test('Handling prefix', () => {
      expect(URLTools.stringifyURLQueries({ foo: '1' }, ''))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1' }, null))
        .toEqual('foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1' }, '?'))
        .toEqual('?foo=1');
      expect(URLTools.stringifyURLQueries({ foo: '1' }, 0))
        .toEqual('0foo=1');
    });
  });

  describe('getHashSelector', () => {
    test('Handling values', () => {
      expect(URLTools.getHashSelector('')).toEqual('');
      expect(URLTools.getHashSelector('#foo')).toEqual('foo');
      expect(URLTools.getHashSelector('#foo=bar')).toEqual('');
      expect(URLTools.getHashSelector('#foo?bar=1')).toEqual('foo');
    });

    test('Handling prefix', () => {
      expect(URLTools.getHashSelector('#foo', '')).toEqual('foo');
      expect(URLTools.getHashSelector('#foo', null)).toEqual('foo');
      expect(URLTools.getHashSelector('#foo', '#')).toEqual('#foo');
      expect(URLTools.getHashSelector('#foo', 0)).toEqual('0foo');
    });
  });
});
