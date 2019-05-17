
type EventFunction = (() => void) | Promise<any>;

/** Executes a queue of asynchronous functions, one at a time. */
export class EventQueue {
  /** Queue of functions. */
  private queue: EventFunction[] = [];
  /** If this is currently executing an event (flag). */
  private isExecuting: boolean = false;

  /**
   * Add en event to the end of the queue.
   * @param event Event function to add.
   */
  push(event: EventFunction): void {
    this.queue.push(event);
    this.update();
  }

  private update() {
    if (!this.isExecuting && this.queue.length > 0) {
      // Update flag
      this.isExecuting = true;
      // Start executing
      const p = new Promise<void>((resolve, reject) => {
        this.executeNext()
        .then(() => { this.isExecuting = false; })
        .then(resolve)
        .catch(reject)
        .then(() => { this.isExecuting = false; });
      });
    }
  }

  /**
   * Execute the next event in the queue (and continue doing so until the queue os empty).
   * @returns A promise that resolves when it reaches the end of the queue.
   */
  private async executeNext(): Promise<void> {
    const event = this.queue.shift();
    if (event) {
      try {
        if (typeof event === 'function') { await event(); }
        else                             { await Promise.resolve(event); }
      }
      catch (error) { /* Emit event? */ }
      await this.executeNext();
    }
  }
}
