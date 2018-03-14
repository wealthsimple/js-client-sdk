import sinon from 'sinon';
import semverCompare from 'semver-compare';

import * as LDClient from '../index';
import * as messages from '../messages';
import { btoa } from '../utils';

describe('LDClient', () => {
  let xhr;
  let requests = [];
  let consoleErrorSpy;
  let consoleWarnSpy;

  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user"}');

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = req => {
      requests.push(req);
    };

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.clear();
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    localStorage.clear();
  });

  describe('initialization', () => {
    it('should trigger the ready event', done => {
      const user = { key: 'user' };
      const handleReady = jest.fn();
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });

    describe('waitUntilReady', () => {
      it('should resolve waitUntilReady promise when ready', done => {
        const user = { key: 'user' };
        const handleReady = jest.fn();
        const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
          bootstrap: {},
        });

        client.waitUntilReady().then(handleReady);

        client.on('ready', () => {
          setTimeout(() => {
            expect(handleReady).toHaveBeenCalled();
            done();
          }, 0);
        });
      });

      it('should resolve waitUntilReady promise after ready event was already emitted', done => {
        const user = { key: 'user' };
        const handleInitialReady = jest.fn();
        const handleReady = jest.fn();
        const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
          bootstrap: {},
        });

        client.on('ready', handleInitialReady);

        setTimeout(() => {
          client.waitUntilReady().then(handleReady);

          setTimeout(() => {
            expect(handleInitialReady).toHaveBeenCalled();
            expect(handleReady).toHaveBeenCalled();
            done();
          }, 0);
        }, 0);
      });
    });

    it('should emit an error when an invalid samplingInterval is specified', done => {
      const user = { key: 'user' };
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
        samplingInterval: 'totally not a number',
      });

      client.on('error', err => {
        expect(err.message).toEqual('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
        done();
      });
    });

    it('should emit an error when initialize is called without an environment key', done => {
      const user = { key: 'user' };
      const client = LDClient.initialize('', user, {
        bootstrap: {},
      });
      client.on('error', err => {
        expect(err.message).toEqual(messages.environmentNotSpecified());
        done();
      });
    });

    it('should emit an error when an invalid environment key is specified', () => {
      const user = { key: 'user' };

      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(404);
      });
      const client = LDClient.initialize('abc', user);
      server.respond();
      client.on('error', err => {
        expect(err.message).toEqual(messages.environmentNotFound());
        done();
      });
    });

    it('should not fetch flag settings since bootstrap is provided', () => {
      const user = { key: 'user' };

      LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
      });

      const settingsRequest = requests[0];
      expect(/sdk\/eval/.test(settingsRequest.url)).toEqual(false);
    });

    it('should contain package version', () => {
      const version = LDClient.version;
      // All client bundles above 1.0.7 should contain package version
      // https://github.com/substack/semver-compare
      const result = semverCompare(version, '1.0.6');
      expect(result).toEqual(1);
    });

    it('should clear cached settings if they are invalid JSON', done => {
      const user = { key: 'user' };

      localStorage.setItem(lsKey, 'foo{bar}');

      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        expect(localStorage.getItem(lsKey)).toBeNull();
        done();
      });
    });

    it('should not clear cached settings if they are valid JSON', done => {
      const json = '{"enable-thing": true}';
      const user = { key: 'user' };

      localStorage.setItem(lsKey, json);

      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        expect(localStorage.getItem(lsKey)).toEqual(json);
        done();
      });
    });

    it('should not update cached settings if there was an error fetching flags', done => {
      const user = { key: 'user' };
      const json = '{"enable-foo": true}';

      localStorage.setItem(lsKey, json);

      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(503);
      });

      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        server.respond();
        setTimeout(() => {
          expect(localStorage.getItem(lsKey)).toEqual(json);
          done();
        }, 0);
      });
    });

    it('should use hash as localStorage key when secure mode is enabled', done => {
      const user = { key: 'user' };
      const lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
      });

      client.on('ready', () => {
        expect(localStorage.getItem(lsKeyHash)).toEqual('{"enable-foo":true}');
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": true}');
    });

    it('should clear localStorage when user context is changed', done => {
      const json = '{"enable-foo":true}';
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user2"}');

      const user = { key: 'user' };
      const user2 = { key: 'user2' };
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        client.identify(user2, null, () => {
          expect(localStorage.getItem(lsKey)).toBeNull();
          expect(localStorage.getItem(lsKey2)).toEqual(json);
          done();
        });
      });

      // This is a little hacky, but there will be three requests: fetch flags, fetch goals, re-fetch flags
      requests[0].respond(200, { 'Content-Type': 'application/json' }, json);
      requests[1].respond(200, { 'Content-Type': 'application/json' }, json);
      requests[2].respond(200, { 'Content-Type': 'application/json' }, json);
    });

    it('should not warn when tracking a known custom goal event', done => {
      const user = { key: 'user' };
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // so the client doesn't request settings
      });

      client.on('ready', () => {
        client.track('known');
        expect(consoleWarnSpy).not.toHaveBeenCalledWith('Custom event key does not exist');
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should emit an error when tracking a non-string custom goal event', done => {
      const user = { key: 'user' };
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // so the client doesn't request settings
      });

      client.on('ready', () => {
        const badCustomEventKeys = [123, [], {}, null, undefined];
        badCustomEventKeys.forEach(key => {
          client.track(key);
          expect(consoleErrorSpy).toHaveBeenCalledWith(messages.unknownCustomEventKey(key));
        });
        done();
      });
    });

    it('should warn when tracking an unknown custom goal event', done => {
      const user = { key: 'user' };
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // so the client doesn't request settings
      });

      client.on('ready', () => {
        client.track('unknown');
        expect(consoleWarnSpy).toHaveBeenCalledWith(messages.unknownCustomEventKey('unknown'));
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should emit an error event if there was an error fetching flags', done => {
      const user = { key: 'user' };

      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(503);
      });

      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user);

      const handleError = jest.fn();
      client.on('error', handleError);
      server.respond();

      setTimeout(() => {
        expect(handleError).toHaveBeenCalled();
        done();
      }, 0);
    });
  });
});
