type DoAsyncFunction = (done: () => void) => void;

/**
 * Call several functions in parallel, then resolve the promise once all are done
 * @param calls Functions to call in parallel, they are considered "done" once the "done" callback parameter has been called
 */
export function doAsyncParallel(calls: Array<DoAsyncFunction>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let callsLeft = calls.length;
      for (let i = 0; i < calls.length; i++) {
        let hasCalledDone = false;
        calls[i](() => {
          if (!hasCalledDone) {
            hasCalledDone = true;
            callsLeft -= 1;
            if (callsLeft <= 0) { resolve(); }
          }
          else { console.warn('You should not call the same done() functions multiple times.'); }
        });
      }
    } catch (e) { reject(e); }
  });
}
