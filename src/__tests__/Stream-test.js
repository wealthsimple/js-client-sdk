import Stream from '../Stream';

const noop = function() {};

describe('Stream', () => {
  it('should not throw on EventSource when it does not exist', () => {
    window.EventSource = undefined;
    const stream = new Stream('https://example.com', 'test');

    const connect = function() {
      stream.connect(noop);
    };

    expect(connect).not.toThrow(TypeError);
  });
  it('should not throw when calling disconnect without first calling connect', () => {
    const stream = new Stream('https://example.com', 'test');

    const disconnect = function() {
      stream.disconnect(noop);
    };

    expect(disconnect).not.toThrow(TypeError);
  });
});
