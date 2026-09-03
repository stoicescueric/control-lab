import {buildEventMap} from '@site/src/lib/domain/launchSelection';

// A worker owns the expensive integration. Subsequent target changes only
// threshold the cached tile and query prefix sums on the presentation side.
self.onmessage = () => {
  try {
    const events = buildEventMap();
    self.postMessage({events});
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : 'Could not build event map'});
  }
};
