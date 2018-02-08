import sinon from 'sinon';
import { wrapPromiseCallback } from '../utils';

describe('utils', () => {
  describe('wrapPromiseCallback', () => {
    it('should resolve to the value', done => {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'));
      promise.then(value => {
        expect(value).toEqual('woohoo');
        done();
      });
    });

    it('should reject with the error', done => {
      const error = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(error));
      promise.catch(error => {
        expect(error).toEqual(error);
        done();
      });
    });

    it('should call the callback with a value if the promise resolves', done => {
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'), callback);

      promise.then(result => {
        expect(result).toEqual('woohoo');
        // callback run on next tick to maintain asynchronous expections
        setTimeout(() => {
          expect(callback.calledWith(null, 'woohoo')).toEqual(true);
          done();
        }, 0);
      });
    });

    it('should call the callback with an error if the promise rejects', done => {
      const error = new Error('something went wrong');
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.reject(error), callback);

      promise.catch(v => {
        expect(v).toEqual(error);
        // callback run on next tick to maintain asynchronous expections
        setTimeout(() => {
          expect(callback.calledWith(error, null)).toEqual(true);
          done();
        }, 0);
      });
    });
  });
});
