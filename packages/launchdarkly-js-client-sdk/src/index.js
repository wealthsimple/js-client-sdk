import * as common from 'launchdarkly-js-sdk-common';
import rnPlatform from './browserPlatform';

const extraDefaults = {
  fetchGoals: false,
};

// Pass our platform object to the common code to create the browser version of the client
export function initialize(env, user, options = {}) {
  const platform = rnPlatform();
  const clientVars = common.initialize(env, user, options, platform, extraDefaults);

  const client = clientVars.client;

  client.waitUntilGoalsReady = () => Promise.resolve();

  clientVars.start();

  // the browser client would call client.close() on page 'beforeunload' but
  // we'll need to hoist that behaviour into the parent apps

  return client;
}

export const createConsoleLogger = common.createConsoleLogger;

export const version = common.version;
