type QueueOneWrapper<T extends (...args: any[]) => Promise<void>> = (...args: Parameters<T>) => void

/**
 * Ensures that the wrapped function can not be called until its returned promise is pending.
 * If the wrapper is called before that and there is no call queued,
 * the call will be queued and executed when the promise resolves or rejects.
 * If there is a call queued then it will replace the currently queued call (hence "queueOne").
 * @param fn Function to wrap.
 * @returns Wrapper function.
 */
export function queueOne<T extends (...args: any[]) => Promise<void>>(fn: T): QueueOneWrapper<T> {
  /** If it is waiting for the wrapped function to resolve / reject. */
  let isBusy = false;
  /** The most recent arguments this was called with while busy. */
  let queued: Parameters<T> | undefined;

  const callback: QueueOneWrapper<T> = (...args) => {
    if (isBusy) {
      queued = args;
    } else {
      isBusy = true;

      fn(...args)
      .catch(error => {
        console.error('queueOne - Error thrown in wrapped function!', error);
      })
      .finally(() => {
        isBusy = false;

        if (queued) {
          const next = queued;
          queued = undefined;
          callback(...next);
        }
      });
    }
  };

  return callback;
}
