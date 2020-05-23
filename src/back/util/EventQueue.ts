/** Event functions accepted by EventQueue. */
type EventFunction = (() => void) | (() => Promise<any>) | Promise<any>;

export interface EventQueue {
  push(event: EventFunction, returnPromise: true): Promise<void>;
  push(event: EventFunction, returnPromise?: false): void;
}

/** Executes a queue of asynchronous functions, one at a time. */
export class EventQueue {
  /** Max size of queue (Unlimited if undefined) */
  private maxSize?: number;
  /** Queue of functions. */
  private queue: EventFunction[] = [];
  /** If this is currently executing an event (flag). */
  private isExecuting: boolean = false;
  /** Called whenever an error occurs. */
  public onError: (error: any) => void = noop;

  constructor(maxSize?: number) {
    this.maxSize = maxSize;
  }

  /**
   * Add en event to the end of the queue.
   * @param event Event function to add.
   * @param returnPromise If a promise should be returned.
   * @returns Nothing or a promise that resolves after the event is executed,
   *          or rejects if it rejects or throws an error.
   */
  push(event: EventFunction, returnPromise?: boolean): Promise<void> | void {
    // Wrap the event, and create a promise, if a promise should be returned
    const [wrappedEvent, promise] = returnPromise ? wrapEvent(event) : [undefined, undefined];
    // Push end off early if max size is reached
    if (this.queue.length === this.maxSize) {
      this.queue.shift();
    }
    // Add event to the end of the queue
    this.queue.push(wrappedEvent || event);
    this.update();
    // Return promise (if any)
    return promise;
  }

  private update() {
    if (!this.isExecuting && this.queue.length > 0) {
      // Update flag
      this.isExecuting = true;
      // Start executing
      this.executeNext()
      .finally(() => { this.isExecuting = false; });
    }
  }

  /**
   * Execute the next event in the queue (and continue doing so until the queue is empty).
   * @returns A promise that resolves when it reaches the end of the queue.
   */
  private async executeNext(): Promise<void> {
    const event = this.queue.shift();
    if (event) {
      try { await executeEventFunction(event); }
      catch (error) { this.onError(error); }
      await this.executeNext();
    }
  }
}

/**
 * Execute an event function.
 * @param event Event function to execute.
 * @returns A promise the resolves when the event function is done executing,
 *          or rejects if it throws an error.
 */
async function executeEventFunction(event: EventFunction): Promise<void> {
  if (typeof event === 'function') { await event(); }
  else                             { await Promise.resolve(event); }
}

/**
 * Wrap an event function in another event that resolves a promise when done.
 * @param event Event function to wrap.
 * @returns The wrapped event function and a promise that resolves when the event is done executing,
 *          or rejects if it rejects or throws an error.
 *          [ wrapped event, promise ]
 */
function wrapEvent(event: EventFunction): [ () => Promise<void>, Promise<void> ] {
  // Exposed promise callbacks
  let resolvePromise: ()           => void;
  let rejectPromise:  (error: any) => void;
  // Wrap the event in another event
  const wrappedEvent = async () => {
    try {
      await executeEventFunction(event);
      resolvePromise();
    } catch (error) {
      rejectPromise(error);
    }
  };
  // Create the promise to return (and expose its callbacks)
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise  = reject;
  });
  // Return wrapped event and promise
  return [wrappedEvent, promise];
}

function noop() {}
